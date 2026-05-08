import { candidateMembers, yen } from "@/lib/mock-data";

export default function AdminMembersPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">メンバー</p>
          <h1>メンバー管理</h1>
        </div>
        <button className="button">新規作成</button>
      </div>
      <div className="list">
        {candidateMembers.map((member) => (
          <section className="list-item row" key={member.id}>
            <div>
              <h3>{member.name}</h3>
              <p className="muted">基本日当：{yen(member.baseDailyRate)}</p>
            </div>
            <span className="badge ok">active</span>
          </section>
        ))}
      </div>
    </>
  );
}
