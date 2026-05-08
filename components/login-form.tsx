"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginStatus = "idle" | "loading" | "demo" | "error";

export function LoginForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>(supabase ? "idle" : "demo");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    if (!supabase) {
      setStatus("demo");
      setMessage("Supabase環境変数が未設定のため、デモ画面で確認できます。");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setStatus("error");
      setMessage(error?.message ?? "ログインに失敗しました。");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile || profile.status !== "active") {
      await supabase.auth.signOut();
      setStatus("error");
      setMessage("有効なプロフィールが見つかりません。管理者に確認してください。");
      return;
    }

    router.push(profile.role === "admin" ? "/admin" : "/member");
  }

  return (
    <div className="form" style={{ marginTop: 20 }}>
      <div className="field">
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          placeholder="member@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          placeholder="********"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <button className="button" type="button" onClick={handleLogin} disabled={status === "loading"}>
        <LogIn size={18} />
        {status === "loading" ? "ログイン中" : "ログイン"}
      </button>
      {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}
      <div className="grid two">
        <Link href="/member" className="button secondary">
          メンバー画面デモ
        </Link>
        <Link href="/admin" className="button secondary">
          管理者画面デモ
        </Link>
      </div>
    </div>
  );
}
