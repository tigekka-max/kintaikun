import Link from "next/link";
import { AlertCircle, CalendarDays, ChevronRight, ReceiptText } from "lucide-react";
import { assignments, member, yen } from "@/lib/mock-data";

export default function MemberHomePage() {
  const nextAssignment = assignments[0];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">こんにちは、{member.name}さん</p>
          <h1>ホーム</h1>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <div className="row">
            <h2>次回稼働</h2>
            <span className="badge ok">確定</span>
          </div>
          <h3>{nextAssignment.labelDate} {nextAssignment.projectTitle}</h3>
          <p className="muted">{nextAssignment.storeName}</p>
          <p>集合 {nextAssignment.meetingTime} / 稼働 {nextAssignment.workTime}</p>
          <p>日当 {yen(nextAssignment.dailyRate)}</p>
          <Link className="button secondary" href={`/member/schedule/${nextAssignment.id}`}>
            詳細を見る
            <ChevronRight size={18} />
          </Link>
        </section>

        <section className="card">
          <h2>やること</h2>
          <div className="list">
            <Link className="list-item row" href="/member/shifts">
              <span><CalendarDays size={18} /> 翌月シフトが未提出です</span>
              <ChevronRight size={18} />
            </Link>
            <Link className="list-item row" href="/member/schedule">
              <span><ReceiptText size={18} /> 交通費未申請が1件あります</span>
              <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="row">
            <h2>今月の見込み</h2>
            <AlertCircle size={18} color="var(--warning)" />
          </div>
          <div className="grid two">
            <div className="metric"><span className="muted">稼働日数</span><strong>{member.monthlyWorkDays}日</strong></div>
            <div className="metric"><span className="muted">支払見込み</span><strong>{yen(member.paymentTotal)}</strong></div>
          </div>
          <Link className="button secondary" href="/member/settlements" style={{ marginTop: 14 }}>
            精算を見る
          </Link>
        </section>
      </div>
    </>
  );
}
