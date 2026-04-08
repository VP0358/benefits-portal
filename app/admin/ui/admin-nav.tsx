"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useCallback } from "react";
import SignOutButton from "@/app/components/sign-out-button";
import ViolaLogo from "@/app/components/viola-logo";

const navItems = [
  { href: "/admin",                  label: "🏠 ダッシュボード" },
  { href: "/admin/dashboard",        label: "📊 売上 / ポイント" },
  { href: "/admin/menus",            label: "📋 メニュー管理" },
  { href: "/admin/members",          label: "👥 会員管理" },
  // ── MLM（CLAIR仕様）
  { href: "/admin/mlm-members",      label: "🌲 MLM会員管理" },
  { href: "/admin/bonus-run",        label: "🧮 MLMボーナス計算" },
  { href: "/admin/autoship",         label: "🔄 オートシップ管理" },
  // ── VP未来phone / 旅行
  { href: "/admin/contracts",        label: "📱 携帯契約一覧" },
  { href: "/admin/vp-phone",         label: "📲 VP未来phone申し込み" },
  { href: "/admin/travel-subscriptions", label: "✈️ 旅行サブスク一覧" },
  { href: "/admin/referral-rewards", label: "💰 紹介者報酬計算" },
  // ── 商品 / 注文 / 発送
  { href: "/admin/products",         label: "📦 商品管理" },
  { href: "/admin/orders",           label: "🛒 注文管理" },
  { href: "/admin/shipping-labels",  label: "🚚 発送伝票管理" },
  // ── ポイント
  { href: "/admin/points/monthly",   label: "🗓️ 月次ポイント計算" },
  { href: "/admin/points/expire",    label: "⏰ ポイント失効処理" },
  { href: "/admin/monthly-runs",     label: "📅 月次実行履歴" },
  // ── その他
  { href: "/admin/referral-history", label: "🔗 紹介者変更履歴" },
  { href: "/admin/audit",            label: "🔍 監査ログ" },
  { href: "/admin/export",           label: "📥 CSV エクスポート" },
  { href: "/admin/mail-settings",    label: "📧 送信メール編集" },
  { href: "/admin/site-settings",    label: "⚙️ サイト設定" },
  { href: "/admin/account",          label: "🔐 ログイン情報変更" },
  { href: "/admin/announcements",    label: "📢 お知らせ管理" },
];

// 相談窓口は特別扱い（未読バッジを付ける）
const CONTACT_HREF = "/admin/contacts";
const CONTACT_LABEL = "💬 相談窓口";


export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // 未読件数をポーリング（30秒ごと）
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/contacts/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 30_000);
    return () => clearInterval(timer);
  }, [fetchUnread]);

  // 相談ページに遷移したら未読を再取得
  useEffect(() => {
    if (pathname.startsWith(CONTACT_HREF)) {
      setTimeout(fetchUnread, 1500);
    }
  }, [pathname, fetchUnread]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function handleNav(href: string) {
    if (pathname === href) return;
    setLoadingHref(href);
    startTransition(() => { router.push(href); });
  }

  const itemClass = (href: string) =>
    `w-full text-left flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60 ${
      isActive(href)
        ? "bg-slate-900 text-white font-semibold"
        : loadingHref === href
        ? "bg-slate-200 text-slate-700"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <aside className="rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:h-fit">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ViolaLogo size="md" />
        </div>
        <div className="text-xs text-slate-700 border-t border-slate-100 pt-2">管理画面</div>
      </div>

      {isPending && (
        <div className="mb-3 rounded-xl bg-blue-50 px-4 py-2 text-xs text-blue-600 text-center animate-pulse">
          読み込み中...
        </div>
      )}

      <nav className="space-y-1">
        {/* 相談窓口（未読バッジ付き） */}
        <button
          onClick={() => handleNav(CONTACT_HREF)}
          disabled={isPending}
          className={itemClass(CONTACT_HREF)}
        >
          <span className="flex items-center gap-2">
            {CONTACT_LABEL}
            {loadingHref === CONTACT_HREF && isPending && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            )}
          </span>
          {unreadCount > 0 && (
            <span className={`rounded-full text-xs font-bold px-1.5 py-0.5 leading-none min-w-[20px] text-center ${
              isActive(CONTACT_HREF)
                ? "bg-red-500 text-white"
                : "bg-red-500 text-white animate-pulse"
            }`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* 通常メニュー */}
        {navItems.map(item => (
          <button
            key={item.href}
            onClick={() => handleNav(item.href)}
            disabled={isPending}
            className={itemClass(item.href)}
          >
            <span>
              {item.label}
              {loadingHref === item.href && isPending && (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              )}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-6 border-t pt-4">
        <SignOutButton className="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors" />
      </div>
    </aside>
  );
}
