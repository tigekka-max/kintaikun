"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MonthNav } from "@/components/month-nav";
import { monthEnd, monthLabel, monthStart, normalizeMonth, operatingDaysForMonth } from "@/lib/month";
import { projects as mockProjects, yen } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Staff = {
  id: string;
  name: string;
  area: string;
  yesDays: number[];
  assigned: number;
  target: number;
  rate: number;
};

type AssignmentProject = {
  id: string;
  day: number;
  dateLabel: string;
  title: string;
  storeName: string;
  requiredPeople: number;
  assignedPeople: number;
  dailyRate: number;
  detailText: string;
};

type DraftAssignment = {
  id: string;
  staffId: string;
  projectId: string;
  day: number;
  rate: number;
};

type ConfirmedAssignment = {
  id: string;
  staffId: string;
  projectId: string;
  day: number;
};

type LoadStatus = "idle" | "loading" | "saving" | "saved" | "error" | "demo";

const demoStaff: Staff[] = [
  { id: "m1", name: "山田太郎", area: "東京・神奈川", yesDays: [6, 7, 13, 14, 20, 21], assigned: 3, target: 6, rate: 12000 },
  { id: "m2", name: "佐藤花子", area: "東京", yesDays: [7, 14, 21, 28], assigned: 2, target: 4, rate: 12000 },
  { id: "m3", name: "鈴木一郎", area: "埼玉・東京", yesDays: [6, 13, 20, 27, 28], assigned: 4, target: 5, rate: 13000 },
  { id: "m4", name: "高橋健", area: "神奈川", yesDays: [7, 13, 21], assigned: 1, target: 3, rate: 12000 }
];

const demoProjects: AssignmentProject[] = mockProjects.map((project) => ({
  id: project.id,
  day: readDayFromLabel(project.date),
  dateLabel: project.date,
  title: project.title,
  storeName: project.storeName,
  requiredPeople: project.requiredPeople,
  assignedPeople: project.assignedPeople,
  dailyRate: project.dailyRate,
  detailText: `${project.title} ${project.storeName}`
}));

export default function AdminAssignmentsIndexPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中...</p>}>
      <AdminAssignmentsContent />
    </Suspense>
  );
}

