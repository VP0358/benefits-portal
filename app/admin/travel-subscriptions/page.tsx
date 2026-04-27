import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TravelSubsActions from "./ui/travel-subs-actions";
import TravelForceActions from "./ui/travel-force-actions";
import MemberStatsSummary from "@/app/admin/ui/member-stats-summary";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "申込中",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active:    { label: "有効",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  canceled:  { label: "解約済",  cls: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "停止中",  cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const LV_COLORS = [
  "",
  "bg-violet-100 text-violet-700 border-violet-200",   // Lv1
  "bg-blue-100 text-blue-700 border-blue-200",          // Lv2
  "bg-emerald-100 text-emerald-700 border-emerald-200", // Lv3
  "bg-amber-100 text-amber-700 border-amber-200",       // Lv4
  "bg-rose-100 text-rose-700 border-rose-200",          // Lv5
];

const TIER_LABEL: Record<string, string> = {
  early:    "🌸 初回50名",
  standard: "📌 51名〜",
};

// forceStatus ラベル・色
const FORCE_LABEL: Record<string, { label: string; cls: string }> = {
  none:            { label: "",          cls: "" },
  forced_active:   { label: "✨ 強制アクティブ",  cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  forced_inactive: { label: "⏸ 強制非アクティブ", cls: "bg-orange-100 text-orange-700 border-orange-200" },
};

export default async function AdminTravelSubsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const tab = sp.tab ?? "list"; // "list" | "unregistered"
  const limit = 30;
  const skip = (page - 1) * limit;

  const where = statusFilter
    ? { status: statusFilter as "pending" | "active" | "canceled" | "suspended" }
    : {};

  // 全アクティブ会員数
  const totalActiveUsers = await prisma.user.count({ where: { status: "active" } });

  // サブスクを持つユーザーIDセット（canceled以外）
  const subsWithUsers = await prisma.travelSubscription.findMany({
    where: { status: { not: "canceled" } },
    select: { userId: true, status: true, forceStatus: true },
  });

  const activeSubUserIds = new Set(
    subsWithUsers.filter(s =>
      s.forceStatus === "forced_active" || (s.status === "active" && s.forceStatus !== "forced_inactive")
    ).map(s => s.userId.toString())
  );
  const inactiveSubUserIds = new Set(
    subsWithUsers.filter(s =>
      s.forceStatus === "forced_inactive" || (s.status !== "active" && s.forceStatus !== "forced_active")
    ).map(s => s.userId.toString())
  );
  const allSubUserIds = new Set(subsWithUsers.map(s => s.userId.toString()));

  const activeCount      = activeSubUserIds.size;
  const inactiveCount    = inactiveSubUserIds.size;
  const unregisteredCount = totalActiveUsers - allSubUserIds.size;

  const [total, subs, users, statusCounts] = await Promise.all([
    prisma.travelSubscription.count({ where }),
    prisma.travelSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, memberCode: true, name: true,
            referrals: {
              where: { isActive: true },
              include: { referrer: { select: { id: true, memberCode: true, name: true } } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, memberCode: true, name: true },
      where: { status: "active" },
      orderBy: { memberCode: "asc" },
    }),
    prisma.travelSubscription.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  // 未登録ユーザー一覧
  const unregisteredUsers = await prisma.user.findMany({
    where: {
      status: "active",
      id: { notIn: Array.from(allSubUserIds).map(id => BigInt(id)) },
    },
    select: {
      id: true, memberCode: true, name: true,
      referrals: {
        where: { isActive: true },
        include: { referrer: { select: { id: true, memberCode: true, name: true } } },
        take: 1,
      },
    },
    orderBy: { memberCode: "asc" },
  });

  const pages = Math.ceil(total / limit);
  const countByStatus = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]));
  const usersForForm = users.map(u => ({ id: u.id.toString(), memberCode: u.memberCode, name: u.name }));

  return (
    <main className="space-y-5">
      {/* 旅行サブスク 統計サマリー */}
      <MemberStatsSummary show={["travel"]} compact />

      {/* ヘッダー */}
      <div className="rounded-2xl bg-white border border-stone-100 p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#a78bfa" }}>Travel Subscriptions</p>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">旅行サブスク一覧</h1>
            <p className="text-sm text-stone-400 mt-0.5">全会員 {totalActiveUsers.toLocaleString()} 名</p>
          </div>
          <TravelSubsActions users={usersForForm} mode="register-only" />
        </div>

        {/* 3段サマリー：アクティブ / 非アクティブ / 未登録 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-xs font-semibold text-emerald-700 mb-1">アクティブ</div>
            <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
            <div className="text-xs text-emerald-500">名</div>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
            <div className="text-2xl mb-1">❌</div>
            <div className="text-xs font-semibold text-slate-600 mb-1">非アクティブ</div>
            <div className="text-2xl font-bold text-slate-700">{inactiveCount}</div>
            <div className="text-xs text-slate-400">名</div>
          </div>
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center">
            <div className="text-2xl mb-1">💤</div>
            <div className="text-xs font-semibold text-gray-600 mb-1">未登録</div>
            <div className="text-2xl font-bold text-gray-700">{unregisteredCount}</div>
            <div className="text-xs text-gray-600">名</div>
          </div>
        </div>

        {/* ステータス別カウント */}
        <div className="flex gap-3 flex-wrap">
          {(["active", "pending", "canceled", "suspended"] as const).map(s => (
            <div key={s} className="rounded-2xl bg-slate-50 px-4 py-2 text-center min-w-[72px]">
              <div className={`text-xs font-medium mb-0.5 ${STATUS_LABEL[s].cls.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                {STATUS_LABEL[s].label}
              </div>
              <div className="text-lg font-bold text-slate-800">{countByStatus[s] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 料金表 */}
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold text-slate-800 mb-3">料金マスター</div>
        <div className="grid grid-cols-2 gap-4">
          {(["early", "standard"] as const).map(tier => (
            <div key={tier} className={`rounded-2xl p-4 ${tier === "early" ? "bg-violet-50" : "bg-blue-50"}`}>
              <div className={`text-xs font-bold mb-3 ${tier === "early" ? "text-violet-700" : "text-blue-700"}`}>
                {tier === "early" ? "🌸 初回申込者50名まで" : "📌 申込者51名から"}
              </div>
              <div className="space-y-1">
                {[1,2,3,4,5].map(lv => (
                  <div key={lv} className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${tier === "early" ? "text-violet-800" : "text-blue-800"}`}>Lv{lv}</span>
                    <span className="font-bold text-slate-800">
                      ¥{(tier === "early"
                        ? [2000,1700,1500,1200,1000]
                        : [3000,2700,2500,2000,1500])[lv-1].toLocaleString()}
                      <span className="text-xs font-normal text-slate-700 ml-0.5">/ 月</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* タブ切替 */}
      <div className="rounded-2xl bg-white border border-stone-100 p-4">
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/travel-subscriptions?tab=list"
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            📋 契約一覧
          </Link>
          <Link
            href="/admin/travel-subscriptions?tab=unregistered"
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === "unregistered" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            💤 未登録者
            {unregisteredCount > 0 && (
              <span className={`rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[20px] text-center ${
                tab === "unregistered" ? "bg-white text-slate-900" : "bg-red-500 text-white"
              }`}>
                {unregisteredCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ─── 未登録者タブ ─── */}
      {tab === "unregistered" && (
        <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">💤 未登録会員一覧</div>
              <div className="text-xs text-slate-500 mt-0.5">旅行サブスク未登録のアクティブ会員</div>
            </div>
            <div className="text-sm font-bold text-slate-700">{unregisteredUsers.length} 名</div>
          </div>
          {unregisteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="text-4xl mb-2">🎉</div>
              未登録会員はいません
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {unregisteredUsers.map(u => {
                const referrer = u.referrals[0]?.referrer ?? null;
                return (
                  <div key={u.id.toString()} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <Link href={`/admin/users/${u.id}`}
                        className="font-medium text-slate-800 hover:text-slate-600 text-sm">
                        {u.name}
                      </Link>
                      <div className="text-xs text-slate-500">{u.memberCode}</div>
                      {referrer && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          紹介者: {referrer.name}（{referrer.memberCode}）
                        </div>
                      )}
                    </div>
                    <TravelForceActions
                      userId={u.id.toString()}
                      userName={u.name}
                      currentForceStatus="none"
                      hasSubsc={false}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 契約一覧タブ ─── */}
      {tab === "list" && (
        <>
          {/* フィルター */}
          <div className="rounded-2xl bg-white border border-stone-100 p-4 flex items-center gap-2 flex-wrap">
            {[
              { value: "", label: "すべて" },
              { value: "active", label: "有効" },
              { value: "pending", label: "申込中" },
              { value: "suspended", label: "停止中" },
              { value: "canceled", label: "解約済" },
            ].map(opt => (
              <Link
                key={opt.value}
                href={`/admin/travel-subscriptions?tab=list&status=${opt.value}`}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {/* テーブル */}
          <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">会員</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-800">Lv</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">制度</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-800">月額</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">直紹介者</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">ステータス</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">強制</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">確定日</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-slate-700">
                        該当するサブスクリプションがありません
                      </td>
                    </tr>
                  )}
                  {subs.map(s => {
                    const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending;
                    const referrer = s.user.referrals[0]?.referrer ?? null;
                    const lvColor = LV_COLORS[s.level] ?? LV_COLORS[1];
                    const forceInfo = FORCE_LABEL[s.forceStatus] ?? FORCE_LABEL.none;
                    return (
                      <tr key={s.id.toString()} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/admin/users/${s.user.id}`}
                            className="font-medium text-slate-800 hover:text-slate-600">
                            {s.user.name}
                          </Link>
                          <div className="text-xs text-slate-700">{s.user.memberCode}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${lvColor}`}>
                            Lv{s.level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${
                            s.pricingTier === "early" ? "text-violet-600" : "text-blue-600"
                          }`}>
                            {TIER_LABEL[s.pricingTier] ?? s.pricingTier}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-800">
                          ¥{Number(s.monthlyFee).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          {referrer ? (
                            <Link href={`/admin/users/${referrer.id}`} className="text-slate-700 hover:text-slate-500">
                              {referrer.name}
                              <span className="block text-xs text-slate-700">{referrer.memberCode}</span>
                            </Link>
                          ) : (
                            <span className="text-slate-300 text-xs">紹介なし</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        {/* 強制ステータスバッジ */}
                        <td className="px-4 py-3">
                          {forceInfo.label ? (
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${forceInfo.cls}`}>
                              {forceInfo.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-700">
                          {s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <TravelSubsActions
                              subId={s.id.toString()}
                              currentStatus={s.status}
                              users={usersForForm}
                              mode="actions-only"
                              sub={{
                                id: s.id.toString(),
                                planName: s.planName,
                                level: s.level,
                                pricingTier: s.pricingTier,
                                monthlyFee: Number(s.monthlyFee),
                                status: s.status,
                                startedAt: s.startedAt?.toISOString() ?? null,
                                confirmedAt: s.confirmedAt?.toISOString() ?? null,
                                note: s.note ?? null,
                              }}
                            />
                            {/* 強制アクティブ / 強制非アクティブ ボタン */}
                            {s.status !== "canceled" && (
                              <TravelForceActions
                                userId={s.user.id.toString()}
                                userName={s.user.name}
                                currentForceStatus={s.forceStatus}
                                hasSubsc={true}
                                currentStatus={s.status}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex justify-center gap-2 px-5 py-4 border-t border-slate-100">
                {page > 1 && (
                  <Link href={`/admin/travel-subscriptions?tab=list&status=${statusFilter}&page=${page - 1}`}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">← 前へ</Link>
                )}
                <span className="px-4 py-2 text-sm text-slate-700">{page} / {pages}</span>
                {page < pages && (
                  <Link href={`/admin/travel-subscriptions?tab=list&status=${statusFilter}&page=${page + 1}`}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">次へ →</Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
