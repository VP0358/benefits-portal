// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, UNILEVEL_RATES } from "@/lib/mlm-bonus";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id ?? "0");

  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // ボーナス履歴取得（確定済み かつ 管理側で公開済みのもののみ）
    const results = await prisma.bonusResult.findMany({
      where: {
        mlmMemberId: mlmMember.id,
        bonusRun: { status: "confirmed" },
        isPublished: true,
      },
      include: {
        bonusRun: {
          select: { bonusMonth: true, status: true, confirmedAt: true },
        },
      },
      orderBy: { bonusMonth: "desc" },
      take: 36, // 直近3年分
    });

    const history = results.map((r) => {
      // ユニレベル段数詳細
      const detail = r.unilevelDetail as Record<string, number> | null;
      // 算出率テーブル（当月の実績レベルベース）
      const rates = UNILEVEL_RATES[r.achievedLevel] ?? UNILEVEL_RATES[0];

      return {
        bonusMonth: r.bonusMonth,
        confirmedAt: r.bonusRun.confirmedAt?.toISOString() ?? null,
        // アクティブ・レベル
        isActive: r.isActive,
        selfPurchasePoints: r.selfPurchasePoints,
        groupPoints: r.groupPoints,
        directActiveCount: r.directActiveCount,
        achievedLevel: r.achievedLevel,
        achievedLevelLabel: LEVEL_LABELS[r.achievedLevel] ?? "—",
        previousTitleLevel: r.previousTitleLevel,
        previousTitleLevelLabel: LEVEL_LABELS[r.previousTitleLevel] ?? "—",
        newTitleLevel: r.newTitleLevel,
        newTitleLevelLabel: LEVEL_LABELS[r.newTitleLevel] ?? "—",
        // ボーナス金額内訳
        directBonus: r.directBonus,
        unilevelBonus: r.unilevelBonus,
        rankUpBonus: r.rankUpBonus,
        shareBonus: r.shareBonus,
        structureBonus: r.structureBonus,
        savingsBonus: r.savingsBonus,
        carryoverAmount: r.carryoverAmount,
        adjustmentAmount: r.adjustmentAmount,
        otherPositionAmount: r.otherPositionAmount,
        totalBonus: r.totalBonus,
        // 支払い計算
        amountBeforeAdjustment: r.amountBeforeAdjustment,
        paymentAdjustmentRate: r.paymentAdjustmentRate ?? null,
        paymentAdjustmentAmount: r.paymentAdjustmentAmount,
        finalAmount: r.finalAmount,
        consumptionTax: r.consumptionTax,
        withholdingTax: r.withholdingTax,
        shortageAmount: r.shortageAmount,
        otherPositionShortage: r.otherPositionShortage,
        serviceFee: r.serviceFee,
        paymentAmount: r.paymentAmount,
        // 組織データ
        groupActiveCount: r.groupActiveCount,
        minLinePoints: r.minLinePoints,
        lineCount: r.lineCount,
        level1Lines: r.level1Lines,
        level2Lines: r.level2Lines,
        level3Lines: r.level3Lines,
        conditions: r.conditions ?? null,
        savingsPoints: r.savingsPoints,
        savingsPointsAdded: r.savingsPointsAdded,
        // ユニレベル段数内訳
        unilevelDetail: detail
          ? Object.entries(detail).map(([depth, amount]) => ({
              depth: Number(depth),
              amount,
              rate: rates[Number(depth) - 1] ?? 0,
            }))
          : [],
      };
    });

    return NextResponse.json({
      memberType: mlmMember.memberType,
      currentLevel: mlmMember.currentLevel,
      titleLevel: mlmMember.titleLevel,
      currentLevelLabel: LEVEL_LABELS[mlmMember.currentLevel] ?? "—",
      titleLevelLabel: LEVEL_LABELS[mlmMember.titleLevel] ?? "—",
      savingsPoints: mlmMember.savingsPoints,
      history,
    });
  } catch (e) {
    console.error("mlm-bonus-history error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
