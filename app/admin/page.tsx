import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminPage() {
  const [userCount, menuCount, orderCount, productCount, pendingVpPhone, planChangeCnt, contractCancelCnt, cancelApplyCnt] = await Promise.all([
    prisma.user.count(),
    prisma.menu.count(),
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.vpPhoneApplication.count({ where: { status: "pending" } }),
    prisma.vpPhoneApplication.count({ where: { adminNote: { contains: "【プラン変更申請】" } } }),
    prisma.vpPhoneApplication.count({ where: { adminNote: { contains: "【解約申請】" } } }),
    prisma.vpPhoneApplication.count({ where: { adminNote: { contains: "【申込取消申請】" } } }),
  ]);

  const totalRequests = planChangeCnt + contractCancelCnt + cancelApplyCnt;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="mt-2 text-slate-800">管理者向けの概要画面です。</p>
      </div>

      {/* ━━━ VP未来phone 要対応アラート ━━━ */}
      {(pendingVpPhone > 0 || totalRequests > 0) && (
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            📱 VP未来phone 要対応
          </h2>

          <div className="grid gap-3 md:grid-cols-2">

            {/* 審査待ち */}
            {pendingVpPhone > 0 && (
              <Link href="/admin/vp-phone?status=pending"
                className="flex items-center gap-4 rounded-2xl bg-yellow-50 border-2 border-yellow-300 px-5 py-4 hover:bg-yellow-100 transition">
                <span className="text-2xl">⏳</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-yellow-700">審査待ち</p>
                  <p className="text-2xl font-black text-yellow-800 leading-none mt-0.5">
                    {pendingVpPhone}<span className="text-sm font-semibold ml-1">件</span>
                  </p>
                </div>
                <span className="text-yellow-500 text-lg">›</span>
              </Link>
            )}

            {/* プラン変更申請 */}
            {planChangeCnt > 0 && (
              <Link href="/admin/vp-phone?view=plan_change"
                className="flex items-center gap-4 rounded-2xl bg-blue-50 border-2 border-blue-300 px-5 py-4 hover:bg-blue-100 transition">
                <span className="text-2xl">🔄</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700">プラン変更申請</p>
                  <p className="text-2xl font-black text-blue-800 leading-none mt-0.5">
                    {planChangeCnt}<span className="text-sm font-semibold ml-1">件</span>
                  </p>
                </div>
                <span className="text-blue-500 text-lg">›</span>
              </Link>
            )}

            {/* 解約申請 */}
            {contractCancelCnt > 0 && (
              <Link href="/admin/vp-phone?view=contract_cancel"
                className="flex items-center gap-4 rounded-2xl bg-red-50 border-2 border-red-300 px-5 py-4 hover:bg-red-100 transition">
                <span className="text-2xl">🚫</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-700">解約申請</p>
                  <p className="text-2xl font-black text-red-800 leading-none mt-0.5">
                    {contractCancelCnt}<span className="text-sm font-semibold ml-1">件</span>
                  </p>
                </div>
                <span className="text-red-500 text-lg">›</span>
              </Link>
            )}

            {/* 申込取消申請 */}
            {cancelApplyCnt > 0 && (
              <Link href="/admin/vp-phone?view=cancel_apply"
                className="flex items-center gap-4 rounded-2xl bg-orange-50 border-2 border-orange-300 px-5 py-4 hover:bg-orange-100 transition">
                <span className="text-2xl">✋</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-orange-700">申込取消申請</p>
                  <p className="text-2xl font-black text-orange-800 leading-none mt-0.5">
                    {cancelApplyCnt}<span className="text-sm font-semibold ml-1">件</span>
                  </p>
                </div>
                <span className="text-orange-500 text-lg">›</span>
              </Link>
            )}
          </div>

          {pendingVpPhone === 0 && totalRequests === 0 && (
            <p className="text-xs text-slate-500 text-center py-2">現在、対応が必要な申請はありません</p>
          )}
        </div>
      )}

      {/* ━━━ 基本サマリー ━━━ */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "会員数",  value: userCount,    href: "/admin/users",    icon: "👥" },
          { label: "メニュー数", value: menuCount, href: "/admin/menus",    icon: "📋" },
          { label: "商品数",  value: productCount, href: "/admin/products", icon: "🛍️" },
          { label: "注文数",  value: orderCount,   href: "/admin/orders",   icon: "📦" },
        ].map(item => (
          <Link key={item.label} href={item.href}
            className="rounded-3xl bg-white p-6 shadow-sm hover:shadow-md transition block">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{item.icon}</span>
              <div className="text-sm text-slate-700">{item.label}</div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{item.value}</div>
          </Link>
        ))}
      </div>

      {/* ━━━ MLM管理 ━━━ */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-4">🌲 MLM管理（CLAIR仕様）</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            { href: "/admin/mlm-members", label: "👥 MLM会員管理", desc: "会員タイプ・レベル・条件設定" },
            { href: "/admin/bonus-run",   label: "🧮 ボーナス計算", desc: "月次ボーナス自動計算・確定" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-3 hover:bg-violet-100 transition">
              <div className="flex-1">
                <div className="text-sm font-bold text-violet-800">{item.label}</div>
                <div className="text-xs text-violet-600">{item.desc}</div>
              </div>
              <span className="text-violet-400">›</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ━━━ クイックリンク ━━━ */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-4">🔗 クイックリンク</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/admin/vp-phone",             label: "📱 VP未来phone 申し込み管理" },
            { href: "/admin/contracts",             label: "📋 携帯契約管理" },
            { href: "/admin/travel-subscriptions", label: "✈️ 旅行サブスク管理" },
            { href: "/admin/members",              label: "👥 会員管理" },
            { href: "/admin/announcements",        label: "🔔 お知らせ管理" },
            { href: "/admin/points/monthly",       label: "💎 ポイント付与" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              {item.label}
              <span className="ml-auto text-slate-400">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
