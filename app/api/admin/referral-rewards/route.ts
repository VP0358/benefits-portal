import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const REWARD_RATE = 0.25; // 月額の1/4

/**
 * 紹介者報酬計算一覧
 * - 各紹介者が直紹介した会員の「有効な携帯契約」の月額 × 1/4 を集計
 * - status=active かつ confirmedAt が設定済みの契約のみ対象
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const referrerId = searchParams.get("referrerId") ?? "";

  // 有効な携帯契約（active + confirmedAt あり）を全件取得、紹介関係込みで
  const contracts = await prisma.mobileContract.findMany({
    where: {
      status: "active",
      confirmedAt: { not: null },
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
                select: {
                  id: true,
                  memberCode: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { confirmedAt: "desc" },
  });

  // 紹介者ごとに集計
  const referrerMap = new Map<string, {
    referrerId: string;
    referrerCode: string;
    referrerName: string;
    totalReward: number;
    contracts: Array<{
      contractId: string;
      contractedUserId: string;
      contractedUserCode: string;
      contractedUserName: string;
      planName: string;
      monthlyFee: number;
      reward: number;
      confirmedAt: string;
    }>;
  }>();

  for (const contract of contracts) {
    const referral = contract.user.referrals[0];
    if (!referral?.referrer) continue;

    const ref = referral.referrer;
    const refIdStr = ref.id.toString();

    // referrerId フィルタ
    if (referrerId && refIdStr !== referrerId) continue;

    if (!referrerMap.has(refIdStr)) {
      referrerMap.set(refIdStr, {
        referrerId: refIdStr,
        referrerCode: ref.memberCode,
        referrerName: ref.name,
        totalReward: 0,
        contracts: [],
      });
    }

    const fee = Number(contract.monthlyFee);
    const reward = Math.floor(fee * REWARD_RATE);

    const entry = referrerMap.get(refIdStr)!;
    entry.totalReward += reward;
    entry.contracts.push({
      contractId: contract.id.toString(),
      contractedUserId: contract.user.id.toString(),
      contractedUserCode: contract.user.memberCode,
      contractedUserName: contract.user.name,
      planName: contract.planName,
      monthlyFee: fee,
      reward,
      confirmedAt: contract.confirmedAt!.toISOString(),
    });
  }

  const result = Array.from(referrerMap.values())
    .sort((a, b) => b.totalReward - a.totalReward);

  return NextResponse.json({
    rewardRate: REWARD_RATE,
    totalReferrers: result.length,
    totalRewardPoints: result.reduce((s, r) => s + r.totalReward, 0),
    referrers: result,
  });
}
