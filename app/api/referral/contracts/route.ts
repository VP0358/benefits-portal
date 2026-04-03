import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const rewards = await prisma.contractReferralReward.findMany({
    where: { referrerUserId: userId },
    orderBy: { createdAt: "desc" },
  });

  const thisMonthRewards = rewards.filter(r => r.rewardMonth === currentMonth);
  const totalPoints = rewards.reduce((sum, r) => sum + r.rewardPoints, 0);

  return NextResponse.json({
    currentMonth,
    thisMonthCount: thisMonthRewards.length,
    totalCount: rewards.length,
    totalPoints,
    rewards,
  });
}
