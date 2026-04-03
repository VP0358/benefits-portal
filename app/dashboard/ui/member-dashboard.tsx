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

const TAG_STYLE: Record<string, { bg: string; text: string }> = {
  important: { bg: "bg-red-500",    text: "text-white" },
  campaign:  { bg: "bg-yellow-400", text: "text-yellow-900" },
  new:       { bg: "bg-blue-500",   text: "text-white" },
  notice:    { bg: "bg-gray-400",   text: "text-white" },
};

// スライドごとの背景グラデーション
const SLIDE_BG = [
  "linear-gradient(135deg, #2563eb, #60a5fa)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #ea580c, #fb923c)",
  "linear-gradient(135deg, #0891b2, #22d3ee)",
  "linear-gradient(135deg, #db2777, #f472b6)",
];

const TAG_LABEL: Record<string, string> = {
  important: "重要",
  campaign:  "キャンペーン",
  new:       "新機能",
  notice:    "お知らせ",
};

const ICON_MAP: Record<string, string> = {
  smartphone: "📱", plane: "✈️", smile: "😊",
  cart: "🛒", message: "💬", jar: "🫙",
  gift: "🎁", star: "⭐", heart: "❤️", home: "🏠",
};

// アイコン選択用絵文字リスト
const AVATAR_OPTIONS = ["😊","😎","🦁","🐯","🐼","🦊","🐸","🌸","⭐","🔥","💎","🎯"];

