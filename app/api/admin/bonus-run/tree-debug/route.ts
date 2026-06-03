/**
 * GET /api/admin/bonus-run/tree-debug?memberCode=82179501&bonusMonth=2026-04
 *
 * 特定会員の詳細デバッグ情報を返す。
 * 仕様書の完了条件チェック用。
 *
 * デバッグ対象: 82179501 / 44504701 / 86820601 / 93713601 / 89248801
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isActiveMember,
  UNILEVEL_RATES,
  UNILEVEL_MAX_DEPTH,
  STRUCTURE_BONUS_RATES,
  POINT_RATE,
  ACTIVE_REQUIRED_PRODUCTS,
} from "@/lib/mlm-bonus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const memberCode  = searchParams.get("memberCode") ?? "82179501";
  const bonusMonth  = searchParams.get("bonusMonth") ?? "2026-04";

  // ── 会員情報 ──
  const target = await prisma.mlmMember.findFirst({
    where: { memberCode },
    select: {
      id: true, memberCode: true, status: true,
      forceActive: true, forceLevel: true,
      uplineId: true, referrerId: true,
      currentLevel: true,
    },
  });
  if (!target) return NextResponse.json({ error: `${memberCode} not found` }, { status: 404 });

  // ── 全会員ロード ──
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true, memberCode: true, status: true,
      forceActive: true, forceLevel: true,
      uplineId: true, referrerId: true,
      currentLevel: true,
    },
  });
  const memberMap = new Map(allMembers.map(m => [m.id, m]));

  // ── 購入データ（クーリングオフ・キャンセル除外） ──
  const purchases = await prisma.mlmPurchase.findMany({
    where: {
      purchaseMonth: bonusMonth,
      purchaseStatus: { notIn: ["cooling_off", "canceled"] },
    },
    include: {
      order: { select: { slipType: true, paidAt: true, paymentStatus: true } },
    },
  });

  type PurchaseData = {
    selfPurchasePoints: number;
    purchasedRequiredProduct: boolean;
    hasProduct1000: boolean;
    autoshipInvoicePoints: number;
    hasAutoshipInvoice: boolean;
  };
  const purchaseMap = new Map<bigint, PurchaseData>();
  for (const p of purchases) {
    const mid = p.mlmMemberId;
    if (!purchaseMap.has(mid)) {
      purchaseMap.set(mid, {
        selfPurchasePoints: 0, purchasedRequiredProduct: false,
        hasProduct1000: false, autoshipInvoicePoints: 0, hasAutoshipInvoice: false,
      });
    }
    const d = purchaseMap.get(mid)!;
    if (ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)) {
      d.selfPurchasePoints += p.totalPoints || 0;
      d.purchasedRequiredProduct = true;
    }
    if (p.productCode === "1000") {
      d.hasProduct1000 = true;
    }
    if (
      p.order &&
      p.order.slipType === "autoship" &&
      (p.order.paidAt !== null || p.order.paymentStatus === "paid")
    ) {
      if (ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)) {
        d.autoshipInvoicePoints += p.totalPoints || 0;
      }
      d.hasAutoshipInvoice = true;
    }
  }

  // ── bonusEligibleMemberIds ──
  const bonusEligibleMemberIds = new Set<bigint>(
    allMembers
      .filter(m => m.status !== "withdrawn" && !(m.status === "lapsed" && !m.forceActive))
      .map(m => m.id)
  );

  // uplineChildrenMap（全会員）
  const uplineChildrenMap = new Map<bigint, bigint[]>();
  for (const m of allMembers) {
    if (m.uplineId) {
      if (!uplineChildrenMap.has(m.uplineId)) uplineChildrenMap.set(m.uplineId, []);
      uplineChildrenMap.get(m.uplineId)!.push(m.id);
    }
  }

  // childrenMap（referrerId）
  const childrenMap = new Map<bigint, bigint[]>();
  for (const m of allMembers) {
    if (m.referrerId) {
      if (!childrenMap.has(m.referrerId)) childrenMap.set(m.referrerId, []);
      childrenMap.get(m.referrerId)!.push(m.id);
    }
  }

  // ── ターゲット会員の基本情報 ──
  const targetPurchase = purchaseMap.get(target.id);
  const selfPt = targetPurchase?.selfPurchasePoints ?? 0;
  const isActive = isActiveMember({
    selfPoints: selfPt,
    purchasedRequiredProduct: targetPurchase?.purchasedRequiredProduct ?? false,
    forceActive: target.forceActive || false,
  });

  // directActiveCount（referrerId直下アクティブ数）
  const referrerDirectChildren = childrenMap.get(target.id) || [];
  let directActiveCount = 0;
  for (const childId of referrerDirectChildren) {
    const childMember   = memberMap.get(childId);
    if (!childMember) continue;
    if (!bonusEligibleMemberIds.has(childId)) continue;
    const childPurchase = purchaseMap.get(childId);
    const childIsActive = isActiveMember({
      selfPoints: childPurchase?.selfPurchasePoints ?? 0,
      purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
      forceActive: childMember.forceActive || false,
    });
    if (childIsActive) directActiveCount++;
  }

  // ── BonusResult から achievedLevel を取得 ──
  let bonusRunInfo: { id: bigint } | null = null;
  try {
    bonusRunInfo = await (prisma as any).bonusRun.findFirst({ where: { bonusMonth }, select: { id: true } });
  } catch {}

  let dbResult: {
    achievedLevel: number; unilevelBonus: bigint | number; structureBonus: bigint | number;
    minLinePoints: number; lineCount: number; directActiveCount: number;
    selfPurchasePoints: number; unilevelDetail: unknown; savingsPointsAdded: number;
    directBonus: bigint | number; amountBeforeAdjustment: bigint | number;
    paymentAmount: bigint | number; serviceFee: bigint | number; groupPoints: bigint | number;
  } | null = null;

  if (bonusRunInfo) {
    dbResult = await (prisma as any).bonusResult.findFirst({
      where: { bonusRunId: bonusRunInfo.id, mlmMemberId: target.id },
      select: {
        achievedLevel: true, unilevelBonus: true, structureBonus: true,
        minLinePoints: true, lineCount: true, directActiveCount: true,
        selfPurchasePoints: true, unilevelDetail: true, savingsPointsAdded: true,
        directBonus: true, amountBeforeAdjustment: true, paymentAmount: true,
        serviceFee: true, groupPoints: true,
      },
    });
  }

  const achievedLevel = dbResult?.achievedLevel ?? (target.forceLevel ?? target.currentLevel ?? 0);
  const maxULDepth    = UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;
  const rates         = UNILEVEL_RATES[achievedLevel] ?? [];
  const forceLevel    = target.forceLevel;

  // ── UL trace ──
  const depthPoints: Record<number, number> = {};
  const ulTrace: { depth: number; memberCode: string; selfPt: number; active: boolean; withdrawn: boolean; forceActive: boolean }[] = [];

  function traverseUL(currentId: bigint, depth: number) {
    if (depth > maxULDepth) return;
    const children = uplineChildrenMap.get(currentId) || [];
    for (const childId of children) {
      const childMember  = memberMap.get(childId);
      const childPurchase = purchaseMap.get(childId);
      if (!childMember) continue;

      const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);
      const childForceActive = childMember.forceActive || false;
      const childSelfPt      = childPurchase?.selfPurchasePoints ?? 0;

      if (childIsWithdrawn) {
        ulTrace.push({ depth, memberCode: childMember.memberCode, selfPt: childSelfPt, active: false, withdrawn: true, forceActive: childForceActive });
        traverseUL(childId, depth);
        continue;
      }

      const childIsActive = isActiveMember({
        selfPoints: childSelfPt,
        purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
        forceActive: childForceActive,
      });

      ulTrace.push({ depth, memberCode: childMember.memberCode, selfPt: childSelfPt, active: childIsActive, withdrawn: false, forceActive: childForceActive });

      if (childIsActive) {
        depthPoints[depth] = (depthPoints[depth] || 0) + childSelfPt;
        traverseUL(childId, depth + 1);
      } else {
        traverseUL(childId, depth);
      }
    }
  }
  traverseUL(target.id, 1);

  let ulTotal = 0;
  const ulDetail: Record<number, { pt: number; rate: number; bonus: number }> = {};
  for (let d = 1; d <= maxULDepth; d++) {
    const pt   = depthPoints[d] ?? 0;
    const rate = rates[d - 1] ?? 0;
    if (pt > 0 && rate > 0) {
      const bonus = Math.floor(pt * (rate / 100) * POINT_RATE);
      ulDetail[d] = { pt, rate, bonus };
      ulTotal += bonus;
    }
  }

  // ── SB trace ──
  // 組織構築B: 段数制限なし（仕様書準拠）
  const directChildren = uplineChildrenMap.get(target.id) || [];
  const seriesDetailMap: Record<string, { total: number; members: { depth: number; memberCode: string; selfPt: number; active: boolean; withdrawn: boolean; forceActive: boolean }[] }> = {};

  for (const childId of directChildren) {
    const childMember = memberMap.get(childId);
    const seriesKey   = childMember?.memberCode ?? childId.toString();
    let seriesTotal   = 0;
    const seriesMembers: { depth: number; memberCode: string; selfPt: number; active: boolean; withdrawn: boolean; forceActive: boolean }[] = [];

    function traverseSeries(currentId: bigint, depth: number) {
      // 段数制限なし
      const mem      = memberMap.get(currentId);
      const purchase = purchaseMap.get(currentId);
      if (!mem) return;

      const isWithdrawn   = !bonusEligibleMemberIds.has(currentId);
      const isForceActive = mem.forceActive || false;
      const selfPt2       = purchase?.selfPurchasePoints ?? 0;

      if (isWithdrawn) {
        seriesMembers.push({ depth, memberCode: mem.memberCode, selfPt: selfPt2, active: false, withdrawn: true, forceActive: isForceActive });
        for (const descId of (uplineChildrenMap.get(currentId) || [])) traverseSeries(descId, depth);
        return;
      }

      if (isForceActive) {
        seriesMembers.push({ depth, memberCode: mem.memberCode, selfPt: 0, active: false, withdrawn: false, forceActive: true });
        for (const descId of (uplineChildrenMap.get(currentId) || [])) traverseSeries(descId, depth + 1);
        return;
      }

      const isActive2 = isActiveMember({
        selfPoints: selfPt2,
        purchasedRequiredProduct: purchase?.purchasedRequiredProduct ?? false,
        forceActive: false,
      });
      seriesMembers.push({ depth, memberCode: mem.memberCode, selfPt: selfPt2, active: isActive2, withdrawn: false, forceActive: false });
      if (isActive2) seriesTotal += selfPt2;
      for (const descId of (uplineChildrenMap.get(currentId) || [])) traverseSeries(descId, depth + 1);
    }
    traverseSeries(childId, 1);
    seriesDetailMap[seriesKey] = { total: seriesTotal, members: seriesMembers };
  }

  const seriesValues = Object.values(seriesDetailMap).map(s => s.total).filter(v => v > 0);
  const minSeriesPt  = seriesValues.length > 0 ? Math.min(...seriesValues) : 0;
  const sbRate       = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
  const sbCalc       = Math.floor(minSeriesPt * (sbRate / 100) * POINT_RATE);
  const positiveSeriesCount = seriesValues.length;

  // ── 直接紹介・ダイレクトB ──
  let directBonusPersonCount = 0;
  for (const referralId of referrerDirectChildren) {
    const hasProduct1000 = purchaseMap.get(referralId)?.hasProduct1000 ?? false;
    if (hasProduct1000) directBonusPersonCount++;
  }
  const directBonusCalc = directBonusPersonCount * 2000;

  // ── 貯金B ──
  const sProductPt    = selfPt;
  const asProductPt   = targetPurchase?.autoshipInvoicePoints ?? 0;
  const earnedTotalYen= directBonusCalc + ulTotal + sbCalc;
  const bonusPointBase= Math.floor(earnedTotalYen / POINT_RATE);
  const savingFromSProduct = 0; // A: 初回登録月のみ（デバッグでは省略）
  const savingFromAS       = asProductPt > 0 ? Math.floor(asProductPt * 0.05 * 10) / 10 : 0;
  const savingFromBonus    = bonusPointBase > 0 ? Math.floor(bonusPointBase * 0.03 * 10) / 10 : 0;
  const totalSavingPt      = savingFromSProduct + savingFromAS + savingFromBonus;

  // ── 支払判定 ──
  const grossBonusBeforeAdjustment = directBonusCalc + ulTotal + sbCalc;
  const isPayTarget = grossBonusBeforeAdjustment >= 3000;

  // UL資格
  const isForceActiveTarget = target.forceActive || false;
  const hasSelfPurchase = selfPt > 0;
  const ulQualified = (hasSelfPurchase || isForceActiveTarget) && directActiveCount >= 2;

  // 組織例外
  const ORG_EXCEPTION_CODES = new Set(["44504701", "89248801"]);
  const isOrgException = ORG_EXCEPTION_CODES.has(memberCode);

  return NextResponse.json({
    target: {
      memberCode: target.memberCode,
      positionId: target.id.toString(),
      status: target.status,
      forceActive: target.forceActive,
      forceLevel,
      currentLevel: target.currentLevel,
    },

    // ── 基本情報 ──
    basic: {
      position_id: target.id.toString(),
      selfPt,
      groupPt: dbResult ? Number(dbResult.groupPoints) : null,
      active: isActive,
      forceActive: isForceActiveTarget,
      directAct: directActiveCount,
      monthlyLevel: achievedLevel,
      forceLevel,
      appliedLevel: achievedLevel,
    },

    // ── ユニレベルB ──
    unilevel: {
      unilevelQualified: ulQualified,
      depth1Pt: depthPoints[1] ?? 0,
      depth2Pt: depthPoints[2] ?? 0,
      depth3Pt: depthPoints[3] ?? 0,
      depth4Pt: depthPoints[4] ?? 0,
      depth5Pt: depthPoints[5] ?? 0,
      depth6Pt: depthPoints[6] ?? 0,
      depth7Pt: depthPoints[7] ?? 0,
      calculatedUnilevelB: ulTotal,
      rates: rates.slice(0, maxULDepth),
      ulDetail,
    },

    // ── 組織構築B ──
    structureBonus: {
      orgEligible: isActive && directActiveCount >= 2 && achievedLevel >= 3 && memberCode.endsWith("01"),
      directChildren: directChildren.map(id => memberMap.get(id)?.memberCode ?? id.toString()),
      seriesPtList: seriesValues,
      positiveSeriesCount,
      selectedMinSeriesPt: minSeriesPt,
      orgRate: sbRate,
      calculatedOrgBuildB: sbCalc,
      isOrgException,
      positiveSeriesRequired: isOrgException ? 1 : 3,
      seriesQualifies: positiveSeriesCount >= (isOrgException ? 1 : 3),
    },

    // ── 貯金B ──
    savingsBonus: {
      sProductPt,
      asProductPt,
      bonusPointBase,
      savingFromSProduct,
      savingFromAS,
      savingFromBonus,
      totalSavingPt,
      dbSavingsPointsAdded: dbResult?.savingsPointsAdded ?? null,
    },

    // ── 支払 ──
    payment: {
      directBonusPersonCount,
      directBonusCalc,
      grossBonusBeforeAdjustment,
      isPayTarget,
      carryoverAmount: 0,
      adminFee: isPayTarget ? 440 : 0,
      finalPaymentAmount: isPayTarget ? (grossBonusBeforeAdjustment - 440) : 0,
    },

    // ── DB結果（最新計算） ──
    dbResult: dbResult ? {
      achievedLevel: dbResult.achievedLevel,
      directBonus: Number(dbResult.directBonus),
      unilevelBonus: Number(dbResult.unilevelBonus),
      structureBonus: Number(dbResult.structureBonus),
      minLinePoints: dbResult.minLinePoints,
      lineCount: dbResult.lineCount,
      directActiveCount: dbResult.directActiveCount,
      selfPurchasePoints: dbResult.selfPurchasePoints,
      unilevelDetail: dbResult.unilevelDetail,
      savingsPointsAdded: dbResult.savingsPointsAdded,
      amountBeforeAdjustment: Number(dbResult.amountBeforeAdjustment),
      paymentAmount: Number(dbResult.paymentAmount),
      serviceFee: Number(dbResult.serviceFee),
    } : null,

    // ── 期待値 ──
    expected: ({
      "82179501": { ul: 53850, sb: 35700, minSeries: 10200, level: 4 },
      "44504701": { ul: 44850, sb: 122400, minSeries: 30600, level: 5 },
      "86820601": { ul: 161250, sb: 16200, minSeries: 5400, level: 3 },
      "93713601": { ul: 110100, sb: 4200, minSeries: 1400, level: 3 },
      "89248801": { ul: null, sb: 122400, minSeries: 30600, level: 5 },
    } as Record<string, { ul: number | null; sb: number; minSeries: number; level: number } | undefined>)[memberCode] ?? null,

    // ── トレース ──
    seriesDetail: seriesDetailMap,
    ulTrace: ulTrace.slice(0, 200),
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
