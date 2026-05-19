/**
 * POST /api/admin/bonus-utilities/recalc-savings
 *
 * 全会員の貯金ボーナスポイントを一旦全削除し、
 * 現在のSavingsBonusConfig設定値 × 新計算方式（pt × %）で全月再計算する。
 *
 * 【付与条件】
 *   - 01ポジション会員のみ
 *   - MlmMember.status === "autoship" のみ（active は対象外）
 *   - 当月 BonusResult.isActive === true であること
 *     （商品を受け取らなかった月・返送された月はアクティブにならず全消滅）
 *
 * 【計算式】（pt × %）
 *   A. 商品1000を1個以上購入 → 自己購入pt × registrationRate
 *   B. オートシップ伝票（当月・入金あり）1件以上 → AS伝票合計pt × autoshipRate
 *   C. 当月ボーナス実際発生（directBonus+unilevelBonus+structureBonus > 0） → GP × bonusRate
 *
 * 【累計リセット】
 *   当月 isActive=false の場合 → savingsPoints（累計）を 0 にリセット（全消滅）
 *
 * Body:
 *   { bonusMonth?: "YYYY-MM" }   省略時は全BonusRunが対象
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { ACTIVE_REQUIRED_PRODUCTS } from "@/lib/mlm-bonus";

// 01ポジション判定
function isFirstPosition(memberCode: string): boolean {
  const parts = memberCode.split("-");
  if (parts.length < 2) return true;
  return parts[parts.length - 1] === "01";
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({})) as { bonusMonth?: string };
  const targetMonth = body.bonusMonth ?? null; // nullなら全月対象

  // ── STEP 1: 全会員の貯金ボーナスを全削除 ──
  // BonusResult.savingsPointsAdded / savingsPoints をすべて 0 にリセット
  const resetResult = await prisma.bonusResult.updateMany({
    where: targetMonth ? {
      bonusRunId: {
        in: (await prisma.bonusRun.findMany({
          where: { bonusMonth: targetMonth },
          select: { id: true },
        })).map((r: { id: bigint }) => r.id),
      },
    } : undefined,
    data: {
      savingsPointsAdded: 0,
      savingsPoints: 0,
    },
  });

  // MlmMember.savingsPoints も全員 0 にリセット
  await prisma.mlmMember.updateMany({
    data: { savingsPoints: 0 },
  });

  console.log(`🗑️ 貯金ボーナス全削除完了: BonusResult ${resetResult.count}件リセット`);

  // ── STEP 2: 貯金ボーナス設定を取得 ──
  const savingsConfig = await prisma.savingsBonusConfig.findFirst({
    orderBy: { id: "desc" },
  });
  const registrationRate = savingsConfig?.registrationRate ?? 20.0;
  const autoshipRate     = savingsConfig?.autoshipRate     ?? 5.0;
  const bonusRate        = savingsConfig?.bonusRate        ?? 3.0;

  // ── STEP 3: 対象BonusRunを取得（古い順） ──
  const bonusRuns = await prisma.bonusRun.findMany({
    where: targetMonth ? { bonusMonth: targetMonth } : undefined,
    orderBy: { bonusMonth: "asc" },
    select: { id: true, bonusMonth: true },
  });

  if (bonusRuns.length === 0) {
    return NextResponse.json(
      { error: targetMonth ? `${targetMonth}のボーナスランが見つかりません` : "ボーナスランが1件もありません" },
      { status: 404 }
    );
  }

  const log: string[] = [];
  let totalUpdated = 0;

  // ── STEP 4: 月ごとに新条件・新計算式で再計算 ──
  for (const run of bonusRuns) {
    const { bonusMonth } = run;

    // 対象月の全BonusResultを取得
    const bonusResults = await prisma.bonusResult.findMany({
      where: { bonusRunId: run.id },
      select: {
        id: true,
        mlmMemberId: true,
        isActive: true,
        selfPurchasePoints: true,
        groupPoints: true,
        directBonus: true,
        unilevelBonus: true,
        structureBonus: true,
        mlmMember: {
          select: {
            memberCode: true,
            status: true,
          },
        },
      },
    });

    // 対象月の購入データを取得
    const purchases = await prisma.mlmPurchase.findMany({
      where: { purchaseMonth: bonusMonth },
      select: {
        mlmMemberId: true,
        productCode: true,
        totalPoints: true,
        order: {
          select: { slipType: true, paidAt: true, paymentStatus: true },
        },
      },
    });

    // 会員ごとの購入集計
    type PurchaseAgg = {
      autoshipInvoicePoints: number;
      hasAutoshipInvoice: boolean;
      directBonusProductCount: number;
    };
    const purchaseAggMap = new Map<bigint, PurchaseAgg>();

    for (const p of purchases) {
      const mid = p.mlmMemberId;
      if (!purchaseAggMap.has(mid)) {
        purchaseAggMap.set(mid, {
          autoshipInvoicePoints: 0,
          hasAutoshipInvoice: false,
          directBonusProductCount: 0,
        });
      }
      const agg = purchaseAggMap.get(mid)!;

      // 商品1000の購入数（A計算用）
      if (p.productCode === "1000") {
        agg.directBonusProductCount += 1;
      }

      // オートシップ伝票（当月・入金あり）判定（B計算用）
      if (
        p.order &&
        p.order.slipType === "autoship" &&
        (p.order.paidAt !== null || p.order.paymentStatus === "paid") &&
        ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)
      ) {
        agg.autoshipInvoicePoints += p.totalPoints ?? 0;
        agg.hasAutoshipInvoice = true;
      }
    }

    // ── 再計算 & UPDATE ──
    let monthUpdated = 0;

    for (const br of bonusResults) {
      const memberCode   = br.mlmMember.memberCode;
      const memberStatus = br.mlmMember.status;

      // 付与条件:
      //   01ポジション かつ ステータスが autoship（active は対象外） かつ 当月isActive=true
      const isFirstPos  = isFirstPosition(memberCode);
      const isEligible  = isFirstPos &&
        memberStatus === "autoship" &&
        br.isActive;

      let savingsPointsAdded = 0;

      if (isEligible) {
        const agg = purchaseAggMap.get(br.mlmMemberId) ?? {
          autoshipInvoicePoints: 0,
          hasAutoshipInvoice: false,
          directBonusProductCount: 0,
        };

        // A. 商品1000を1個以上購入 → 自己購入pt × registrationRate
        if (agg.directBonusProductCount >= 1) {
          const ptA = Math.floor(br.selfPurchasePoints * (registrationRate / 100) * 10) / 10;
          savingsPointsAdded += ptA;
        }

        // B. オートシップ伝票（当月・入金あり）が1件以上 → AS伝票合計pt × autoshipRate
        if (agg.hasAutoshipInvoice && agg.autoshipInvoicePoints > 0) {
          const ptB = Math.floor(agg.autoshipInvoicePoints * (autoshipRate / 100) * 10) / 10;
          savingsPointsAdded += ptB;
        }

        // C. 当月ボーナスが実際に発生（合計 > 0） → GP × bonusRate
        //    ※ eligibleだけでは不十分。実際のボーナス金額 > 0 であること
        const hasBonusThisMonth = (br.directBonus + br.unilevelBonus + br.structureBonus) > 0;
        if (hasBonusThisMonth && br.groupPoints > 0) {
          const ptC = Math.floor(br.groupPoints * (bonusRate / 100) * 10) / 10;
          savingsPointsAdded += ptC;
        }

        // 小数点第1位まで（第2位切り捨て）
        savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;
      }

      // × 10して整数で保存
      const savingsPointsAddedInt = Math.round(savingsPointsAdded * 10);

      await prisma.bonusResult.update({
        where: { id: br.id },
        data: { savingsPointsAdded: savingsPointsAddedInt },
      });
      monthUpdated++;
    }

    log.push(`${bonusMonth}: ${monthUpdated}件更新`);
    totalUpdated += monthUpdated;
  }

  // ── STEP 5: savingsPoints（累計）を月順に積み上げ再計算 ──
  // 01ポジション かつ autoship 会員の累計を時系列で再構築
  // 当月 isActive=false の月は累計を 0 にリセット（全消滅仕様）
  const allMembers = await prisma.mlmMember.findMany({
    select: { id: true, memberCode: true, status: true },
  });

  let memberUpdated = 0;
  for (const m of allMembers) {
    if (!isFirstPosition(m.memberCode)) continue;
    // autoship でない会員は累計 0 のまま（既にリセット済み）
    if (m.status !== "autoship") continue;

    // この会員の全月のBonusResultを古い順に取得
    const allResults = await prisma.bonusResult.findMany({
      where: { mlmMemberId: m.id },
      orderBy: { bonusMonth: "asc" },
      select: { id: true, bonusMonth: true, isActive: true, savingsPointsAdded: true },
    });

    let cumulative = 0;
    for (const r of allResults) {
      if (!r.isActive) {
        // 当月アクティブでない → 累計全消滅
        cumulative = 0;
      } else {
        const added = (r.savingsPointsAdded ?? 0) / 10; // 整数保存 × 10 なので戻す
        cumulative = Math.round((cumulative + added) * 10) / 10;
      }
      // × 10して整数で保存
      const cumulativeInt = Math.round(cumulative * 10);
      await prisma.bonusResult.update({
        where: { id: r.id },
        data: { savingsPoints: cumulativeInt },
      });
    }

    // MlmMember.savingsPoints を最新月の累計で更新
    if (allResults.length > 0) {
      const latestCumulativeInt = Math.round(cumulative * 10);
      await prisma.mlmMember.update({
        where: { id: m.id },
        data: { savingsPoints: latestCumulativeInt },
      });
      memberUpdated++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `貯金ボーナスを全削除し、新条件（autoshipのみ・isActive必須・pt×%）で再計算しました`,
    detail: {
      resetBonusResults: resetResult.count,
      targetMonths: bonusRuns.map((r: { id: bigint; bonusMonth: string }) => r.bonusMonth),
      totalBonusResultsUpdated: totalUpdated,
      memberSavingsUpdated: memberUpdated,
      rates: { registrationRate, autoshipRate, bonusRate },
      conditions: {
        statusRequired: "autoship のみ（active は対象外）",
        isActiveRequired: "当月 isActive=true 必須（商品未受取・返送 → 全消滅）",
        bonusCRequired: "実際のボーナス金額 > 0 であること",
      },
      log,
    },
  });
}
