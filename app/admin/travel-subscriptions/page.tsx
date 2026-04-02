import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TravelSubsActions from "./ui/travel-subs-actions";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "申込中",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active:    { label: "有効",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  canceled:  { label: "解約済",  cls: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "停止中",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const LV_COLORS = [
  "", // 0: unused
  "bg-violet-100 text-violet-700 border-violet-200",  // Lv1
  "bg-blue-100 text-blue-700 border-blue-200",         // Lv2
  "bg-emerald-100 text-emerald-700 border-emerald-200",// Lv3
  "bg-amber-100 text-amber-700 border-amber-200",      // Lv4
  "bg-rose-100 text-rose-700 border-rose-200",         // Lv5
];

const TIER_LABEL: Record<string, string> = {
  early:    "🌸 初回50名",
  standard: "📌 51名〜",
};

export default async function AdminTravelSubsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where = statusFilter
    ? { status: statusFilter as "pending" | "active" | "canceled" | "suspended" }
    : {};

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
            id: true,
            memberCode: true,
            name: true,
            referrals: {
              where: { isActive: true },
              include: {
                referrer: { select: { id: true, memberCode: true, name: true } },
              },
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

  const pages = Math.ceil(total / limit);
  const countByStatus = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]));
  const usersForForm = users.map(u => ({ id: u.id.toString(), memberCode: u.memberCode, name: u.name }));

  return (
    <main className="space-y-5">
      {/* ヘッダー・集計 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">✈️ 旅行サブスク一覧</h1>
            <p className="text-sm text-slate-500 mt-0.5">全 {total.toLocaleString()} 件</p>
          </div>
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
      </div>

      {/* 料金表 */}
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold text-slate-600 mb-3">料金マスター</div>
        <div className="grid grid-cols-2 gap-4">
          {(["early", "standard"] as const).map(tier => (
            <div key={tier} className={`rounded-2xl p-4 ${tier === "early" ? "bg-violet-50" : "bg-blue-50"}`}>
              <div className={`text-xs font-bold mb-3 ${tier === "early" ? "text-violet-700" : "text-blue-700"}`}>
                {tier === "early" ? "🌸 初回申込者50名まで" : "📌 申込者51名から"}
              </div>
              <div className="space-y-1">
                {[1,2,3,4,5].map(lv => (
                  <div key={lv} className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${tier === "early" ? "text-violet-800" : "text-blue-800"}`}>
                      Lv{lv}
                    </span>
                    <span className="font-bold text-slate-800">
                      ¥{(tier === "early"
                        ? [2000,1700,1500,1200,1000]
                        : [3000,2700,2500,2000,1500])[lv-1].toLocaleString()}
                      <span className="text-xs font-normal text-slate-500 ml-0.5">/ 月</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* フィルター + 新規登録 */}
      <div className="rounded-3xl bg-white p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "すべて" },
            { value: "active", label: "有効" },
            { value: "pending", label: "申込中" },
            { value: "suspended", label: "停止中" },
            { value: "canceled", label: "解約済" },
          ].map(opt => (
            <Link
              key={opt.value}
              href={`/admin/travel-subscriptions?status=${opt.value}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <TravelSubsActions users={usersForForm} mode="register-only" />
      </div>

      {/* テーブル */}
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">会員</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Lv</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">制度</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">月額</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">直紹介者</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">ステータス</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">確定日</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">備考</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    該当するサブスクリプションがありません
                  </td>
                </tr>
              )}
              {subs.map(s => {
                const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending;
                const referrer = s.user.referrals[0]?.referrer ?? null;
                const lvColor = LV_COLORS[s.level] ?? LV_COLORS[1];
                return (
                  <tr key={s.id.toString()} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${s.user.id}`}
                        className="font-medium text-slate-800 hover:text-slate-600">
                        {s.user.name}
                      </Link>
                      <div className="text-xs text-slate-400">{s.user.memberCode}</div>
                    </td>
                    {/* Lv バッジ */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${lvColor}`}>
                        Lv{s.level}
                      </span>
                    </td>
                    {/* 更新制度 */}
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
                          <span className="block text-xs text-slate-400">{referrer.memberCode}</span>
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
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString("ja-JP") : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 max-w-[100px] truncate">
                      {s.note ?? "—"}
                    </td>
                    <td className="px-5 py-3">
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
              <Link href={`/admin/travel-subscriptions?status=${statusFilter}&page=${page - 1}`}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">← 前へ</Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
            {page < pages && (
              <Link href={`/admin/travel-subscriptions?status=${statusFilter}&page=${page + 1}`}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">次へ →</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
