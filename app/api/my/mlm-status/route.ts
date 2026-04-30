export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";
import { getMlmDisplayName } from "@/lib/mlm-display-name";
import { currentAndLastMonthJST } from "@/lib/japan-time";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id ?? "0");

  try {
    // ユーザー＋ウォレット
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pointWallet: true },
    });
    if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

    // MLM会員情報
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
    });
    if (!mlmMember) return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });

    // 今月・先月の計算（JST基準）
    const { currentMonth, lastMonth } = currentAndLastMonthJST();

    // 今月・先月の購入集計（MLM購入）
    const [currentPurchases, lastPurchases] = await Promise.all([
      prisma.mlmPurchase.aggregate({
        where: { mlmMemberId: mlmMember.id, purchaseMonth: currentMonth },
        _sum: { totalPoints: true, unitPrice: true },
        _count: true,
      }),
      prisma.mlmPurchase.aggregate({
        where: { mlmMemberId: mlmMember.id, purchaseMonth: lastMonth },
        _sum: { totalPoints: true, unitPrice: true },
        _count: true,
      }),
    ]);

    // 直紹介数（ユニレベル）
    const directCount = await prisma.mlmMember.count({
      where: { referrerId: mlmMember.id },
    });
    const directActiveCount = await prisma.mlmMember.count({
      where: { referrerId: mlmMember.id, status: "active" },
    });

    // 直下ダウンライン（マトリックス）
    const downlineCount = await prisma.mlmMember.count({
      where: { uplineId: mlmMember.id },
    });

    // 最新ボーナス結果（直近1件）
    const latestBonus = await prisma.bonusResult.findFirst({
      where: {
        mlmMemberId: mlmMember.id,
        bonusRun: { status: "confirmed" },
        isPublished: true,
      },
      include: {
        bonusRun: { select: { bonusMonth: true, confirmedAt: true } },
      },
      orderBy: { bonusMonth: "desc" },
    });

    // ポイントウォレット
    const wallet = user.pointWallet;

    return NextResponse.json({
      // 基本
      memberCode: mlmMember.memberCode,
      name: getMlmDisplayName(user.name, mlmMember.companyName),
      status: mlmMember.status,
      memberType: mlmMember.memberType,
      // レベル
      currentLevel: mlmMember.currentLevel,
      currentLevelLabel: LEVEL_LABELS[mlmMember.currentLevel] ?? "—",
      titleLevel: mlmMember.titleLevel,
      titleLevelLabel: LEVEL_LABELS[mlmMember.titleLevel] ?? "—",
      conditionAchieved: mlmMember.conditionAchieved,
      forceActive: mlmMember.forceActive,
      savingsPoints: mlmMember.savingsPoints,
      // 今月・先月購入
      currentMonth,
      lastMonth,
      currentMonthPoints: currentPurchases._sum.totalPoints ?? 0,
      currentMonthAmount: (currentPurchases._sum.unitPrice ?? 0),
      currentMonthCount: currentPurchases._count,
      lastMonthPoints: lastPurchases._sum.totalPoints ?? 0,
      lastMonthAmount: (lastPurchases._sum.unitPrice ?? 0),
      lastMonthCount: lastPurchases._count,
      // 組織
      directCount,
      directActiveCount,
      downlineCount,
      // ポイントウォレット
      autoPoints: wallet?.autoPointsBalance ?? 0,
      manualPoints: wallet?.manualPointsBalance ?? 0,
      externalPoints: wallet?.externalPointsBalance ?? 0,
      availablePoints: wallet?.availablePointsBalance ?? 0,
      // 最新ボーナス
      latestBonus: latestBonus
        ? {
            bonusMonth: latestBonus.bonusRun.bonusMonth,
            confirmedAt: latestBonus.bonusRun.confirmedAt?.toISOString() ?? null,
            isActive: latestBonus.isActive,
            paymentAmount: latestBonus.paymentAmount,
            totalBonus: latestBonus.amountBeforeAdjustment,
            groupPoints: latestBonus.groupPoints,
            groupActiveCount: latestBonus.groupActiveCount,
          }
        : null,
    });
  } catch (e) {
    console.error("mlm-status error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
