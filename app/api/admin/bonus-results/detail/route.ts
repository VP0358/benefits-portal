// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

/**
 * GET /api/admin/bonus-results/detail?bonusMonth=2026-02
 * ボーナス計算結果の詳細データを取得
 *
 * 複数ポジション取得者は baseCode（memberCode先頭6桁）で合算し、
 * 各ポジションの詳細は positions[] 配列に格納する。
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
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
      include: {
        results: {
          include: {
            mlmMember: {
              include: { user: true },
            },
          },
          orderBy: { mlmMember: { memberCode: "asc" } },
        },
      },
    });

    if (!bonusRun) {
      return NextResponse.json({ bonusRun: null, results: [] });
    }

    // ── 1ポジション分のデータを正規化するヘルパー ──
    type PositionRow = {
      id: string;
      memberCode: string;
      memberName: string;
      companyName: string | null;
      status: string;
      isActive: boolean;
      selfPurchasePoints: number;
      groupPoints: number;
      directActiveCount: number;
      achievedLevel: number;
      previousTitleLevel: number;
      newTitleLevel: number;
      directBonus: number;
      unilevelBonus: number;
      rankUpBonus: number;
      shareBonus: number;
      structureBonus: number;
      savingsBonus: number;
      bonusTotal: number;
      carryoverAmount: number;
      adjustmentAmount: number;
      otherPositionAmount: number;
      amountBeforeAdjustment: number;
      paymentAdjustmentRate: number | null;
      paymentAdjustmentAmount: number;
      finalAmount: number;
      consumptionTax: number;
      withholdingTax: number;
      shortageAmount: number;
      otherPositionShortage: number;
      serviceFee: number;
      paymentAmount: number;
      groupActiveCount: number;
      groupPoints2: number;  // alias for display
      minLinePoints: number;
      lineCount: number;
      level1Lines: number;
      level2Lines: number;
      level3Lines: number;
      forcedLevel: number;
      conditions: string | null;
      savingsPoints: number;
      unilevelDetail: Record<string, number> | null;
      savingsPointsAdded: number;
      createdAt: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toPositionRow = (r: any): PositionRow => ({
      id: r.id.toString(),
      memberCode: r.mlmMember.memberCode,
      memberName: getMlmDisplayName(r.mlmMember.user.name, r.mlmMember.companyName),
      companyName: r.mlmMember.companyName,
      status: r.mlmMember.status,
      isActive: r.isActive,
      selfPurchasePoints: r.selfPurchasePoints,
      groupPoints: r.groupPoints,
      directActiveCount: r.directActiveCount,
      achievedLevel: r.achievedLevel,
      previousTitleLevel: r.previousTitleLevel,
      newTitleLevel: r.newTitleLevel,
      directBonus: r.directBonus,
      unilevelBonus: r.unilevelBonus,
      rankUpBonus: r.rankUpBonus || 0,
      shareBonus: r.shareBonus || 0,
      structureBonus: r.structureBonus,
      savingsBonus: r.savingsBonus,
      bonusTotal: r.amountBeforeAdjustment,
      carryoverAmount: r.carryoverAmount || 0,
      adjustmentAmount: r.adjustmentAmount || 0,
      otherPositionAmount: r.otherPositionAmount || 0,
      amountBeforeAdjustment: r.amountBeforeAdjustment || 0,
      paymentAdjustmentRate: r.paymentAdjustmentRate,
      paymentAdjustmentAmount: r.paymentAdjustmentAmount || 0,
      finalAmount: r.finalAmount || 0,
      consumptionTax: r.consumptionTax || 0,
      withholdingTax: r.withholdingTax || 0,
      shortageAmount: r.shortageAmount || 0,
      otherPositionShortage: r.otherPositionShortage || 0,
      serviceFee: r.serviceFee || 0,
      paymentAmount: r.paymentAmount || 0,
      groupActiveCount: r.groupActiveCount || 0,
      groupPoints2: r.groupPoints,
      minLinePoints: r.minLinePoints || 0,
      lineCount: r.lineCount || 0,
      level1Lines: r.level1Lines || 0,
      level2Lines: r.level2Lines || 0,
      level3Lines: r.level3Lines || 0,
      forcedLevel: r.forcedLevel || 0,
      conditions: r.conditions,
      savingsPoints: r.savingsPoints || 0,
      unilevelDetail: r.unilevelDetail as Record<string, number> | null,
      savingsPointsAdded: r.savingsPointsAdded || 0,
      createdAt: r.createdAt.toISOString(),
    });

    // ── baseCode（先頭6桁）でグループ化 ──
    // memberCode 形式: "XXXXXX-NN"  → baseCode = "XXXXXX"
    type MergedRow = PositionRow & {
      baseCode: string;
      positionCount: number;
      positions: PositionRow[];  // ポジション別詳細
    };

    const mergedMap = new Map<string, MergedRow>();

    for (const r of bonusRun.results) {
      const mc = r.mlmMember.memberCode;
      // memberCode形式: "10885801"（8桁） → baseCode="108858"（先頭6桁）、枝番="01"（末尾2桁）
      // ハイフンあり形式: "123456-01" → baseCode="123456" にも対応
      let baseCode: string;
      if (mc.includes("-")) {
        // ハイフン区切り形式: "123456-01" → "123456"
        baseCode = mc.replace(/-\d+$/, "");
      } else if (mc.length === 8) {
        // 8桁形式: "10885801" → "108858"（先頭6桁）
        baseCode = mc.slice(0, 6);
      } else {
        // その他（5桁等）はそのままbaseCode
        baseCode = mc;
      }
      const pos = toPositionRow(r);

      if (mergedMap.has(baseCode)) {
        const merged = mergedMap.get(baseCode)!;

        // 数値フィールドを合算
        merged.selfPurchasePoints   += pos.selfPurchasePoints;
        merged.groupPoints          += pos.groupPoints;
        merged.directActiveCount    += pos.directActiveCount;
        merged.directBonus          += pos.directBonus;
        merged.unilevelBonus        += pos.unilevelBonus;
        merged.rankUpBonus          += pos.rankUpBonus;
        merged.shareBonus           += pos.shareBonus;
        merged.structureBonus       += pos.structureBonus;
        merged.savingsBonus         += pos.savingsBonus;
        merged.bonusTotal           += pos.bonusTotal;
        merged.carryoverAmount      += pos.carryoverAmount;
        merged.adjustmentAmount     += pos.adjustmentAmount;
        merged.amountBeforeAdjustment += pos.amountBeforeAdjustment;
        merged.paymentAdjustmentAmount += pos.paymentAdjustmentAmount;
        merged.finalAmount          += pos.finalAmount;
        merged.consumptionTax       += pos.consumptionTax;
        merged.withholdingTax       += pos.withholdingTax;
        merged.shortageAmount       += pos.shortageAmount;
        merged.serviceFee           += pos.serviceFee;
        merged.paymentAmount        += pos.paymentAmount;

        // レベルは最高値
        if (pos.achievedLevel   > merged.achievedLevel)   merged.achievedLevel   = pos.achievedLevel;
        if (pos.newTitleLevel   > merged.newTitleLevel)   merged.newTitleLevel   = pos.newTitleLevel;

        // いずれかがアクティブならアクティブ
        if (pos.isActive) merged.isActive = true;

        merged.positionCount += 1;
        merged.positions.push(pos);
      } else {
        mergedMap.set(baseCode, {
          ...pos,
          baseCode,
          positionCount: 1,
          positions: [pos],
        });
      }
    }

    // ── 合算済みリストを支払額降順でソート ──
    const results = Array.from(mergedMap.values()).sort(
      (a, b) => b.paymentAmount - a.paymentAmount
    );

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
      { error: "Failed to fetch bonus results", detail: String(error) },
      { status: 500 }
    );
  }
}
