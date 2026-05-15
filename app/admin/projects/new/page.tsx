"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminProjectNewPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error" | "demo">(supabase ? "idle" : "demo");
  const [message, setMessage] = useState(supabase ? "" : "Supabase未接続のため、保存操作はデモ扱いです。");

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!supabase) {
      setStatus("demo");
      setMessage("デモ保存しました。Supabase接続後はDBへ保存されます。");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setStatus("error");
      setMessage("ログイン状態を確認できません。管理者アカウントでログインし直してください。");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
      setStatus("error");
      setMessage("このユーザーは有効な管理者として登録されていません。profiles の role/status を確認してください。");
      return;
    }

    const { error } = await supabase.from("projects").insert({
      work_date: String(formData.get("work_date")),
      title: String(formData.get("title")),
      store_name: String(formData.get("store_name")),
      address: String(formData.get("address") || ""),
      required_people: Number(formData.get("required_people") || 1),
      project_daily_rate: Number(formData.get("project_daily_rate") || 0),
      meeting_time: String(formData.get("meeting_time") || "09:40"),
      start_time: String(formData.get("start_time") || "10:00"),
      end_time: String(formData.get("end_time") || "18:00"),
      break_minutes: Number(formData.get("break_minutes") || 60),
      memo: String(formData.get("memo") || ""),
      status: "active",
      created_by: userData.user.id
    });

    if (error) {
      setStatus("error");
      setMessage(`案件の保存に失敗しました: ${error.message}`);
      return;
    }

    setStatus("saved");
    setMessage("案件を保存しました。");
    router.push("/admin/projects");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">案件管理</p>
          <h1>案件作成</h1>
        </div>
      </div>
      <section className="card">
        <form className="form" onSubmit={saveProject}>
          <div className="grid two">
            <div className="field"><label>稼働日</label><input name="work_date" type="date" defaultValue="2026-06-08" required /></div>
            <div className="field"><label>案件名</label><input name="title" placeholder="auイベント" required /></div>
            <div className="field"><label>店舗名</label><input name="store_name" placeholder="〇〇店" required /></div>
            <div className="field"><label>住所</label><input name="address" placeholder="東京都..." /></div>
            <div className="field"><label>必要人数</label><input name="required_people" type="number" min="1" defaultValue="2" required /></div>
            <div className="field"><label>案件日当</label><input name="project_daily_rate" type="number" min="0" defaultValue="12000" required /></div>
            <div className="field"><label>集合時間</label><input name="meeting_time" type="time" defaultValue="09:40" required /></div>
            <div className="field"><label>稼働開始</label><input name="start_time" type="time" defaultValue="10:00" required /></div>
            <div className="field"><label>稼働終了</label><input name="end_time" type="time" defaultValue="18:00" required /></div>
            <div className="field"><label>休憩</label><input name="break_minutes" type="number" min="0" defaultValue="60" required /></div>
          </div>
          <div className="field"><label>管理者メモ</label><textarea name="memo" placeholder="入口前で集合..." /></div>
          <button className="button" type="submit" disabled={status === "loading"}>{status === "loading" ? "保存中" : "保存"}</button>
          {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}
        </form>
      </section>
    </>
  );
}