function AdminAssignmentsContent() {
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const operatingDays = useMemo(() => operatingDaysForMonth(targetMonth), [targetMonth]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [staff, setStaff] = useState<Staff[]>(demoStaff);
  const [projects, setProjects] = useState<AssignmentProject[]>(demoProjects);
  const [confirmedAssignments, setConfirmedAssignments] = useState<ConfirmedAssignment[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(demoStaff[0]?.id ?? "");
  const [selectedDayNumber, setSelectedDayNumber] = useState(operatingDays[0]?.day ?? 1);
  const [draftAssignments, setDraftAssignments] = useState<DraftAssignment[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState<LoadStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(supabase ? "Supabaseの割当情報を読み込み中です。" : "Supabase未接続のため、デモデータで動作しています。");

  const selectedStaff = staff.find((person) => person.id === selectedStaffId) ?? staff[0] ?? demoStaff[0];
  const firstYesDay = operatingDays.find((day) => selectedStaff?.yesDays.includes(day.day)) ?? operatingDays[0];
  const selectedDay = operatingDays.find((day) => day.day === selectedDayNumber) ?? firstYesDay ?? operatingDays[0];

  const loadAssignments = useCallback(async () => {
    if (!supabase) return;

    setStatus("loading");
    setMessage("Supabaseの割当情報を読み込み中です。");

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id,profile_id,base_daily_rate,memo")
      .order("created_at", { ascending: true });

    if (membersError) {
      setStatus("error");
      setMessage(`メンバー情報の取得に失敗しました: ${membersError.message}`);
      return;
    }

    const memberIds = (members ?? []).map((member) => member.id);
    const profileIds = (members ?? []).map((member) => member.profile_id);
    const { data: profiles, error: profilesError } = profileIds.length > 0
      ? await supabase.from("profiles").select("id,name").in("id", profileIds)
      : { data: [], error: null };

    const { data: shifts, error: shiftsError } = memberIds.length > 0
      ? await supabase
          .from("shift_availabilities")
          .select("member_id,work_date,availability")
          .in("member_id", memberIds)
          .gte("work_date", monthStart(targetMonth))
          .lte("work_date", monthEnd(targetMonth))
      : { data: [], error: null };

    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("id,work_date,title,store_name,required_people,project_daily_rate,memo,status")
      .gte("work_date", monthStart(targetMonth))
      .lte("work_date", monthEnd(targetMonth))
      .neq("status", "cancelled")
      .order("work_date", { ascending: true });

    if (profilesError || shiftsError || projectsError) {
      setStatus("error");
      setMessage(`割当情報の取得に失敗しました: ${profilesError?.message ?? shiftsError?.message ?? projectsError?.message}`);
      return;
    }

    const projectIds = (projectRows ?? []).map((project) => project.id);
    const { data: assignmentRows, error: assignmentsError } = projectIds.length > 0
      ? await supabase
          .from("assignments")
          .select("id,project_id,member_id,status")
          .in("project_id", projectIds)
          .eq("status", "confirmed")
      : { data: [], error: null };

    if (assignmentsError) {
      setStatus("error");
      setMessage(`確定済み割当の取得に失敗しました: ${assignmentsError.message}`);
      return;
    }

    const profileNameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
    const yesDaysByMemberId = new Map<string, number[]>();
    for (const shift of shifts ?? []) {
      if (shift.availability !== "yes") continue;
      const day = Number(String(shift.work_date).slice(-2));
      yesDaysByMemberId.set(shift.member_id, [...(yesDaysByMemberId.get(shift.member_id) ?? []), day]);
    }

    const confirmed = (assignmentRows ?? []).map((assignment) => {
      const project = (projectRows ?? []).find((item) => item.id === assignment.project_id);
      return {
        id: assignment.id,
        staffId: assignment.member_id,
        projectId: assignment.project_id,
        day: project ? Number(String(project.work_date).slice(-2)) : 1
      };
    });

    const nextStaff = (members ?? []).map((member) => {
      const yesDays = yesDaysByMemberId.get(member.id) ?? [];
      const assigned = confirmed.filter((assignment) => assignment.staffId === member.id).length;
      return {
        id: member.id,
        name: profileNameById.get(member.profile_id) ?? "名前未設定",
        area: member.memo || "対応エリア未設定",
        yesDays,
        assigned,
        target: Math.max(yesDays.length, assigned),
        rate: member.base_daily_rate || 12000
      };
    });

    const assignedCountByProject = new Map<string, number>();
    for (const assignment of confirmed) {
      assignedCountByProject.set(assignment.projectId, (assignedCountByProject.get(assignment.projectId) ?? 0) + 1);
    }

    const nextProjects = (projectRows ?? []).map((project) => ({
      id: project.id,
      day: Number(String(project.work_date).slice(-2)),
      dateLabel: formatDate(project.work_date),
      title: project.title,
      storeName: project.store_name,
      requiredPeople: project.required_people,
      assignedPeople: assignedCountByProject.get(project.id) ?? 0,
      dailyRate: project.project_daily_rate ?? 0,
      detailText: project.memo || `${project.title} ${project.store_name}`
    }));

    setStaff(nextStaff);
    setProjects(nextProjects);
    setConfirmedAssignments(confirmed);
    setDraftAssignments([]);

    const firstStaff = nextStaff[0];
    setSelectedStaffId(firstStaff?.id ?? "");
    const nextDay = firstStaff ? operatingDays.find((day) => firstStaff.yesDays.includes(day.day)) ?? operatingDays[0] : operatingDays[0];
    setSelectedDayNumber(nextDay?.day ?? 1);
    setStatus("idle");
    setMessage(nextStaff.length > 0 ? "Supabaseのシフト提出と案件を表示しています。" : "メンバーがまだ登録されていません。");
  }, [operatingDays, supabase, targetMonth]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    setDraftAssignments([]);
    setSelectedDayNumber(operatingDays[0]?.day ?? 1);
  }, [operatingDays, targetMonth]);

  const selectedStaffDrafts = draftAssignments.filter((item) => item.staffId === selectedStaff?.id);
  const selectedStaffConfirmed = confirmedAssignments.filter((item) => item.staffId === selectedStaff?.id);
  const selectedStaffAssigned = (selectedStaff?.assigned ?? 0) + selectedStaffDrafts.length;
  const submittedCount = staff.filter((person) => person.yesDays.length > 0).length;
  const openProjectCount = projects.filter((project) => project.requiredPeople > project.assignedPeople).length;

  const staffRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return staff
      .map((person) => {
        const draftCount = draftAssignments.filter((item) => item.staffId === person.id).length;
        const confirmedCount = confirmedAssignments.filter((item) => item.staffId === person.id).length;
        const assigned = confirmedCount + draftCount;
        return {
          ...person,
          draftCount,
          confirmedCount,
          assigned,
          shortage: Math.max(person.target - assigned, 0)
        };
      })
      .filter((person) => !query || `${person.name} ${person.area}`.toLowerCase().includes(query))
      .sort((a, b) => b.yesDays.length - a.yesDays.length || a.name.localeCompare(b.name, "ja"));
  }, [confirmedAssignments, draftAssignments, searchText, staff]);

  const visibleProjects = useMemo(() => {
    if (!selectedDay) return [];
    return projects.filter((project) => project.day === selectedDay.day);
  }, [projects, selectedDay]);

  function selectStaff(staffId: string) {
    const nextStaff = staff.find((person) => person.id === staffId) ?? staff[0] ?? demoStaff[0];
    const nextDay = operatingDays.find((day) => nextStaff.yesDays.includes(day.day)) ?? operatingDays[0];
    setSelectedStaffId(staffId);
    setSelectedDayNumber(nextDay?.day ?? 1);
  }

  function assignedCountByProject(projectId: string) {
    return draftAssignments.filter((item) => item.projectId === projectId).length;
  }

  function assignProject(projectId: string) {
    if (!selectedStaff || !selectedDay) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const exists = draftAssignments.some((item) => item.staffId === selectedStaff.id && item.projectId === projectId)
      || confirmedAssignments.some((item) => item.staffId === selectedStaff.id && item.projectId === projectId);
    if (exists) return;

    const currentAssigned = project.assignedPeople + assignedCountByProject(projectId);
    if (currentAssigned >= project.requiredPeople) return;

    setDraftAssignments((current) => [
      ...current,
      {
        id: `${selectedStaff.id}-${projectId}`,
        staffId: selectedStaff.id,
        projectId,
        day: selectedDay.day,
        rate: rates[projectId] ?? project.dailyRate
      }
    ]);
  }

  function removeAssignment(id: string) {
    setDraftAssignments((current) => current.filter((item) => item.id !== id));
  }

  async function confirmAssignments() {
    if (draftAssignments.length === 0) return;

    if (!supabase) {
      moveDraftsToConfirmed();
      setStatus("demo");
      setMessage("デモ上で下書き割当を確定しました。Supabase接続後はDBへ保存されます。");
      return;
    }

    setStatus("saving");
    setMessage("下書き割当を確定しています。");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setStatus("error");
      setMessage("管理者としてログインしていません。/login から管理者アカウントでログインしてください。");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
      setStatus("error");
      setMessage("有効な管理者権限が確認できません。profiles の role/status を確認してください。");
      return;
    }

    const rows = draftAssignments.map((draft) => {
      const project = projects.find((item) => item.id === draft.projectId);
      return {
        project_id: draft.projectId,
        member_id: draft.staffId,
        daily_rate: draft.rate,
        detail_text: project?.detailText ?? null,
        status: "confirmed" as const,
        confirmed_at: new Date().toISOString()
      };
    });

    const { error } = await supabase.from("assignments").upsert(rows, {
      onConflict: "project_id,member_id"
    });

    if (error) {
      setStatus("error");
      setMessage(`割当の確定に失敗しました: ${error.message}`);
      return;
    }

    setStatus("saved");
    setMessage("下書き割当をSupabaseへ確定保存しました。");
    await loadAssignments();
  }

  function moveDraftsToConfirmed() {
    setConfirmedAssignments((current) => [
      ...current,
      ...draftAssignments.map((draft) => ({
        id: draft.id,
        staffId: draft.staffId,
        projectId: draft.projectId,
        day: draft.day
      }))
    ]);
    setProjects((current) => current.map((project) => ({
      ...project,
      assignedPeople: project.assignedPeople + draftAssignments.filter((draft) => draft.projectId === project.id).length
    })));
    setDraftAssignments([]);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)} / 土日祝のみ</p>
          <h1>スタッフ起点の割当</h1>
        </div>
        <div className="admin-actions">
          <MonthNav basePath="/admin/assignments" month={targetMonth} />
          <button className="button" disabled={draftAssignments.length === 0 || status === "saving"} onClick={() => void confirmAssignments()}>
            {status === "saving" ? "確定中" : "下書きを確定"}
          </button>
        </div>
      </div>

      {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}

      <section className="admin-summary">
        <div className="grid three">
          <div className="summary-tile"><span>シフト提出済み</span><strong>{submittedCount}/{staff.length}人</strong></div>
          <div className="summary-tile warn"><span>未充足案件</span><strong>{openProjectCount}件</strong></div>
          <div className="summary-tile"><span>下書き割当</span><strong>{draftAssignments.length}件</strong></div>
        </div>
      </section>

      <section className="assignment-board">
        <aside className="assignment-panel staff-picker">
          <div className="panel-head">
            <h2>スタッフ</h2>
            <span className="badge">YES順</span>
          </div>
          <div className="field compact-field">
            <label htmlFor="assignment-staff-search">検索</label>
            <input
              id="assignment-staff-search"
              placeholder="名前・エリア"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <div className="staff-pick-list">
            {staffRows.map((person) => {
              const active = person.id === selectedStaff?.id;
              return (
                <button className={`staff-pick-item ${active ? "active" : ""}`} key={person.id} onClick={() => selectStaff(person.id)}>
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.area}</span>
                  </div>
                  <div className="staff-pick-meta">
                    <span className="badge ok">YES {person.yesDays.length}日</span>
                    <span className={`badge ${person.shortage > 0 ? "warn" : "ok"}`}>割当 {person.assigned}/{person.target}</span>
                    {person.confirmedCount > 0 && <span className="badge ok">確定 +{person.confirmedCount}</span>}
                    {person.draftCount > 0 && <span className="badge">下書き +{person.draftCount}</span>}
                  </div>
                </button>
              );
            })}
            {staffRows.length === 0 && <p className="muted">表示できるスタッフがいません。</p>}
          </div>
        </aside>

        <section className="assignment-panel availability-panel">
          <div className="panel-head">
            <div>
              <h2>{selectedStaff?.name ?? "スタッフ未選択"}</h2>
              <p className="muted">基本日当 {yen(selectedStaff?.rate ?? 0)} / 対応エリア {selectedStaff?.area ?? "-"}</p>
            </div>
            <span className={`badge ${(selectedStaff?.target ?? 0) - selectedStaffAssigned > 0 ? "warn" : "ok"}`}>
              あと{Math.max((selectedStaff?.target ?? 0) - selectedStaffAssigned, 0)}日
            </span>
          </div>

          <div className="availability-list">
            {operatingDays.map((day) => {
              const yes = selectedStaff?.yesDays.includes(day.day) ?? false;
              const active = day.day === selectedDay?.day;
              const dayDrafts = selectedStaffDrafts.filter((item) => item.day === day.day).length;
              const dayConfirmed = selectedStaffConfirmed.filter((item) => item.day === day.day).length;
              return (
                <button
                  className={`availability-day ${active ? "active" : ""} ${yes ? "" : "disabled"}`}
                  key={day.day}
                  disabled={!yes}
                  onClick={() => setSelectedDayNumber(day.day)}
                >
                  <span>{day.label}</span>
                  <strong>{yes ? "YES" : "NO"}</strong>
                  <small>{yes ? dayStatusText(dayConfirmed, dayDrafts) : "割当不可"}</small>
                </button>
              );
            })}
          </div>

          <div className="draft-list">
            <h3>このスタッフの下書き割当</h3>
            {selectedStaffDrafts.length === 0 ? (
              <p className="muted">まだ下書き割当はありません。</p>
            ) : (
              selectedStaffDrafts.map((draft) => {
                const project = projects.find((item) => item.id === draft.projectId);
                return (
                  <div className="draft-item" key={draft.id}>
                    <span>{project?.dateLabel} {project?.title} / {yen(draft.rate)}</span>
                    <button className="button ghost" onClick={() => removeAssignment(draft.id)}>解除</button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="assignment-panel project-match-panel">
          <div className="panel-head">
            <div>
              <h2>{selectedDay?.label ?? "日付未選択"} の案件</h2>
              <p className="muted">YESの日だけ割当できます</p>
            </div>
          </div>

          <div className="project-match-list">
            {visibleProjects.map((project) => {
              const draftAssigned = assignedCountByProject(project.id);
              const currentAssigned = project.assignedPeople + draftAssigned;
              const remaining = Math.max(project.requiredPeople - currentAssigned, 0);
              const alreadyAssigned = draftAssignments.some((item) => item.staffId === selectedStaff?.id && item.projectId === project.id)
                || confirmedAssignments.some((item) => item.staffId === selectedStaff?.id && item.projectId === project.id);
              return (
                <article className="project-match-item" key={project.id}>
                  <div>
                    <h3>{project.title}</h3>
                    <p className="muted">{project.storeName}</p>
                  </div>
                  <div className="project-match-meta">
                    <span className={`badge ${remaining > 0 ? "warn" : "ok"}`}>
                      必要 {project.requiredPeople} / 割当 {currentAssigned}
                    </span>
                    <span>{yen(project.dailyRate)}</span>
                  </div>
                  <div className="project-rate-row">
                    <label htmlFor={`rate-${project.id}`}>割当日当</label>
                    <input
                      id={`rate-${project.id}`}
                      value={rates[project.id] ?? project.dailyRate}
                      inputMode="numeric"
                      onChange={(event) => setRates((current) => ({ ...current, [project.id]: Number(event.target.value) || 0 }))}
                    />
                    <button className="button secondary" disabled={remaining === 0 || alreadyAssigned} onClick={() => assignProject(project.id)}>
                      {alreadyAssigned ? "割当済み" : "割当"}
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleProjects.length === 0 && <p className="muted">この日の案件はまだありません。</p>}
          </div>
        </section>
      </section>
    </>
  );
}

function dayStatusText(confirmedCount: number, draftCount: number) {
  if (confirmedCount > 0 && draftCount > 0) return `確定 ${confirmedCount}件 / 下書き ${draftCount}件`;
  if (confirmedCount > 0) return `確定 ${confirmedCount}件`;
  if (draftCount > 0) return `下書き ${draftCount}件`;
  return "案件を選択";
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}

function readDayFromLabel(value: string) {
  return Number(value.match(/^\d+\/(\d+)/)?.[1] ?? 1);
}
