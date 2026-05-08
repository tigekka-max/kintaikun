import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "稼働管理",
  description: "シフト提出、案件割当、交通費精算を管理するPWA",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#23624b",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
