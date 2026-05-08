"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { operatingShiftDays } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Availability = "yes" | "no";
type SaveStatus = "idle" | "loading" | "saved" | "error" | "demo";

const targetYear = 2026;
const targetMonth = 6;

export default function MemberShiftsPage() {
  const supabase = createSupabaseBrowserClient();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<number, Availability>>({});
  const [status, setStatus] = useState<SaveStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState("");
  const unanswered = useMemo(() => operatingShiftDays.filter((day) => !values[day.day]).length, [values]);
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

      const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
      const endDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-30`;
      const { data: rows, error: shiftError } = await client
        .from("shift_availabilities")
        .select("work_date,availability")
        .eq("member_id", member.id)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      if (!active) return;

      if (shiftError) {
        setStatus("error");
        setMessage("シフトの取得に失敗しました。");
        return;
      }

      setMemberId(member.id);
      setValues(
        Object.fromEntries(
          (rows ?? []).map((row) => [Number(String(row.work_date).slice(-2)), row.availability as Availability])
        )
      );
      setStatus("idle");
      setMessage("");
    }

    loadShift();

    return () => {
      active = false;
    };
  }, [supabase]);

  function setAll(value: Availability) {
    setValues(Object.fromEntries(operatingShiftDays.map((day) => [day.day, value])));
  }

  function setWeekendsYes() {
    setValues(Object.fromEntries(operatingShiftDays.map((day) => [day.day, "yes"])));
  }

  async function saveShift() {
    if (unanswered > 0) return;

    if (!supabase || !memberId) {
      setStatus("demo");
      setMessage("デモ入力を保存した状態にしました。Supabase接続後はDBへ保存されます。");
      return;
    }

    setStatus("loading");
    const rows = operatingShiftDays.map((day) => ({
      member_id: memberId,
      work_date: `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`,
      availability: values[day.day],
      submitted_at: new Date().toISOString()
    }));

    const { error } = await supabase.from("shift_availabilities").upsert(rows, {
      onConflict: "member_id,work_date"
    });

    if (error) {
      setStatus("error");
      setMessage("シフトの保存に失敗しました。");
      return;
    }

    setStatus("saved");
    setMessage("シフトを保存しました。");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{targetYear}年{targetMonth}月 / 土日祝のみ</p>
          <h1>シフト提出</h1>
        </div>
        <span className={`badge ${isSubmitted ? "ok" : "warn"}`}>{isSubmitted ? "保存済み" : "未提出"}</span>
      </div>

      <section className="card stack">
        <div className="row">
          <button className="button secondary" onClick={setWeekendsYes}>すべてYES</button>
          <button className="button ghost" onClick={() => setAll("no")}>全日NO</button>
        </div>
        <p className="muted">稼働対象の土日祝だけを入力してください。平日は表示しません。</p>
        <div className="list">
          {operatingShiftDays.map((day) => (
            <div key={day.day} className="shift-row">
              <span className={day.weekend ? "weekend" : ""}>{day.label}</span>
              <div className="segmented">
                <button
                  className={`segment ${values[day.day] === "yes" ? "active" : ""}`}
                  onClick={() => setValues((current) => ({ ...current, [day.day]: "yes" }))}
                >
                  YES
                </button>
                <button
                  className={`segment ${values[day.day] === "no" ? "active" : ""}`}
                  onClick={() => setValues((current) => ({ ...current, [day.day]: "no" }))}
                >
                  NO
                </button>
              </div>
              {!values[day.day] && <span className="badge">未回答</span>}
            </div>
          ))}
        </div>
        <button className="button" disabled={unanswered > 0 || status === "loading"} onClick={saveShift}>
          <Save size={18} />
          {status === "loading" ? "保存中" : "保存する"}
        </button>
        {unanswered > 0 && <p className="muted">未回答：{unanswered}日。表示されている土日祝すべてでYES/NOを選択してください。</p>}
        {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}
      </section>
    </>
  );
}
