// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  // PointWallet と MlmMember.savingsPoints を同時取得
  const [wallet, mlmMember] = await Promise.all([
    prisma.pointWallet.findUnique({ where: { userId } }),
    prisma.mlmMember.findUnique({ where: { userId }, select: { savingsPoints: true } }),
  ]);

  const savingsPoints = mlmMember?.savingsPoints ?? 0;

  if (!wallet) {
    return NextResponse.json({
      savingsPoints,
      availablePointsBalance: 0,
      autoPointsBalance: 0,
      manualPointsBalance: 0,
      externalPointsBalance: 0,
      usedPointsBalance: 0,
      expiredPointsBalance: 0,
    });
  }

  return NextResponse.json({
    savingsPoints,
    availablePointsBalance: wallet.availablePointsBalance,
    autoPointsBalance: wallet.autoPointsBalance,
    manualPointsBalance: wallet.manualPointsBalance,
    externalPointsBalance: wallet.externalPointsBalance,
    usedPointsBalance: wallet.usedPointsBalance,
    expiredPointsBalance: wallet.expiredPointsBalance,
  });
}
