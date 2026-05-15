"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { assignments as mockAssignments } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ExpenseFormState = {
  labelDate: string;
  projectTitle: string;
  storeName: string;
  amount: number | "";
  routeMemo: string;
};

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error" | "demo";

function mockState(assignmentId: string): ExpenseFormState {
  const assignment = mockAssignments.find((item) => item.id === assignmentId) ?? mockAssignments[0];
  return {
    labelDate: assignment.labelDate,
    projectTitle: assignment.projectTitle,
    storeName: assignment.storeName,
    amount: assignment.expenseAmount || "",
    routeMemo: ""
  };
}

export default function ExpenseNewPage() {
  const router = useRouter();
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;
  const supabase = createSupabaseBrowserClient();
  const [form, setForm] = useState<ExpenseFormState>(() => mockState(assignmentId));
  const [memberId, setMemberId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(supabase ? "Supabaseの予定を確認しています。" : "Supabase未接続のため、デモ申請です。");

  useEffect(() => {
    if (!supabase) {
      setForm(mockState(assignmentId));
      return;
    }

    if (!isUuid(assignmentId)) {
      setStatus("error");
      setMessage("Supabase接続中です。交通費申請はDBのassignment IDから開いてください。");
      return;
    }

    const client = supabase;
    let active = true;

    async function loadExpenseTarget() {
      setStatus("loading");
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (!active) return;
        setStatus("error");
        setMessage("メンバーとしてログインしてください。");
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

      const { data: assignment, error: assignmentError } = await client
        .from("assignments")
        .select("id,project_id,member_id,status")
        .eq("id", assignmentId)
        .eq("member_id", member.id)
        .eq("status", "confirmed")
        .single();

      if (!active) return;

      if (assignmentError || !assignment) {
        setStatus("error");
        setMessage(`申請対象の予定が見つかりません: ${assignmentError?.message ?? "対象なし"}`);
        return;
      }

      const { data: project, error: projectError } = await client
        .from("projects")
        .select("title,work_date,store_name")
        .eq("id", assignment.project_id)
        .single();

      const { data: expense, error: expenseError } = await client
        .from("transportation_expenses")
        .select("amount,route_memo,status")
        .eq("assignment_id", assignmentId)
        .maybeSingle();

      if (!active) return;

      if (projectError || !project || expenseError) {
        setStatus("error");
        setMessage(`申請情報の取得に失敗しました: ${projectError?.message ?? expenseError?.message}`);
        return;
      }

      setMemberId(member.id);
      setForm({
        labelDate: formatDate(project.work_date),
        projectTitle: project.title,
        storeName: project.store_name,
        amount: expense?.amount ?? "",
        routeMemo: expense?.route_memo ?? ""
      });
      setStatus("idle");
      setMessage(expense ? "既存の交通費申請を編集できます。" : "");
    }

    loadExpenseTarget();

    return () => {
      active = false;
    };
  }, [assignmentId, supabase]);

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !memberId || !isUuid(assignmentId)) {
      setStatus("demo");
      setMessage("デモ申請を保存済みにしました。Supabase接続後はDBへ保存されます。");
      return;
    }

    const amount = Number(form.amount || 0);
    if (amount < 0) {
      setStatus("error");
      setMessage("交通費は0円以上で入力してください。");
      return;
    }

    setStatus("saving");
    const { error } = await supabase.from("transportation_expenses").upsert({
      assignment_id: assignmentId,
      member_id: memberId,
      amount,
      route_memo: form.routeMemo,
      status: "submitted",
      submitted_at: new Date().toISOString()
    }, {
      onConflict: "assignment_id"
    });

    if (error) {
      setStatus("error");
      setMessage(`交通費申請に失敗しました: ${error.message}`);
      return;
    }

    setStatus("saved");
    setMessage("交通費を申請しました。");
    router.push("/member/schedule");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">交通費申請</p>
          <h1>{form.labelDate}</h1>
        </div>
      </div>

      <section className="card stack">
        <div>
          <h2>{form.projectTitle}</h2>
          <p className="muted">{form.storeName}</p>
        </div>
        <form className="form" onSubmit={submitExpense}>
          <div className="field">
            <label htmlFor="amount">交通費合計</label>
            <input
              id="amount"
              type="number"
              min="0"
              placeholder="1400"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) || "" }))}
            />
          </div>
          <div className="field">
            <label htmlFor="route">経路メモ</label>
            <textarea
              id="route"
              placeholder="自宅最寄り駅 -> 新宿駅 -> 店舗"
              value={form.routeMemo}
              onChange={(event) => setForm((current) => ({ ...current, routeMemo: event.target.value }))}
            />
          </div>
          <p className="muted">往復合計金額を入力してください。</p>
          <button className="button" type="submit" disabled={status === "loading" || status === "saving"}>
            <Send size={18} />
            {status === "saving" ? "申請中" : "申請する"}
          </button>
          {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}
        </form>
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
