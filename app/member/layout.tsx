import { MemberShell } from "@/components/member-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
