import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ContractsOrgChart from "./ui/contracts-org-chart";
import MemberStatsSummary from "@/app/admin/ui/member-stats-summary";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "申込中",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active:    { label: "有効",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  canceled:  { label: "解約済",  cls: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "停止中",  cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const REWARD_RATE = 0.25;

// 2026年4月末：特別キャンペーン対象の契約期限
const CAMPAIGN_DEADLINE = new Date("2026-04-30T23:59:59.999Z");

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; tab?: string; campaign?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp = await searchParams;
  const activeTab = sp.tab ?? "list"; // "list" | "org"
  const statusFilter = sp.status ?? "";
  const campaignFilter = sp.campaign ?? ""; // "campaign" | "normal" | ""
  const page = Math.max(1, Number(sp.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where: {
    status?: "pending" | "active" | "canceled" | "suspended";
    createdAt?: { lte?: Date; gt?: Date };
  } = {};
  if (statusFilter) {
    where.status = statusFilter as "pending" | "active" | "canceled" | "suspended";
  }
  if (campaignFilter === "campaign") {
    where.createdAt = { lte: CAMPAIGN_DEADLINE };
  } else if (campaignFilter === "normal") {
    where.createdAt = { gt: CAMPAIGN_DEADLINE };
  }

  // MLM会員IDセット（配当条件①）
  const mlmMemberUserIds = await prisma.mlmMember.findMany({
    select: { userId: true },
  });
  const mlmUserIdSet = new Set(mlmMemberUserIds.map(m => m.userId.toString()));

  const [total, contracts, statusCounts, campaignCount, normalCount] = await Promise.all([
    prisma.mobileContract.count({ where }),
    activeTab === "list"
      ? prisma.mobileContract.findMany({
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
                contracts: {
                  where: { status: { in: ["active", "pending"] } },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.mobileContract.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.mobileContract.count({ where: { createdAt: { lte: CAMPAIGN_DEADLINE } } }),
    prisma.mobileContract.count({ where: { createdAt: { gt: CAMPAIGN_DEADLINE } } }),
  ]);

  const pages = Math.ceil(total / limit);
  const countByStatus = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]));

  return (
    <main className="space-y-5">
      {/* 携帯契約 統計サマリー */}
      <MemberStatsSummary show={["mobile"]} compact />

      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📱 携帯契約管理</h1>
            <p className="text-sm text-slate-700 mt-0.5">全 {total.toLocaleString()} 件</p>
          </div>
          {/* 集計カード */}
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

        {/* キャンペーン集計 */}
        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-2 text-center min-w-[120px]">
            <div className="text-xs font-medium text-orange-700 mb-0.5">🎁 特別キャンペーン対象</div>
            <div className="text-lg font-bold text-orange-800">{campaignCount.toLocaleString()} 件</div>
            <div className="text-xs text-orange-600">2026年4月末まで</div>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2 text-center min-w-[120px]">
            <div className="text-xs font-medium text-slate-700 mb-0.5">通常契約</div>
            <div className="text-lg font-bold text-slate-800">{normalCount.toLocaleString()} 件</div>
            <div className="text-xs text-slate-600">2026年5月以降</div>
          </div>
        </div>

        {/* VP未来phone 紹介ツリーへのリンク */}
        <div className="mt-4 rounded-2xl bg-violet-50 border border-violet-200 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-violet-800">📱 VP未来phone 紹介ツリー</p>
            <p className="text-xs text-violet-600 mt-0.5">会員の紹介ネットワークとVP申込状況をツリー形式で管理</p>
          </div>
          <Link
            href="/admin/vp-phone"
            className="shrink-0 rounded-xl bg-violet-600 text-white text-xs font-bold px-4 py-2.5 hover:bg-violet-700 transition-colors"
          >
            VP申込管理 →
          </Link>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <Link
            href="/admin/contracts?tab=list"
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "list"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            📋 契約一覧
          </Link>
          <Link
            href="/admin/contracts?tab=org"
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "org"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            🌳 携帯契約 組織図
          </Link>
        </div>
      </div>

      {/* ─── 契約一覧タブ ─── */}
      {activeTab === "list" && (
        <>
          {/* フィルター */}
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {/* ステータスフィルター */}
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">ステータス</div>
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
                      href={`/admin/contracts?tab=list&status=${opt.value}&campaign=${campaignFilter}`}
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
              </div>
              {/* キャンペーンフィルター */}
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">キャンペーン区分</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "", label: "すべて" },
                    { value: "campaign", label: "🎁 特別キャンペーン対象（4月末まで）" },
                    { value: "normal", label: "通常契約（5月以降）" },
                  ].map(opt => (
                    <Link
                      key={opt.value}
                      href={`/admin/contracts?tab=list&status=${statusFilter}&campaign=${opt.value}`}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        campaignFilter === opt.value
                          ? opt.value === "campaign"
                            ? "bg-orange-500 text-white"
                            : "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 配当条件の説明 */}
          <div className="rounded-3xl bg-blue-50 border border-blue-200 p-4 shadow-sm">
            <div className="text-sm font-semibold text-blue-800 mb-1">💡 配当受け取り条件</div>
            <div className="text-xs text-blue-700 space-y-0.5">
              <div>✅ 自身もMLM会員登録していること</div>
              <div>✅ 自身も携帯契約をしていること</div>
              <div className="mt-1 text-blue-600">→ 下表の「配当資格」列で条件充足状況を確認できます</div>
            </div>
          </div>

          {/* テーブル */}
          <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">会員</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">キャンペーン</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">配当資格</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">プラン名</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">契約番号</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-800">月額</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      報酬額 (×1/4)
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">直紹介者</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">ステータス</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-800">契約日</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {contracts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-slate-700">
                        該当する契約がありません
                      </td>
                    </tr>
                  )}
                  {contracts.map(c => {
                    const s = STATUS_LABEL[c.status] ?? STATUS_LABEL.pending;
                    const referrer = c.user.referrals[0]?.referrer ?? null;
                    const reward = Math.floor(Number(c.monthlyFee) * REWARD_RATE);

                    // ①配当条件チェック
                    const isMlmMember = mlmUserIdSet.has(c.user.id.toString());
                    const hasContract = c.user.contracts.length > 0;
                    const canReceiveDividend = isMlmMember && hasContract;

                    // ③キャンペーン対象チェック
                    const isCampaign = new Date(c.createdAt) <= CAMPAIGN_DEADLINE;

                    return (
                      <tr
                        key={c.id.toString()}
                        className={`hover:bg-slate-50/50 transition-colors ${isCampaign ? "bg-orange-50/30" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/users/${c.user.id}`}
                            className="font-medium text-slate-800 hover:text-slate-600"
                          >
                            {c.user.name}
                          </Link>
                          <div className="text-xs text-slate-700">{c.user.memberCode}</div>
                        </td>
                        <td className="px-5 py-3">
                          {isCampaign ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-300 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                              🎁 特別
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">通常</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {canReceiveDividend ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                              ✅ 資格あり
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs text-red-600">
                                ❌ 資格なし
                              </span>
                              <div className="text-xs text-slate-500">
                                {!isMlmMember && <div>MLM未登録</div>}
                                {!hasContract && <div>契約なし</div>}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-700">{c.planName}</td>
                        <td className="px-5 py-3 text-slate-700 text-xs font-mono">{c.contractNumber}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          ¥{Number(c.monthlyFee).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {c.status === "active" && c.confirmedAt ? (
                            <span className="font-bold text-emerald-600">
                              ¥{reward.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {referrer ? (
                            <Link
                              href={`/admin/users/${referrer.id}`}
                              className="text-slate-700 hover:text-slate-500"
                            >
                              {referrer.name}
                              <span className="block text-xs text-slate-700">{referrer.memberCode}</span>
                            </Link>
                          ) : (
                            <span className="text-slate-500 text-xs">紹介なし</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-700">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString("ja-JP")
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/users/${c.user.id}`}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-200 transition-colors"
                          >
                            詳細
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {pages > 1 && (
              <div className="flex justify-center gap-2 px-5 py-4 border-t border-slate-100">
                {page > 1 && (
                  <Link
                    href={`/admin/contracts?tab=list&status=${statusFilter}&campaign=${campaignFilter}&page=${page - 1}`}
                    className="rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    ← 前へ
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-slate-700">
                  {page} / {pages}
                </span>
                {page < pages && (
                  <Link
                    href={`/admin/contracts?tab=list&status=${statusFilter}&campaign=${campaignFilter}&page=${page + 1}`}
                    className="rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    次へ →
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── 組織図タブ ─── */}
      {activeTab === "org" && <ContractsOrgChart />}
    </main>
  );
}
