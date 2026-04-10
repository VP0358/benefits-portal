"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useCallback } from "react";
import SignOutButton from "@/app/components/sign-out-button";

// グループごとのカラー設定
// color: [通常テキスト, アクティブテキスト, アクティブ背景, アイコン通常, アイコンアクティブ]
const groupColors: Record<string, { text: string; activeText: string; activeBg: string; icon: string; activeIcon: string; border: string }> = {
  mlm:    { text: "text-blue-300",   activeText: "text-blue-200",   activeBg: "bg-blue-900/40",   icon: "text-blue-400",   activeIcon: "text-blue-300",   border: "border-blue-800/60" },
  mobile: { text: "text-emerald-300",activeText: "text-emerald-200",activeBg: "bg-emerald-900/40",icon: "text-emerald-400",activeIcon: "text-emerald-300",border: "border-emerald-800/60" },
  travel: { text: "text-purple-300", activeText: "text-purple-200", activeBg: "bg-purple-900/40", icon: "text-purple-400", activeIcon: "text-purple-300", border: "border-purple-800/60" },
  export: { text: "text-amber-300",  activeText: "text-amber-200",  activeBg: "bg-amber-900/40",  icon: "text-amber-400",  activeIcon: "text-amber-300",  border: "border-amber-800/60" },
  other:  { text: "text-slate-300",  activeText: "text-slate-200",  activeBg: "bg-slate-800/60",  icon: "text-slate-400",  activeIcon: "text-slate-300",  border: "border-slate-700/60" },
}

// メニュー項目をグループ化
const menuGroups = [
  {
    id: "mlm",
    title: "MLM関連",
    icon: "fas fa-users",
    items: [
      { href: "/admin/mlm-members", label: "MLM会員管理", icon: "fas fa-id-card" },
      { href: "/admin/mlm-members/new", label: "新規会員登録", icon: "fas fa-user-plus" },
      { href: "/admin/mlm-organization", label: "組織図・リスト", icon: "fas fa-sitemap" },
      { href: "/admin/bonus-calculate", label: "ボーナス計算・処理", icon: "fas fa-calculator" },
      { href: "/admin/bonus-report-center", label: "ボーナス結果・レポート", icon: "fas fa-file-invoice-dollar" },
      { href: "/admin/bonus-utilities", label: "ボーナスユーティリティ", icon: "fas fa-tools" },
      { href: "/admin/bonus-settings", label: "ボーナス設定", icon: "fas fa-sliders-h" },
      { href: "/admin/autoship", label: "オートシップ管理", icon: "fas fa-sync" },
      { href: "/admin/products", label: "商品管理", icon: "fas fa-box" },
      { href: "/admin/product-purchases", label: "商品購入管理", icon: "fas fa-shopping-bag" },
      { href: "/admin/orders", label: "注文管理", icon: "fas fa-shopping-cart" },
      { href: "/admin/orders-shipping", label: "受注・発送状況", icon: "fas fa-shipping-fast" },
      { href: "/admin/shipping-labels", label: "発送伝票管理", icon: "fas fa-file-invoice" },
    ]
  },
  {
    id: "mobile",
    title: "携帯契約",
    icon: "fas fa-mobile-alt",
    items: [
      { href: "/admin/vp-phone", label: "VP未来phone申し込み", icon: "fas fa-mobile-alt" },
      { href: "/admin/vp-phone/stats", label: "携帯契約統計", icon: "fas fa-chart-bar" },
      { href: "/admin/contracts", label: "携帯契約一覧", icon: "fas fa-file-contract" },
      { href: "/admin/referral-rewards", label: "紹介者報酬計算", icon: "fas fa-gift" },
    ]
  },
  {
    id: "travel",
    title: "格安旅行",
    icon: "fas fa-plane",
    items: [
      { href: "/admin/travel-subscriptions", label: "旅行サブスク一覧", icon: "fas fa-plane" },
      { href: "/admin/travel-subscriptions/stats", label: "旅行サブスク統計", icon: "fas fa-chart-bar" },
    ]
  },
  {
    id: "export",
    title: "データ出力",
    icon: "fas fa-download",
    items: [
      { href: "/admin/export", label: "CSV/振込データ出力", icon: "fas fa-download" },
      { href: "/admin/dashboard", label: "売上/ポイントレポート", icon: "fas fa-chart-line" },
    ]
  },
  {
    id: "other",
    title: "システム設定",
    icon: "fas fa-cog",
    items: [
      { href: "/admin/members", label: "会員管理", icon: "fas fa-user" },
      { href: "/admin/points/monthly", label: "月次ポイント計算", icon: "fas fa-calendar-check" },
      { href: "/admin/points/expire", label: "ポイント失効処理", icon: "fas fa-clock" },
      { href: "/admin/monthly-runs", label: "月次実行履歴", icon: "fas fa-calendar-alt" },
      { href: "/admin/audit", label: "監査ログ", icon: "fas fa-search" },
      { href: "/admin/mail-settings", label: "送信メール編集", icon: "fas fa-envelope" },
      { href: "/admin/site-settings", label: "サイト設定", icon: "fas fa-cog" },
      { href: "/admin/announcements", label: "お知らせ管理", icon: "fas fa-bullhorn" },
      { href: "/admin/account", label: "ログイン情報変更", icon: "fas fa-key" },
    ]
  },
];

