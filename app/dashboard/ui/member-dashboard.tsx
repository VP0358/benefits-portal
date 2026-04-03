"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface User { id:string; name:string; memberCode:string; email:string; phone:string; availablePoints:number; }
interface Announcement { id:string; title:string; content:string; tag:string; isPublished:boolean; publishedAt:string|null; }
interface Menu { id:string; title:string; subtitle?:string; iconType?:string; menuType?:string; linkUrl?:string; }

const TAG_STYLE: Record<string,string> = {
  important: "bg-red-500 text-white",
  campaign:  "bg-yellow-400 text-yellow-900",
  new:       "bg-blue-500 text-white",
  notice:    "bg-gray-400 text-white",
};
const TAG_LABEL: Record<string,string> = {
  important:"重要", campaign:"キャンペーン", new:"新機能", notice:"お知らせ"
};
const SLIDE_BG = [
  "linear-gradient(135deg, #2563eb, #60a5fa)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #ea580c, #fb923c)",
  "linear-gradient(135deg, #0891b2, #22d3ee)",
  "linear-gradient(135deg, #db2777, #f472b6)",
];
const ICON_MAP: Record<string,string> = {
  smartphone:"📱", plane:"✈️", smile:"😊", cart:"🛒",
  message:"💬", jar:"🫙", gift:"🎁", star:"⭐", heart:"❤️", home:"🏠"
};
const AVATAR_OPTIONS = ["😊","😎","🦁","🐯","🐼","🦊","🐸","🌸","⭐","🔥","💎","🎯"];

