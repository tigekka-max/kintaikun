"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MonthNav } from "@/components/month-nav";
import { ExpenseBadge } from "@/components/status-badge";
import { assignments as mockAssignments, member as mockMember, yen, type ExpenseStatus } from "@/lib/mock-data";
import { monthEnd, monthLabel, monthStart, normalizeMonth } from "@/lib/month";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SettlementItem = {
  id: string;
  labelDate: string;
  projectTitle: string;
  storeName: string;
  dailyRate: number;
  expenseAmount: number;
  expenseStatus: ExpenseStatus;
  sortDate: string;
};

type LoadStatus = "idle" | "loading" | "error" | "demo";

const demoItems: SettlementItem[] = mockAssignments.map((item) => ({
  id: item.id,
  labelDate: item.labelDate,
  projectTitle: item.projectTitle,
  storeName: item.storeName,
  dailyRate: item.dailyRate,
  expenseAmount: item.expenseAmount,
  expenseStatus: item.expenseStatus,
  sortDate: item.date
}));

export default function MemberSettlementsPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中...</p>}>
      <MemberSettlementsContent />
    </Suspense>
  );
}

function MemberSettlementsContent() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const [items, setItems] = useState<SettlementItem[]>(supabase ? [] : demoItems);
  const [status, setStatus] = useState<LoadStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(supabase ? "Supabaseの精算見込みを確認しています。" : "Supabase未接続のため、デモ精算を表示しています。");

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    async function loadSettlement() {
      setStatus("loading");
      setItems([]);
      setMessage("Supabaseの精算見込みを確認しています。");

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (!active) return;
        setStatus("idle");
        setMessage("メンバーとしてログインすると、Supabaseの精算見込みを表示します。");
        return;
      }

      const { data: member, error: memberError } = await client
        .from("members")
        .select("id")
        .eq("profile_id", userData.user.id)
        .single();

      if (!active) return;

      if (memberError || !member) {
        setStatus("error");
        setMessage(`メンバー情報が見つかりません。ログイン中UID: ${userData.user.id}`);
        return;
      }

      const { data: assignmentRows, error: assignmentsError } = await client
        .from("assignments")
        .select("id,project_id,daily_rate,status")
        .eq("member_id", member.id)
        .eq("status", "confirmed");

      if (!active) return;

      if (assignmentsError) {
        setStatus("error");
        setMessage(`精算対象の取得に失敗しました: ${assignmentsError.message}`);
        return;
      }

      const projectIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.project_id))];
      const { data: projects, error: projectsError } = projectIds.length > 0
        ? await client
            .from("projects")
            .select("id,title,work_date,store_name")
            .in("id", projectIds)
            .gte("work_date", monthStart(targetMonth))
            .lte("work_date", monthEnd(targetMonth))
        : { data: [], error: null };

      const monthProjectIds = new Set((projects ?? []).map((project) => project.id));
      const monthAssignments = (assignmentRows ?? []).filter((assignment) => monthProjectIds.has(assignment.project_id));
      const assignmentIds = monthAssignments.map((assignment) => assignment.id);
      const { data: expenses, error: expensesError } = assignmentIds.length > 0
        ? await client
            .from("transportation_expenses")
            .select("assignment_id,amount,status")
            .in("assignment_id", assignmentIds)
        : { data: [], error: null };

      if (!active) return;

      if (projectsError || expensesError) {
        setStatus("error");
        setMessage(`精算詳細の取得に失敗しました: ${projectsError?.message ?? expensesError?.message}`);
        return;
      }

      const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
      const expenseByAssignmentId = new Map((expenses ?? []).map((expense) => [expense.assignment_id, expense]));
      const nextItems = monthAssignments
        .map((assignment) => {
          const project = projectById.get(assignment.project_id);
          if (!project) return null;
          const expense = expenseByAssignmentId.get(assignment.id);
          return {
            id: assignment.id,
            labelDate: formatDate(project.work_date),
            projectTitle: project.title,
            storeName: project.store_name,
            dailyRate: assignment.daily_rate,
            expenseAmount: expense?.amount ?? 0,
            expenseStatus: (expense?.status as ExpenseStatus | undefined) ?? "unsubmitted",
            sortDate: project.work_date
          };
        })
        .filter((item): item is SettlementItem => Boolean(item))
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate));

      setItems(nextItems);
      setStatus("idle");
      setMessage(nextItems.length > 0 ? "Supabaseの精算見込みを表示しています。" : "この月の精算対象はまだありません。");
    }

    loadSettlement();

    return () => {
      active = false;
    };
  }, [supabase, targetMonth]);

  const workDays = items.length;
  const dailyRateTotal = items.reduce((sum, item) => sum + item.dailyRate, 0);
  const transportationTotal = items.reduce((sum, item) => sum + item.expenseAmount, 0);
  const paymentTotal = dailyRateTotal + transportationTotal;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)}</p>
          <h1>精算</h1>
        </div>
        <MonthNav basePath="/member/settlements" month={targetMonth} />
      </div>
      <span className="badge warn">見込み</span>
      {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}

      <section className="card" style={{ marginTop: 14 }}>
        <div className="member-metric-grid">
          <div className="metric"><span className="muted">稼働日数</span><strong>{status === "demo" ? mockMember.monthlyWorkDays : workDays}日</strong></div>
          <div className="metric"><span className="muted">支払合計</span><strong>{yen(status === "demo" ? mockMember.paymentTotal : paymentTotal)}</strong></div>
          <div className="metric"><span className="muted">日当合計</span><strong>{yen(status === "demo" ? mockMember.dailyRateTotal : dailyRateTotal)}</strong></div>
          <div className="metric"><span className="muted">交通費合計</span><strong>{yen(status === "demo" ? mockMember.transportationTotal : transportationTotal)}</strong></div>
        </div>
      </section>

      <div className="member-stack">
        {items.map((item) => (
          <section className="list-item member-settlement-item" key={item.id}>
            <div className="row">
              <div>
                <h3>{item.labelDate} {item.projectTitle}</h3>
                <p className="muted">{item.storeName}</p>
              </div>
              <ExpenseBadge status={item.expenseStatus} />
            </div>
            <div className="member-cost-row">
              <span>日当 {yen(item.dailyRate)}</span>
              <span>交通費 {yen(item.expenseAmount)}</span>
            </div>
            <strong>小計 {yen(item.dailyRate + item.expenseAmount)}</strong>
          </section>
        ))}
        {items.length === 0 && status !== "loading" && <p className="muted">表示できる精算対象はありません。</p>}
      </div>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}
