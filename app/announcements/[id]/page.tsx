"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

interface Announcement {
  id: string; title: string; content: string; tag: string; publishedAt: string | null;
}

const TAG_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  important: { bg: "#ef4444",   text: "#fff",     border: "#ef444440" },
  campaign:  { bg: ORANGE,      text: "#fff",     border: `${ORANGE}40` },
  new:       { bg: GOLD,        text: "#fff",     border: `${GOLD}40` },
  notice:    { bg: `${GOLD}22`, text: GOLD_LIGHT, border: `${GOLD}35` },
};
const TAG_LABEL: Record<string, string> = {
  important: "重要", campaign: "キャンペーン", new: "新機能", notice: "お知らせ",
};

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item,    setItem]    = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/announcements/${id}`)
      .then(r => r.json())
      .then(d => {
        setItem(d);
        const stored = localStorage.getItem("readAnnouncements");
        const read: string[] = stored ? JSON.parse(stored) : [];
        if (!read.includes(id)) {
          read.push(id);
          localStorage.setItem("readAnnouncements", JSON.stringify(read));
          window.dispatchEvent(new Event("announcementsRead"));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
          <p className="text-sm font-jp" style={{ color: `${GOLD}60` }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div className="text-center">
          <p className="text-4xl mb-3">😢</p>
          <p className="font-bold font-jp" style={{ color: NAVY }}>お知らせが見つかりませんでした</p>
          <Link href="/announcements"
            className="text-sm font-semibold font-jp mt-4 block"
            style={{ color: GOLD }}>← 一覧に戻る</Link>
        </div>
      </div>
    );
  }

  const tagCfg = TAG_STYLE[item.tag] ?? TAG_STYLE.notice;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.13]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/announcements" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">お知らせ一覧</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>お知らせ詳細</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 relative">

        {/* 記事カード */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}25`, boxShadow: `0 12px 40px rgba(10,22,40,0.22)` }}>

          {/* ゴールドライン */}
          <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>

          <div className="px-6 py-6">
            {/* タグ・日付 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-jp font-semibold"
                style={{ background: tagCfg.bg, color: tagCfg.text, border: `1px solid ${tagCfg.border}` }}>
                {TAG_LABEL[item.tag] ?? "お知らせ"}
              </span>
              <span className="text-xs font-label tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>
                {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("ja-JP") : ""}
              </span>
            </div>

            {/* タイトル */}
            <h1 className="text-xl font-black font-jp leading-tight mb-4"
              style={{ color: "rgba(255,255,255,0.92)" }}>
              {item.title}
            </h1>

            {/* 区切り線 */}
            <div className="h-px mb-5" style={{ background: `linear-gradient(90deg,${GOLD}40,transparent)` }}/>

            {/* 本文 */}
            <div className="text-sm font-jp leading-relaxed whitespace-pre-wrap"
              style={{ color: "rgba(255,255,255,0.72)" }}>
              {item.content}
            </div>
          </div>
        </div>

        {/* 一覧リンク */}
        <Link href="/announcements"
          className="flex items-center justify-center gap-2 mt-5 py-3.5 rounded-2xl text-sm font-semibold font-jp transition"
          style={{ background: "rgba(10,22,40,0.06)", border: `1px solid rgba(10,22,40,0.12)`, color: `${NAVY}70` }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          お知らせ一覧に戻る
        </Link>

      </main>
    </div>
  );
}
