import { settlementRows } from "@/lib/mock-data";

export function downloadSettlementCsv() {
  const header = ["対象月", "メンバー名", "稼働日数", "日当合計", "交通費合計", "支払合計", "申請中交通費件数"];
  const rows = settlementRows.map((row) => [
    "2026-06",
    row.memberName,
    row.workDays,
    row.dailyRateTotal,
    row.transportationTotal,
    row.paymentTotal,
    row.pendingExpenses
  ]);
  const csv = [header, ...rows].map((cols) => cols.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "settlements-2026-06.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
