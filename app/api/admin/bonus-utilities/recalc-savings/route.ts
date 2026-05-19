/**
 * POST /api/admin/bonus-utilities/recalc-savings
 *
 * 指定月（または全月）のBonusResultに対して
 * 貯金ボーナス（savingsPointsAdded / savingsPoints）を
 * 現在のSavingsBonusConfig設定値で再計算して上書き更新する。
 *
 * Body:
 *   { bonusMonth?: "YYYY-MM" }   省略時は全BonusRunが対象
 *
 * 処理フロー:
 *   1. SavingsBonusConfig（最新）を取得
 *   2. 対象月のBonusRunを取得
 *   3. BonusResultごとに購入データを参照して貯金ptを再計算
 *   4. BonusResult.savingsPointsAdded / savingsPoints を更新
 *   5. MlmMember.savingsPoints（累計）も最終月の結果で更新
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

  // ── 1. 貯金ボーナス設定を取得 ──
  const savingsConfig = await prisma.savingsBonusConfig.findFirst({
    orderBy: { id: "desc" },
  });
  const registrationRate = savingsConfig?.registrationRate ?? 20.0;
  const autoshipRate     = savingsConfig?.autoshipRate     ?? 5.0;
  const bonusRate        = savingsConfig?.bonusRate        ?? 3.0;

  // ── 2. 対象BonusRunを取得 ──
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

  // ── 3. 月ごとに再計算 ──
  for (const run of bonusRuns) {
    const { bonusMonth } = run;

    // 対象月の全BonusResultを取得（メンバーコード・ステータス含む）
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

    // 対象月の購入データを取得（オートシップ伝票判定含む）
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

    // 会員ごとのオートシップ伝票pt集計
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
      const memberCode = br.mlmMember.memberCode;
      const memberStatus = br.mlmMember.status;

      // 01ポジション & ステータスがactiveまたはautoshipのみ対象
      const isFirstPos = isFirstPosition(memberCode);
      const isEligible = isFirstPos &&
        (memberStatus === "active" || memberStatus === "autoship");

      let savingsPointsAdded = 0;

      if (isEligible && br.isActive) {
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

        // C. 当月ボーナスを取得（ダイレクト+ユニレベル+組織構築のいずれか > 0）→ GP × bonusRate
        const hasBonus = (br.directBonus + br.unilevelBonus + br.structureBonus) > 0;
        if (hasBonus && br.groupPoints > 0) {
          const ptC = Math.floor(br.groupPoints * (bonusRate / 100) * 10) / 10;
          savingsPointsAdded += ptC;
        }

        // 小数点第1位まで（第2位切り捨て）
        savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;
      }

      // ×10して整数で保存（既存の保存形式を踏襲）
      const savingsPointsAddedInt = Math.round(savingsPointsAdded * 10);

      await prisma.bonusResult.update({
        where: { id: br.id },
        data: { savingsPointsAdded: savingsPointsAddedInt },
      });
      monthUpdated++;
    }

    // ── savingsPoints（累計）を月順に積み上げ再計算 ──
    // 01ポジション会員の累計を時系列で再構築
    type BrItem = (typeof bonusResults)[number];
    const firstPosMemberIds = bonusResults
      .filter((br: BrItem) => isFirstPosition(br.mlmMember.memberCode))
      .map((br: BrItem) => br.mlmMemberId);

    // 全月のBonusResultを取得して累計を再計算
    // (この月のresultのsavingsPointsを「前月累計 + 今月追加」で更新)
    for (const memberId of firstPosMemberIds) {
      // この会員の全月のBonusResultを古い順に取得
      const allResults = await prisma.bonusResult.findMany({
        where: { mlmMemberId: memberId },
        orderBy: { bonusMonth: "asc" },
        select: { id: true, bonusMonth: true, savingsPointsAdded: true, savingsPoints: true },
      });

      type AllResultItem = (typeof allResults)[number];
      let cumulative = 0;
      for (const r of allResults as AllResultItem[]) {
        const added = r.savingsPointsAdded ?? 0;
        // activeまたはautoshipの月のみ積算（ステータスはBonusResult.isActiveで代替）
        cumulative = Math.round((cumulative + added) * 10) / 10;
        if (r.savingsPoints !== cumulative) {
          await prisma.bonusResult.update({
            where: { id: r.id },
            data: { savingsPoints: cumulative },
          });
        }
      }
    }

    log.push(`${bonusMonth}: ${monthUpdated}件更新`);
    totalUpdated += monthUpdated;
  }

  // ── 4. MlmMember.savingsPoints（累計）を最終月で更新 ──
  // 01ポジション全会員の最新BonusResultのsavingsPointsで上書き
  const allFirstPosMembers = await prisma.mlmMember.findMany({
    select: { id: true, memberCode: true },
  });

  let memberUpdated = 0;
  for (const m of allFirstPosMembers) {
    if (!isFirstPosition(m.memberCode)) continue;

    const latestResult = await prisma.bonusResult.findFirst({
      where: { mlmMemberId: m.id },
      orderBy: { bonusMonth: "desc" },
      select: { savingsPoints: true },
    });

    if (latestResult) {
      await prisma.mlmMember.update({
        where: { id: m.id },
        data: { savingsPoints: latestResult.savingsPoints },
      });
      memberUpdated++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `貯金ボーナスの再計算が完了しました`,
    detail: {
      targetMonths: bonusRuns.map((r: { id: bigint; bonusMonth: string }) => r.bonusMonth),
      totalBonusResultsUpdated: totalUpdated,
      memberSavingsUpdated: memberUpdated,
      rates: { registrationRate, autoshipRate, bonusRate },
      log,
    },
  });
}
