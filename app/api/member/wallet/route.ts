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

  // 今月1日 00:00:00 (JST) を UTC に変換して月初を算出
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const monthStartJST = new Date(
    Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), 1, -9, 0, 0, 0)
  ); // JST 1日00:00 = UTC 前日15:00

  // PointWallet・MlmMember・今月分トランザクション を同時取得
  const [wallet, mlmMember, monthlyTxs] = await Promise.all([
    prisma.pointWallet.findUnique({ where: { userId } }),
    prisma.mlmMember.findUnique({ where: { userId }, select: { savingsPoints: true } }),
    prisma.pointTransaction.findMany({
      where: {
        userId,
        occurredAt: { gte: monthStartJST },
        transactionType: { in: ["grant", "adjust", "external_import"] },
        pointSourceType: { in: ["manual", "external"] },
        points: { gt: 0 }, // 付与のみ（消費・減算は除く）
      },
      select: { pointSourceType: true, points: true },
    }),
  ]);

  const savingsPoints = mlmMember?.savingsPoints ?? 0;

  // 今月分の manual / external 付与合計（表示用・DBの実値は変えない）
  type TxRow = { pointSourceType: string; points: number };
  const monthlyManualPt   = monthlyTxs.filter((t: TxRow) => t.pointSourceType === "manual").reduce((s: number, t: TxRow) => s + t.points, 0);
  const monthlyExternalPt = monthlyTxs.filter((t: TxRow) => t.pointSourceType === "external").reduce((s: number, t: TxRow) => s + t.points, 0);

  if (!wallet) {
    return NextResponse.json({
      savingsPoints,
      monthlyManualPt,
      monthlyExternalPt,
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
    monthlyManualPt,
    monthlyExternalPt,
    availablePointsBalance: wallet.availablePointsBalance,
    autoPointsBalance: wallet.autoPointsBalance,
    manualPointsBalance: wallet.manualPointsBalance,
    externalPointsBalance: wallet.externalPointsBalance,
    usedPointsBalance: wallet.usedPointsBalance,
    expiredPointsBalance: wallet.expiredPointsBalance,
  });
}
