import Link from "next/link";
import { adminStats, yen } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">2026年6月</p>
          <h1>管理ダッシュボード</h1>
        </div>
      </div>
      <div className="grid three">
        <section className="card metric">
          <span className="muted">シフト提出</span>
          <strong>{adminStats.submittedMembers}/{adminStats.totalMembers}人</strong>
          <Link className="button secondary" href="/admin/shifts">シフトを見る</Link>
        </section>
        <section className="card metric">
          <span className="muted">未割当案件</span>
          <strong>{adminStats.unassignedProjects}件</strong>
          <Link className="button secondary" href="/admin/projects">割当する</Link>
        </section>
        <section className="card metric">
          <span className="muted">交通費申請</span>
          <strong>{adminStats.submittedExpenses}件</strong>
          <Link className="button secondary" href="/admin/expenses">確認する</Link>
        </section>
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <div>
            <p className="eyebrow">今月支払見込み</p>
            <h2>{yen(adminStats.paymentTotal)}</h2>
          </div>
          <Link className="button" href="/admin/settlements">精算を見る</Link>
        </div>
      </section>
    </>
  );
}
