"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MonthNav } from "@/components/month-nav";
import { monthEnd, monthLabel, monthStart, normalizeMonth } from "@/lib/month";
import { adminStats, yen } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DashboardStats = {
  submittedMembers: number;
  totalMembers: number;
  unassignedProjects: number;
  submittedExpenses: number;
  paymentTotal: number;
  activeProjects: number;
  confirmedAssignments: number;
  pendingExpenses: number;
};

type LoadStatus = "idle" | "loading" | "error" | "demo";

const demoStats: DashboardStats = {
  submittedMembers: adminStats.submittedMembers,
  totalMembers: adminStats.totalMembers,
  unassignedProjects: adminStats.unassignedProjects,
  submittedExpenses: adminStats.submittedExpenses,
  paymentTotal: adminStats.paymentTotal,
  activeProjects: adminStats.unassignedProjects,
  confirmedAssignments: 0,
  pendingExpenses: adminStats.submittedExpenses
};

const emptyStats: DashboardStats = {
  submittedMembers: 0,
  totalMembers: 0,
  unassignedProjects: 0,
  submittedExpenses: 0,
  paymentTotal: 0,
  activeProjects: 0,
  confirmedAssignments: 0,
  pendingExpenses: 0
};

export function AdminDashboardClient() {
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stats, setStats] = useState<DashboardStats>(() => supabase ? emptyStats : demoStats);
  const [status, setStatus] = useState<LoadStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(
    supabase ? "Supabaseの月次状況を集計しています。" : "Supabase未接続のため、デモ集計を表示しています。"
  );

  const loadDashboard = useCallback(async () => {
    if (!supabase) return;

    setStatus("loading");
    setMessage("Supabaseの月次状況を集計しています。");

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id");

    if (membersError) {
      setStatus("error");
      setMessage(`メンバー情報の取得に失敗しました: ${membersError.message}`);
      return;
    }

    const memberIds = (members ?? []).map((member) => member.id);
    const { data: shifts, error: shiftsError } = memberIds.length > 0
      ? await supabase
          .from("shift_availabilities")
          .select("member_id")
          .in("member_id", memberIds)
          .gte("work_date", monthStart(targetMonth))
          .lte("work_date", monthEnd(targetMonth))
      : { data: [], error: null };

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id,required_people")
      .gte("work_date", monthStart(targetMonth))
      .lte("work_date", monthEnd(targetMonth))
      .neq("status", "cancelled");

    if (shiftsError || projectsError) {
      setStatus("error");
      setMessage(`月次状況の取得に失敗しました: ${shiftsError?.message ?? projectsError?.message}`);
      return;
    }

    const projectIds = (projects ?? []).map((project) => project.id);
    const { data: assignments, error: assignmentsError } = projectIds.length > 0
      ? await supabase
          .from("assignments")
          .select("id,project_id,daily_rate")
          .in("project_id", projectIds)
          .eq("status", "confirmed")
      : { data: [], error: null };

    if (assignmentsError) {
      setStatus("error");
      setMessage(`割当情報の取得に失敗しました: ${assignmentsError.message}`);
      return;
    }

    const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
    const { data: expenses, error: expensesError } = assignmentIds.length > 0
      ? await supabase
          .from("transportation_expenses")
          .select("assignment_id,amount,status")
          .in("assignment_id", assignmentIds)
      : { data: [], error: null };

    if (expensesError) {
      setStatus("error");
      setMessage(`交通費申請の取得に失敗しました: ${expensesError.message}`);
      return;
    }

    const submittedMemberIds = new Set((shifts ?? []).map((shift) => shift.member_id));
    const assignedCountByProject = new Map<string, number>();
    for (const assignment of assignments ?? []) {
      assignedCountByProject.set(assignment.project_id, (assignedCountByProject.get(assignment.project_id) ?? 0) + 1);
    }

    const unassignedProjects = (projects ?? []).filter((project) => {
      const assigned = assignedCountByProject.get(project.id) ?? 0;
      return assigned < project.required_people;
    }).length;
    const dailyRateTotal = (assignments ?? []).reduce((sum, assignment) => sum + assignment.daily_rate, 0);
    const approvedExpenseTotal = (expenses ?? [])
      .filter((expense) => expense.status === "approved")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const submittedExpenses = (expenses ?? []).filter((expense) => expense.status === "submitted").length;
    const pendingExpenses = (expenses ?? []).filter((expense) => expense.status !== "approved").length;

    setStats({
      submittedMembers: submittedMemberIds.size,
      totalMembers: memberIds.length,
      unassignedProjects,
      submittedExpenses,
      paymentTotal: dailyRateTotal + approvedExpenseTotal,
      activeProjects: projects?.length ?? 0,
      confirmedAssignments: assignments?.length ?? 0,
      pendingExpenses
    });
    setStatus("idle");
    setMessage("Supabaseの月次状況を同期しました。");
  }, [supabase, targetMonth]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)}</p>
          <h1>管理ダッシュボード</h1>
          <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>
        </div>
        <MonthNav basePath="/admin" month={targetMonth} />
      </div>
      <div className="grid three">
        <section className="card metric">
          <span className="muted">シフト提出</span>
          <strong>{stats.submittedMembers}/{stats.totalMembers}人</strong>
          <small className="muted">対象月に提出済みのメンバー</small>
          <Link className="button secondary" href={`/admin/shifts?month=${targetMonth}`}>シフトを見る</Link>
        </section>
        <section className="card metric">
          <span className="muted">未充足案件</span>
          <strong>{stats.unassignedProjects}件</strong>
          <small className="muted">案件 {stats.activeProjects}件 / 確定割当 {stats.confirmedAssignments}件</small>
          <Link className="button secondary" href={`/admin/assignments?month=${targetMonth}`}>割当する</Link>
        </section>
        <section className="card metric">
          <span className="muted">交通費申請</span>
          <strong>{stats.submittedExpenses}件</strong>
          <small className="muted">未承認 {stats.pendingExpenses}件</small>
          <Link className="button secondary" href={`/admin/expenses?month=${targetMonth}`}>確認する</Link>
        </section>
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <div>
            <p className="eyebrow">今月支払見込み</p>
            <h2>{yen(stats.paymentTotal)}</h2>
            <p className="muted">確定日当と承認済み交通費を集計しています。</p>
          </div>
          <Link className="button" href={`/admin/settlements?month=${targetMonth}`}>精算を見る</Link>
        </div>
      </section>
    </>
  );
}
