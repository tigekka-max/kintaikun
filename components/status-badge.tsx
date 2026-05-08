import type { ExpenseStatus } from "@/lib/mock-data";

const labels: Record<ExpenseStatus, string> = {
  unsubmitted: "未申請",
  submitted: "申請済み",
  approved: "承認済み",
  rejected: "差戻し"
};

export function ExpenseBadge({ status }: { status: ExpenseStatus }) {
  const tone = status === "approved" ? "ok" : status === "submitted" ? "warn" : status === "rejected" ? "danger" : "";
  return <span className={`badge ${tone}`}>{labels[status]}</span>;
}
