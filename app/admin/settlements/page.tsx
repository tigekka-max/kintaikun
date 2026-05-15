import { Suspense } from "react";
import { AdminSettlementsClient } from "./admin-settlements-client";

export default function AdminSettlementsPage() {
  return (
    <Suspense>
      <AdminSettlementsClient />
    </Suspense>
  );
}
