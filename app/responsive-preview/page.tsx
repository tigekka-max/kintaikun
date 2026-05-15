"use client";

import { useMemo, useState } from "react";

const pages = [
  { label: "スタッフ ホーム", path: "/member" },
  { label: "スタッフ シフト", path: "/member/shifts?month=2026-06" },
  { label: "スタッフ 予定", path: "/member/schedule?month=2026-06" },
  { label: "スタッフ 精算", path: "/member/settlements?month=2026-06" },
  { label: "スタッフ 交通費", path: "/member/expenses/a1" },
  { label: "管理 シフト", path: "/admin/shifts" },
  { label: "管理 案件作成", path: "/admin/projects/new" }
];

const viewports = [
  { label: "iPhone SE相当", width: 375, height: 667, fitScale: 0.78 },
  { label: "スマホ大", width: 430, height: 932, fitScale: 0.68 },
  { label: "タブレット", width: 768, height: 1024, fitScale: 0.4 },
  { label: "PC", width: 1280, height: 800, fitScale: 0.24 }
];

export default function ResponsivePreviewPage() {
  const [path, setPath] = useState(pages[0].path);
  const [scaleMode, setScaleMode] = useState<"fit" | "actual">("fit");
  const selectedPage = pages.find((page) => page.path === path) ?? pages[0];

  const previewUrl = useMemo(() => {
    const url = new URL(selectedPage.path, "http://localhost:3000");
    url.searchParams.set("preview", "1");
    return `${url.pathname}${url.search}`;
  }, [selectedPage.path]);

  return (
    <main className="responsive-preview-page">
      <header className="responsive-preview-toolbar">
        <div>
          <p className="eyebrow">表示確認</p>
          <h1>レスポンシブプレビュー</h1>
        </div>
        <div className="responsive-preview-controls">
          <label>
            画面
            <select value={path} onChange={(event) => setPath(event.target.value)}>
              {pages.map((page) => (
                <option key={page.path} value={page.path}>{page.label}</option>
              ))}
            </select>
          </label>
          <label>
            表示
            <select value={scaleMode} onChange={(event) => setScaleMode(event.target.value as "fit" | "actual")}>
              <option value="fit">縮小して全体を見る</option>
              <option value="actual">実寸で見る</option>
            </select>
          </label>
        </div>
      </header>

      <section className="responsive-preview-grid">
        {viewports.map((viewport) => (
          <article className="responsive-preview-card" key={viewport.label}>
            <div className="responsive-preview-head">
              <div>
                <h2>{viewport.label}</h2>
                <p className="muted">{viewport.width} x {viewport.height}px</p>
              </div>
              <a className="button secondary" href={previewUrl} target="_blank" rel="noreferrer">単体で開く</a>
            </div>
            <div className={`responsive-frame-wrap ${scaleMode}`}>
              <div
                className="responsive-frame-stage"
                style={{
                  width: scaleMode === "fit" ? viewport.width * viewport.fitScale : viewport.width,
                  height: scaleMode === "fit" ? viewport.height * viewport.fitScale : viewport.height
                }}
              >
                <iframe
                  title={`${selectedPage.label} ${viewport.label}`}
                  src={previewUrl}
                  style={{
                    width: viewport.width,
                    height: viewport.height,
                    transform: scaleMode === "fit" ? `scale(${viewport.fitScale})` : "none"
                  }}
                />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
