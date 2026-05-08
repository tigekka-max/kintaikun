"use client";

import { Download } from "lucide-react";
import { downloadSettlementCsv } from "@/lib/csv";
import { settlementRows, yen } from "@/lib/mock-data";

export default function AdminSettlementsPage() {
  const total = settlementRows.reduce(
    (sum, row) => ({
      workDays: sum.workDays + row.workDays,
      daily: sum.daily + row.dailyRateTotal,
      transportation: sum.transportation + row.transportationTotal,
      payment: sum.payment + row.paymentTotal,
      pending: sum.pending + row.pendingExpenses
    }),
    { workDays: 0, daily: 0, transportation: 0, payment: 0, pending: 0 }
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">2026年6月</p>
          <h1>精算</h1>
        </div>
        <button className="button" onClick={downloadSettlementCsv}>
          <Download size={18} />
          サマリーCSV
        </button>
      </div>
      <section className="card">
        <div className="grid three">
          <div className="metric"><span className="muted">稼働日数合計</span><strong>{total.workDays}日</strong></div>
          <div className="metric"><span className="muted">交通費合計</span><strong>{yen(total.transportation)}</strong></div>
          <div className="metric"><span className="muted">支払合計</span><strong>{yen(total.payment)}</strong></div>
        </div>
        {total.pending > 0 && <p className="muted" style={{ marginTop: 12 }}>未承認交通費：{total.pending}件</p>}
      </section>
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>メンバー</th>
              <th>稼働</th>
              <th>日当</th>
              <th>交通費</th>
              <th>支払</th>
              <th>未承認</th>
            </tr>
          </thead>
          <tbody>
            {settlementRows.map((row) => (
              <tr key={row.memberName}>
                <td>{row.memberName}</td>
                <td>{row.workDays}日</td>
                <td>{yen(row.dailyRateTotal)}</td>
                <td>{yen(row.transportationTotal)}</td>
                <td>{yen(row.paymentTotal)}</td>
                <td>{row.pendingExpenses}件</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="button secondary" style={{ marginTop: 14 }}>月次確定</button>
    </>
  );
}
