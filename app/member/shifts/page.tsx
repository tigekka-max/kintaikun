"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save } from "lucide-react";
import { MonthNav } from "@/components/month-nav";
import { dateFromMonthDay, monthEnd, monthLabel, monthStart, normalizeMonth, operatingDaysForMonth } from "@/lib/month";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Availability = "yes" | "no";
type SaveStatus = "idle" | "loading" | "saved" | "error" | "demo";

export default function MemberShiftsPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中...</p>}>
      <MemberShiftsContent />
    </Suspense>
  );
}

function MemberShiftsContent() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const operatingDays = useMemo(() => operatingDaysForMonth(targetMonth), [targetMonth]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<number, Availability>>({});
  const [status, setStatus] = useState<SaveStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState("");
  const unanswered = useMemo(() => operatingDays.filter((day) => !values[day.day]).length, [operatingDays, values]);
  const yesCount = useMemo(() => operatingDays.filter((day) => values[day.day] === "yes").length, [operatingDays, values]);
  const isSubmitted = unanswered === 0 && Object.keys(values).length > 0;

  useEffect(() => {
    if (!supabase) {
      setStatus("demo");
      setMessage("Supabase未接続のため、デモ入力として動作しています。");
      return;
    }

    const client = supabase;
    let active = true;

    async function loadShift() {
      setStatus("loading");
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        if (!active) return;
        setStatus("demo");
        setMessage("ログインしていないため、デモ入力として動作しています。");
        return;
      }

      const { data: member, error: memberError } = await client
        .from("members")
        .select("id")
        .eq("profile_id", userData.user.id)
        .single();

      if (memberError || !member) {
        if (!active) return;
        setStatus("error");
        setMessage("メンバー情報が見つかりません。管理者に確認してください。");
        return;
      }

      const { data: rows, error: shiftError } = await client
        .from("shift_availabilities")
        .select("work_date,availability")
        .eq("member_id", member.id)
        .gte("work_date", monthStart(targetMonth))
        .lte("work_date", monthEnd(targetMonth));

      if (!active) return;

      if (shiftError) {
        setStatus("error");
        setMessage(`シフトの取得に失敗しました: ${shiftError.message}`);
        return;
      }

      setMemberId(member.id);
      setValues(Object.fromEntries((rows ?? []).map((row) => [Number(String(row.work_date).slice(-2)), row.availability as Availability])));
      setStatus("idle");
      setMessage("");
    }

    loadShift();

    return () => {
      active = false;
    };
  }, [supabase, targetMonth]);

  function setAll(value: Availability) {
    setValues(Object.fromEntries(operatingDays.map((day) => [day.day, value])));
  }

  function setWeekendsYes() {
    setValues(Object.fromEntries(operatingDays.map((day) => [day.day, "yes"])));
  }

  async function saveShift() {
    if (unanswered > 0) return;

    if (!supabase || !memberId) {
      setStatus("demo");
      setMessage("デモ入力を保存済みにしました。Supabase接続後はDBへ保存されます。");
      return;
    }

    setStatus("loading");
    const rows = operatingDays.map((day) => ({
      member_id: memberId,
      work_date: dateFromMonthDay(targetMonth, day.day),
      availability: values[day.day],
      submitted_at: new Date().toISOString()
    }));

    const { error } = await supabase.from("shift_availabilities").upsert(rows, {
      onConflict: "member_id,work_date"
    });

    if (error) {
      setStatus("error");
      setMessage(`シフトの保存に失敗しました: ${error.message}`);
      return;
    }

    setStatus("saved");
    setMessage("シフトを保存しました。");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)} / 土日祝のみ</p>
          <h1>シフト提出</h1>
        </div>
        <MonthNav basePath="/member/shifts" month={targetMonth} />
      </div>
      <span className={`badge ${isSubmitted ? "ok" : "warn"}`}>{isSubmitted ? "保存済み" : "未提出"}</span>

      <section className="card member-shift-summary" style={{ marginTop: 14 }}>
        <div className="member-metric-grid">
          <div className="metric"><span className="muted">YES</span><strong>{yesCount}日</strong></div>
          <div className="metric"><span className="muted">未回答</span><strong>{unanswered}日</strong></div>
        </div>
        <div className="member-action-row">
          <button className="button secondary" onClick={setWeekendsYes}>すべてYES</button>
          <button className="button ghost" onClick={() => setAll("no")}>全日NO</button>
        </div>
      </section>

      <section className="card stack">
        <div className="member-shift-list">
          {operatingDays.map((day) => (
            <div key={day.day} className="member-shift-row">
              <div>
                <strong className={day.weekend ? "weekend" : ""}>{day.label}</strong>
                <span>{values[day.day] ? "回答済み" : "未回答"}</span>
              </div>
              <div className="segmented">
                <button className={`segment ${values[day.day] === "yes" ? "active" : ""}`} onClick={() => setValues((current) => ({ ...current, [day.day]: "yes" }))}>
                  YES
                </button>
                <button className={`segment ${values[day.day] === "no" ? "active" : ""}`} onClick={() => setValues((current) => ({ ...current, [day.day]: "no" }))}>
                  NO
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="button" disabled={unanswered > 0 || status === "loading"} onClick={saveShift}>
          <Save size={18} />
          {status === "loading" ? "保存中" : "保存する"}
        </button>
        {unanswered > 0 && <p className="muted">表示されている土日祝すべてでYES/NOを選択してください。</p>}
        {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}
      </section>
    </>
  );
}
