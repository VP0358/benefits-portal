// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";



import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-results/detail?bonusMonth=2026-02
 * ボーナス計算結果の詳細データを取得（30+項目）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    // ボーナス実行を取得
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
      include: {
        results: {
          include: {
            mlmMember: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { totalBonus: "desc" },
        },
      },
    });

    if (!bonusRun) {
      return NextResponse.json({
        bonusRun: null,
        results: [],
      });
    }

    // 結果を詳細フォーマットに変換
    const results = bonusRun.results.map((r) => ({
      id: r.id.toString(),
      memberCode: r.mlmMember.memberCode,
      memberName: r.mlmMember.user.name,
      companyName: r.mlmMember.companyName,
      status: r.mlmMember.status,

      // ボーナス項目
      directBonus: r.directBonus,
      unilevelBonus: r.unilevelBonus,
      rankUpBonus: r.rankUpBonus || 0,
      shareBonus: r.shareBonus || 0,
      structureBonus: r.structureBonus,
      savingsBonus: r.savingsBonus,

      // 合計・調整
      bonusTotal: r.totalBonus,
      carryoverAmount: r.carryoverAmount || 0,
      adjustmentAmount: r.adjustmentAmount || 0,
      otherPositionAmount: r.otherPositionAmount || 0,
      amountBeforeAdjustment: r.amountBeforeAdjustment || 0,

      // 支払調整
      paymentAdjustmentRate: r.paymentAdjustmentRate,
      paymentAdjustmentAmount: r.paymentAdjustmentAmount || 0,
      finalAmount: r.finalAmount || 0,

      // 税金・手数料
      consumptionTax: r.consumptionTax || 0,
      withholdingTax: r.withholdingTax || 0,
      shortageAmount: r.shortageAmount || 0,
      otherPositionShortage: r.otherPositionShortage || 0,
      serviceFee: r.serviceFee || 0,
      paymentAmount: r.paymentAmount || 0,

      // グループ情報
      groupActiveCount: r.groupActiveCount || 0,
      groupPoints: r.groupPoints,
      minLinePoints: r.minLinePoints || 0,
      lineCount: r.lineCount || 0,
      level1Lines: r.level1Lines || 0,
      level2Lines: r.level2Lines || 0,
      level3Lines: r.level3Lines || 0,

      // 個人情報
      selfPurchasePoints: r.selfPurchasePoints,
      directActiveCount: r.directActiveCount,

      // レベル情報
      previousTitleLevel: r.previousTitleLevel,
      newTitleLevel: r.newTitleLevel,
      achievedLevel: r.achievedLevel,
      forcedLevel: r.forcedLevel || 0,

      // 条件・フラグ
      conditions: r.conditions,
      savingsPoints: r.savingsPoints || 0,
      isActive: r.isActive,

      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      bonusRun: {
        id: bonusRun.id.toString(),
        bonusMonth: bonusRun.bonusMonth,
        status: bonusRun.status,
        totalMembers: bonusRun.totalMembers,
        totalActiveMembers: bonusRun.totalActiveMembers,
        totalBonusAmount: bonusRun.totalBonusAmount,
        paymentAdjustmentRate: bonusRun.paymentAdjustmentRate,
        capAdjustmentAmount: bonusRun.capAdjustmentAmount || 0,
        executedByAdminId: bonusRun.executedByAdminId?.toString(),
        confirmedAt: bonusRun.confirmedAt?.toISOString(),
        createdAt: bonusRun.createdAt.toISOString(),
      },
      results,
    });
  } catch (error) {
    console.error("Error fetching bonus results detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus results" },
      { status: 500 }
    );
  }
}
