"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useCallback } from "react";
import SignOutButton from "@/app/components/sign-out-button";
import ViolaLogo from "@/app/components/viola-logo";

// メニュー項目をグループ化
const menuGroups = [
  {
    title: "メイン",
    items: [
      { href: "/admin", label: "ダッシュボード", icon: "fas fa-home" },
    ]
  },
  {
    title: "MLM関連",
    items: [
      { href: "/admin/mlm-members", label: "MLM会員管理", icon: "fas fa-users" },
      { href: "/admin/mlm-members/new", label: "MLM会員新規登録", icon: "fas fa-user-plus" },
      { href: "/admin/mlm-organization", label: "組織図・リスト", icon: "fas fa-sitemap" },
      { href: "/admin/bonus-run", label: "MLMボーナス計算", icon: "fas fa-coins" },
      { href: "/admin/bonus-summary", label: "ボーナス一覧", icon: "fas fa-chart-line" },
      { href: "/admin/bonus-process", label: "ボーナス計算処理", icon: "fas fa-calculator" },
      { href: "/admin/bonus-results", label: "ボーナス計算結果", icon: "fas fa-file-invoice-dollar" },
      { href: "/admin/bonus-reports", label: "ボーナス関連レポート", icon: "fas fa-file-alt" },
      { href: "/admin/bonus-utilities", label: "ボーナスユーティリティ", icon: "fas fa-tools" },
      { href: "/admin/autoship", label: "オートシップ管理", icon: "fas fa-sync" },
      { href: "/admin/products", label: "商品管理", icon: "fas fa-box" },
      { href: "/admin/product-purchases", label: "商品購入管理", icon: "fas fa-shopping-bag" },
      { href: "/admin/orders", label: "注文管理", icon: "fas fa-shopping-cart" },
      { href: "/admin/orders-shipping", label: "受注・発送状況", icon: "fas fa-shipping-fast" },
      { href: "/admin/shipping-labels", label: "発送伝票管理", icon: "fas fa-truck" },
    ]
  },
  {
    title: "携帯契約関連",
    items: [
      { href: "/admin/vp-phone", label: "VP未来phone申し込み", icon: "fas fa-mobile-alt" },
      { href: "/admin/contracts", label: "携帯契約一覧", icon: "fas fa-file-contract" },
      { href: "/admin/referral-rewards", label: "紹介者報酬計算", icon: "fas fa-gift" },
      { href: "/admin/referral-history", label: "紹介者変更履歴", icon: "fas fa-history" },
    ]
  },
  {
    title: "旅行サブスク関連",
    items: [
      { href: "/admin/travel-subscriptions", label: "旅行サブスク一覧", icon: "fas fa-plane" },
    ]
  },
  {
    title: "データエクスポート",
    items: [
      { href: "/admin/export", label: "CSV/振込データ出力", icon: "fas fa-download" },
    ]
  },
  {
    title: "その他",
    items: [
      { href: "/admin/dashboard", label: "売上/ポイント", icon: "fas fa-chart-line" },
      { href: "/admin/menus", label: "メニュー管理", icon: "fas fa-list" },
      { href: "/admin/members", label: "会員管理", icon: "fas fa-user" },
      { href: "/admin/points/monthly", label: "月次ポイント計算", icon: "fas fa-calendar-check" },
      { href: "/admin/points/expire", label: "ポイント失効処理", icon: "fas fa-clock" },
      { href: "/admin/monthly-runs", label: "月次実行履歴", icon: "fas fa-calendar-alt" },
      { href: "/admin/audit", label: "監査ログ", icon: "fas fa-search" },
      { href: "/admin/mail-settings", label: "送信メール編集", icon: "fas fa-envelope" },
      { href: "/admin/site-settings", label: "サイト設定", icon: "fas fa-cog" },
      { href: "/admin/account", label: "ログイン情報変更", icon: "fas fa-key" },
      { href: "/admin/announcements", label: "お知らせ管理", icon: "fas fa-bullhorn" },
    ]
  },
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
    `w-full text-left flex items-center justify-between rounded px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
      isActive(href)
        ? "bg-blue-600 text-white font-semibold"
        : loadingHref === href
        ? "bg-gray-700 text-gray-300"
        : "text-gray-300 hover:bg-gray-700"
    }`;

  return (
    <aside className="bg-gray-800 text-white p-4 lg:sticky lg:top-0 lg:h-screen overflow-y-auto" style={{ width: '250px', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <i className="fas fa-tasks"></i>
          統合管理
        </h1>
      </div>

      {/* ローディング表示 */}
      {isPending && (
        <div className="mb-3 rounded bg-blue-600 px-4 py-2 text-xs text-white text-center animate-pulse">
          読み込み中...
        </div>
      )}

      <nav className="space-y-6">
        {/* 相談窓口（未読バッジ付き） - 特別扱い */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase">相談窓口</h2>
          <button
            onClick={() => handleNav(CONTACT_HREF)}
            disabled={isPending}
            className={itemClass(CONTACT_HREF)}
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-comments"></i>
              相談窓口
              {loadingHref === CONTACT_HREF && isPending && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              )}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full text-xs font-bold px-1.5 py-0.5 leading-none min-w-[20px] text-center bg-red-500 text-white animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* グループ化されたメニュー */}
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase">{group.title}</h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  disabled={isPending}
                  className={itemClass(item.href)}
                >
                  <span className="flex items-center gap-2">
                    <i className={item.icon}></i>
                    {item.label}
                    {loadingHref === item.href && isPending && (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* サインアウト */}
      <div className="mt-8 pt-4 border-t border-gray-700">
        <SignOutButton className="block w-full rounded px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors" />
      </div>
    </aside>
  );
}
