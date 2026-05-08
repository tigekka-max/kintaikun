import { operatingShiftDays, projects, yen } from "@/lib/mock-data";

const staff = [
  { id: "m1", name: "山田太郎", area: "東京・神奈川", yesDays: [6, 7, 13, 14, 20, 21], assigned: 3, target: 6, rate: 12000 },
  { id: "m2", name: "佐藤花子", area: "東京", yesDays: [7, 14, 21, 28], assigned: 2, target: 4, rate: 12000 },
  { id: "m3", name: "鈴木一郎", area: "埼玉・東京", yesDays: [6, 13, 20, 27, 28], assigned: 4, target: 5, rate: 13000 },
  { id: "m4", name: "高橋健", area: "神奈川", yesDays: [7, 13, 21], assigned: 1, target: 3, rate: 12000 }
];

const selectedStaff = staff[0];
const selectedDay = operatingShiftDays[0];
const dayProjects = projects.filter((project) => project.date.startsWith(`6/${selectedDay.day}`));
const fallbackProjects = dayProjects.length > 0 ? dayProjects : projects.slice(0, 2);

export default function AdminAssignmentsIndexPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">2026年6月 / 土日祝のみ</p>
          <h1>スタッフ起点の割当</h1>
        </div>
        <div className="admin-actions">
          <button className="button secondary">下書き保存</button>
          <button className="button">確定する</button>
        </div>
      </div>

      <section className="assignment-board">
        <aside className="assignment-panel staff-picker">
          <div className="panel-head">
            <h2>スタッフ</h2>
            <span className="badge">YES順</span>
          </div>
          <div className="field compact-field">
            <label htmlFor="assignment-staff-search">検索</label>
            <input id="assignment-staff-search" placeholder="名前・エリア" />
          </div>
          <div className="staff-pick-list">
            {staff.map((person) => {
              const active = person.id === selectedStaff.id;
              const shortage = person.target - person.assigned;
              return (
                <button className={`staff-pick-item ${active ? "active" : ""}`} key={person.id}>
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.area}</span>
                  </div>
                  <div className="staff-pick-meta">
                    <span className="badge ok">YES {person.yesDays.length}日</span>
                    <span className={`badge ${shortage > 0 ? "warn" : "ok"}`}>割当 {person.assigned}/{person.target}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="assignment-panel availability-panel">
          <div className="panel-head">
            <div>
              <h2>{selectedStaff.name}</h2>
              <p className="muted">基本日当 {yen(selectedStaff.rate)} / 対応エリア {selectedStaff.area}</p>
            </div>
            <span className="badge warn">あと{selectedStaff.target - selectedStaff.assigned}日</span>
          </div>

          <div className="availability-list">
            {operatingShiftDays.map((day) => {
              const yes = selectedStaff.yesDays.includes(day.day);
              const active = day.day === selectedDay.day;
              return (
                <button className={`availability-day ${active ? "active" : ""} ${yes ? "" : "disabled"}`} key={day.day} disabled={!yes}>
                  <span>{day.label}</span>
                  <strong>{yes ? "YES" : "NO"}</strong>
                  <small>{yes ? "未割当案件あり" : "割当不可"}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="assignment-panel project-match-panel">
          <div className="panel-head">
            <div>
              <h2>{selectedDay.label} の案件</h2>
              <p className="muted">YESの日だけ割当できます</p>
            </div>
          </div>

          <div className="project-match-list">
            {fallbackProjects.map((project) => {
              const remaining = Math.max(project.requiredPeople - project.assignedPeople, 0);
              return (
                <article className="project-match-item" key={project.id}>
                  <div>
                    <h3>{project.title}</h3>
                    <p className="muted">{project.storeName}</p>
                  </div>
                  <div className="project-match-meta">
                    <span className={`badge ${remaining > 0 ? "warn" : "ok"}`}>
                      必要 {project.requiredPeople} / 割当 {project.assignedPeople}
                    </span>
                    <span>{yen(project.dailyRate)}</span>
                  </div>
                  <div className="project-rate-row">
                    <label htmlFor={`rate-${project.id}`}>割当日当</label>
                    <input id={`rate-${project.id}`} defaultValue={project.dailyRate} inputMode="numeric" />
                    <button className="button secondary" disabled={remaining === 0}>
                      割当
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </>
  );
}
