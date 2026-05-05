"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useCallback } from "react";
import SignOutButton from "@/app/components/sign-out-button";

// ── グループカラー（視認性を高めた明確な色分け） ──
const menuGroups = [
  {
    id: "mlm",
    title: "MLM管理",
    icon: "fas fa-users",
    color: "#8b7cf8",        // バイオレット
    bgColor: "rgba(139,124,248,0.12)",
    borderColor: "rgba(139,124,248,0.3)",
    labelColor: "#a78bfa",
    items: [
      { href: "/admin/mlm-members", label: "MLM会員管理", icon: "fas fa-id-card" },
      { href: "/admin/mlm-members/new", label: "新規会員登録", icon: "fas fa-user-plus" },
      { href: "/admin/mlm-stats", label: "MLM月次統計", icon: "fas fa-chart-pie" },
      { href: "/admin/mlm-organization", label: "組織図・リスト", icon: "fas fa-sitemap" },
      { href: "/admin/bonus-calculate", label: "ボーナス計算・処理", icon: "fas fa-calculator" },
      { href: "/admin/bonus-report-center", label: "ボーナス結果・レポート", icon: "fas fa-file-invoice-dollar" },
      { href: "/admin/bonus-utilities", label: "ボーナスユーティリティ", icon: "fas fa-tools" },
      { href: "/admin/bonus-settings", label: "ボーナス設定", icon: "fas fa-sliders-h" },
      { href: "/admin/autoship", label: "継続購入管理", icon: "fas fa-sync" },
      { href: "/admin/products", label: "商品管理", icon: "fas fa-box" },
      { href: "/admin/product-purchases", label: "商品購入管理", icon: "fas fa-shopping-bag" },
      { href: "/admin/orders", label: "注文管理", icon: "fas fa-shopping-cart" },
      { href: "/admin/orders-shipping", label: "受注・発送状況", icon: "fas fa-shipping-fast" },
      { href: "/admin/shipping-labels", label: "発送伝票管理", icon: "fas fa-file-invoice" },
    ]
  },
  {
    id: "welfare",
    title: "福利厚生",
    icon: "fas fa-heart",
    color: "#f472b6",        // ピンク
    bgColor: "rgba(244,114,182,0.10)",
    borderColor: "rgba(244,114,182,0.28)",
    labelColor: "#f9a8d4",
    items: [
      // 携帯契約
      { href: "/admin/vp-phone",              label: "VP未来phone申し込み", icon: "fas fa-mobile-alt" },
      { href: "/admin/vp-phone/stats",        label: "携帯契約統計",       icon: "fas fa-chart-bar" },
      { href: "/admin/contracts",             label: "携帯契約一覧",       icon: "fas fa-file-contract" },
      { href: "/admin/referral-rewards",      label: "紹介者報酬計算",     icon: "fas fa-gift" },
      // 格安旅行
      { href: "/admin/travel-subscriptions",       label: "旅行サブスク一覧", icon: "fas fa-plane" },
      { href: "/admin/travel-subscriptions/stats", label: "旅行サブスク統計", icon: "fas fa-chart-bar" },
      // 福利厚生メニュー管理
      { href: "/admin/menus",     label: "福利厚生メニュー管理", icon: "fas fa-list" },
      { href: "/admin/menus/new", label: "新規メニュー追加",     icon: "fas fa-plus-circle" },
      // プラン・金額設定
      { href: "/admin/vp-phone-settings",  label: "VPphoneプラン設定",  icon: "fas fa-sliders-h" },
      { href: "/admin/used-car-settings",  label: "中古車ページ設定",   icon: "fas fa-car" },
    ]
  },
  {
    id: "export",
    title: "データ出力",
    icon: "fas fa-download",
    color: "#fbbf24",        // アンバー/ゴールド
    bgColor: "rgba(251,191,36,0.10)",
    borderColor: "rgba(251,191,36,0.28)",
    labelColor: "#fcd34d",
    items: [
      { href: "/admin/export", label: "CSV/振込データ出力", icon: "fas fa-download" },
      { href: "/admin/dashboard", label: "売上/ポイントレポート", icon: "fas fa-chart-line" },
    ]
  },
  {
    id: "other",
    title: "システム設定",
    icon: "fas fa-cog",
    color: "#94a3b8",        // スレート
    bgColor: "rgba(148,163,184,0.10)",
    borderColor: "rgba(148,163,184,0.25)",
    labelColor: "#cbd5e1",
    items: [
      { href: "/admin/members", label: "会員管理", icon: "fas fa-user" },
      { href: "/admin/import-members", label: "会員CSVインポート", icon: "fas fa-file-import" },
      { href: "/admin/points/monthly", label: "月次ポイント計算", icon: "fas fa-calendar-check" },
      { href: "/admin/points/expire", label: "ポイント失効処理", icon: "fas fa-clock" },
      { href: "/admin/monthly-runs", label: "月次実行履歴", icon: "fas fa-calendar-alt" },
      { href: "/admin/audit", label: "監査ログ", icon: "fas fa-search" },
      { href: "/admin/mail-settings", label: "送信メール編集", icon: "fas fa-envelope" },
      { href: "/admin/site-settings", label: "サイト設定", icon: "fas fa-cog" },
      { href: "/admin/announcements", label: "お知らせ管理", icon: "fas fa-bullhorn" },
      { href: "/admin/account", label: "ログイン情報変更", icon: "fas fa-key" },
      { href: "/admin/password-reset", label: "会員PW初期化", icon: "fas fa-lock-open" },
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(["mlm"]));

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
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <aside
      className="flex flex-col lg:sticky lg:top-0 lg:h-screen overflow-y-auto"
      style={{
        width: 256,
        minWidth: 256,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #07111f 0%, #0a1628 40%, #0d1830 100%)",
        borderRight: "1px solid rgba(201,168,76,0.12)",
        boxShadow: "4px 0 24px rgba(10,22,40,0.4)",
      }}
    >
      {/* ロゴヘッダー */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{
          borderBottom: "1px solid rgba(201,168,76,0.12)",
          background: "linear-gradient(135deg, rgba(201,168,76,0.06), transparent)",
        }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
            color: "#0a1628",
            boxShadow: "0 4px 12px rgba(201,168,76,0.4), 0 0 0 1px rgba(201,168,76,0.3)",
            fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif",
            letterSpacing: "0.1em",
          }}
        >
          VP
        </div>
        <div>
          <div
            className="text-sm font-bold leading-tight tracking-wide"
            style={{
              color: "#e8c96a",
              fontFamily: "var(--font-cormorant), 'Georgia', serif",
              fontSize: "15px",
              letterSpacing: "0.05em",
            }}
          >
            VIOLA Pure
          </div>
          <div
            className="text-[10px] tracking-widest uppercase mt-0.5"
            style={{
              color: "rgba(201,168,76,0.55)",
              fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif",
            }}
          >
            Admin Portal
          </div>
        </div>
      </div>

      {/* ローディング */}
      {isPending && (
        <div
          className="mx-4 mt-3 rounded-lg px-3 py-1.5 text-xs text-center animate-pulse"
          style={{ background: "rgba(201,168,76,0.10)", color: "#c9a84c" }}
        >
          読み込み中...
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">

        {/* ダッシュボード */}
        <NavItem
          href="/admin"
          label="ダッシュボード"
          icon="fas fa-home"
          active={isActive("/admin")}
          loading={loadingHref === "/admin" && isPending}
          onClick={() => handleNav("/admin")}
          disabled={isPending}
        />

        {/* 相談窓口 */}
        <button
          onClick={() => handleNav(CONTACT_HREF)}
          disabled={isPending}
          className="w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150 mt-0.5"
          style={isActive(CONTACT_HREF)
            ? {
              background: "linear-gradient(90deg, rgba(239,68,68,0.20), rgba(239,68,68,0.10))",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.25)",
            }
            : {
              color: "rgba(255,255,255,0.55)",
              border: "1px solid transparent",
            }
          }
          onMouseEnter={e => {
            if (!isActive(CONTACT_HREF)) {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
            }
          }}
          onMouseLeave={e => {
            if (!isActive(CONTACT_HREF)) {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
            }
          }}
        >
          <span className="flex items-center gap-2.5">
            <i className="fas fa-comments w-4 text-center text-xs" style={{ color: isActive(CONTACT_HREF) ? "#fca5a5" : "rgba(255,255,255,0.35)" }} />
            <span>相談窓口</span>
          </span>
          <span className="flex items-center gap-1">
            {loadingHref === CONTACT_HREF && isPending && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone-500 border-t-transparent" />
            )}
            {unreadCount > 0 && (
              <span
                className="rounded-full text-[10px] font-bold px-1.5 py-0.5 animate-pulse"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </button>

        {/* 区切り */}
        <div
          className="my-3"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.25) 30%, rgba(232,201,106,0.35) 50%, rgba(201,168,76,0.25) 70%, transparent)",
          }}
        />

        {/* グループ */}
        {menuGroups.map((group) => {
          const isOpen = openGroups.has(group.id);
          const hasActive = group.items.some(item => isActive(item.href));

          return (
            <div key={group.id} className="mb-1">
              {/* グループヘッダー */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-150"
                style={hasActive
                  ? {
                    background: group.bgColor,
                    border: `1px solid ${group.borderColor}`,
                    color: group.labelColor,
                  }
                  : {
                    background: "transparent",
                    border: "1px solid transparent",
                    color: "rgba(255,255,255,0.45)",
                  }
                }
                onMouseEnter={e => {
                  if (!hasActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
                  }
                }}
                onMouseLeave={e => {
                  if (!hasActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                  }
                }}
              >
                <span className="flex items-center gap-2.5">
                  {/* カラーインジケーター */}
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                    style={{
                      background: hasActive ? group.bgColor : "rgba(255,255,255,0.05)",
                      border: `1px solid ${hasActive ? group.borderColor : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <i
                      className={`${group.icon} text-[9px]`}
                      style={{ color: hasActive ? group.color : "rgba(255,255,255,0.3)" }}
                    />
                  </span>
                  <span
                    className="text-[11px] font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {group.title}
                  </span>
                </span>
                <i
                  className={`fas fa-chevron-${isOpen ? "up" : "down"} text-[9px] opacity-40`}
                />
              </button>

              {/* グループアイテム */}
              {isOpen && (
                <div
                  className="mt-0.5 ml-3 pb-1 space-y-0.5"
                  style={{ borderLeft: `2px solid ${group.borderColor}` }}
                >
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNav(item.href)}
                        disabled={isPending}
                        className="w-full text-left flex items-center gap-2.5 rounded-r-xl pl-4 pr-3 py-2 text-sm transition-all duration-150"
                        style={active
                          ? {
                            background: group.bgColor,
                            color: group.labelColor,
                            fontWeight: 600,
                            borderRight: `2px solid ${group.color}`,
                          }
                          : {
                            color: "rgba(255,255,255,0.50)",
                          }
                        }
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.50)";
                          }
                        }}
                      >
                        <i
                          className={`${item.icon} w-3.5 text-center text-[11px] flex-shrink-0`}
                          style={{ color: active ? group.color : "rgba(255,255,255,0.25)" }}
                        />
                        <span className="truncate text-[13px]">{item.label}</span>
                        {loadingHref === item.href && isPending && (
                          <span className="ml-auto inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone-500 border-t-transparent flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* フッター */}
      <div
        className="px-3 py-4"
        style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
      >
        <SignOutButton
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all"
          style={{ color: "rgba(255,255,255,0.35)" }}
        />
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  loading,
  onClick,
  disabled,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  loading: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-150"
      style={
        active
          ? {
            background: "linear-gradient(90deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))",
            color: "#e8c96a",
            fontWeight: 600,
            border: "1px solid rgba(201,168,76,0.25)",
          }
          : {
            color: "rgba(255,255,255,0.6)",
            border: "1px solid transparent",
          }
      }
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
        }
      }}
    >
      <i
        className={`${icon} w-4 text-center text-xs`}
        style={{ color: active ? "#c9a84c" : "rgba(255,255,255,0.35)" }}
      />
      <span>{label}</span>
      {loading && (
        <span className="ml-auto inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone-500 border-t-transparent" />
      )}
    </button>
  );
}
