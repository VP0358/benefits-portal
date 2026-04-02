import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const REWARD_RATE = 0.25;

/**
 * GET /api/my/referral-contracts
 * ログイン会員の「直紹介した会員の携帯契約」今月分を返す
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const now      = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // この会員が直紹介した会員のIDリスト
  const referrals = await prisma.userReferral.findMany({
    where: { referrerId: user.id, isActive: true },
    select: { userId: true, user: { select: { name: true, memberCode: true } } },
  });

  const referredUserIds = referrals.map(r => r.userId);

  if (referredUserIds.length === 0) {
    return NextResponse.json({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      thisMonthCount: 0,
      totalCount: 0,
      thisMonthFee: 0,
      thisMonthReward: 0,
      contracts: [],
    });
  }

  // 直紹介した会員の携帯契約を取得
  const [thisMonthContracts, allContracts] = await Promise.all([
    // 今月確定分
    prisma.mobileContract.findMany({
      where: {
        userId: { in: referredUserIds },
        status: "active",
        confirmedAt: { gte: monthStart, lt: monthEnd },
      },
      include: { user: { select: { name: true, memberCode: true } } },
      orderBy: { confirmedAt: "desc" },
    }),
    // 累計（有効なもの全て）
    prisma.mobileContract.count({
      where: {
        userId: { in: referredUserIds },
        status: "active",
        confirmedAt: { not: null },
      },
    }),
  ]);

  const thisMonthFee    = thisMonthContracts.reduce((s, c) => s + Number(c.monthlyFee), 0);
  const thisMonthReward = Math.floor(thisMonthFee * REWARD_RATE);

  return NextResponse.json({
    year:            now.getFullYear(),
    month:           now.getMonth() + 1,
    thisMonthCount:  thisMonthContracts.length,
    totalCount:      allContracts,
    thisMonthFee,
    thisMonthReward,
    contracts: thisMonthContracts.map(c => ({
      id:          c.id.toString(),
      userName:    c.user.name,
      memberCode:  c.user.memberCode,
      planName:    c.planName,
      monthlyFee:  Number(c.monthlyFee),
      reward:      Math.floor(Number(c.monthlyFee) * REWARD_RATE),
      confirmedAt: c.confirmedAt?.toISOString() ?? null,
    })),
  });
}
