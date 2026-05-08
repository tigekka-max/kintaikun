import { Send } from "lucide-react";
import { assignments } from "@/lib/mock-data";

export default async function ExpenseNewPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = assignments.find((item) => item.id === assignmentId) ?? assignments[0];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">交通費申請</p>
          <h1>{assignment.labelDate}</h1>
        </div>
      </div>
      <section className="card">
        <p>{assignment.projectTitle} {assignment.storeName}</p>
        <form className="form">
          <div className="field">
            <label htmlFor="amount">交通費合計</label>
            <input id="amount" type="number" min="0" placeholder="1400" />
          </div>
          <div className="field">
            <label htmlFor="route">経路メモ</label>
            <textarea id="route" placeholder="自宅最寄り駅 → 新宿駅 → 店舗" />
          </div>
          <p className="muted">往復合計金額を入力してください。</p>
          <button className="button" type="button">
            <Send size={18} />
            申請する
          </button>
        </form>
      </section>
    </>
  );
}
