export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * GET /api/admin/bonus-summary
 * 月別ボーナス集計サマリーを返す（最大18ヶ月分）
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    // 確定済み・下書きを含む全ボーナスランを取得（新しい順）
    const bonusRuns = await prisma.bonusRun.findMany({
      orderBy: { bonusMonth: "desc" },
      take: 18,
    });

    if (bonusRuns.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    const summaries = await Promise.all(
      bonusRuns.map(async (run) => {
        // 当月の全ボーナス結果を集計
        const agg = await prisma.bonusResult.aggregate({
          where: { bonusRunId: run.id },
          _sum: {
            directBonus: true,
            unilevelBonus: true,
            rankUpBonus: true,
            shareBonus: true,
            structureBonus: true,
            savingsBonus: true,
            carryoverAmount: true,
            adjustmentAmount: true,
            otherPositionAmount: true,
            amountBeforeAdjustment: true,
            paymentAdjustmentAmount: true,
            finalAmount: true,
            consumptionTax: true,
            withholdingTax: true,
            shortageAmount: true,
            serviceFee: true,
            paymentAmount: true,
            groupPoints: true,
            selfPurchasePoints: true,
          },
          _count: { id: true },
        });

        const s = agg._sum;
        const directBonus      = s.directBonus      ?? 0;
        const unilevelBonus    = s.unilevelBonus    ?? 0;
        const rankUpBonus      = s.rankUpBonus      ?? 0;
        const shareBonus       = s.shareBonus       ?? 0;
        const structureBonus   = s.structureBonus   ?? 0;
        const savingsBonus     = s.savingsBonus     ?? 0;
        const bonusTotal       = directBonus + unilevelBonus + rankUpBonus + shareBonus + structureBonus + savingsBonus;
        const carryover        = s.carryoverAmount  ?? 0;
        const adjustment       = s.adjustmentAmount ?? 0;
        const otherPosition    = s.otherPositionAmount ?? 0;
        const beforeAdjustment = s.amountBeforeAdjustment ?? 0;
        const adjAmount        = s.paymentAdjustmentAmount ?? 0;
        const finalAmount      = s.finalAmount      ?? 0;
        const consumptionTax   = s.consumptionTax   ?? 0;
        const withholdingTax   = s.withholdingTax   ?? 0;
        const shortage         = s.shortageAmount   ?? 0;
        const serviceFee       = s.serviceFee       ?? 0;
        const paymentTotal     = s.paymentAmount    ?? 0;
        const totalPoints      = s.groupPoints      ?? 0;
        const selfPoints       = s.selfPurchasePoints ?? 0;

        // 当月購入データ（MLM購入記録）から売上集計
        const [month_y, month_m] = run.bonusMonth.split("-").map(Number);
        const monthStart = new Date(month_y, month_m - 1, 1);
        const monthEnd   = new Date(month_y, month_m, 1);

        const purchaseAgg = await prisma.mlmPurchase.aggregate({
          where: {
            purchaseDate: { gte: monthStart, lt: monthEnd },
          },
          _sum: { totalAmount: true, points: true },
          _count: { id: true },
        });

        const salesTotal    = purchaseAgg._sum.totalAmount ?? 0;
        const salesExTax    = Math.round(salesTotal / 1.1);
        const tax10         = salesTotal - salesExTax;
        const purchaseCount = purchaseAgg._count.id ?? 0;

        // 支払率 = 支払額合計 / 売上合計
        const paymentRate = salesTotal > 0 ? Math.round((paymentTotal / salesTotal) * 10000) / 100 : 0;

        return {
          month:               run.bonusMonth,
          status:              run.status,
          totalMembers:        run.totalMembers,
          totalActiveMembers:  run.totalActiveMembers,
          // ボーナス内訳
          directBonus,
          unilevelBonus,
          rankUpBonus,
          shareBonus,
          structureBonus,
          savingsBonus,
          bonusTotal,
          // 調整
          carryover,
          adjustment,
          otherPosition,
          beforeAdjustmentTotal: beforeAdjustment,
          adjustmentRate:   run.paymentAdjustmentRate ?? 0,
          adjustmentAmount: adjAmount,
          finalTotal:       finalAmount,
          // 税・手数料
          consumptionTax,
          withholdingTax,
          shortage,
          serviceFee,
          paymentTotal,
          // ポイント・売上
          totalPoints,
          selfPoints,
          purchaseCount,
          salesExTax,
          tax8:        0,
          tax10,
          salesTotal,
          pointRate:   100,
          paymentRate,
          // その他
          capAdjustmentAmount: run.capAdjustmentAmount,
          shareSource:  0,
        };
      })
    );

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("bonus-summary error:", error);
    return NextResponse.json({ error: "Failed to fetch bonus summary" }, { status: 500 });
  }
}