export default function MemberDashboard({
  user, announcements, menus,
}: {
  user: User;
  announcements: Announcement[];
  menus: Menu[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide]       = useState(0);
  const slideRef                = useRef(0);
  const [avatar, setAvatar]     = useState("😊");

  // アバターをlocalStorageから読み込む
  useEffect(() => {
    const saved = localStorage.getItem(`avatar_${user.id}`);
    if (saved) setAvatar(saved);
  }, [user.id]);

  // 自動スライド
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % announcements.length;
      setSlide(slideRef.current);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // ドロワー外タップで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const activeAnn = announcements[slide];
  const slideBg   = SLIDE_BG[slide % SLIDE_BG.length];
  const tagStyle  = TAG_STYLE[activeAnn?.tag] ?? TAG_STYLE.notice;

  // ポイントバー用（最大想定10万pt）
  const maxPt   = 100000;
  const barPct  = Math.min((user.availablePoints / maxPt) * 100, 100);

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-28 relative">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
               style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>V</div>
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
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                  className="text-gray-700 text-2xl p-1">☰</button>
        </div>
      </header>

      {/* ── ドロワーメニュー ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl flex flex-col"
               onClick={(e) => e.stopPropagation()}>
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
                <Link key={item.href} href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium text-gray-800 hover:bg-green-50 transition">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-6">
              <button onClick={async () => {
                        const { signOut } = await import("next-auth/react");
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition text-left">
                🚪 ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ── ウェルカムカード ── */}
        <div className="rounded-2xl p-5 text-white shadow-lg"
             style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>
          <div className="flex items-center gap-3 mb-3">
            {/* 丸型アイコン */}
            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-2xl shrink-0 border-2 border-white/50">
              {avatar}
            </div>
            <div>
              <p className="text-xs font-medium opacity-90">こんにちは 👋</p>
              <p className="text-xl font-bold">{user.name} さん</p>
              <p className="text-xs font-medium opacity-80">会員コード：{user.memberCode}</p>
            </div>
          </div>
          {/* ポイント表示 */}
          <div className="bg-white/20 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">利用可能ポイント</span>
              <span className="text-2xl font-bold">
                {user.availablePoints.toLocaleString()}<span className="text-sm ml-1">pt</span>
              </span>
            </div>
            {/* 残高バー */}
            <div className="w-full bg-white/30 rounded-full h-2">
              <div className="h-2 rounded-full bg-white transition-all duration-500"
                   style={{ width: `${barPct}%` }} />
            </div>
            <p className="text-[10px] font-medium opacity-75 mt-1 text-right">
              最大 {maxPt.toLocaleString()} pt
            </p>
          </div>
        </div>

        {/* ── 携帯契約直紹介ボタン ── */}
        <Link href="/referral/contracts"
              className="block bg-white rounded-2xl p-4 shadow flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">今月の直紹介 携帯契約</p>
              <p className="text-xs text-gray-500">直紹介した会員の今月の契約件数</p>
            </div>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>

        {/* ── お知らせ一覧（スライダー1枚＋リスト） ── */}
        <section id="news">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📢 お知らせ一覧</h2>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-gray-500 text-sm shadow font-medium">
              現在お知らせはありません
            </div>
          ) : (
            <>
              {/* カラースライダー（1枚大きく） */}
                            <Link href="/announcements" className="block rounded-2xl shadow overflow-hidden mb-3 transition-all duration-500 hover:opacity-95 active:scale-95"
                   style={{ background: slideBg }}>
                <div className="p-5 text-white min-h-[130px]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tagStyle.bg} ${tagStyle.text}`}>
                      {TAG_LABEL[activeAnn?.tag] ?? "お知らせ"}
                    </span>
                    <span className="text-xs font-medium opacity-80">
                      {activeAnn?.publishedAt
                        ? new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP")
                        : ""}
                    </span>
                  </div>
                  <p className="font-bold text-base leading-snug">{activeAnn?.title}</p>
                  <p className="text-sm font-medium opacity-90 mt-1 line-clamp-3">{activeAnn?.content}</p>
                 </div>
                 {announcements.length > 1 && (
                  <div className="flex justify-center gap-1.5 pb-3">
                    {announcements.map((_, i) => (
                      <button key={i}
                              onClick={() => { slideRef.current = i; setSlide(i); }}
                              className={`h-2 rounded-full transition-all duration-300 bg-white ${
                                i === slide ? "w-6 opacity-100" : "w-2 opacity-40"
                              }`} />
                    ))}
                  </div>
                   }}
                </Link>

              </div>

              {/* リスト（スライダー以外） */}
              {announcements.length > 1 && (
                <div className="space-y-2">
                  {announcements.map((a, i) => {
                    const ts = TAG_STYLE[a.tag] ?? TAG_STYLE.notice;
                    return (
                      <button key={a.id}
                              onClick={() => { slideRef.current = i; setSlide(i); }}
                              className={`w-full bg-white rounded-2xl p-3 shadow flex gap-3 items-start text-left transition ${
                                i === slide ? "ring-2 ring-green-400" : ""
                              }`}>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5 ${ts.bg} ${ts.text}`}>
                          {TAG_LABEL[a.tag] ?? "お知らせ"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-800 truncate">{a.title}</p>
                          <p className="text-xs font-medium text-gray-600 mt-0.5 line-clamp-1">{a.content}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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
                <a key={m.id}
                   href={m.menuType === "contact" ? "/contact" : (m.linkUrl ?? "#")}
                   className="bg-white rounded-2xl p-3 text-center shadow hover:shadow-md transition active:scale-95">
                  <div className="text-3xl mb-1">{emoji}</div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                  {m.subtitle && <p className="text-[10px] font-medium text-gray-500 mt-0.5">{m.subtitle}</p>}
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
              <Link key={item.href} href={item.href}
                    className="bg-white rounded-2xl p-4 shadow text-center hover:shadow-md transition active:scale-95">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs font-bold text-gray-800">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── アイコン変更セクション ── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">🎨 プロフィールアイコン変更</h2>
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-xs font-medium text-gray-600 mb-3">好きなアイコンを選んでください</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button key={emoji}
                        onClick={() => {
                          setAvatar(emoji);
                          localStorage.setItem(`avatar_${user.id}`, emoji);
                        }}
                        className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition ${
                          avatar === emoji
                            ? "bg-green-100 ring-2 ring-green-500 scale-110"
                            : "bg-gray-50 hover:bg-green-50"
                        }`}>
                  {emoji}
                </button>
              ))}
            </div>
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
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-2xl border-4 border-white"
                 style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>💎</div>
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
