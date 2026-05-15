"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, ChevronRight, ReceiptText } from "lucide-react";
import { assignments as mockAssignments, member as mockMember, yen, type ExpenseStatus } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HomeAssignment = {
  id: string;
  labelDate: string;
  projectTitle: string;
  storeName: string;
  meetingTime: string;
  workTime: string;
  dailyRate: number;
  expenseStatus: ExpenseStatus;
  expenseAmount: number;
  sortDate: string;
};

type HomeData = {
  memberName: string;
  nextAssignment: HomeAssignment | null;
  workDays: number;
  dailyRateTotal: number;
  transportationTotal: number;
  paymentTotal: number;
  unsubmittedExpenses: number;
  message: string;
};

const demoAssignments: HomeAssignment[] = mockAssignments.map((assignment) => ({
  id: assignment.id,
  labelDate: assignment.labelDate,
  projectTitle: assignment.projectTitle,
  storeName: assignment.storeName,
  meetingTime: assignment.meetingTime,
  workTime: assignment.workTime,
  dailyRate: assignment.dailyRate,
  expenseStatus: assignment.expenseStatus,
  expenseAmount: assignment.expenseAmount,
  sortDate: assignment.date
}));

const demoHome: HomeData = {
  memberName: mockMember.name,
  nextAssignment: demoAssignments[0],
  workDays: mockMember.monthlyWorkDays,
  dailyRateTotal: mockMember.dailyRateTotal,
  transportationTotal: mockMember.transportationTotal,
  paymentTotal: mockMember.paymentTotal,
  unsubmittedExpenses: demoAssignments.filter((assignment) => assignment.expenseStatus === "unsubmitted").length,
  message: "Supabase未接続のため、デモ情報を表示しています。"
};

