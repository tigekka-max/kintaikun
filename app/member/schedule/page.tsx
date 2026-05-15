"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MonthNav } from "@/components/month-nav";
import { ExpenseBadge } from "@/components/status-badge";
import { assignments as mockAssignments, yen, type ExpenseStatus } from "@/lib/mock-data";
import { monthEnd, monthLabel, monthParts, monthStart, normalizeMonth } from "@/lib/month";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ScheduleItem = {
  id: string;
  day: number;
  labelDate: string;
  projectTitle: string;
  storeName: string;
  meetingTime: string;
  dailyRate: number;
  expenseStatus: ExpenseStatus;
  sortDate: string;
};

type CalendarDay = {
  day: number | null;
  dateKey: string;
  weekend: boolean;
};

type LoadStatus = "idle" | "loading" | "error" | "demo" | "unauthenticated";

const demoSchedule: ScheduleItem[] = mockAssignments.map((assignment) => ({
  id: assignment.id,
  day: Number(assignment.date.slice(-2)),
  labelDate: assignment.labelDate,
  projectTitle: assignment.projectTitle,
  storeName: assignment.storeName,
  meetingTime: assignment.meetingTime,
  dailyRate: assignment.dailyRate,
  expenseStatus: assignment.expenseStatus,
  sortDate: assignment.date
}));

export default function MemberSchedulePage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中...</p>}>
      <MemberScheduleContent />
    </Suspense>
  );
}

function MemberScheduleContent() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const [schedule, setSchedule] = useState<ScheduleItem[]>(supabase ? [] : demoSchedule);
  const [status, setStatus] = useState<LoadStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(supabase ? "Supabaseの確定予定を確認しています。" : "Supabase未接続のため、デモ予定を表示しています。");
  const [selectedDay, setSelectedDay] = useState<number | null>(supabase ? null : demoSchedule[0]?.day ?? null);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    async function loadSchedule() {
      setStatus("loading");
      setSchedule([]);
      setMessage("Supabaseの確定予定を確認しています。");

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (!active) return;
        setStatus("unauthenticated");
        setMessage("メンバーとしてログインすると、Supabaseに保存された確定予定だけを表示します。");
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
        setMessage(`予定の取得に失敗しました: ${assignmentsError.message}`);
        return;
      }

      const projectIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.project_id))];
      const { data: projects, error: projectsError } = projectIds.length > 0
        ? await client
            .from("projects")
            .select("id,title,work_date,store_name,meeting_time")
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
            .select("assignment_id,status")
            .in("assignment_id", assignmentIds)
        : { data: [], error: null };

      if (!active) return;

      if (projectsError || expensesError) {
        setStatus("error");
        setMessage(`予定詳細の取得に失敗しました: ${projectsError?.message ?? expensesError?.message}`);
        return;
      }

      const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
      const expenseStatusByAssignmentId = new Map(
        (expenses ?? []).map((expense) => [expense.assignment_id, expense.status as ExpenseStatus])
      );

      const nextSchedule = monthAssignments
        .map((assignment) => {
          const project = projectById.get(assignment.project_id);
          if (!project) return null;

          return {
            id: assignment.id,
            day: Number(project.work_date.slice(-2)),
            labelDate: formatDate(project.work_date),
            projectTitle: project.title,
            storeName: project.store_name,
            meetingTime: project.meeting_time.slice(0, 5),
            dailyRate: assignment.daily_rate,
            expenseStatus: expenseStatusByAssignmentId.get(assignment.id) ?? "unsubmitted",
            sortDate: project.work_date
          };
        })
        .filter((item): item is ScheduleItem => Boolean(item))
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate));

      setSchedule(nextSchedule);
      setSelectedDay(nextSchedule[0]?.day ?? null);
      setStatus("idle");
      setMessage(nextSchedule.length > 0 ? "Supabaseの確定予定を表示しています。" : "この月の確定予定はまだありません。");
    }

    loadSchedule();

    return () => {
      active = false;
    };
  }, [supabase, targetMonth]);

  const calendarDays = useMemo(() => buildCalendarDays(targetMonth), [targetMonth]);
  const scheduleByDay = useMemo(() => {
    const map = new Map<number, ScheduleItem[]>();
    for (const item of schedule) {
      map.set(item.day, [...(map.get(item.day) ?? []), item]);
    }
    return map;
  }, [schedule]);
  const selectedItems = selectedDay ? scheduleByDay.get(selectedDay) ?? [] : [];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)}</p>
          <h1>予定</h1>
        </div>
        <MonthNav basePath="/member/schedule" month={targetMonth} />
      </div>
      {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}

      <section className="card">
        <div className="grid two">
          <div className="metric"><span className="muted">確定稼働</span><strong>{schedule.length}日</strong></div>
          <div className="metric"><span className="muted">見込み日当</span><strong>{yen(schedule.reduce((sum, item) => sum + item.dailyRate, 0))}</strong></div>
        </div>
      </section>

      <section className="schedule-calendar card">
        <div className="calendar-weekdays">
          {["日", "月", "火", "水", "木", "金", "土"].map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            const items = day.day ? scheduleByDay.get(day.day) ?? [] : [];
            const hasUnsubmittedExpense = items.some((item) => item.expenseStatus === "unsubmitted");
            const active = day.day !== null && day.day === selectedDay;

            return (
              <button
                className={`calendar-day ${day.day ? "" : "empty"} ${day.weekend ? "weekend-cell" : ""} ${items.length > 0 ? "has-plan" : ""} ${active ? "active" : ""}`}
                disabled={!day.day}
                key={`${day.dateKey}-${index}`}
                onClick={() => day.day && setSelectedDay(day.day)}
              >
                {day.day && (
                  <>
                    <span className="calendar-date">{day.day}</span>
                    {items.length > 0 && <strong>{items.length}件</strong>}
                    {hasUnsubmittedExpense && <small>交通費未</small>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="selected-day-list">
        <div className="row">
          <h2>{selectedDay ? `${selectedDay}日の予定` : "予定"}</h2>
          {selectedItems.length > 0 && <span className="badge ok">{selectedItems.length}件</span>}
        </div>
        <div className="list">
          {selectedItems.map((assignment) => (
            <Link key={assignment.id} href={`/member/schedule/${assignment.id}`} className="list-item">
              <div className="row">
                <div>
                  <h3>{assignment.labelDate} {assignment.projectTitle}</h3>
                  <p className="muted">{assignment.storeName}</p>
                  <p>集合 {assignment.meetingTime} / 日当 {yen(assignment.dailyRate)}</p>
                </div>
                <ChevronRight size={20} />
              </div>
              <ExpenseBadge status={assignment.expenseStatus} />
            </Link>
          ))}
          {selectedItems.length === 0 && status !== "loading" && <p className="muted">この日の予定はありません。</p>}
        </div>
      </section>
    </>
  );
}

function buildCalendarDays(monthValue: string): CalendarDay[] {
  const { year, month } = monthParts(monthValue);
  const firstDate = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const blanks = Array.from({ length: firstDate.getDay() }, (_, index) => ({
    day: null,
    dateKey: `blank-${index}`,
    weekend: false
  }));
  const days = Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month - 1, day);
    return {
      day,
      dateKey: `${year}-${month}-${day}`,
      weekend: date.getDay() === 0 || date.getDay() === 6
    };
  });

  return [...blanks, ...days];
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}
