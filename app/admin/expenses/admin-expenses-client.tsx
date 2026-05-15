"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MonthNav } from "@/components/month-nav";
import { ExpenseBadge } from "@/components/status-badge";
import { assignments as demoAssignments, type ExpenseStatus } from "@/lib/mock-data";
import { monthEnd, monthStart, normalizeMonth } from "@/lib/month";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ExpenseRow = Database["public"]["Tables"]["transportation_expenses"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AdminExpenseItem = {
  id: string;
  memberName: string;
  workDate: string;
  title: string;
  storeName: string;
  amount: number;
  routeMemo: string;
  status: ExpenseStatus;
  submittedAt: string;
  reviewedAt: string | null;
  adminComment: string;
};

const demoItems: AdminExpenseItem[] = demoAssignments
  .filter((item) => item.expenseStatus !== "unsubmitted")
  .map((item) => ({
    id: item.id,
    memberName: "山田太郎",
    workDate: item.date,
    title: item.projectTitle,
    storeName: item.storeName,
    amount: item.expenseAmount,
    routeMemo: "往復交通費",
    status: item.expenseStatus,
    submittedAt: item.date,
    reviewedAt: null,
    adminComment: ""
  }));

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function buildItems(
  expenses: ExpenseRow[],
  assignments: AssignmentRow[],
  projects: ProjectRow[],
  members: MemberRow[],
  profiles: ProfileRow[]
) {
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return expenses
    .map((expense): AdminExpenseItem | null => {
      const assignment = assignmentById.get(expense.assignment_id);
      const project = assignment ? projectById.get(assignment.project_id) : null;
      const member = memberById.get(expense.member_id);
      const profile = member ? profileById.get(member.profile_id) : null;

      if (!assignment || !project || !member || !profile) return null;

      return {
        id: expense.id,
        memberName: profile.name,
        workDate: project.work_date,
        title: project.title,
        storeName: project.store_name,
        amount: expense.amount,
        routeMemo: expense.route_memo ?? "",
        status: expense.status,
        submittedAt: expense.submitted_at,
        reviewedAt: expense.reviewed_at,
        adminComment: expense.admin_comment ?? ""
      };
    })
    .filter((item): item is AdminExpenseItem => item !== null)
    .sort((a, b) => a.workDate.localeCompare(b.workDate));
}

export function AdminExpensesClient() {
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<AdminExpenseItem[]>(supabase ? [] : demoItems);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(supabase ? "交通費申請を読み込み中です。" : "デモ表示中です。Supabase接続後に申請を同期します。");
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!supabase) return;

    setMessage("交通費申請を読み込み中です。");
    const { data: expenses, error: expensesError } = await supabase
      .from("transportation_expenses")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (expensesError) {
      setMessage(`交通費申請の取得に失敗しました: ${expensesError.message}`);
      return;
    }

    const assignmentIds = [...new Set((expenses ?? []).map((expense) => expense.assignment_id))];
    if (assignmentIds.length === 0) {
      setItems([]);
      setMessage("この月の交通費申請はありません。");
      return;
    }

    const { data: assignmentRows, error: assignmentsError } = await supabase
      .from("assignments")
      .select("*")
      .in("id", assignmentIds);

    if (assignmentsError) {
      setMessage(`案件割り当ての取得に失敗しました: ${assignmentsError.message}`);
      return;
    }

    const projectIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.project_id))];
    const memberIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.member_id))];

    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .in("id", projectIds)
      .gte("work_date", monthStart(targetMonth))
      .lte("work_date", monthEnd(targetMonth));

    const { data: memberRows, error: membersError } = await supabase
      .from("members")
      .select("*")
      .in("id", memberIds);

    if (projectsError || membersError) {
      setMessage(`申請詳細の取得に失敗しました: ${projectsError?.message ?? membersError?.message}`);
      return;
    }

    const profileIds = [...new Set((memberRows ?? []).map((member) => member.profile_id))];
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", profileIds);

    if (profilesError) {
      setMessage(`スタッフ情報の取得に失敗しました: ${profilesError.message}`);
      return;
    }

    const visibleProjectIds = new Set((projectRows ?? []).map((project) => project.id));
    const visibleAssignments = (assignmentRows ?? []).filter((assignment) => visibleProjectIds.has(assignment.project_id));
    const visibleAssignmentIds = new Set(visibleAssignments.map((assignment) => assignment.id));
    const visibleExpenses = (expenses ?? []).filter((expense) => visibleAssignmentIds.has(expense.assignment_id));
    const nextItems = buildItems(visibleExpenses, visibleAssignments, projectRows ?? [], memberRows ?? [], profileRows ?? []);

    setItems(nextItems);
    setComments(Object.fromEntries(nextItems.map((item) => [item.id, item.adminComment])));
    setMessage(nextItems.length > 0 ? "交通費申請を同期しました。" : "この月の交通費申請はありません。");
  }, [supabase, targetMonth]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    if (!supabase) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
      setMessage("デモ表示のステータスを更新しました。");
      return;
    }

    setSavingId(id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("transportation_expenses")
      .update({
        status,
        admin_comment: comments[id]?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData.user?.id ?? null
      })
      .eq("id", id);

    setSavingId(null);

    if (error) {
      setMessage(`交通費の更新に失敗しました: ${error.message}`);
      return;
    }

    setMessage(status === "approved" ? "交通費を承認しました。" : "交通費を差戻ししました。");
    await loadExpenses();
  }

  const submittedCount = items.filter((item) => item.status === "submitted").length;
  const approvedTotal = items.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">交通費</p>
          <h1>交通費確認</h1>
          <p className="muted">{message}</p>
        </div>
        <MonthNav basePath="/admin/expenses" month={targetMonth} />
      </div>

      <div className="grid three admin-summary">
        <div className="summary-tile warn">
          <span>承認待ち</span>
          <strong>{submittedCount}件</strong>
        </div>
        <div className="summary-tile">
          <span>表示中の申請</span>
          <strong>{items.length}件</strong>
        </div>
        <div className="summary-tile">
          <span>承認済み交通費</span>
          <strong>{yen(approvedTotal)}</strong>
        </div>
      </div>

      <div className="list admin-expense-list">
        {items.map((item) => (
          <section className="list-item admin-expense-item" key={item.id}>
            <div className="row admin-expense-head">
              <div>
                <h3>{formatDate(item.workDate)} {item.memberName}</h3>
                <p className="muted">{item.title} {item.storeName}</p>
              </div>
              <ExpenseBadge status={item.status} />
            </div>

            <div className="admin-expense-detail">
              <div>
                <span>申請額</span>
                <strong>{yen(item.amount)}</strong>
              </div>
              <div>
                <span>申請日時</span>
                <strong>{formatDateTime(item.submittedAt)}</strong>
              </div>
              <div>
                <span>確認日時</span>
                <strong>{formatDateTime(item.reviewedAt)}</strong>
              </div>
            </div>

            <p className="admin-expense-route">{item.routeMemo || "経路メモなし"}</p>

            <label className="field admin-expense-comment">
              <span>管理者コメント</span>
              <textarea
                value={comments[item.id] ?? ""}
                onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))}
                placeholder="差戻し理由や確認メモ"
              />
            </label>

            <div className="admin-expense-actions">
              <button
                className="button secondary"
                type="button"
                disabled={savingId === item.id}
                onClick={() => void updateStatus(item.id, "approved")}
              >
                承認する
              </button>
              <button
                className="button ghost"
                type="button"
                disabled={savingId === item.id}
                onClick={() => void updateStatus(item.id, "rejected")}
              >
                差戻し
              </button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
