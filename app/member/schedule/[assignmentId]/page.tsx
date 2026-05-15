"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, ReceiptText } from "lucide-react";
import { LinkifiedText } from "@/components/linkified-text";
import { ExpenseBadge } from "@/components/status-badge";
import { assignments as mockAssignments, yen, type ExpenseStatus } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ScheduleDetail = {
  id: string;
  labelDate: string;
  projectTitle: string;
  storeName: string;
  address: string;
  meetingTime: string;
  workTime: string;
  breakMinutes: number;
  dailyRate: number;
  detailText: string;
  expenseStatus: ExpenseStatus;
  expenseAmount: number;
};

type LoadStatus = "idle" | "loading" | "error" | "demo";

function mockDetail(assignmentId: string): ScheduleDetail {
  const assignment = mockAssignments.find((item) => item.id === assignmentId) ?? mockAssignments[0];
  return {
    id: assignment.id,
    labelDate: assignment.labelDate,
    projectTitle: assignment.projectTitle,
    storeName: assignment.storeName,
    address: assignment.address,
    meetingTime: assignment.meetingTime,
    workTime: assignment.workTime,
    breakMinutes: assignment.breakMinutes,
    dailyRate: assignment.dailyRate,
    detailText: assignment.detailText,
    expenseStatus: assignment.expenseStatus,
    expenseAmount: assignment.expenseAmount
  };
}

export default function MemberScheduleDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;
  const supabase = createSupabaseBrowserClient();
  const [assignment, setAssignment] = useState<ScheduleDetail>(() => mockDetail(assignmentId));
  const [status, setStatus] = useState<LoadStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(supabase ? "" : "Supabase未接続のため、デモ予定を表示しています。");

  useEffect(() => {
    if (!supabase) {
      setAssignment(mockDetail(assignmentId));
      setStatus("demo");
      setMessage("");
      return;
    }

    if (!isUuid(assignmentId)) {
      setStatus("error");
      setMessage("Supabase接続中です。予定詳細はDBのassignment IDから開いてください。");
      return;
    }

    const client = supabase;
    let active = true;

    async function loadAssignment() {
      setStatus("loading");

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (!active) return;
        setStatus("error");
        setMessage("メンバーとしてログインすると、Supabaseに保存された予定詳細を表示します。");
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

      const { data: assignmentRow, error: assignmentError } = await client
        .from("assignments")
        .select("id,project_id,daily_rate,detail_text,status")
        .eq("id", assignmentId)
        .eq("member_id", member.id)
        .eq("status", "confirmed")
        .single();

      if (!active) return;

      if (assignmentError || !assignmentRow) {
        setStatus("error");
        setMessage(`予定の取得に失敗しました: ${assignmentError?.message ?? "対象予定がありません。"}`);
        return;
      }

      const { data: project, error: projectError } = await client
        .from("projects")
        .select("title,work_date,store_name,address,meeting_time,start_time,end_time,break_minutes,memo")
        .eq("id", assignmentRow.project_id)
        .single();

      const { data: expense, error: expenseError } = await client
        .from("transportation_expenses")
        .select("amount,status")
        .eq("assignment_id", assignmentRow.id)
        .maybeSingle();

      if (!active) return;

      if (projectError || !project || expenseError) {
        setStatus("error");
        setMessage(`予定詳細の取得に失敗しました: ${projectError?.message ?? expenseError?.message}`);
        return;
      }

      setAssignment({
        id: assignmentRow.id,
        labelDate: formatDate(project.work_date),
        projectTitle: project.title,
        storeName: project.store_name,
        address: project.address || "",
        meetingTime: project.meeting_time.slice(0, 5),
        workTime: `${project.start_time.slice(0, 5)}-${project.end_time.slice(0, 5)}`,
        breakMinutes: project.break_minutes,
        dailyRate: assignmentRow.daily_rate,
        detailText: assignmentRow.detail_text || project.memo || project.title,
        expenseStatus: (expense?.status as ExpenseStatus | undefined) ?? "unsubmitted",
        expenseAmount: expense?.amount ?? 0
      });
      setStatus("idle");
      setMessage("Supabaseの確定予定を表示しています。");
    }

    loadAssignment();

    return () => {
      active = false;
    };
  }, [assignmentId, supabase]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">現場詳細</p>
          <h1>{assignment.projectTitle}</h1>
        </div>
        <ExpenseBadge status={assignment.expenseStatus} />
      </div>

      {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}

      <section className="card stack">
        <div><span className="muted">日付</span><p>{assignment.labelDate}</p></div>
        <div><span className="muted">店舗</span><p>{assignment.storeName}</p></div>
        <div><span className="muted">住所</span><p>{assignment.address || "未設定"}</p></div>
        <div><span className="muted">集合/稼働</span><p>{assignment.meetingTime} / {assignment.workTime}</p></div>
        <div><span className="muted">休憩</span><p>{assignment.breakMinutes}分</p></div>
        <div><span className="muted">日当</span><p>{yen(assignment.dailyRate)}</p></div>
        <div>
          <span className="muted">稼働詳細</span>
          <LinkifiedText text={assignment.detailText} />
        </div>
        <a className="button secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.address)}`} target="_blank" rel="noreferrer">
          <MapPin size={18} />
          地図で開く
        </a>
        {assignment.expenseStatus === "unsubmitted" || assignment.expenseStatus === "rejected" ? (
          <Link className="button" href={`/member/expenses/${assignment.id}`}>
            <ReceiptText size={18} />
            交通費を申請する
          </Link>
        ) : (
          <p>交通費: {yen(assignment.expenseAmount)} (<ExpenseBadge status={assignment.expenseStatus} />)</p>
        )}
      </section>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
