"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  tag: string;
  publishedAt: string | null;
}

// ── デザイントークン（ダッシュボードと統一）
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

const TAG_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  important: { bg: "#ef4444",      text: "#fff",          border: "#ef444440" },
  campaign:  { bg: ORANGE,         text: "#fff",          border: `${ORANGE}40` },
  new:       { bg: GOLD,           text: "#fff",          border: `${GOLD}40` },
  notice:    { bg: `${GOLD}22`,    text: GOLD_LIGHT,      border: `${GOLD}35` },
};
const TAG_LABEL: Record<string, string> = {
  important: "重要", campaign: "キャンペーン", new: "新機能", notice: "お知らせ",
};

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("readAnnouncements");
    if (stored) setReadIds(JSON.parse(stored));

    fetch("/api/announcements?published=true")
      .then(r => r.json())
      .then(d => { setList(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>お知らせ一覧</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3 relative">

        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: NAVY_CARD }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
            <p className="text-sm" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: LINEN, border: `1px solid rgba(201,168,76,0.18)` }}>
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm font-jp" style={{ color: "rgba(10,22,40,0.40)" }}>現在お知らせはありません</p>
          </div>
        )}

        {!loading && list.map(a => {
          const isRead = readIds.includes(a.id);
          const tagCfg = TAG_STYLE[a.tag] ?? TAG_STYLE.notice;
          return (
            <Link key={a.id} href={`/announcements/${a.id}`}
              className="block rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-95 relative"
              style={{
                background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`,
                border: `1px solid ${isRead ? `${GOLD}18` : `${GOLD}45`}`,
                boxShadow: `0 4px 20px rgba(10,22,40,0.18)`,
              }}>
              {/* 未読ゴールドライン */}
              {!isRead && (
                <div className="h-0.5" style={{ background: `linear-gradient(90deg,${GOLD}80,${GOLD_LIGHT},${GOLD}80)` }}/>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-jp font-semibold"
                    style={{ background: tagCfg.bg, color: tagCfg.text, border: `1px solid ${tagCfg.border}` }}>
                    {TAG_LABEL[a.tag] ?? "お知らせ"}
                  </span>
                  <span className="text-xs font-label tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("ja-JP") : ""}
                  </span>
                  {!isRead && (
                    <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: GOLD_LIGHT }}/>
                  )}
                </div>
                <p className="font-jp font-semibold text-sm leading-snug" style={{ color: isRead ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.92)" }}>
                  {a.title}
                </p>
                <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.38)" }}>{a.content}</p>
                <p className="text-xs mt-2 text-right font-label tracking-wider" style={{ color: `${GOLD}55` }}>続きを読む →</p>
              </div>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
