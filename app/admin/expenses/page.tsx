import { Suspense } from "react";
import { AdminExpensesClient } from "./admin-expenses-client";

export default function AdminExpensesPage() {
  return (
    <Suspense>
      <AdminExpensesClient />
    </Suspense>
  );
}
