"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  memberCode: string;
  email: string;
  phone: string;
  availablePoints: number;
}
interface Announcement {
  id: string;
  title: string;
  content: string;
  tag: string;
  isPublished: boolean;
  publishedAt: string | null;
}
interface Menu {
  id: string;
  title: string;
  subtitle?: string;
  iconType?: string;
  menuType?: string;
  linkUrl?: string;
}

const TAG_STYLE: Record<string, string> = {
  important: "bg-red-100 text-red-700",
  campaign:  "bg-yellow-100 text-yellow-700",
  new:       "bg-blue-100 text-blue-700",
  notice:    "bg-gray-100 text-gray-600",
};
const TAG_LABEL: Record<string, string> = {
  important: "重要",
  campaign:  "キャンペーン",
  new:       "新機能",
  notice:    "お知らせ",
};

// アイコン名→絵文字変換
const ICON_MAP: Record<string, string> = {
  smartphone: "📱",
  plane:      "✈️",
  smile:      "😊",
  cart:       "🛒",
  message:    "💬",
  jar:        "🫙",
  gift:       "🎁",
  star:       "⭐",
  heart:      "❤️",
  home:       "🏠",
};

export default function MemberDashboard({
  user,
  announcements,
  menus,
}: {
  user: User;
  announcements: Announcement[];
  menus: Menu[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide]       = useState(0);
  const slideRef                = useRef(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % announcements.length;
      setSlide(slideRef.current);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const activeAnn = announcements[slide];

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-28 relative">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
          >
            V
          </div>
          <span className="font-bold text-green-800 text-sm">VIOLA Pure</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="#news" className="relative text-gray-500 text-xl">
            🔔
            {announcements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {announcements.length}
              </span>
            )}
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="text-gray-600 text-2xl p-1"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ── ドロワーメニュー ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <span className="font-bold text-green-800">メニュー</span>
              <button onClick={() => setMenuOpen(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <nav className="flex flex-col gap-1 flex-1 px-3 py-3 overflow-y-auto">
              {[
                { href: "/dashboard",      label: "🏠 ホーム" },
                { href: "#menu",           label: "📋 福利厚生メニュー" },
                { href: "/points/use",     label: "💎 ポイントを使う" },
                { href: "/points/history", label: "📊 ポイント履歴" },
                { href: "#news",           label: "🔔 お知らせ" },
                { href: "/orders",         label: "📦 福利厚生使用履歴" },
                { href: "/profile",        label: "👤 マイアカウント" },
                { href: "/referral",       label: "🎁 友達を紹介する" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-gray-800 hover:bg-green-50 transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-6">
              <button
                onClick={async () => {
                  const { signOut } = await import("next-auth/react");
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition text-left"
              >
                🚪 ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ── ウェルカムカード ── */}
        <div
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
        >
          <p className="text-sm font-medium opacity-90">こんにちは 👋</p>
          <p className="text-2xl font-bold mt-0.5">{user.name} さん</p>
          <p className="text-xs font-medium opacity-80 mt-1">会員コード：{user.memberCode}</p>
          <div className="mt-4 bg-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">利用可能ポイント</span>
            <span className="text-3xl font-bold">
              {user.availablePoints.toLocaleString()}
              <span className="text-sm ml-1">pt</span>
            </span>
          </div>
        </div>

        {/* ── 携帯契約直紹介ボタン ── */}
        <Link
          href="/referral/contracts"
          className="block bg-white rounded-2xl p-4 shadow flex items-center justify-between hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">今月の直紹介 携帯契約</p>
              <p className="text-xs text-gray-500">直紹介した会員の今月の契約件数</p>
            </div>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>

        {/* ── お知らせ一覧（スライダー付き） ── */}
        <section id="news">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📢 お知らせ一覧</h2>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-gray-500 text-sm shadow font-medium">
              現在お知らせはありません
            </div>
          ) : (
            <>
              {/* スライダー */}
              <div className="bg-white rounded-2xl shadow overflow-hidden mb-3">
                <div className="p-4 min-h-[110px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TAG_STYLE[activeAnn?.tag] ?? "bg-gray-100 text-gray-600"}`}>
                      {TAG_LABEL[activeAnn?.tag] ?? "お知らせ"}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {activeAnn?.publishedAt
                        ? new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP")
                        : ""}
                    </span>
                  </div>
                  <p className="font-bold text-gray-800 text-sm">{activeAnn?.title}</p>
                  <p className="text-xs font-medium text-gray-600 mt-1 line-clamp-3">{activeAnn?.content}</p>
                </div>
                {announcements.length > 1 && (
                  <div className="flex justify-center gap-1.5 pb-3">
                    {announcements.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { slideRef.current = i; setSlide(i); }}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === slide ? "bg-green-500 w-6" : "bg-gray-300 w-2"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 一覧リスト */}
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow flex gap-3 items-start">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5 ${TAG_STYLE[a.tag] ?? "bg-gray-100 text-gray-600"}`}>
                      {TAG_LABEL[a.tag] ?? "お知らせ"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-800">{a.title}</p>
                      <p className="text-xs font-medium text-gray-600 mt-0.5">{a.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── 福利厚生メニュー ── */}
        <section id="menu">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">🛎️ 福利厚生メニュー</h2>
          <div className="grid grid-cols-3 gap-3">
            {menus.map((m) => {
              const emoji = ICON_MAP[m.iconType ?? ""] ?? "📌";
              return (
                <a
                  key={m.id}
                  href={m.menuType === "contact" ? "/contact" : (m.linkUrl ?? "#")}
                  className="bg-white rounded-2xl p-3 text-center shadow hover:shadow-md transition active:scale-95"
                >
                  <div className="text-3xl mb-1">{emoji}</div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                  {m.subtitle && (
                    <p className="text-[10px] font-medium text-gray-500 mt-0.5">{m.subtitle}</p>
                  )}
                </a>
              );
            })}
          </div>
        </section>

        {/* ── クイックアクセス ── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📌 クイックアクセス</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/orders",         icon: "📦", label: "福利厚生使用履歴" },
              { href: "/points/history", icon: "📊", label: "ポイント履歴" },
              { href: "/profile",        icon: "👤", label: "マイアカウント" },
              { href: "/referral",       icon: "🎁", label: "友達を紹介する" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl p-4 shadow text-center hover:shadow-md transition active:scale-95"
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs font-bold text-gray-800">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

      </main>

      {/* ── 下のナビバー ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto flex items-end justify-around px-2 py-1">
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-semibold text-gray-600">ホーム</span>
          </Link>
          <Link href="#menu" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">📋</span>
            <span className="text-[10px] font-semibold text-gray-600">メニュー</span>
          </Link>
          <Link href="/points/use" className="flex flex-col items-center -mt-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-2xl border-4 border-white"
              style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
            >
              💎
            </div>
            <span className="text-[10px] font-semibold text-gray-600 mt-1">ポイント</span>
          </Link>
          <Link href="#news" className="flex flex-col items-center gap-0.5 py-2 px-3 relative">
            <span className="text-xl">🔔</span>
            {announcements.length > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {announcements.length}
              </span>
            )}
            <span className="text-[10px] font-semibold text-gray-600">お知らせ</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">👤</span>
            <span className="text-[10px] font-semibold text-gray-600">マイページ</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
