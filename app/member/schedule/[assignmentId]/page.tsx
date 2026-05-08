import Link from "next/link";
import { MapPin, ReceiptText } from "lucide-react";
import { ExpenseBadge } from "@/components/status-badge";
import { assignments, yen } from "@/lib/mock-data";

export default async function MemberScheduleDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = assignments.find((item) => item.id === assignmentId) ?? assignments[0];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">現場詳細</p>
          <h1>{assignment.projectTitle}</h1>
        </div>
        <ExpenseBadge status={assignment.expenseStatus} />
      </div>

      <section className="card stack">
        <div><span className="muted">日付</span><p>{assignment.labelDate}</p></div>
        <div><span className="muted">店舗</span><p>{assignment.storeName}</p></div>
        <div><span className="muted">住所</span><p>{assignment.address}</p></div>
        <div><span className="muted">集合/稼働</span><p>{assignment.meetingTime} / {assignment.workTime}</p></div>
        <div><span className="muted">休憩</span><p>{assignment.breakMinutes}分</p></div>
        <div><span className="muted">日当</span><p>{yen(assignment.dailyRate)}</p></div>
        <div><span className="muted">管理者メモ</span><p>{assignment.memo}</p></div>
        <a className="button secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.address)}`} target="_blank">
          <MapPin size={18} />
          地図で開く
        </a>
        {assignment.expenseStatus === "unsubmitted" || assignment.expenseStatus === "rejected" ? (
          <Link className="button" href={`/member/expenses/${assignment.id}`}>
            <ReceiptText size={18} />
            交通費を申請する
          </Link>
        ) : (
          <p>交通費：{yen(assignment.expenseAmount)}（<ExpenseBadge status={assignment.expenseStatus} />）</p>
        )}
      </section>
    </>
  );
}
