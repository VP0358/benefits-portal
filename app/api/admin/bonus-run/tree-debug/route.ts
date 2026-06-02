/**
 * GET /api/admin/bonus-run/tree-debug?memberCode=82179501&bonusMonth=2026-04
 * 
 * 特定会員のuplineツリーを詳細トレースして、
 * UL / SB の計算差を診断する。
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

function getMonthRange(bonusMonth: string) {
  const [y, m] = bonusMonth.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end:   new Date(Date.UTC(y, m, 1)),
  };
}

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
    select: { id: true, memberCode: true, status: true, isActive: true, forceActive: true, forceLevel: true, uplineId: true, referrerId: true },
  });
  if (!target) return NextResponse.json({ error: `${memberCode} not found` }, { status: 404 });

  // ── 全会員ロード ──
  const allMembers = await prisma.mlmMember.findMany({
    select: { id: true, memberCode: true, status: true, isActive: true, forceActive: true, forceLevel: true, uplineId: true, referrerId: true },
  });
  const memberMap = new Map(allMembers.map(m => [m.id, m]));

  // ── 購入データ ──
  const purchases = await prisma.mlmPurchase.findMany({
    where: { purchaseMonth: bonusMonth },
    include: {
      order: { select: { slipType: true, paidAt: true, paymentStatus: true } },
    },
  });

  type PurchaseData = {
    selfPurchasePoints: number;
    purchasedRequiredProduct: boolean;
  };
  const purchaseMap = new Map<bigint, PurchaseData>();
  for (const p of purchases) {
    const mid = p.mlmMemberId;
    if (!purchaseMap.has(mid)) {
      purchaseMap.set(mid, { selfPurchasePoints: 0, purchasedRequiredProduct: false });
    }
    const d = purchaseMap.get(mid)!;
    if (ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)) {
      d.selfPurchasePoints += p.totalPoints || 0;
      d.purchasedRequiredProduct = true;
    }
  }

  // ── 組織マップ ──
  const withdrawnMembers = await prisma.mlmMember.findMany({
    where: { status: { in: ["withdrawn", "lapsed"] } },
    select: { id: true, memberCode: true, status: true, isActive: true, forceActive: true, forceLevel: true, uplineId: true, referrerId: true },
  });
  // bonusEligibleMemberIds = withdrawn/lapsed-without-forceActive を除く
  const activeLapsedIds = new Set(
    allMembers.filter(m => m.status === "lapsed" && m.forceActive).map(m => m.id)
  );
  const bonusEligibleMemberIds = new Set<bigint>(
    allMembers
      .filter(m => m.status !== "withdrawn" && !(m.status === "lapsed" && !m.forceActive))
      .map(m => m.id)
  );

  const allMembersForTree = [...allMembers, ...withdrawnMembers.filter(m => !allMembers.find(a => a.id === m.id))];
  const uplineChildrenMap = new Map<bigint, bigint[]>();
  for (const m of allMembersForTree) {
    if (m.uplineId) {
      if (!uplineChildrenMap.has(m.uplineId)) uplineChildrenMap.set(m.uplineId, []);
      uplineChildrenMap.get(m.uplineId)!.push(m.id);
    }
  }

  // ── BonusResult から achievedLevel を取得 ──
  const bonusRun = await prisma.bonusRun.findUnique({ where: { bonusMonth } });
  let dbResult: { achievedLevel: number; unilevelBonus: bigint | number; structureBonus: bigint | number; minLinePoints: number; lineCount: number; directActiveCount: number; selfPurchasePoints: number; unilevelDetail: unknown } | null = null;
  if (bonusRun) {
    dbResult = await (prisma as any).bonusResult.findFirst({
      where: { bonusRunId: bonusRun.id, mlmMemberId: target.id },
      select: {
        achievedLevel: true, unilevelBonus: true, structureBonus: true,
        minLinePoints: true, lineCount: true, directActiveCount: true,
        selfPurchasePoints: true, unilevelDetail: true,
      },
    });
  }

  const achievedLevel = dbResult?.achievedLevel ?? (target.forceLevel ?? 0);
  const maxULDepth    = UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;
  const rates         = UNILEVEL_RATES[achievedLevel] ?? [];

  // ── calcDepthPoints trace ──
  const depthTrace: { depth: number; memberCode: string; selfPt: number; active: boolean; withdrawn: boolean; forceActive: boolean }[] = [];
  const depthPoints: Record<number, number> = {};

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
        depthTrace.push({ depth, memberCode: childMember.memberCode, selfPt: childSelfPt, active: false, withdrawn: true, forceActive: childForceActive });
        traverseUL(childId, depth); // transparent
        continue;
      }

      const childIsActive = isActiveMember({
        selfPoints: childSelfPt,
        purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
        forceActive: childForceActive,
      });

      depthTrace.push({ depth, memberCode: childMember.memberCode, selfPt: childSelfPt, active: childIsActive, withdrawn: false, forceActive: childForceActive });

      if (childIsActive) {
        depthPoints[depth] = (depthPoints[depth] || 0) + childSelfPt;
        traverseUL(childId, depth + 1);
      } else {
        traverseUL(childId, depth); // non-active transparent
      }
    }
  }
  traverseUL(target.id, 1);

  // UL bonus
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

  // ── calcMinSeriesPoints trace ──
  const directChildren = uplineChildrenMap.get(target.id) || [];
  const seriesDetailMap: Record<string, { total: number; members: { depth: number; memberCode: string; selfPt: number; active: boolean; withdrawn: boolean; forceActive: boolean }[] }> = {};

  for (const childId of directChildren) {
    const childMember = memberMap.get(childId);
    const seriesKey   = childMember?.memberCode ?? childId.toString();
    let seriesTotal   = 0;
    const seriesMembers: typeof seriesDetailMap[string]["members"] = [];

    const MAX_SERIES_DEPTH = 7;

    function traverseSeries(currentId: bigint, depth: number) {
      if (depth > MAX_SERIES_DEPTH) return;
      const mem      = memberMap.get(currentId);
      const purchase = purchaseMap.get(currentId);
      if (!mem) return;

      const isWithdrawn  = !bonusEligibleMemberIds.has(currentId);
      const isForceActive = mem.forceActive || false;
      const selfPt       = purchase?.selfPurchasePoints ?? 0;

      if (isWithdrawn) {
        seriesMembers.push({ depth, memberCode: mem.memberCode, selfPt, active: false, withdrawn: true, forceActive: isForceActive });
        for (const descId of (uplineChildrenMap.get(currentId) || [])) {
          traverseSeries(descId, depth); // transparent
        }
        return;
      }

      if (isForceActive) {
        seriesMembers.push({ depth, memberCode: mem.memberCode, selfPt, active: true, withdrawn: false, forceActive: true });
        for (const descId of (uplineChildrenMap.get(currentId) || [])) {
          traverseSeries(descId, depth); // forceActive: transparent (current impl)
        }
        return;
      }

      const isActive = isActiveMember({
        selfPoints: selfPt,
        purchasedRequiredProduct: purchase?.purchasedRequiredProduct ?? false,
        forceActive: false,
      });
      seriesMembers.push({ depth, memberCode: mem.memberCode, selfPt, active: isActive, withdrawn: false, forceActive: false });
      if (isActive) seriesTotal += selfPt;

      for (const descId of (uplineChildrenMap.get(currentId) || [])) {
        traverseSeries(descId, depth + 1);
      }
    }
    traverseSeries(childId, 1);

    seriesDetailMap[seriesKey] = { total: seriesTotal, members: seriesMembers };
  }

  const seriesValues = Object.values(seriesDetailMap).map(s => s.total).filter(v => v > 0);
  const minSeriesPt  = seriesValues.length > 0 ? Math.min(...seriesValues) : 0;
  const sbRate       = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
  const sbCalc       = Math.floor(minSeriesPt * (sbRate / 100) * POINT_RATE);

  return NextResponse.json({
    target: {
      memberCode: target.memberCode,
      status: target.status,
      forceActive: target.forceActive,
      forceLevel: target.forceLevel,
    },
    dbResult: dbResult ? {
      achievedLevel: dbResult.achievedLevel,
      unilevelBonus: Number(dbResult.unilevelBonus),
      structureBonus: Number(dbResult.structureBonus),
      minLinePoints: dbResult.minLinePoints,
      lineCount: dbResult.lineCount,
      directActiveCount: dbResult.directActiveCount,
      selfPurchasePoints: dbResult.selfPurchasePoints,
      unilevelDetail: dbResult.unilevelDetail,
    } : null,
    calculated: {
      achievedLevel,
      maxULDepth,
      depthPoints,
      ulDetail,
      ulTotal,
      minSeriesPt,
      sbRate,
      sbCalc,
      seriesCount: seriesValues.length,
    },
    seriesDetail: seriesDetailMap,
    ulTrace: depthTrace,
    expected: {
      "82179501": { ul: 53850, sb: 35700, minSeries: 10200 },
      "44504701": { ul: 44850, sb: 122400 },
      "86820601": { ul: 161250, sb: 16200 },
      "93713601": { ul: 110100, sb: 4200 },
    }[memberCode] ?? null,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
