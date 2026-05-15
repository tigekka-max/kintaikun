"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LayoutDashboard, ReceiptText, Users, WalletCards } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const nav = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/shifts", label: "シフト", icon: CalendarCheck },
  { href: "/admin/expenses", label: "交通費", icon: ReceiptText },
  { href: "/admin/settlements", label: "精算", icon: WalletCards },
  { href: "/admin/members", label: "メンバー", icon: Users }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">稼働管理</div>
        <nav className="nav-list" aria-label="管理者ナビゲーション">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}>
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <LogoutButton className="button ghost sidebar-logout" />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
