// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const REWARD_RATE = 0.25;

/**
 * 紹介者報酬計算一覧（初回ショット配当方式）
 * GET /api/admin/referral-rewards?year=2026&month=4
 *
 * - year / month 指定 → その月に confirmedAt がある契約（初回確定時のみ）を対象
 * - 省略 → 全期間（confirmedAt あり）
 *
 * ショット配当：契約確定時（confirmedAt設定時）に1回だけ発生
 * 毎月繰り返しではなく、初回のみ配当
 *
 * レスポンス:
 *   rewardRate, year, month, totalReferrers, totalContracts,
 *   totalFee, totalReward, referrers[]
 *
 * referrers[]:
 *   referrerId, referrerCode, referrerName,
 *   contractCount, totalFee, totalReward,
 *   planStats[]: { planName, count, totalFee, reward }
 *   contracts[]:  { ... confirmedAt }
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const yearParam  = searchParams.get("year");
  const monthParam = searchParams.get("month");

  // 月フィルター範囲を計算（confirmedAt ベース）
  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (yearParam && monthParam) {
    const y = parseInt(yearParam);
    const m = parseInt(monthParam); // 1-12
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 1);
    dateFilter = { gte: from, lt: to };
  }

  // 携帯契約を取得（ショット配当：confirmedAt が設定された契約が対象）
  // ステータスに関わらず confirmedAt がある契約をすべて対象とする
  const contracts = await prisma.mobileContract.findMany({
    where: {
      confirmedAt: dateFilter ? dateFilter : { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          memberCode: true,
          name: true,
          referrals: {
            where: { isActive: true },
            include: {
              referrer: {
                select: { id: true, memberCode: true, name: true },
              },
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { confirmedAt: "desc" },
  });

  // 紹介者ごとに集計
  type PlanStat = {
    planName: string;
    count: number;
    totalFee: number;
    reward: number;
  };
  type ContractDetail = {
    contractId: string;
    contractedUserId: string;
    contractedUserCode: string;
    contractedUserName: string;
    planName: string;
    monthlyFee: number;
    reward: number;
    confirmedAt: string;
  };
  type ReferrerEntry = {
    referrerId: string;
    referrerCode: string;
    referrerName: string;
    contractCount: number;
    totalFee: number;
    totalReward: number;
    planStats: PlanStat[];
    contracts: ContractDetail[];
  };

  const referrerMap = new Map<string, ReferrerEntry>();

  for (const contract of contracts) {
    const referral = contract.user.referrals[0];
    if (!referral?.referrer) continue;

    const ref      = referral.referrer;
    const refIdStr = ref.id.toString();
    const fee      = Number(contract.monthlyFee);
    const reward   = Math.floor(fee * REWARD_RATE);

    if (!referrerMap.has(refIdStr)) {
      referrerMap.set(refIdStr, {
        referrerId:    refIdStr,
        referrerCode:  ref.memberCode,
        referrerName:  ref.name,
        contractCount: 0,
        totalFee:      0,
        totalReward:   0,
        planStats:     [],
        contracts:     [],
      });
    }

    const entry = referrerMap.get(refIdStr)!;
    entry.contractCount++;
    entry.totalFee    += fee;
    entry.totalReward += reward;

    // プラン統計を集計
    const planStat = entry.planStats.find(p => p.planName === contract.planName);
    if (planStat) {
      planStat.count++;
      planStat.totalFee += fee;
      planStat.reward   += reward;
    } else {
      entry.planStats.push({
        planName: contract.planName,
        count:    1,
        totalFee: fee,
        reward,
      });
    }

    entry.contracts.push({
      contractId:          contract.id.toString(),
      contractedUserId:    contract.user.id.toString(),
      contractedUserCode:  contract.user.memberCode,
      contractedUserName:  contract.user.name,
      planName:            contract.planName,
      monthlyFee:          fee,
      reward,
      confirmedAt:         contract.confirmedAt!.toISOString(),
    });
  }

  const referrers = Array.from(referrerMap.values())
    .sort((a, b) => b.totalReward - a.totalReward);

  const totalContracts = referrers.reduce((s, r) => s + r.contractCount, 0);
  const totalFee       = referrers.reduce((s, r) => s + r.totalFee, 0);
  const totalReward    = referrers.reduce((s, r) => s + r.totalReward, 0);

  return NextResponse.json({
    rewardRate:     REWARD_RATE,
    rewardType:     "shot",  // ショット配当（初回のみ）
    year:           yearParam  ? parseInt(yearParam)  : null,
    month:          monthParam ? parseInt(monthParam) : null,
    totalReferrers: referrers.length,
    totalContracts,
    totalFee,
    totalReward,
    referrers,
  });
}
