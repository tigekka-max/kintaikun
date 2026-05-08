import { ExpenseBadge } from "@/components/status-badge";
import { assignments, member, yen } from "@/lib/mock-data";

export default function MemberSettlementsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">2026年6月</p>
          <h1>精算</h1>
        </div>
        <span className="badge warn">見込み</span>
      </div>
      <section className="card">
        <div className="grid two">
          <div className="metric"><span className="muted">稼働日数</span><strong>{member.monthlyWorkDays}日</strong></div>
          <div className="metric"><span className="muted">支払合計</span><strong>{yen(member.paymentTotal)}</strong></div>
          <div className="metric"><span className="muted">日当合計</span><strong>{yen(member.dailyRateTotal)}</strong></div>
          <div className="metric"><span className="muted">交通費合計</span><strong>{yen(member.transportationTotal)}</strong></div>
        </div>
      </section>
      <div className="list" style={{ marginTop: 14 }}>
        {assignments.map((item) => (
          <div className="list-item" key={item.id}>
            <div className="row">
              <h3>{item.labelDate} {item.projectTitle}</h3>
              <ExpenseBadge status={item.expenseStatus} />
            </div>
            <p className="muted">{item.storeName}</p>
            <p>日当 {yen(item.dailyRate)} / 交通費 {yen(item.expenseAmount)}</p>
            <strong>小計 {yen(item.dailyRate + item.expenseAmount)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