const CONTACT_HREF = "/admin/contacts";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // 初期状態: MLM関連を開く
    return new Set(["mlm"]);
  });

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

  useEffect(() => {
    if (pathname.startsWith(CONTACT_HREF)) {
      setTimeout(fetchUnread, 1500);
    }
    // 現在のパスが含まれるグループを自動で開く
    menuGroups.forEach(group => {
      if (group.items.some(item => pathname.startsWith(item.href) && item.href !== "/admin")) {
        setOpenGroups(prev => new Set([...prev, group.id]));
      }
    });
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

  function toggleGroup(groupId: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  const itemClass = (href: string) =>
    `w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
      isActive(href)
        ? "bg-violet-600 text-white font-semibold shadow-sm"
        : loadingHref === href
        ? "bg-gray-700 text-gray-300"
        : "text-gray-300 hover:bg-gray-700/60 hover:text-white"
    }`;

  return (
    <aside 
      className="flex flex-col bg-gray-900 text-white lg:sticky lg:top-0 lg:h-screen overflow-y-auto"
      style={{ width: '240px', minWidth: '240px', minHeight: '100vh' }}
    >
      {/* ロゴ・タイトル */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white text-lg font-bold shadow">
          V
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">VIOLA Pure</div>
          <div className="text-xs text-gray-400">管理システム</div>
        </div>
      </div>

      {/* ローディング表示 */}
      {isPending && (
        <div className="mx-3 mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs text-white text-center animate-pulse">
          読み込み中...
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {/* ダッシュボード */}
        <button
          onClick={() => handleNav("/admin")}
          disabled={isPending}
          className={itemClass("/admin")}
        >
          <i className="fas fa-home w-4 text-center text-xs"></i>
          <span>ダッシュボード</span>
          {loadingHref === "/admin" && isPending && (
            <span className="ml-auto inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          )}
        </button>

        {/* 相談窓口 */}
        <button
          onClick={() => handleNav(CONTACT_HREF)}
          disabled={isPending}
          className={`${itemClass(CONTACT_HREF)} justify-between`}
        >
          <span className="flex items-center gap-2">
            <i className="fas fa-comments w-4 text-center text-xs"></i>
            <span>相談窓口</span>
          </span>
          <span className="flex items-center gap-1">
            {loadingHref === CONTACT_HREF && isPending && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            )}
            {unreadCount > 0 && (
              <span className="rounded-full text-xs font-bold px-1.5 py-0.5 leading-none min-w-[20px] text-center bg-red-500 text-white animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </button>

        <div className="my-3 border-t border-gray-800" />

        {/* グループ化されたメニュー */}
        {menuGroups.map((group) => {
          const isOpen = openGroups.has(group.id);
          const hasActive = group.items.some(item => isActive(item.href));
          const c = groupColors[group.id] ?? groupColors.other;

          return (
            <div key={group.id} className="mb-1">
              {/* グループヘッダー（折りたたみ） */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  hasActive
                    ? `${c.activeText} ${c.activeBg}`
                    : `${c.text} hover:text-white hover:bg-gray-800/60`
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <i className={`${group.icon} w-4 text-center text-sm ${hasActive ? c.activeIcon : c.icon}`}></i>
                  <span className="text-sm font-bold tracking-wide">{group.title}</span>
                </span>
                <i className={`fas fa-chevron-${isOpen ? "up" : "down"} text-xs opacity-60`}></i>
              </button>

              {/* グループアイテム */}
              {isOpen && (
                <div className={`mt-1 ml-2 space-y-0.5 border-l-2 ${c.border} pl-2`}>
                  {group.items.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNav(item.href)}
                      disabled={isPending}
                      className={itemClass(item.href)}
                    >
                      <i className={`${item.icon} w-4 text-center text-xs opacity-70`}></i>
                      <span className="truncate">{item.label}</span>
                      {loadingHref === item.href && isPending && (
                        <span className="ml-auto inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* フッター */}
      <div className="px-3 py-4 border-t border-gray-800">
        <SignOutButton className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors" />
      </div>
    </aside>
  );
}
