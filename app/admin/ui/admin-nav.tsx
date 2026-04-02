"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SignOutButton from "@/app/components/sign-out-button";
import ViolaLogo from "@/app/components/viola-logo";

const navItems = [
  { href: "/admin", label: "🏠 ダッシュボード" },
  { href: "/admin/dashboard", label: "📊 売上 / ポイント" },
  { href: "/admin/menus", label: "📋 メニュー管理" },
  { href: "/admin/users", label: "👥 会員管理" },
  { href: "/admin/products", label: "📦 商品管理" },
  { href: "/admin/orders", label: "🛒 注文管理" },
  { href: "/admin/points/monthly", label: "💰 月次ポイント計算" },
  { href: "/admin/points/expire", label: "⏰ ポイント失効処理" },
  { href: "/admin/monthly-runs", label: "📅 月次実行履歴" },
  { href: "/admin/referral-history", label: "🔗 紹介者変更履歴" },
  { href: "/admin/audit", label: "🔍 監査ログ" },
  { href: "/admin/export", label: "📥 CSV エクスポート" },
  { href: "/admin/site-settings", label: "⚙️ サイト設定" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function handleNav(href: string) {
    if (pathname === href) return;
    setLoadingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <aside className="rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:h-fit">
      <div className="mb-6">
        {/* ロゴ */}
        <div className="flex items-center gap-2 mb-3">
          <ViolaLogo size="md" />
        </div>
        <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">管理画面</div>
      </div>

      {isPending && (
        <div className="mb-3 rounded-xl bg-blue-50 px-4 py-2 text-xs text-blue-600 text-center animate-pulse">
          読み込み中...
        </div>
      )}

      <nav className="space-y-1">
        {navItems.map(item => (
          <button
            key={item.href}
            onClick={() => handleNav(item.href)}
            disabled={isPending}
            className={`w-full text-left block rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60 ${
              isActive(item.href)
                ? "bg-slate-900 text-white font-semibold"
                : loadingHref === item.href
                ? "bg-slate-200 text-slate-700"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
            {loadingHref === item.href && isPending && (
              <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6 border-t pt-4">
        <SignOutButton className="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-100 transition-colors" />
      </div>
    </aside>
  );
}