export default function MemberHomePage() {
  const supabase = createSupabaseBrowserClient();
  const [home, setHome] = useState<HomeData>(supabase ? { ...demoHome, nextAssignment: null, workDays: 0, dailyRateTotal: 0, transportationTotal: 0, paymentTotal: 0, unsubmittedExpenses: 0, message: "Supabaseの情報を確認しています。" } : demoHome);
  const [status, setStatus] = useState<"loading" | "idle" | "error" | "demo">(supabase ? "loading" : "demo");

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    async function loadHome() {
      setStatus("loading");

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (!active) return;
        setHome({
          ...demoHome,
          nextAssignment: null,
          workDays: 0,
          dailyRateTotal: 0,
          transportationTotal: 0,
          paymentTotal: 0,
          unsubmittedExpenses: 0,
          message: "メンバーとしてログインすると、Supabaseの予定と精算見込みを表示します。"
        });
        setStatus("idle");
        return;
      }

      const { data: profile } = await client
        .from("profiles")
        .select("name")
        .eq("id", userData.user.id)
        .single();

      const { data: member, error: memberError } = await client
        .from("members")
        .select("id")
        .eq("profile_id", userData.user.id)
        .single();

      if (!active) return;

      if (memberError || !member) {
        setHome({
          ...demoHome,
          memberName: profile?.name ?? userData.user.email ?? "メンバー",
          nextAssignment: null,
          workDays: 0,
          dailyRateTotal: 0,
          transportationTotal: 0,
          paymentTotal: 0,
          unsubmittedExpenses: 0,
          message: `メンバー情報が見つかりません。ログイン中UID: ${userData.user.id}`
        });
        setStatus("error");
        return;
      }

      const { data: assignmentRows, error: assignmentError } = await client
        .from("assignments")
        .select("id,project_id,daily_rate,status")
        .eq("member_id", member.id)
        .eq("status", "confirmed");

      if (!active) return;

      if (assignmentError) {
        setHome((current) => ({ ...current, message: `予定の取得に失敗しました: ${assignmentError.message}` }));
        setStatus("error");
        return;
      }

      const projectIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.project_id))];
      const { data: projects, error: projectError } = projectIds.length > 0
        ? await client
            .from("projects")
            .select("id,title,work_date,store_name,meeting_time,start_time,end_time")
            .in("id", projectIds)
        : { data: [], error: null };

      const assignmentIds = (assignmentRows ?? []).map((assignment) => assignment.id);
      const { data: expenses, error: expenseError } = assignmentIds.length > 0
        ? await client
            .from("transportation_expenses")
            .select("assignment_id,amount,status")
            .in("assignment_id", assignmentIds)
        : { data: [], error: null };

      if (!active) return;

      if (projectError || expenseError) {
        setHome((current) => ({ ...current, message: `精算情報の取得に失敗しました: ${projectError?.message ?? expenseError?.message}` }));
        setStatus("error");
        return;
      }

      const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
      const expenseByAssignmentId = new Map((expenses ?? []).map((expense) => [expense.assignment_id, expense]));

      const assignments = (assignmentRows ?? [])
        .map((assignment) => {
          const project = projectById.get(assignment.project_id);
          if (!project) return null;
          const expense = expenseByAssignmentId.get(assignment.id);
          return {
            id: assignment.id,
            labelDate: formatDate(project.work_date),
            projectTitle: project.title,
            storeName: project.store_name,
            meetingTime: project.meeting_time.slice(0, 5),
            workTime: `${project.start_time.slice(0, 5)}-${project.end_time.slice(0, 5)}`,
            dailyRate: assignment.daily_rate,
            expenseStatus: (expense?.status as ExpenseStatus | undefined) ?? "unsubmitted",
            expenseAmount: expense?.amount ?? 0,
            sortDate: project.work_date
          };
        })
        .filter((assignment): assignment is HomeAssignment => Boolean(assignment))
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate));

      const dailyRateTotal = assignments.reduce((sum, assignment) => sum + assignment.dailyRate, 0);
      const transportationTotal = assignments.reduce((sum, assignment) => sum + assignment.expenseAmount, 0);

      setHome({
        memberName: profile?.name ?? userData.user.email ?? "メンバー",
        nextAssignment: assignments[0] ?? null,
        workDays: assignments.length,
        dailyRateTotal,
        transportationTotal,
        paymentTotal: dailyRateTotal + transportationTotal,
        unsubmittedExpenses: assignments.filter((assignment) => assignment.expenseStatus === "unsubmitted").length,
        message: assignments.length > 0 ? "Supabaseの予定と精算見込みを表示しています。" : "Supabase上に確定予定はまだありません。"
      });
      setStatus("idle");
    }

    loadHome();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <>
      <div className="member-greeting">
        <p className="eyebrow">こんにちは、{home.memberName}さん</p>
        <h1>ホーム</h1>
      </div>

      {home.message && <p className={status === "error" ? "badge danger" : "muted"}>{home.message}</p>}

      <div className="member-stack">
        <section className="card member-next-card">
          <div className="row">
            <div>
              <span className="muted">次回稼働</span>
              <h2>{home.nextAssignment?.labelDate ?? "未確定"}</h2>
            </div>
            <span className={`badge ${home.nextAssignment ? "ok" : "warn"}`}>{home.nextAssignment ? "確定" : "なし"}</span>
          </div>
          {home.nextAssignment ? (
            <>
              <h3>{home.nextAssignment.projectTitle} {home.nextAssignment.storeName}</h3>
              <p>集合 {home.nextAssignment.meetingTime} / 稼働 {home.nextAssignment.workTime}</p>
              <p className="muted">日当 {yen(home.nextAssignment.dailyRate)}</p>
              <Link className="button secondary" href={`/member/schedule/${home.nextAssignment.id}`}>
                詳細を見る
                <ChevronRight size={18} />
              </Link>
            </>
          ) : (
            <p className="muted">管理者が確定した予定がここに表示されます。</p>
          )}
        </section>

        <section className="card">
          <h2>やること</h2>
          <div className="member-task-list">
            <Link className="member-task-item" href="/member/shifts">
              <span className="member-task-icon"><CalendarDays size={18} /></span>
              <span>
                <strong>翌月シフトを提出</strong>
                <small>土日祝の可否を回答してください</small>
              </span>
              <ChevronRight size={18} />
            </Link>
            <Link className="member-task-item" href="/member/schedule">
              <span className="member-task-icon"><ReceiptText size={18} /></span>
              <span>
                <strong>交通費未申請 {home.unsubmittedExpenses}件</strong>
                <small>稼働後に往復合計を申請します</small>
              </span>
              <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="row">
            <h2>今月の見込み</h2>
            <AlertCircle size={18} color="var(--warning)" />
          </div>
          <div className="member-metric-grid">
            <div className="metric"><span className="muted">稼働日数</span><strong>{home.workDays}日</strong></div>
            <div className="metric"><span className="muted">支払見込み</span><strong>{yen(home.paymentTotal)}</strong></div>
          </div>
          <Link className="button secondary member-full-button" href="/member/settlements">
            精算を見る
          </Link>
        </section>
      </div>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}
