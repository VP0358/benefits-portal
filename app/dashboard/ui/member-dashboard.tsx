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

function VpPhoneButton() {
  const [appData, setAppData] = useState<{ status: string; contractType?: string; desiredPlan?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my/vp-phone")
      .then(r => r.json())
      .then(d => {
        setAppData(d.application ? {
          status:       d.application.status,
          contractType: d.application.contractType ?? "",
          desiredPlan:  d.application.desiredPlan ?? "",
        } : null);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  // ステータス別スタイル定義
  type SInfo = { label: string; icon: string; cardBg: string; cardBorder: string; badgeBg: string; badgeText: string; pulse?: boolean };
  const STATUS_INFO: Record<string, SInfo> = {
    pending:    { label: "審査待ち",  icon: "⏳", cardBg: "bg-yellow-50",  cardBorder: "border-yellow-300", badgeBg: "bg-yellow-400",  badgeText: "text-white", pulse: true },
    reviewing:  { label: "審査中",    icon: "🔍", cardBg: "bg-blue-50",    cardBorder: "border-blue-400",   badgeBg: "bg-blue-500",    badgeText: "text-white", pulse: true },
    contracted: { label: "契約済み",  icon: "✅", cardBg: "bg-emerald-50", cardBorder: "border-emerald-400",badgeBg: "bg-emerald-500", badgeText: "text-white" },
    rejected:   { label: "審査不可",  icon: "❌", cardBg: "bg-red-50",    cardBorder: "border-red-300",    badgeBg: "bg-red-500",     badgeText: "text-white" },
    canceled:   { label: "取消済み",  icon: "🚫", cardBg: "bg-gray-50",   cardBorder: "border-gray-300",   badgeBg: "bg-gray-400",    badgeText: "text-white" },
  };

  const info = appData ? STATUS_INFO[appData.status] : null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow border-2 border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📱</div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">VP未来phone 申し込み</p>
          <p className="text-xs text-gray-400 animate-pulse mt-0.5">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未申し込み
  if (!info) {
    return (
      <Link href="/vp-phone"
        className="block rounded-2xl p-4 shadow border-2 border-dashed border-green-300 bg-white hover:shadow-md hover:border-green-400 transition flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)" }}>📱</div>
          <div>
            <p className="font-bold text-sm text-gray-800">VP未来phone 申し込み</p>
            <p className="text-[10px] text-gray-500 mt-0.5">お得なスマートフォン回線</p>
          </div>
        </div>
        <span className="rounded-full bg-green-500 text-white px-3 py-1 text-xs font-bold shadow">
          申し込む →
        </span>
      </Link>
    );
  }

  // 申し込み済み（ステータスあり）
  const contractTypeLabel = appData?.contractType === "voice" ? "音声回線" : appData?.contractType === "data" ? "データ回線" : "";

  return (
    <Link href="/vp-phone"
      className={`block rounded-2xl p-4 shadow border-2 hover:shadow-md transition ${info.cardBg} ${info.cardBorder}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)" }}>📱</div>
          <div>
            <p className="font-bold text-sm text-gray-800">VP未来phone 申し込み</p>
            {contractTypeLabel && (
              <p className="text-[10px] text-gray-500 mt-0.5">{contractTypeLabel}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 ${info.badgeBg} ${info.badgeText} ${info.pulse ? "animate-pulse" : ""}`}>
            <span>{info.icon}</span>
            <span>{info.label}</span>
          </span>
          <span className="text-gray-400 text-xs">タップして確認 →</span>
        </div>
      </div>
      {/* contracted なら祝福メッセージ */}
      {appData?.status === "contracted" && (
        <div className="mt-2 bg-emerald-100 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-800">
          🎉 VP未来phone の契約が完了しています！
        </div>
      )}
      {/* pending/reviewing なら進捗バー */}
      {(appData?.status === "pending" || appData?.status === "reviewing") && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>申込完了</span><span>審査中</span><span>契約完了</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${
              appData.status === "reviewing" ? "bg-blue-500 w-2/3" : "bg-yellow-400 w-1/3"
            }`} />
          </div>
        </div>
      )}
    </Link>
  );
}

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
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const slideRef = useRef(0);
  const [contractCount, setContractCount] = useState<number | null>(null);

  // 旅行サブスク状態
  type TravelSubInfo = {
    displayStatus: "active" | "inactive" | "none";
    sub: {
      level: number;
      planName: string;
      monthlyFee: number;
      forceStatus: string;
    } | null;
  };
  const [travelSub, setTravelSub] = useState<TravelSubInfo | null>(null);

  // アバター読み込み（DB画像 > localStorage絵文字）
  useEffect(() => {
    // DBから取得
    fetch("/api/my/avatar")
      .then(r => r.json())
      .then(d => {
        if (d.avatarUrl) {
          setProfileAvatarUrl(d.avatarUrl);
          localStorage.setItem("profileAvatarUrl", d.avatarUrl);
        } else {
          setProfileAvatarUrl(null);
          // 絵文字アバターを読む
          const saved = localStorage.getItem("userAvatar");
          if (saved) setAvatar(saved);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("userAvatar");
        if (saved) setAvatar(saved);
        const url = localStorage.getItem("profileAvatarUrl");
        if (url) setProfileAvatarUrl(url);
      });

    // 画像更新イベントを監視
    const onAvatarUpdated = () => {
      const url = localStorage.getItem("profileAvatarUrl");
      setProfileAvatarUrl(url ?? null);
    };
    window.addEventListener("avatarUpdated", onAvatarUpdated);
    return () => window.removeEventListener("avatarUpdated", onAvatarUpdated);
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

  // 今月の携帯契約件数を取得
  useEffect(() => {
    fetch("/api/referral/contracts")
      .then(r => r.json())
      .then(d => setContractCount(d.thisMonthCount ?? 0))
      .catch(() => setContractCount(0));
  }, []);

  // 旅行サブスク状態を取得
  useEffect(() => {
    fetch("/api/my/travel-subscription")
      .then(r => r.json())
      .then(d => setTravelSub(d))
      .catch(() => setTravelSub({ displayStatus: "none", sub: null }));
  }, []);

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
                { href: "/vp-phone",        label: "📱 VP未来phone申し込み" },
                { href: "/points/use",      label: "💎 ポイントを使う" },
                { href: "/points/history",  label: "📊 ポイント履歴" },
                { href: "/announcements",   label: "🔔 お知らせ" },
                { href: "/orders/history",   label: "📦 福利厚生使用履歴" },
                { href: "/profile",         label: "👤 マイアカウント" },
                { href: "/referral",        label: "🎁 友達を紹介する" },
                { href: "/org-chart",       label: "🌳 直紹介 組織図" },
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
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl hover:bg-white/30 transition overflow-hidden">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="アバター" className="w-full h-full object-cover rounded-full" />
              ) : avatar}
            </button>
            <div>
              <p className="text-sm font-medium opacity-90">こんにちは 👋</p>
              <p className="text-xl font-bold">{user.name} さん</p>
              <p className="text-xs opacity-80">会員コード：{user.memberCode}</p>
            </div>
          </div>
          {showAvatarPicker && (
            <div className="bg-white/20 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">アイコンを選択</p>
                <Link href="/profile#avatar"
                  className="text-[10px] bg-white/30 rounded-lg px-2 py-1 font-semibold hover:bg-white/40 transition"
                  onClick={() => setShowAvatarPicker(false)}>
                  📷 写真に変更 →
                </Link>
              </div>
              {profileAvatarUrl && (
                <p className="text-[10px] opacity-80 mb-2">📸 プロフィール写真が設定されています</p>
              )}
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map(em => (
                  <button key={em} onClick={() => {
                    setAvatar(em);
                    setProfileAvatarUrl(null);
                    localStorage.setItem("userAvatar", em);
                    localStorage.removeItem("profileAvatarUrl");
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

        {/* VP未来phone申し込みボタン */}
        <VpPhoneButton />

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
          <div className="flex items-center gap-2">
            {contractCount === null ? (
              <span className="text-sm text-gray-400 animate-pulse">...</span>
            ) : (
              <span className="text-2xl font-black text-green-600">
                {contractCount}
                <span className="text-xs font-semibold text-gray-500 ml-0.5">件</span>
              </span>
            )}
            <span className="text-gray-400 text-lg">›</span>
          </div>
        </Link>

        {/* 旅行サブスクボタン */}
        {(() => {
          // Lv別カラー定義（level 1〜5）
          const LV_STYLE: Record<number, { bg: string; border: string; badge: string; text: string }> = {
            1: { bg: "bg-violet-50",  border: "border-violet-200", badge: "bg-violet-500 text-white",  text: "text-violet-700" },
            2: { bg: "bg-blue-50",    border: "border-blue-200",   badge: "bg-blue-500 text-white",    text: "text-blue-700" },
            3: { bg: "bg-emerald-50", border: "border-emerald-200",badge: "bg-emerald-500 text-white", text: "text-emerald-700" },
            4: { bg: "bg-amber-50",   border: "border-amber-200",  badge: "bg-amber-500 text-white",   text: "text-amber-700" },
            5: { bg: "bg-rose-50",    border: "border-rose-200",   badge: "bg-rose-500 text-white",    text: "text-rose-700" },
          };

          // 強制ステータス別の特別スタイル
          const FORCE_STYLE = {
            forced_active:   { bg: "bg-cyan-50",   border: "border-cyan-300",   badge: "bg-cyan-500 text-white",   text: "text-cyan-700",   label: "✨ 特別アクティブ" },
            forced_inactive: { bg: "bg-orange-50", border: "border-orange-300", badge: "bg-orange-500 text-white", text: "text-orange-700", label: "⏸ 一時停止中" },
          };

          if (!travelSub) {
            // ローディング中
            return (
              <div className="block bg-white rounded-2xl p-4 shadow flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✈️</span>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">旅行サブスク</p>
                    <p className="text-xs text-gray-400 animate-pulse mt-0.5">読み込み中...</p>
                  </div>
                </div>
              </div>
            );
          }

          const { displayStatus, sub } = travelSub;
          const lv = sub?.level ?? 1;
          const lvStyle = LV_STYLE[lv] ?? LV_STYLE[1];
          const forceStyle = sub?.forceStatus && sub.forceStatus !== "none"
            ? FORCE_STYLE[sub.forceStatus as keyof typeof FORCE_STYLE]
            : null;

          // 未登録
          if (displayStatus === "none") {
            return (
              <div className="block bg-white rounded-2xl p-4 shadow border-2 border-dashed border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✈️</span>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">旅行サブスク</p>
                    <p className="text-xs text-gray-500 mt-0.5">未登録</p>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1">
                  💤 未登録
                </span>
              </div>
            );
          }

          // 強制ステータス適用中
          const appliedStyle = forceStyle ?? (displayStatus === "active" ? null : null);
          const cardBg    = forceStyle ? forceStyle.bg    : (displayStatus === "active" ? lvStyle.bg    : "bg-slate-50");
          const cardBorder= forceStyle ? forceStyle.border: (displayStatus === "active" ? lvStyle.border : "border-slate-200");
          const badgeStyle= forceStyle ? forceStyle.badge : (displayStatus === "active" ? lvStyle.badge  : "bg-slate-400 text-white");
          const labelText = forceStyle ? forceStyle.label
            : displayStatus === "active" ? "✅ アクティブ" : "❌ 非アクティブ";

          return (
            <div className={`rounded-2xl p-4 shadow border-2 ${cardBg} ${cardBorder} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">✈️</span>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">旅行サブスク</p>
                  {sub && (
                    <p className="text-xs text-gray-500 mt-0.5">{sub.planName} · ¥{sub.monthlyFee.toLocaleString()}/月</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {sub && (
                  <span className={`rounded-full text-xs font-bold px-2.5 py-0.5 ${lvStyle.badge}`}>
                    Lv{lv}
                  </span>
                )}
                <span className={`rounded-full text-xs font-semibold px-2.5 py-1 ${badgeStyle}`}>
                  {labelText}
                </span>
              </div>
            </div>
          );
        })()}

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
              // VP phone関連メニューは /vp-phone に飛ばす
              const isVpPhone = m.title?.includes("phone") || m.title?.includes("Phone") ||
                m.title?.includes("未来phone") || m.linkUrl?.includes("vp-phone") ||
                m.iconType === "smartphone";
              const href = isVpPhone
                ? "/vp-phone"
                : m.menuType === "contact"
                  ? "/contact"
                  : (m.linkUrl ?? "#");
              return (
                <a key={m.id}
                  href={href}
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
              { href: "/orders/history",  icon: "📦", label: "福利厚生使用履歴" },
              { href: "/points/history", icon: "📊", label: "ポイント履歴" },
              { href: "/profile",        icon: "👤", label: "マイアカウント" },
              { href: "/referral",       icon: "🎁", label: "友達を紹介する" },
              { href: "/org-chart",     icon: "🌳", label: "直紹介 組織図" },
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
