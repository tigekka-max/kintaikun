"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { projects as mockProjects, yen } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProjectRow = {
  id: string;
  workDate: string;
  date: string;
  title: string;
  storeName: string;
  requiredPeople: number;
  assignedPeople: number;
  dailyRate: number;
};

export default function AdminProjectsPage() {
  const supabase = createSupabaseBrowserClient();
  const [projects, setProjects] = useState<ProjectRow[]>(
    mockProjects.map((project) => ({
      id: project.id,
      workDate: "2026-06-01",
      date: project.date,
      title: project.title,
      storeName: project.storeName,
      requiredPeople: project.requiredPeople,
      assignedPeople: project.assignedPeople,
      dailyRate: project.dailyRate
    }))
  );
  const [message, setMessage] = useState(supabase ? "" : "Supabase未接続のため、デモデータを表示しています。");

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    async function loadProjects() {
      const { data, error } = await client
        .from("projects")
        .select("id,work_date,title,store_name,required_people,project_daily_rate")
        .order("work_date", { ascending: true });

      if (!active) return;

      if (error) {
        setMessage("案件一覧の取得に失敗しました。ログイン権限を確認してください。");
        return;
      }

      const projectIds = (data ?? []).map((project) => project.id);
      const { data: assignments, error: assignmentsError } = projectIds.length > 0
        ? await client
            .from("assignments")
            .select("project_id")
            .in("project_id", projectIds)
            .eq("status", "confirmed")
        : { data: [], error: null };

      if (!active) return;

      if (assignmentsError) {
        setMessage("割当人数の取得に失敗しました。ログイン権限を確認してください。");
        return;
      }

      const assignedCountByProject = new Map<string, number>();
      for (const assignment of assignments ?? []) {
        assignedCountByProject.set(assignment.project_id, (assignedCountByProject.get(assignment.project_id) ?? 0) + 1);
      }

      setProjects(
        (data ?? []).map((project) => ({
          id: project.id,
          workDate: project.work_date,
          date: formatDate(project.work_date),
          title: project.title,
          storeName: project.store_name,
          requiredPeople: project.required_people,
          assignedPeople: assignedCountByProject.get(project.id) ?? 0,
          dailyRate: project.project_daily_rate ?? 0
        }))
      );
      setMessage("");
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">案件・現場</p>
          <h1>案件管理</h1>
        </div>
        <Link className="button" href="/admin/projects/new">新規作成</Link>
      </div>
      {message && <p className="muted">{message}</p>}
      <div className="list">
        {projects.map((project) => (
          <section className="list-item" key={project.id}>
            <div className="row">
              <div>
                <h3>{project.date} {project.title}</h3>
                <p className="muted">{project.storeName}</p>
                <p>必要人数：{project.requiredPeople} / 割当済み：{project.assignedPeople}　案件日当：{yen(project.dailyRate)}</p>
              </div>
              <Link className="button secondary" href={`/admin/assignments?month=${project.workDate.slice(0, 7)}`}>割当</Link>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
}
