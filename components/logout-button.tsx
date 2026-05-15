"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton({ className = "button ghost" }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button className={className} type="button" onClick={logout}>
      <LogOut size={18} />
      ログアウト
    </button>
  );
}
