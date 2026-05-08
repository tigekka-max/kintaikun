import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel card">
        <p className="eyebrow">PWAプロトタイプ</p>
        <h1>稼働管理</h1>
        <p className="muted">シフト提出、案件割当、交通費精算をまとめて管理します。</p>
        <LoginForm />
      </section>
    </main>
  );
}