export default function MemberDashboard({
  user, announcements, menus
}: {
  user: User;
  announcements: Announcement[];
  menus: Menu[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [unreadCount, setUnreadCount] = useState(announcements.length);
  const [avatar, setAvatar] = useState("😊");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const slideRef = useRef(0);

  // アバター読み込み
  useEffect(() => {
    const saved = localStorage.getItem("userAvatar");
    if (saved) setAvatar(saved);
  }, []);

  // スライダー自動切替
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % announcements.length;
      setSlide(slideRef.current);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  // 未読カウント管理
  useEffect(() => {
    const check = () => {
      const stored = localStorage.getItem("readAnnouncements");
      const read: string[] = stored ? JSON.parse(stored) : [];
      const unread = announcements.filter(a => !read.includes(a.id));
      setUnreadCount(unread.length);
    };
    check();
    window.addEventListener("announcementsRead", check);
    return () => window.removeEventListener("announcementsRead", check);
  }, [announcements]);

  const activeAnn = announcements[slide];
  const slideBg = SLIDE_BG[slide % SLIDE_BG.length];
  const maxPt = 100000;
  const barPct = Math.min((user.availablePoints / maxPt) * 100, 100);

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-28 relative">

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>V</div>
          <span className="font-bold text-green-800 text-sm">VIOLA Pure</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/announcements" className="relative text-gray-500 text-xl">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="text-gray-700 text-2xl p-1">☰</button>
        </div>
      </header>

      {/* ドロワーメニュー */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <span className="font-bold text-green-800">メニュー</span>
              <button onClick={() => setMenuOpen(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <nav className="flex flex-col gap-1 flex-1 px-3 py-3 overflow-y-auto">
              {[
                { href: "/dashboard",       label: "🏠 ホーム" },
                { href: "#menu",            label: "📋 福利厚生メニュー" },
                { href: "/points/use",      label: "💎 ポイントを使う" },
                { href: "/points/history",  label: "📊 ポイント履歴" },
                { href: "/announcements",   label: "🔔 お知らせ" },
                { href: "/orders",          label: "📦 福利厚生使用履歴" },
                { href: "/profile",         label: "👤 マイアカウント" },
                { href: "/referral",        label: "🎁 友達を紹介する" },
              ].map(item => (
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
              }} className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition text-left">
                🚪 ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ウェルカムカード */}
        <div className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl hover:bg-white/30 transition">
              {avatar}
            </button>
            <div>
              <p className="text-sm font-medium opacity-90">こんにちは 👋</p>
              <p className="text-xl font-bold">{user.name} さん</p>
              <p className="text-xs opacity-80">会員コード：{user.memberCode}</p>
            </div>
          </div>
          {showAvatarPicker && (
            <div className="bg-white/20 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold mb-2">アイコンを選択</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map(em => (
                  <button key={em} onClick={() => {
                    setAvatar(em);
                    localStorage.setItem("userAvatar", em);
                    setShowAvatarPicker(false);
                  }} className="text-2xl hover:scale-125 transition">
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white/20 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">利用可能ポイント</span>
              <span className="text-2xl font-black">
                {user.availablePoints.toLocaleString()}
                <span className="text-sm ml-1">pt</span>
              </span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${barPct}%` }} />
            </div>
            <p className="text-[10px] opacity-70 mt-1 text-right">最大 {maxPt.toLocaleString()} pt</p>
          </div>
        </div>

        {/* 携帯契約ボタン */}
        <Link href="/referral/contracts"
          className="block bg-white rounded-2xl p-4 shadow flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">今月の直紹介 携帯契約</p>
              <p className="text-xs text-gray-600 mt-0.5">直紹介した会員の今月の契約件数</p>
            </div>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>

        {/* お知らせスライダー */}
        <section id="news">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📢 お知らせ一覧</h2>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-gray-600 text-sm shadow font-medium">
              現在お知らせはありません
            </div>
          ) : (
            <>
              <Link href="/announcements" className="block rounded-2xl shadow overflow-hidden mb-3"
                style={{ background: slideBg }}>
                <div className="p-5 text-white min-h-[110px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TAG_STYLE[activeAnn?.tag] ?? "bg-white/30 text-white"}`}>
                      {TAG_LABEL[activeAnn?.tag] ?? "お知らせ"}
                    </span>
                    <span className="text-xs opacity-80">
                      {activeAnn?.publishedAt ? new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP") : ""}
                    </span>
                  </div>
                  <p className="font-bold text-base">{activeAnn?.title}</p>
                  <p className="text-xs opacity-90 mt-1 line-clamp-2">{activeAnn?.content}</p>
                </div>
                {announcements.length > 1 && (
                  <div className="flex justify-center gap-1.5 pb-3">
                    {announcements.map((_, i) => (
                      <button key={i} onClick={e => { e.preventDefault(); slideRef.current = i; setSlide(i); }}
                        className={`h-2 rounded-full transition-all duration-300 ${i === slide ? "bg-white w-6" : "bg-white/50 w-2"}`} />
                    ))}
                  </div>
                )}
              </Link>
            </>
          )}
        </section>

        {/* 福利厚生メニュー */}
        <section id="menu">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">🛎️ 福利厚生メニュー</h2>
          <div className="grid grid-cols-3 gap-3">
            {menus.map(m => {
              const emoji = ICON_MAP[m.iconType ?? ""] ?? "📌";
              return (
                <a key={m.id}
                  href={m.menuType === "contact" ? "/contact" : (m.linkUrl ?? "#")}
                  className="bg-white rounded-2xl p-3 text-center shadow hover:shadow-md transition active:scale-95">
                  <div className="text-3xl mb-1">{emoji}</div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                  {m.subtitle && <p className="text-[10px] font-medium text-gray-600 mt-0.5">{m.subtitle}</p>}
                </a>
              );
            })}
          </div>
        </section>

        {/* クイックアクセス */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📌 クイックアクセス</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/orders",         icon: "📦", label: "福利厚生使用履歴" },
              { href: "/points/history", icon: "📊", label: "ポイント履歴" },
              { href: "/profile",        icon: "👤", label: "マイアカウント" },
              { href: "/referral",       icon: "🎁", label: "友達を紹介する" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="bg-white rounded-2xl p-4 shadow text-center hover:shadow-md transition active:scale-95">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs font-bold text-gray-800">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

      </main>

      {/* ボトムナビ */}
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
          <Link href="/announcements" className="flex flex-col items-center gap-0.5 py-2 px-3 relative">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {unreadCount}
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
