import { Suspense } from "react";
import { AdminDashboardClient } from "./admin-dashboard-client";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中...</p>}>
      <AdminDashboardClient />
    </Suspense>
  );
}
