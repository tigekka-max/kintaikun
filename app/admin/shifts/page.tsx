import { operatingShiftDays } from "@/lib/mock-data";

const members = [
  { name: "山田太郎", assigned: 5, target: 6, area: "東京・神奈川" },
  { name: "佐藤花子", assigned: 4, target: 5, area: "東京" },
  { name: "鈴木一郎", assigned: 6, target: 6, area: "埼玉・東京" },
  { name: "高橋健", assigned: 2, target: 4, area: "神奈川" },
  { name: "田中次郎", assigned: 0, target: 3, area: "東京・千葉" }
];

export default function AdminShiftsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">2026年6月</p>
          <h1>スタッフ別シフト</h1>
        </div>
        <div className="admin-actions">
          <div className="segmented">
            <button className="segment active">スタッフ別</button>
            <button className="segment">未回答</button>
            <button className="segment">日付別</button>
          </div>
          <button className="button secondary">CSV</button>
        </div>
      </div>

      <section className="admin-summary">
        <div className="grid three">
          <div className="summary-tile"><span>提出済み</span><strong>12/15人</strong></div>
          <div className="summary-tile"><span>YES合計</span><strong>42日</strong></div>
          <div className="summary-tile warn"><span>未回答</span><strong>3人</strong></div>
        </div>
      </section>

      <section className="shift-toolbar">
        <div className="field">
              <label htmlFor="staff-search">スタッフ検索</label>
          <input id="staff-search" placeholder="名前・エリアで検索" />
        </div>
        <div className="field">
          <label htmlFor="staff-filter">表示</label>
          <select id="staff-filter" defaultValue="all">
            <option value="all">全スタッフ</option>
            <option value="missing">未回答あり</option>
            <option value="short">割当不足</option>
          </select>
        </div>
      </section>

      <div className="staff-shift-table">
        <div className="staff-shift-table-head">
          <div>スタッフ</div>
          <div>提出状況</div>
          <div>月間可否</div>
          <div>操作</div>
        </div>
        {members.map((member, memberIndex) => {
          const availability = operatingShiftDays.map((day) => ({
            ...day,
            value: (day.day + memberIndex) % 5 === 0 ? "未" : (day.day + memberIndex) % 3 !== 0 ? "YES" : "NO"
          }));
          const yesCount = availability.filter((day) => day.value === "YES").length;
          const noCount = availability.filter((day) => day.value === "NO").length;
          const missingCount = availability.filter((day) => day.value === "未").length;
          const allocationTone = member.assigned >= member.target ? "ok" : member.assigned === 0 ? "danger" : "warn";

          return (
            <section className="staff-shift-row-card" key={member.name}>
              <div className="staff-profile">
                <div className="avatar">{member.name.slice(0, 1)}</div>
                <div>
                  <h2>{member.name}</h2>
                  <p>{member.area}</p>
                </div>
              </div>

              <div className="staff-status-stack">
                <span className="status-line"><strong>{yesCount}</strong> YES / <strong>{noCount}</strong> NO</span>
                <span className={`badge ${allocationTone}`}>割当 {member.assigned}/{member.target}日</span>
                {missingCount > 0 ? <span className="badge warn">未回答 {missingCount}日</span> : <span className="badge ok">回答完了</span>}
              </div>

              <div className="staff-shift-calendar" aria-label={`${member.name}の月間シフト`}>
                {availability.map((day) => (
                  <button className={`staff-shift-day ${day.weekend ? "weekend-cell" : ""}`} key={day.day} title={`${day.label} ${day.value}`}>
                    <span className="staff-shift-date">{day.day}</span>
                    <span className={`staff-shift-value ${day.value === "YES" ? "yes" : day.value === "NO" ? "no" : "missing"}`}>
                      {day.value}
                    </span>
                  </button>
                ))}
              </div>

              <div className="staff-row-actions">
                <button className="button secondary">割当へ</button>
                <button className="button ghost">編集</button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
