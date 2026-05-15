"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MonthNav } from "@/components/month-nav";
import { dateFromMonthDay, monthEnd, monthLabel, monthStart, normalizeMonth, operatingDaysForMonth } from "@/lib/month";
import { yen } from "@/lib/mock-data";
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

type ShiftAssignment = {
  id: string;
  staffId: string;
  day: number;
  dailyRate: number;
  detailText: string;
};

type LoadStatus = "idle" | "loading" | "saving" | "saved" | "error" | "demo";

const demoStaff: Staff[] = [
  { id: "m1", name: "山田太郎", area: "東京・神奈川", yesDays: [6, 7, 13, 14, 20, 21], assigned: 1, target: 6, rate: 12000 },
  { id: "m2", name: "佐藤花子", area: "東京", yesDays: [7, 14, 21, 28], assigned: 1, target: 4, rate: 12000 }
];

const emptyForm = {
  dailyRate: 12000,
  detailText: ""
};

export default function AdminShiftsPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中...</p>}>
      <AdminShiftsContent />
    </Suspense>
  );
}

function AdminShiftsContent() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const targetMonth = normalizeMonth(searchParams.get("month"));
  const operatingDays = useMemo(() => operatingDaysForMonth(targetMonth), [targetMonth]);
  const [staff, setStaff] = useState<Staff[]>(demoStaff);
  const [selectedStaffId, setSelectedStaffId] = useState(demoStaff[0].id);
  const selectedStaff = staff.find((person) => person.id === selectedStaffId) ?? staff[0] ?? demoStaff[0];
  const firstYesDay = operatingDays.find((day) => selectedStaff.yesDays.includes(day.day)) ?? operatingDays[0];
  const [selectedDayNumber, setSelectedDayNumber] = useState(firstYesDay?.day ?? 1);
  const selectedDay = operatingDays.find((day) => day.day === selectedDayNumber) ?? firstYesDay ?? operatingDays[0];
  const [searchText, setSearchText] = useState("");
  const [draftAssignments, setDraftAssignments] = useState<ShiftAssignment[]>([]);
  const [confirmedAssignments, setConfirmedAssignments] = useState<ShiftAssignment[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<LoadStatus>(supabase ? "loading" : "demo");
  const [message, setMessage] = useState(supabase ? "" : "Supabase未接続のため、デモデータで動作しています。");

  useEffect(() => {
    setDraftAssignments([]);
    setSelectedDayNumber(operatingDays[0]?.day ?? 1);
  }, [targetMonth, operatingDays]);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    async function loadShiftData() {
      setStatus("loading");
      setMessage("");

      const { data: members, error: membersError } = await client
        .from("members")
        .select("id,profile_id,base_daily_rate,memo")
        .order("created_at", { ascending: true });

      if (!active) return;

      if (membersError) {
        setStatus("error");
        setMessage(`スタッフ情報の取得に失敗しました: ${membersError.message}`);
        return;
      }

      const profileIds = (members ?? []).map((member) => member.profile_id);
      const { data: profiles, error: profilesError } = profileIds.length > 0
        ? await client.from("profiles").select("id,name").in("id", profileIds)
        : { data: [], error: null };

      const memberIds = (members ?? []).map((member) => member.id);
      const { data: availabilities, error: availabilityError } = memberIds.length > 0
        ? await client
            .from("shift_availabilities")
            .select("member_id,work_date,availability")
            .in("member_id", memberIds)
            .gte("work_date", monthStart(targetMonth))
            .lte("work_date", monthEnd(targetMonth))
        : { data: [], error: null };

      const { data: assignmentRows, error: assignmentsError } = memberIds.length > 0
        ? await client
            .from("assignments")
            .select("id,project_id,member_id,daily_rate,detail_text,status")
            .in("member_id", memberIds)
            .eq("status", "confirmed")
        : { data: [], error: null };

      if (!active) return;

      if (profilesError || availabilityError || assignmentsError) {
        setStatus("error");
        setMessage(`シフト情報の取得に失敗しました: ${profilesError?.message ?? availabilityError?.message ?? assignmentsError?.message}`);
        return;
      }

      const projectIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.project_id))];
      const { data: projects, error: projectsError } = projectIds.length > 0
        ? await client
            .from("projects")
            .select("id,work_date,title")
            .in("id", projectIds)
            .gte("work_date", monthStart(targetMonth))
            .lte("work_date", monthEnd(targetMonth))
        : { data: [], error: null };

      if (!active) return;

      if (projectsError) {
        setStatus("error");
        setMessage(`確定済み予定の取得に失敗しました: ${projectsError.message}`);
        return;
      }

      const profileNameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
      const yesDaysByMemberId = new Map<string, number[]>();
      for (const row of availabilities ?? []) {
        if (row.availability !== "yes") continue;
        const day = Number(String(row.work_date).slice(-2));
        yesDaysByMemberId.set(row.member_id, [...(yesDaysByMemberId.get(row.member_id) ?? []), day]);
      }

      const monthProjectIds = new Set((projects ?? []).map((project) => project.id));
      const monthAssignments = (assignmentRows ?? []).filter((assignment) => monthProjectIds.has(assignment.project_id));

      const nextStaff = (members ?? []).map((member) => {
        const confirmedCount = monthAssignments.filter((assignment) => assignment.member_id === member.id).length;
        return {
          id: member.id,
          name: profileNameById.get(member.profile_id) ?? "名前未設定",
          area: member.memo || "対応エリア未設定",
          yesDays: yesDaysByMemberId.get(member.id) ?? [],
          assigned: confirmedCount,
          target: Math.max(confirmedCount, 4),
          rate: member.base_daily_rate || 12000
        };
      });

      const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
      const nextConfirmed = monthAssignments.map((assignment) => {
        const project = projectById.get(assignment.project_id);
        return {
          id: assignment.id,
          staffId: assignment.member_id,
          day: project ? Number(String(project.work_date).slice(-2)) : 1,
          dailyRate: assignment.daily_rate,
          detailText: assignment.detail_text || project?.title || "稼働詳細"
        };
      });

      if (nextStaff.length > 0) {
        setStaff(nextStaff);
        setSelectedStaffId((current) => nextStaff.some((person) => person.id === current) ? current : nextStaff[0].id);
        const firstStaff = nextStaff.find((person) => person.id === selectedStaffId) ?? nextStaff[0];
        const nextDay = operatingDays.find((day) => firstStaff.yesDays.includes(day.day)) ?? operatingDays[0];
        setSelectedDayNumber(nextDay?.day ?? 1);
        setForm({ ...emptyForm, dailyRate: firstStaff.rate });
      } else {
        setStaff([]);
      }
      setConfirmedAssignments(nextConfirmed);
      setStatus("idle");
      setMessage("");
    }

    loadShiftData();

    return () => {
      active = false;
    };
  }, [supabase, targetMonth, operatingDays, selectedStaffId]);

  const selectedStaffDrafts = draftAssignments.filter((item) => item.staffId === selectedStaff.id);
  const selectedDayDrafts = draftAssignments.filter((item) => item.day === selectedDay?.day);
  const selectedDayConfirmed = confirmedAssignments.filter((item) => item.day === selectedDay?.day);
  const submittedCount = staff.filter((person) => person.yesDays.length > 0).length;
  const totalStaff = staff.length;
  const yesTotal = staff.reduce((sum, person) => sum + person.yesDays.length, 0);

  const staffRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return staff
      .map((person) => {
        const draftCount = draftAssignments.filter((item) => item.staffId === person.id).length;
        const confirmedCount = confirmedAssignments.filter((item) => item.staffId === person.id).length;
        const assignedTotal = confirmedCount + draftCount;
        return {
          ...person,
          draftCount,
          confirmedCount,
          assignedTotal,
          shortage: Math.max(person.target - assignedTotal, 0)
        };
      })
      .filter((person) => {
        if (!normalizedSearch) return true;
        return `${person.name} ${person.area}`.toLowerCase().includes(normalizedSearch);
      });
  }, [confirmedAssignments, draftAssignments, searchText, staff]);

  function selectStaff(staffId: string) {
    const nextStaff = staff.find((person) => person.id === staffId) ?? staff[0] ?? demoStaff[0];
    const nextDay = operatingDays.find((day) => nextStaff.yesDays.includes(day.day)) ?? operatingDays[0];
    setSelectedStaffId(staffId);
    setSelectedDayNumber(nextDay?.day ?? 1);
    setForm((current) => ({ ...current, dailyRate: nextStaff.rate }));
  }

  function addDraftAssignment() {
    if (!selectedDay || !form.detailText.trim()) return;

    setDraftAssignments((current) => [
      ...current,
      {
        id: `draft-${selectedStaff.id}-${selectedDay.day}-${Date.now()}`,
        staffId: selectedStaff.id,
        day: selectedDay.day,
        dailyRate: form.dailyRate,
        detailText: form.detailText.trim()
      }
    ]);
    setForm({ ...emptyForm, dailyRate: selectedStaff.rate });
  }

  async function confirmDraftAssignments() {
    if (draftAssignments.length === 0) return;

    if (!supabase) {
      moveDraftsToConfirmed();
      setStatus("demo");
      setMessage("デモ上で下書きを確定しました。Supabase接続後はDBへ保存されます。");
      return;
    }

    setStatus("saving");
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setStatus("error");
      setMessage("管理者としてログインしていません。/login から管理者アカウントでログインしてください。");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status,email")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
      setStatus("error");
      setMessage(`管理者権限が確認できません。ログイン中UID: ${userData.user.id} / email: ${userData.user.email ?? "不明"}`);
      return;
    }

    for (const assignment of draftAssignments) {
      const workDate = dateFromMonthDay(targetMonth, assignment.day);
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: firstLine(assignment.detailText),
          work_date: workDate,
          store_name: "稼働詳細登録",
          required_people: 1,
          project_daily_rate: assignment.dailyRate,
          memo: assignment.detailText,
          status: "active",
          created_by: userData.user.id
        })
        .select("id")
        .single();

      if (projectError || !project) {
        setStatus("error");
        setMessage(`案件の作成に失敗しました: ${formatSupabaseError(projectError)}`);
        return;
      }

      const { data: savedAssignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          project_id: project.id,
          member_id: assignment.staffId,
          daily_rate: assignment.dailyRate,
          detail_text: assignment.detailText,
          status: "confirmed",
          confirmed_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (assignmentError || !savedAssignment) {
        setStatus("error");
        setMessage(`割当の確定に失敗しました: ${formatSupabaseError(assignmentError)}`);
        return;
      }
    }

    moveDraftsToConfirmed();
    setStatus("saved");
    setMessage("下書きをSupabaseへ確定保存しました。");
  }

  function moveDraftsToConfirmed() {
    setConfirmedAssignments((current) => [
      ...current,
      ...draftAssignments.map((assignment) => ({
        ...assignment,
        id: assignment.id.replace("draft-", "confirmed-")
      }))
    ]);
    setDraftAssignments([]);
  }

  function removeDraftAssignment(id: string) {
    setDraftAssignments((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{monthLabel(targetMonth)} / 土日祝のみ</p>
          <h1>シフト管理</h1>
        </div>
        <div className="admin-actions">
          <MonthNav basePath="/admin/shifts" month={targetMonth} />
          <button className="button" disabled={draftAssignments.length === 0 || status === "saving"} onClick={confirmDraftAssignments}>
            {status === "saving" ? "確定中" : "下書きを確定"}
          </button>
        </div>
      </div>

      {message && <p className={status === "error" ? "badge danger" : "muted"}>{message}</p>}

      <section className="admin-summary">
        <div className="grid three">
          <div className="summary-tile"><span>提出済み</span><strong>{submittedCount}/{totalStaff}人</strong></div>
          <div className="summary-tile"><span>YES合計</span><strong>{yesTotal}日</strong></div>
          <div className="summary-tile warn"><span>下書き割当</span><strong>{draftAssignments.length}件</strong></div>
        </div>
      </section>

      <section className="shift-management-board">
        <aside className="assignment-panel">
          <div className="panel-head">
            <h2>スタッフ</h2>
            <span className="badge">スタッフ起点</span>
          </div>
          <div className="field compact-field">
            <label htmlFor="staff-search">検索</label>
            <input id="staff-search" placeholder="名前・エリア" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
          </div>
          <div className="staff-pick-list">
            {staffRows.map((person) => (
              <button className={`staff-pick-item ${person.id === selectedStaff.id ? "active" : ""}`} key={person.id} onClick={() => selectStaff(person.id)}>
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.area}</span>
                </div>
                <div className="staff-pick-meta">
                  <span className="badge ok">YES {person.yesDays.length}日</span>
                  <span className={`badge ${person.shortage > 0 ? "warn" : "ok"}`}>割当 {person.assignedTotal}/{person.target}</span>
                  {person.confirmedCount > 0 && <span className="badge ok">確定 +{person.confirmedCount}</span>}
                  {person.draftCount > 0 && <span className="badge">下書き +{person.draftCount}</span>}
                </div>
              </button>
            ))}
            {staffRows.length === 0 && <p className="muted">表示できるスタッフがいません。</p>}
          </div>
        </aside>

        <section className="assignment-panel">
          <div className="panel-head">
            <div>
              <h2>{selectedStaff.name}</h2>
              <p className="muted">基本日当 {yen(selectedStaff.rate)} / 対応エリア {selectedStaff.area}</p>
            </div>
          </div>
          <div className="availability-list">
            {operatingDays.map((day) => {
              const yes = selectedStaff.yesDays.includes(day.day);
              const active = day.day === selectedDay?.day;
              const dayDraftCount = selectedStaffDrafts.filter((item) => item.day === day.day).length;
              const dayConfirmedCount = confirmedAssignments.filter((item) => item.staffId === selectedStaff.id && item.day === day.day).length;
              return (
                <button className={`availability-day ${active ? "active" : ""} ${yes ? "" : "disabled"}`} disabled={!yes} key={day.day} onClick={() => setSelectedDayNumber(day.day)}>
                  <span>{day.label}</span>
                  <strong>{yes ? "YES" : "NO"}</strong>
                  <small>{yes ? dayStatusText(dayConfirmedCount, dayDraftCount) : "割当不可"}</small>
                </button>
              );
            })}
          </div>

          <div className="confirmed-list">
            <h3>{selectedDay?.label ?? "選択日"} の確定済み予定</h3>
            {selectedDayConfirmed.length === 0 ? (
              <p className="muted">この日の確定済み予定はまだありません。</p>
            ) : (
              selectedDayConfirmed.map((assignment) => {
                const assignedStaff = staff.find((person) => person.id === assignment.staffId);
                return (
                  <div className="confirmed-item" key={assignment.id}>
                    <strong>{assignedStaff?.name}</strong>
                    <span>{firstLine(assignment.detailText)} / {yen(assignment.dailyRate)}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="assignment-panel shift-create-panel">
          <div className="panel-head">
            <div>
              <h2>{selectedStaff.name} / {selectedDay?.label ?? "日付未選択"}</h2>
              <p className="muted">LINEで送っている現場情報をそのまま貼って、稼働予定として登録します。</p>
            </div>
          </div>

          <div className="shift-assignment-form">
            <div className="field">
              <label htmlFor="shift-rate">日当</label>
              <input id="shift-rate" inputMode="numeric" value={form.dailyRate} onChange={(event) => setForm((current) => ({ ...current, dailyRate: Number(event.target.value) || 0 }))} />
            </div>
            <div className="field">
              <label htmlFor="shift-detail">稼働詳細</label>
              <textarea
                id="shift-detail"
                className="work-detail-textarea"
                value={form.detailText}
                onChange={(event) => setForm((current) => ({ ...current, detailText: event.target.value }))}
                placeholder={`auイベント A店
集合: 9:40
稼働: 10:00-18:00
場所: https://maps.google.com/...
担当: 〇〇さん
備考: 入口前集合`}
              />
            </div>
            <button className="button" onClick={addDraftAssignment} disabled={!selectedDay || !form.detailText.trim()}>
              稼働予定を下書き登録
            </button>
          </div>

          <div className="draft-list">
            <div className="draft-list-head">
              <h3>{selectedDay?.label ?? "選択日"} の下書き</h3>
              {selectedDayDrafts.length > 0 && <span className="badge">{selectedDayDrafts.length}件</span>}
            </div>
            {selectedDayDrafts.length === 0 ? (
              <p className="muted">この日の下書き割当はまだありません。</p>
            ) : (
              selectedDayDrafts.map((draft) => {
                const draftStaff = staff.find((person) => person.id === draft.staffId);
                return (
                  <div className="draft-item wide" key={draft.id}>
                    <span>{draftStaff?.name} / {firstLine(draft.detailText)} / {yen(draft.dailyRate)}</span>
                    <button className="button ghost" onClick={() => removeDraftAssignment(draft.id)}>解除</button>
                  </div>
                );
              })
            )}
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
  return "案件入力へ";
}

function firstLine(value: string) {
  return value.split(/\r?\n/).find((line) => line.trim())?.trim() ?? "稼働詳細";
}

function formatSupabaseError(error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return "エラー詳細が返されませんでした。";
  return [error.message, error.code && `code: ${error.code}`, error.details, error.hint].filter(Boolean).join(" / ");
}
