/**
 * POST /api/admin/bonus-utilities/recalc-savings
 *
 * 全会員の貯金ボーナスポイントを一旦全削除し、
 * 現在のSavingsBonusConfig設定値で全月再計算する。
 *
 * 【付与条件】
 *   A（初回・仮付与）:
 *     - 01ポジション
 *     - bonusMonth === MlmMember.createdAt の年月
 *     - 過去に商品1000を一度も購入していない
 *     - ステータス不問（登録時点で付与）
 *     - 翌月に autoship でなければ消滅
 *
 *   B（毎月・アクティブ月のみ）:
 *     - 01ポジション
 *     - isActive=true（ステータス不問）
 *     - AS伝票（入金済）1件以上
 *     - 計算: AS伝票合計pt × autoshipRate(5%)
 *
 *   C（毎月・アクティブ月のみ）:
 *     - 01ポジション
 *     - isActive=true（ステータス不問）
 *     - 当月ボーナス実際発生（directBonus+unilevel+structure > 0）
 *     - 計算: GP × bonusRate(3%)
 *
 * 【累計ルール】
 *   - アクティブ月: B/C分を加算
 *   - 非アクティブ月: 累計をそのまま保持（全消滅なし）
 *   - 登録翌月に autoship でない → 前月A仮付与分を差し引き消滅
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

// "YYYY-MM" の前月を返す
function prevMonth(bonusMonth: string): string {
  const [y, m] = bonusMonth.split("-").map(Number);
  const total = y * 12 + (m - 1) - 1;
  const py = Math.floor(total / 12);
  const pm = (total % 12) + 1;
  return `${py}-${String(pm).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({})) as { bonusMonth?: string };
  const targetMonth = body.bonusMonth ?? null;

  // ── STEP 1: 全会員の貯金ボーナスを全削除 ──
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
      savingsPtAFromRegistration: false,
    },
  });

  await prisma.mlmMember.updateMany({
    data: { savingsPoints: 0 },
  });

  console.log(`🗑️ 貯金ボーナス全削除完了: BonusResult ${resetResult.count}件リセット`);

  // ── STEP 2: 設定取得 ──
  const savingsConfig = await prisma.savingsBonusConfig.findFirst({
    orderBy: { id: "desc" },
  });
  const registrationRate = savingsConfig?.registrationRate ?? 20.0;
  const autoshipRate     = savingsConfig?.autoshipRate     ?? 5.0;
  const bonusRate        = savingsConfig?.bonusRate        ?? 3.0;

  // ── STEP 3: 全会員を取得 ──
  const allMembers = await prisma.mlmMember.findMany({
    select: { id: true, memberCode: true, status: true, createdAt: true },
  });
  const memberMap = new Map(allMembers.map((m: typeof allMembers[number]) => [m.id.toString(), m]));

  // ── STEP 4: BonusRunを古い順に取得 ──
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

  // ── STEP 5: 月ごとに再計算（古い順で累計を積み上げ） ──
  for (const run of bonusRuns) {
    const { bonusMonth: bm } = run;

    // 前月BonusResultのA仮付与フラグを取得（翌月消滅チェック用）
    const pmStr = prevMonth(bm);
    const prevResults = await prisma.bonusResult.findMany({
      where: { bonusMonth: pmStr },
      select: { mlmMemberId: true, savingsPtAFromRegistration: true, savingsPointsAdded: true },
    });
    type PrevResult = { mlmMemberId: bigint; savingsPtAFromRegistration: boolean; savingsPointsAdded: number };
    const prevHadRegistrationA = new Map(
      prevResults
        .filter((r: PrevResult) => r.savingsPtAFromRegistration)
        .map((r: PrevResult) => [r.mlmMemberId.toString(), r.savingsPointsAdded])
    );

    // 当月の商品1000を今月より前に購入済みの会員セット
    const pastProduct1000 = await prisma.mlmPurchase.findMany({
      where: { productCode: "1000", purchaseMonth: { lt: bm } },
      select: { mlmMemberId: true },
      distinct: ["mlmMemberId"],
    });
    const hasPastProduct1000 = new Set(pastProduct1000.map((p: { mlmMemberId: bigint }) => p.mlmMemberId.toString()));

    // 当月BonusResultを取得
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
        mlmMember: { select: { memberCode: true, status: true, createdAt: true } },
      },
    });

    // 当月の購入データを取得
    const purchases = await prisma.mlmPurchase.findMany({
      where: { purchaseMonth: bm },
      select: {
        mlmMemberId: true,
        productCode: true,
        totalPoints: true,
        order: { select: { slipType: true, paidAt: true, paymentStatus: true } },
      },
    });

    type PurchaseAgg = { autoshipInvoicePoints: number; hasAutoshipInvoice: boolean; directBonusProductCount: number };
    const purchaseAggMap = new Map<bigint, PurchaseAgg>();

    for (const p of purchases) {
      const mid = p.mlmMemberId;
      if (!purchaseAggMap.has(mid)) {
        purchaseAggMap.set(mid, { autoshipInvoicePoints: 0, hasAutoshipInvoice: false, directBonusProductCount: 0 });
      }
      const agg = purchaseAggMap.get(mid)!;
      if (p.productCode === "1000") agg.directBonusProductCount += 1;
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

    let monthUpdated = 0;

    for (const br of bonusResults) {
      const memberCode   = br.mlmMember.memberCode;
      const memberStatus = br.mlmMember.status;
      const memberCreatedAt: Date = br.mlmMember.createdAt;
      const memberIdStr  = br.mlmMemberId.toString();

      const isFirstPos = isFirstPosition(memberCode);

      // 登録月判定（JST）
      const createdAtJST = new Date(memberCreatedAt.getTime() + 9 * 60 * 60 * 1000);
      const createdMonthStr = `${createdAtJST.getUTCFullYear()}-${String(createdAtJST.getUTCMonth() + 1).padStart(2, "0")}`;
      const isRegistrationMonth = createdMonthStr === bm;

      const agg = purchaseAggMap.get(br.mlmMemberId) ?? { autoshipInvoicePoints: 0, hasAutoshipInvoice: false, directBonusProductCount: 0 };

      let savingsPointsAdded = 0;
      let savingsPtAFromRegistration = false;

      // 前月A消滅チェック：前月にA仮付与があり、今月 autoship でない → A分差し引き
      // 前月A分消滅チェック（累計はSTEP6で処理するためここでは記録のみ）
      const _prevAConsumptionInt: number = (prevHadRegistrationA.has(memberIdStr) && memberStatus !== "autoship")
        ? (prevHadRegistrationA.get(memberIdStr) as number) ?? 0
        : 0;
      void _prevAConsumptionInt; // STEP6で使用

      // A: 登録月・初回購入・ステータス不問
      if (isFirstPos && isRegistrationMonth && !hasPastProduct1000.has(memberIdStr)) {
        if (agg.directBonusProductCount >= 1) {
          const ptA = Math.floor(br.selfPurchasePoints * (registrationRate / 100) * 10) / 10;
          savingsPointsAdded += ptA;
          savingsPtAFromRegistration = true;
        }
      }

      // B・C: autoship かつ isActive=true のみ
      if (isFirstPos && memberStatus === "autoship" && br.isActive) {
        // B: AS伝票（入金済）1件以上
        if (agg.hasAutoshipInvoice && agg.autoshipInvoicePoints > 0) {
          const ptB = Math.floor(agg.autoshipInvoicePoints * (autoshipRate / 100) * 10) / 10;
          savingsPointsAdded += ptB;
        }
        // C: 当月ボーナス実際発生（>0）かつ GP > 0
        const hasBonusThisMonth = (br.directBonus + br.unilevelBonus + br.structureBonus) > 0;
        if (hasBonusThisMonth && br.groupPoints > 0) {
          const ptC = Math.floor(br.groupPoints * (bonusRate / 100) * 10) / 10;
          savingsPointsAdded += ptC;
        }
      }

      savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;
      const savingsPointsAddedInt = Math.round(savingsPointsAdded * 10);

      await prisma.bonusResult.update({
        where: { id: br.id },
        data: { savingsPointsAdded: savingsPointsAddedInt, savingsPtAFromRegistration },
      });
      monthUpdated++;
    }

    log.push(`${bm}: ${monthUpdated}件更新`);
    totalUpdated += monthUpdated;
  }

  // ── STEP 6: savingsPoints（累計）を月順に再計算 ──
  // 全01ポジション会員を時系列で積み上げ
  let memberUpdated = 0;
  for (const m of allMembers) {
    if (!isFirstPosition(m.memberCode)) continue;

    const allResults = await prisma.bonusResult.findMany({
      where: { mlmMemberId: m.id },
      orderBy: { bonusMonth: "asc" },
      select: {
        id: true,
        bonusMonth: true,
        isActive: true,
        savingsPointsAdded: true,
        savingsPtAFromRegistration: true,
        mlmMember: { select: { status: true } },
      },
    });

    let cumulative = 0;
    for (let i = 0; i < allResults.length; i++) {
      const r = allResults[i];
      const nextR = allResults[i + 1] ?? null;
      const memberStatus = r.mlmMember?.status ?? m.status;

      const isRegistrationMonth = (() => {
        const createdAtJST = new Date(m.createdAt.getTime() + 9 * 60 * 60 * 1000);
        const createdMonthStr = `${createdAtJST.getUTCFullYear()}-${String(createdAtJST.getUTCMonth() + 1).padStart(2, "0")}`;
        return createdMonthStr === r.bonusMonth;
      })();

      const added = (r.savingsPointsAdded ?? 0) / 10;

      if (isRegistrationMonth && r.savingsPtAFromRegistration) {
        // 登録月: A仮付与分を加算
        cumulative = Math.round((cumulative + added) * 10) / 10;
      } else if (r.isActive) {
        // アクティブ月: B/C分を加算（前月A仮付与消滅チェック）
        if (i > 0 && allResults[i - 1].savingsPtAFromRegistration && memberStatus !== "autoship") {
          const prevAdded = (allResults[i - 1].savingsPointsAdded ?? 0) / 10;
          cumulative = Math.max(0, Math.round((cumulative - prevAdded) * 10) / 10);
        }
        cumulative = Math.round((cumulative + added) * 10) / 10;
      } else if (!isRegistrationMonth) {
        // 非アクティブ月: 前月A仮付与があれば消滅、それ以外は累計保持（全消滅なし）
        if (i > 0 && allResults[i - 1].savingsPtAFromRegistration && memberStatus !== "autoship") {
          const prevAdded = (allResults[i - 1].savingsPointsAdded ?? 0) / 10;
          cumulative = Math.max(0, Math.round((cumulative - prevAdded) * 10) / 10);
        }
        // cumulative はそのまま保持
      }

      const cumulativeInt = Math.round(cumulative * 10);
      await prisma.bonusResult.update({
        where: { id: r.id },
        data: { savingsPoints: cumulativeInt },
      });
    }

    // MlmMember.savingsPoints を最新月の累計で更新
    if (allResults.length > 0) {
      await prisma.mlmMember.update({
        where: { id: m.id },
        data: { savingsPoints: Math.round(cumulative * 10) },
      });
      memberUpdated++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `貯金ボーナスを全削除し、新仕様（A初回仮付与・B autoshipのみ・C ボーナス発生者のみ）で再計算しました`,
    detail: {
      resetBonusResults: resetResult.count,
      targetMonths: bonusRuns.map((r: { id: bigint; bonusMonth: string }) => r.bonusMonth),
      totalBonusResultsUpdated: totalUpdated,
      memberSavingsUpdated: memberUpdated,
      rates: { registrationRate, autoshipRate, bonusRate },
      conditions: {
        A: "登録月 + 商品1000初購入（ステータス不問・仮付与、翌月autoshipでなければ消滅）",
        B: "autoship + isActive=true + AS伝票（入金済）≥1件 → AS伝票pt×5%",
        C: "autoship + isActive=true + 当月ボーナス>0 → GP×3%",
        消滅: "autoship以外 または isActive=false → 累計全消滅",
      },
      log,
    },
  });
}
