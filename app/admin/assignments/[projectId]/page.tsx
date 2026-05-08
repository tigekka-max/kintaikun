import { candidateMembers, projects, yen } from "@/lib/mock-data";

export default async function AdminAssignmentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  const remaining = Math.max(project.requiredPeople - project.assignedPeople, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">割当管理</p>
          <h1>{project.date} {project.title}</h1>
          <p className="muted">{project.storeName}</p>
        </div>
        <span className={`badge ${project.status === "confirmed" ? "ok" : "warn"}`}>{project.status === "confirmed" ? "確定済み" : "下書き"}</span>
      </div>
      <div className="grid two">
        <section className="card">
          <h2>割当済み</h2>
          <p>必要人数：{project.requiredPeople} / 割当済み：{project.assignedPeople}</p>
          {project.assignedPeople > 0 ? (
            <div className="list-item row">
              <span>山田太郎</span>
              <span>{yen(project.dailyRate)}</span>
              <button className="button ghost">解除</button>
            </div>
          ) : (
            <p className="muted">まだ割当がありません。</p>
          )}
        </section>
        <section className="card">
          <h2>候補メンバー</h2>
          <p className="muted">シフトYESのみ表示しています。</p>
          <div className="list">
            {candidateMembers.map((member) => (
              <div className="list-item row" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <p className="muted">基本日当：{yen(member.baseDailyRate)}</p>
                </div>
                <button className="button secondary">割当</button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <span>必要人数まであと{remaining}人</span>
          <button className="button">割当を確定する</button>
        </div>
      </section>
    </>
  );
}
