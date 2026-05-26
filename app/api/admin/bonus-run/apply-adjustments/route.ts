export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/bonus-run/apply-adjustments
 * 既存BonusRunに調整金を反映して各BonusResultを再計算・更新する
 * body: { bonusMonth: "2026-03" }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth } = body;
    if (!bonusMonth) {
      return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
    }

    // BonusRunを取得
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
      include: { results: true },
    });
    if (!bonusRun) {
      return NextResponse.json({ error: "BonusRunが見つかりません" }, { status: 404 });
    }

    // 対象月の調整金を取得（全件）
    const adjustments = await prisma.bonusAdjustment.findMany({
      where: { bonusMonth },
    });

    // 会員IDごとに合算
    const adjustmentMap = new Map<bigint, number>();
    for (const adj of adjustments) {
      const cur = adjustmentMap.get(adj.mlmMemberId) ?? 0;
      adjustmentMap.set(adj.mlmMemberId, cur + adj.amount);
    }

    // BonusSettingsを取得
    const bonusSettings = await prisma.bonusSettings.findFirst();
    if (!bonusSettings) {
      return NextResponse.json({ error: "ボーナス設定が見つかりません" }, { status: 500 });
    }

    const paymentAdjRate = (bonusRun.paymentAdjustmentRate ?? 0) / 100; // %→小数

    let updatedCount = 0;
    let totalBonusAmount = 0;

    // トランザクションで一括更新（パフォーマンス向上・整合性確保）
    const updateOps = [];

    for (const result of bonusRun.results) {
      const adjustmentAmount = adjustmentMap.get(result.mlmMemberId) ?? 0;

      // 純ボーナス合計（調整金・支払調整を除く各ボーナスの合計）
      const pureBonus = (result.directBonus ?? 0)
        + (result.unilevelBonus ?? 0)
        + (result.structureBonus ?? 0)
        + (result.carryoverAmount ?? 0)
        + (result.otherPositionAmount ?? 0);

      // 支払調整前取得額 = 純ボーナス + 調整金
      const amountBeforeAdjustment = pureBonus + adjustmentAmount;

      // 支払調整額 = floor(税抜き本体 × 調整率)
      // ★ 支払調整は「消費税抜き本体」に対してかける（viola-pure.biz 仕様確定）
      const consumptionTaxForAdj   = Math.floor(amountBeforeAdjustment / 11);
      const taxExcludedForAdj      = amountBeforeAdjustment - consumptionTaxForAdj;
      const paymentAdjustmentAmount =
        paymentAdjRate > 0
          ? Math.floor(taxExcludedForAdj * paymentAdjRate)
          : 0;

      // 取得額 = 支払調整前取得額 - 支払調整額
      const finalAmount = amountBeforeAdjustment - paymentAdjustmentAmount;

      // 消費税(内税) = floor(取得額 / 11)  ※参考表示のみ・支払額計算には使わない
      const consumptionTax = Math.floor(finalAmount / 11);

      // 源泉徴収税 = floor((取得額 - 120,000) × 10.21%)
      const WITHHOLDING_THRESHOLD = 120000;
      const withholdingTax = finalAmount > WITHHOLDING_THRESHOLD
        ? Math.floor((finalAmount - WITHHOLDING_THRESHOLD) * 0.1021)
        : 0;

      // 事務手数料
      const serviceFee =
        finalAmount > bonusSettings.minPayoutAmount
          ? bonusSettings.serviceFeeAmount
          : 0;

      // 支払額 = 取得額 - 源泉税 - 事務手数料  ※消費税(内税)は引かない
      const paymentAmount = finalAmount - withholdingTax - serviceFee;

      totalBonusAmount += paymentAmount;

      // 更新データを蓄積（調整金0の会員も必ず更新してリセットを保証）
      updateOps.push(
        prisma.bonusResult.update({
          where: { id: result.id },
          data: {
            adjustmentAmount,        // 調整金（なければ0）
            amountBeforeAdjustment,  // 純ボーナス + 調整金
            paymentAdjustmentAmount, // 支払調整額（税抜き本体×調整率）
            finalAmount,             // 取得額（調整後）
            consumptionTax,          // 消費税(内税)参考表示
            withholdingTax,          // 源泉徴収税
            serviceFee,              // 事務手数料
            paymentAmount,           // 支払額（振込額）
          },
        })
      );

      updatedCount++;
    }

    // 一括実行
    await prisma.$transaction(updateOps);

    // BonusRunのtotalBonusAmount（総支払額）を調整金反映後の値で更新
    await prisma.bonusRun.update({
      where: { bonusMonth },
      data: { totalBonusAmount: Math.floor(totalBonusAmount) },
    });

    // 調整金にbonusRunIdを紐付け（未紐付けのもの全件）
    await prisma.bonusAdjustment.updateMany({
      where: { bonusMonth, bonusRunId: null },
      data: { bonusRunId: bonusRun.id },
    });

    const totalAdjustmentAmount = Array.from(adjustmentMap.values()).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      bonusMonth,
      updatedCount,
      adjustmentMembersCount: adjustmentMap.size,
      totalAdjustmentAmount,
      totalBonusAmount: Math.floor(totalBonusAmount),
      message: `${updatedCount}名のボーナス結果を再計算・更新しました（調整金対象: ${adjustmentMap.size}名、調整金合計: ¥${totalAdjustmentAmount.toLocaleString()}）`,
    });
  } catch (error) {
    console.error("Error applying adjustments:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
