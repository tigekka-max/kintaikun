"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Home, ReceiptText } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const tabs = [
  { href: "/member", label: "ホーム", icon: Home },
  { href: "/member/shifts", label: "シフト", icon: ClipboardList },
  { href: "/member/schedule", label: "予定", icon: CalendarDays },
  { href: "/member/settlements", label: "精算", icon: ReceiptText }
];

export function MemberShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mobile-shell">
      <div className="member-shell-actions">
        <LogoutButton className="button ghost member-logout" />
      </div>
      {children}
      <nav className="bottom-tabs" aria-label="メンバーナビゲーション">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href === "/member" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={`tab ${active ? "active" : ""}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
