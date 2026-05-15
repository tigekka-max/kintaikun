"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { MonthNav } from "@/components/month-nav";
import { monthEnd, monthLabel, monthStart, normalizeMonth } from "@/lib/month";
import { settlementRows } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["transportation_expenses"]["Row"];

type SettlementRow = {
  memberId: string;
  memberName: string;
  workDays: number;
  dailyRateTotal: number;
  transportationTotal: number;
  paymentTotal: number;
  pendingExpenses: number;
};

const demoRows: SettlementRow[] = settlementRows.map((row) => ({
  memberId: row.memberName,
  memberName: row.memberName,
  workDays: row.workDays,
  dailyRateTotal: row.dailyRateTotal,
  transportationTotal: row.transportationTotal,
  paymentTotal: row.paymentTotal,
  pendingExpenses: row.pendingExpenses
}));

function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function toCsvValue(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function downloadRowsCsv(rows: SettlementRow[], targetMonth: string) {
  const header = ["メンバー", "稼働日数", "日当合計", "承認済み交通費", "支払合計", "未承認交通費"];
  const body = rows.map((row) => [
    row.memberName,
    row.workDays,
    row.dailyRateTotal,
    row.transportationTotal,
    row.paymentTotal,
    row.pendingExpenses
  ]);
  const csv = [header, ...body].map((line) => line.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `settlements-${targetMonth}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildSettlementRows(
  assignments: AssignmentRow[],
  projects: ProjectRow[],
  expenses: ExpenseRow[],
  members: MemberRow[],
  profiles: ProfileRow[]
) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const expenseByAssignmentId = new Map(expenses.map((expense) => [expense.assignment_id, expense]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const rowsByMember = new Map<string, SettlementRow>();

  assignments.forEach((assignment) => {
    const project = projectById.get(assignment.project_id);
    const member = memberById.get(assignment.member_id);
    const profile = member ? profileById.get(member.profile_id) : null;
    if (!project || !member || !profile) return;

    const existing = rowsByMember.get(member.id) ?? {
      memberId: member.id,
      memberName: profile.name,
      workDays: 0,
      dailyRateTotal: 0,
      transportationTotal: 0,
      paymentTotal: 0,
      pendingExpenses: 0
    };

    const expense = expenseByAssignmentId.get(assignment.id);
    const approvedTransportation = expense?.status === "approved" ? expense.amount : 0;
    const pendingExpense = expense && expense.status !== "approved" ? 1 : 0;

    existing.workDays += 1;
    existing.dailyRateTotal += assignment.daily_rate;
    existing.transportationTotal += approvedTransportation;
    existing.paymentTotal = existing.dailyRateTotal + existing.transportationTotal;
    existing.pendingExpenses += pendingExpense;
    rowsByMember.set(member.id, existing);
  });

  return [...rowsByMember.values()].sort((a, b) => a.memberName.localeCompare(b.memberName, "ja"));
}

export function AdminSettlementsClient() {
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rows, setRows] = useState<SettlementRow[]>(supabase ? [] : demoRows);
  const [message, setMessage] = useState(supabase ? "精算見込みを読み込み中です。" : "デモ表示中です。Supabase接続後に精算を同期します。");
  const [loading, setLoading] = useState(Boolean(supabase));

  const loadSettlements = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setMessage("精算見込みを読み込み中です。");

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .gte("work_date", monthStart(targetMonth))
      .lte("work_date", monthEnd(targetMonth))
      .neq("status", "cancelled");

    if (projectsError) {
      setLoading(false);
      setMessage(`案件の取得に失敗しました: ${projectsError.message}`);
      return;
    }

    const projectIds = (projects ?? []).map((project) => project.id);
    if (projectIds.length === 0) {
      setRows([]);
      setLoading(false);
      setMessage("この月の精算対象はまだありません。");
      return;
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("*")
      .in("project_id", projectIds)
      .eq("status", "confirmed");

    if (assignmentsError) {
      setLoading(false);
      setMessage(`割り当ての取得に失敗しました: ${assignmentsError.message}`);
      return;
    }

    const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
    const memberIds = [...new Set((assignments ?? []).map((assignment) => assignment.member_id))];

    if (assignmentIds.length === 0 || memberIds.length === 0) {
      setRows([]);
      setLoading(false);
      setMessage("この月の確定済み割り当てはまだありません。");
      return;
    }

    const { data: expenses, error: expensesError } = await supabase
      .from("transportation_expenses")
      .select("*")
      .in("assignment_id", assignmentIds);

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("*")
      .in("id", memberIds);

    if (expensesError || membersError) {
      setLoading(false);
      setMessage(`精算詳細の取得に失敗しました: ${expensesError?.message ?? membersError?.message}`);
      return;
    }

    const profileIds = [...new Set((members ?? []).map((member) => member.profile_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", profileIds);

    if (profilesError) {
      setLoading(false);
      setMessage(`スタッフ情報の取得に失敗しました: ${profilesError.message}`);
      return;
    }

    const nextRows = buildSettlementRows(assignments ?? [], projects ?? [], expenses ?? [], members ?? [], profiles ?? []);
    setRows(nextRows);
    setLoading(false);
    setMessage(nextRows.length > 0 ? "承認済み交通費を含めた精算見込みを同期しました。" : "この月の精算対象はまだありません。");
  }, [supabase, targetMonth]);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  const total = rows.reduce(
    (sum, row) => ({
      workDays: sum.workDays + row.workDays,
      daily: sum.daily + row.dailyRateTotal,
      transportation: sum.transportation + row.transportationTotal,
      payment: sum.payment + row.paymentTotal,
      pending: sum.pending + row.pendingExpenses
    }),
    { workDays: 0, daily: 0, transportation: 0, payment: 0, pending: 0 }
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)}</p>
          <h1>精算</h1>
          <p className="muted">{message}</p>
        </div>
        <div className="admin-actions">
          <MonthNav basePath="/admin/settlements" month={targetMonth} />
          <button className="button" type="button" onClick={() => downloadRowsCsv(rows, targetMonth)}>
            <Download size={18} />
            サマリーCSV
          </button>
        </div>
      </div>

      <section className="card">
        <div className="grid three">
          <div className="metric"><span className="muted">稼働日数合計</span><strong>{total.workDays}日</strong></div>
          <div className="metric"><span className="muted">承認済み交通費</span><strong>{yen(total.transportation)}</strong></div>
          <div className="metric"><span className="muted">支払合計</span><strong>{yen(total.payment)}</strong></div>
        </div>
        {total.pending > 0 && <p className="muted admin-settlement-note">未承認交通費: {total.pending}件</p>}
      </section>

      <div className="table-wrap admin-settlement-table">
        <table>
          <thead>
            <tr>
              <th>メンバー</th>
              <th>稼働</th>
              <th>日当</th>
              <th>承認済み交通費</th>
              <th>支払</th>
              <th>未承認</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.memberId}>
                <td>{row.memberName}</td>
                <td>{row.workDays}日</td>
                <td>{yen(row.dailyRateTotal)}</td>
                <td>{yen(row.transportationTotal)}</td>
                <td>{yen(row.paymentTotal)}</td>
                <td>{row.pendingExpenses}件</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6}>表示できる精算対象はありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="button secondary admin-settlement-finalize" type="button" disabled>
        月次確定
      </button>
    </>
  );
}
