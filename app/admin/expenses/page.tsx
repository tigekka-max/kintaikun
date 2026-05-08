import { ExpenseBadge } from "@/components/status-badge";
import { assignments, yen } from "@/lib/mock-data";

export default function AdminExpensesPage() {
  const expenses = assignments.filter((item) => item.expenseStatus !== "unsubmitted");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">交通費</p>
          <h1>交通費確認</h1>
        </div>
      </div>
      <div className="list">
        {expenses.map((item) => (
          <section className="list-item" key={item.id}>
            <div className="row">
              <div>
                <h3>{item.labelDate} 山田太郎</h3>
                <p className="muted">{item.projectTitle} {item.storeName}</p>
                <p>{yen(item.expenseAmount)}</p>
              </div>
              <ExpenseBadge status={item.expenseStatus} />
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="button secondary">承認する</button>
              <button className="button ghost">差戻し</button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
