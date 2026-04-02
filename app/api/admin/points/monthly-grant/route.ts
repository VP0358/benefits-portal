import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const schema = z.object({
  rewardMonth: z.string().regex(/^\d{4}-\d{2}$/),
  closingDate: z.string(),
  execute: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const isExecute = url.pathname.endsWith("/execute");

  const json = await req.json();
  const parsed = schema.safeParse({ ...json, execute: isExecute });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const { rewardMonth, closingDate } = parsed.data;
  const closingDateObj = new Date(closingDate);

  // 有効な契約一覧を取得
  const contracts = await prisma.mobileContract.findMany({
    where: {
      status: "active",
      confirmedAt: { lte: closingDateObj },
    },
    include: {
      user: true,
    },
  });

  const REWARD_RATE = 0.25;
  const targets = [];
  let totalReferrers = 0;
  let totalRewardPoints = 0;

  for (const contract of contracts) {
    const referrals = await prisma.userReferral.findMany({
      where: {
        userId: contract.userId,
        isActive: true,
        validFrom: { lte: closingDateObj },
        OR: [{ validTo: null }, { validTo: { gte: closingDateObj } }],
      },
      include: { referrer: true },
    });

    const referrerList = referrals.map((ref) => {
      const rewardPoints = Math.floor(Number(contract.monthlyFee) * REWARD_RATE);
      return {
        referrerUserId: ref.referrerUserId.toString(),
        referrerUserName: ref.referrer.name,
        rewardPoints,
        referralRelationId: ref.id,
      };
    });

    totalReferrers += referrerList.length;
    totalRewardPoints += referrerList.reduce((sum, r) => sum + r.rewardPoints, 0);

    targets.push({
      contractId: contract.id.toString(),
      contractedUserName: contract.user.name,
      baseMonthlyFee: Number(contract.monthlyFee),
      referrers: referrerList.map(r => ({ ...r, referrerUserId: r.referrerUserId })),
    });
  }

  if (isExecute) {
    // 重複チェック
    const existingRun = await prisma.monthlyRewardRun.findFirst({
      where: { rewardMonth, mode: "execute" },
    });
    if (existingRun) {
      return NextResponse.json({ error: `${rewardMonth}の本実行は既に完了しています` }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      for (const contract of contracts) {
        const referrals = await tx.userReferral.findMany({
          where: {
            userId: contract.userId,
            isActive: true,
            validFrom: { lte: closingDateObj },
            OR: [{ validTo: null }, { validTo: { gte: closingDateObj } }],
          },
        });

        for (const ref of referrals) {
          const rewardPoints = Math.floor(Number(contract.monthlyFee) * REWARD_RATE);

          const existing = await tx.contractReferralReward.findFirst({
            where: { contractId: contract.id, referrerUserId: ref.referrerUserId, rewardMonth },
          });
          if (existing) continue;

          await tx.contractReferralReward.create({
            data: {
              contractId: contract.id,
              contractedUserId: contract.userId,
              referrerUserId: ref.referrerUserId,
              referralRelationId: ref.id,
              rewardMonth,
              baseMonthlyFee: contract.monthlyFee,
              rewardRate: REWARD_RATE,
              rewardPoints,
              calculationTargetDate: closingDateObj,
              status: "granted",
            },
          });

          const refWallet = await tx.pointWallet.upsert({
            where: { userId: ref.referrerUserId },
            create: {
              userId: ref.referrerUserId,
              autoPointsBalance: rewardPoints,
              availablePointsBalance: rewardPoints,
            },
            update: {
              autoPointsBalance: { increment: rewardPoints },
              availablePointsBalance: { increment: rewardPoints },
            },
          });

          await tx.pointTransaction.create({
            data: {
              userId: ref.referrerUserId,
              transactionType: "grant",
              pointSourceType: "auto",
              points: rewardPoints,
              balanceAfter: refWallet.availablePointsBalance,
              description: `${rewardMonth} 月次紹介ポイント付与`,
              relatedContractId: contract.id,
              occurredAt: new Date(),
              createdByType: "system",
            },
          });
        }
      }

      await tx.monthlyRewardRun.create({
        data: {
          rewardMonth,
          closingDate: closingDateObj,
          mode: "execute",
          totalContracts: contracts.length,
          totalReferrers,
          totalRewardPoints,
          executedByAdminId: adminId,
        },
      });
    });

    return NextResponse.json({ grantedCount: totalReferrers, totalRewardPoints, rewardMonth });
  }

  // プレビュー
  await prisma.monthlyRewardRun.create({
    data: {
      rewardMonth,
      closingDate: closingDateObj,
      mode: "preview",
      totalContracts: contracts.length,
      totalReferrers,
      totalRewardPoints,
      executedByAdminId: adminId,
    },
  });

  return NextResponse.json({ rewardMonth, closingDate, totalContracts: contracts.length, totalReferrers, totalRewardPoints, targets });
}
