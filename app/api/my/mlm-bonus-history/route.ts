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

    // ボーナス履歴取得（確定済みのみ）
    const results = await prisma.bonusResult.findMany({
      where: {
        mlmMemberId: mlmMember.id,
        bonusRun: { status: "confirmed" },
      },
      include: {
        bonusRun: {
          select: { bonusMonth: true, status: true, confirmedAt: true },
        },
      },
      orderBy: { bonusMonth: "desc" },
      take: 24, // 直近2年分
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
        // ボーナス金額
        directBonus: r.directBonus,
        unilevelBonus: r.unilevelBonus,
        structureBonus: r.structureBonus,
        savingsBonus: r.savingsBonus,
        totalBonus: r.totalBonus,
        // ユニレベル段数内訳
        unilevelDetail: detail
          ? Object.entries(detail).map(([depth, amount]) => ({
              depth: Number(depth),
              amount,
              rate: rates[Number(depth) - 1] ?? 0,
            }))
          : [],
        savingsPointsAdded: r.savingsPointsAdded,
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
