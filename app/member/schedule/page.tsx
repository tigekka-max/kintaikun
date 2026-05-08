import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ExpenseBadge } from "@/components/status-badge";
import { assignments, yen } from "@/lib/mock-data";

export default function MemberSchedulePage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">2026年6月</p>
          <h1>予定</h1>
        </div>
      </div>
      <section className="card">
        <div className="grid two">
          <div className="metric"><span className="muted">確定稼働</span><strong>{assignments.length}日</strong></div>
          <div className="metric"><span className="muted">見込み日当</span><strong>{yen(assignments.reduce((sum, item) => sum + item.dailyRate, 0))}</strong></div>
        </div>
      </section>
      <div className="list" style={{ marginTop: 14 }}>
        {assignments.map((assignment) => (
          <Link key={assignment.id} href={`/member/schedule/${assignment.id}`} className="list-item">
            <div className="row">
              <div>
                <h3>{assignment.labelDate} {assignment.projectTitle}</h3>
                <p className="muted">{assignment.storeName}</p>
                <p>集合 {assignment.meetingTime} / 日当 {yen(assignment.dailyRate)}</p>
              </div>
              <ChevronRight size={20} />
            </div>
            <ExpenseBadge status={assignment.expenseStatus} />
          </Link>
        ))}
      </div>
    </>
  );
}
