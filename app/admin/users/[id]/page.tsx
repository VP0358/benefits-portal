import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReferralManager from "./ui/referral-manager";
import ContractForm from "./ui/contract-form";
import ContractList from "./ui/contract-list";
import ManualPointAdjuster from "./ui/manual-point-adjuster";
import TravelStatusPanel from "./ui/travel-status-panel";
import Link from "next/link";

// 2026年4月末：特別キャンペーン対象の契約期限
const CAMPAIGN_DEADLINE = new Date("2026-04-30T23:59:59.999Z");

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: bigint;
  try { userId = BigInt(id); } catch { notFound(); return; }

  const [user, referrerOptions, mlmMember, travelSub] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        pointWallet: true,
        referrals: { where: { isActive: true }, include: { referrer: true } },
        contracts: {
          orderBy: { createdAt: "desc" },
        },
        pointLogs: { orderBy: { occurredAt: "desc" }, take: 20 },
      },
    }),
    prisma.user.findMany({
      where: { id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
      take: 200,
    }),
    prisma.mlmMember.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        memberCode: true,
        memberType: true,
        status: true,
        currentLevel: true,
        titleLevel: true,
        contractDate: true,
      },
    }),
    prisma.travelSubscription.findFirst({
      where: { userId: userId, status: { not: "canceled" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, planName: true, level: true, pricingTier: true,
        monthlyFee: true, status: true, forceStatus: true,
        startedAt: true, confirmedAt: true, canceledAt: true, note: true,
      },
    }),
  ]);

  if (!user) notFound();

  const initialReferrals = user!.referrals.map(ref => ({
    id: ref.id.toString(),
    referrerName: ref.referrer.name,
    referrerEmail: ref.referrer.email,
    isActive: ref.isActive,
  }));

  const referrerItems = referrerOptions.map(item => ({ id: item.id.toString(), name: item.name, email: item.email }));

  // 旅行サブスクデータシリアライズ
  const travelSubData = travelSub ? {
    id: travelSub.id.toString(),
    planName: travelSub.planName,
    level: travelSub.level,
    pricingTier: travelSub.pricingTier,
    monthlyFee: Number(travelSub.monthlyFee),
    status: travelSub.status,
    forceStatus: travelSub.forceStatus,
    startedAt: travelSub.startedAt?.toISOString() ?? null,
    confirmedAt: travelSub.confirmedAt?.toISOString() ?? null,
    canceledAt: travelSub.canceledAt?.toISOString() ?? null,
    note: travelSub.note ?? null,
  } : null;

  // 配当条件チェック
  const isMlmMember = !!mlmMember;
  const activeContracts = user!.contracts.filter(c => c.status === "active" || c.status === "pending");
  const hasActiveContract = activeContracts.length > 0;
  const canReceiveDividend = isMlmMember && hasActiveContract;

  // キャンペーン対象の契約
  const campaignContracts = user!.contracts.filter(c => new Date(c.createdAt) <= CAMPAIGN_DEADLINE);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">会員詳細</h1>
        <p className="mt-2 text-slate-800">{user!.memberCode} / {user!.name}</p>
      </div>

      {/* 配当資格ステータス（目立つバナー） */}
      <div className={`rounded-3xl p-4 shadow-sm border ${canReceiveDividend ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-lg font-bold">
            {canReceiveDividend ? "✅ 配当受け取り資格あり" : "⚠️ 配当受け取り資格なし"}
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${isMlmMember ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-red-100 text-red-700 border-red-200"}`}>
              {isMlmMember ? "✅ MLM会員登録済み" : "❌ MLM未登録"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${hasActiveContract ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-red-100 text-red-700 border-red-200"}`}>
              {hasActiveContract ? "✅ 携帯契約あり" : "❌ 携帯契約なし"}
            </span>
          </div>
          {campaignContracts.length > 0 && (
            <span className="rounded-full bg-orange-100 text-orange-800 border border-orange-300 px-3 py-1 text-xs font-bold">
              🎁 特別キャンペーン対象 ({campaignContracts.length}件)
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-800">基本情報</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div>会員番号: <span className="font-medium">{user!.memberCode}</span></div>
            <div>氏名: <span className="font-medium">{user!.name}</span></div>
            {user!.nameKana && <div>フリガナ: <span className="font-medium">{user!.nameKana}</span></div>}
            <div>メール: {user!.email}</div>
            {user!.phone && <div>電話番号: {user!.phone}</div>}
            {user!.postalCode && <div>郵便番号: {user!.postalCode}</div>}
            {user!.address && <div>住所: {user!.address}</div>}
            <div>状態: <span className={`rounded-full px-2 py-0.5 text-xs ${user!.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user!.status}</span></div>
            {user!.referralCode && (
              <div>紹介コード: <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{user!.referralCode}</span></div>
            )}
          </div>
        </section>

        {/* MLM情報セクション */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-800">MLM会員情報</h2>
          {mlmMember ? (
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div>MLM会員コード: <span className="font-mono font-bold text-slate-800">{mlmMember.memberCode}</span></div>
              <div>会員種別: <span className="font-medium">{mlmMember.memberType}</span></div>
              <div>
                MLMステータス:
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${mlmMember.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {mlmMember.status}
                </span>
              </div>
              <div>現在レベル: <span className="font-medium">Lv.{mlmMember.currentLevel}</span></div>
              <div>タイトルレベル: <span className="font-medium">Lv.{mlmMember.titleLevel}</span></div>
              {mlmMember.contractDate && (
                <div>契約日: {new Date(mlmMember.contractDate).toLocaleDateString("ja-JP")}</div>
              )}
              <div className="mt-2">
                <Link
                  href={`/admin/mlm-members/${mlmMember.id}`}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  MLM詳細ページ →
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-500">
              <p>MLM会員登録なし</p>
              <Link
                href="/admin/mlm-members/new"
                className="mt-2 inline-block rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700 transition-colors"
              >
                MLM会員として登録 →
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-800">ポイント残高</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "自動", value: user!.pointWallet?.autoPointsBalance ?? 0 },
              { label: "手動", value: user!.pointWallet?.manualPointsBalance ?? 0 },
              { label: "外部", value: user!.pointWallet?.externalPointsBalance ?? 0 },
              { label: "利用可能", value: user!.pointWallet?.availablePointsBalance ?? 0 },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs text-slate-700">{item.label}ポイント</div>
                <div className="mt-1 text-lg font-bold text-slate-800">{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stone-800">✈️ 格安旅行サブスク</h2>
            <Link href="/admin/travel-subscriptions"
              className="text-xs text-slate-500 hover:text-slate-700 underline">
              一覧ページ →
            </Link>
          </div>
          <TravelStatusPanel sub={travelSubData} userId={user!.id.toString()} />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-800">紹介者管理</h2>
          <div className="mt-4">
            <ReferralManager userId={user!.id.toString()} initialReferrals={initialReferrals} referrerOptions={referrerItems} />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-800">契約登録</h2>
          <div className="mt-4"><ContractForm userId={user!.id.toString()} /></div>
        </section>
      </div>

      {/* 携帯契約詳細セクション */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-800">📱 携帯契約一覧</h2>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              全 {user!.contracts.length} 件
            </span>
            {campaignContracts.length > 0 && (
              <span className="rounded-full bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1 font-semibold">
                🎁 キャンペーン {campaignContracts.length} 件
              </span>
            )}
          </div>
        </div>

        {/* 契約ステータス集計 */}
        {user!.contracts.length > 0 && (
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["active", "pending", "suspended", "canceled"] as const).map(status => {
              const count = user!.contracts.filter(c => c.status === status).length;
              const labelMap: Record<string, { label: string; cls: string }> = {
                active:    { label: "有効",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                pending:   { label: "申込中",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                suspended: { label: "停止中",  cls: "bg-slate-100 text-slate-700 border-slate-200" },
                canceled:  { label: "解約済",  cls: "bg-red-50 text-red-700 border-red-200" },
              };
              const l = labelMap[status];
              return (
                <div key={status} className={`rounded-2xl border p-3 text-center ${l.cls}`}>
                  <div className="text-xs font-medium">{l.label}</div>
                  <div className="text-lg font-bold">{count}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2">
          <ContractList contracts={user!.contracts.map(c => ({
            id: c.id.toString(),
            contractNumber: c.contractNumber ?? "",
            planName: c.planName,
            monthlyFee: Number(c.monthlyFee),
            status: c.status,
            startedAt: c.startedAt?.toISOString() ?? null,
            confirmedAt: c.confirmedAt?.toISOString() ?? null,
            canceledAt: c.canceledAt?.toISOString() ?? null,
            createdAt: c.createdAt.toISOString(),
            isCampaign: new Date(c.createdAt) <= CAMPAIGN_DEADLINE,
          }))} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-stone-800">手動ポイント加算 / 減算</h2>
        <div className="mt-4"><ManualPointAdjuster userId={user!.id.toString()} /></div>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-stone-800">最新ポイント履歴</h2>
        <div className="mt-4 space-y-2 text-sm">
          {user!.pointLogs.length === 0 ? <div className="text-slate-700">履歴はありません。</div> : user!.pointLogs.map(log => (
            <div key={log.id.toString()} className="grid grid-cols-[160px_120px_100px_1fr] gap-4 rounded-2xl border p-3">
              <div className="text-slate-700">{new Date(log.occurredAt).toLocaleString("ja-JP")}</div>
              <div>{log.transactionType}</div>
              <div className={log.points > 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{log.points > 0 ? "+" : ""}{log.points.toLocaleString()}</div>
              <div className="text-slate-800">{log.description}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
