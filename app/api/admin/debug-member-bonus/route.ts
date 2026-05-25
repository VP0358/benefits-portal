export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/debug-member-bonus?memberCode=89248801&bonusMonth=2026-04
 * 指定会員・月のボーナス計算データを詳細デバッグ用に返す
 *
 * viola-pure.biz の「前月ポイント状況」（4月度）比較:
 *   直アクティブ数: 3
 *   新規pt (商品1000): 300pt
 *   継続pt (商品2000): 30,300pt
 *   合計pt (GP): 30,600pt
 *   新規ポジション数: 2
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const memberCode = searchParams.get("memberCode") ?? "89248801";
  const bonusMonth = searchParams.get("bonusMonth") ?? "2026-04";

  // ─── 会員基本情報 ───
  const member = await prisma.mlmMember.findFirst({
    where: { memberCode },
    include: {
      user: { select: { id: true, name: true, memberCode: true } },
      referrer: {
        include: { user: { select: { name: true, memberCode: true } } }
      },
      upline: {
        include: { user: { select: { name: true, memberCode: true } } }
      },
    }
  });

  if (!member) {
    return NextResponse.json({ error: `会員 ${memberCode} が見つかりません` }, { status: 404 });
  }

  // ─── 対象月の自己購買データ ───
  const purchases = await prisma.mlmPurchase.findMany({
    where: { mlmMemberId: member.id, purchaseMonth: bonusMonth },
    include: { order: { select: { orderType: true, paymentStatus: true, invoiceNumber: true, slipType: true } } },
    orderBy: { id: "asc" },
  });

  const selfPurchasePoints = purchases
    .filter(p => ["1000", "2000"].includes(p.productCode))
    .reduce((s, p) => s + (p.totalPoints ?? 0), 0);

  // 商品1000(新規)・2000(継続)別pt
  const newPt = purchases
    .filter(p => p.productCode === "1000")
    .reduce((s, p) => s + (p.totalPoints ?? 0), 0);
  const continuePt = purchases
    .filter(p => p.productCode === "2000")
    .reduce((s, p) => s + (p.totalPoints ?? 0), 0);

  const selfPurchaseProducts = purchases.map(p => ({
    productCode: p.productCode,
    productName: p.productName,
    points: p.points,
    totalPoints: p.totalPoints,
    quantity: p.quantity,
    purchaseStatus: p.purchaseStatus,
    orderType: p.order?.orderType,
    slipType: (p.order as any)?.slipType,
    paymentStatus: p.order?.paymentStatus,
  }));

  // ─── BonusRun一覧 ───
  const bonusRuns = await (prisma as any).bonusRun.findMany({
    where: { bonusMonth },
    orderBy: { id: "desc" },
    select: {
      id: true, bonusMonth: true, status: true,
      totalMembers: true, totalActiveMembers: true,
      totalBonusAmount: true, createdAt: true
    },
  });

  // ─── BonusResult（全ラン） ───
  const bonusResults = await (prisma as any).bonusResult.findMany({
    where: {
      mlmMemberId: member.id,
      bonusRun: { bonusMonth }
    },
    include: { bonusRun: { select: { id: true, bonusMonth: true, status: true } } },
    orderBy: { bonusRunId: "desc" },
  });

  // ─── 直下紹介者（referrerId = member.id）の対象月購買 ─── 
  // ※ withdrawnを含む全ての直下紹介者を取得（ボーナスエンジンと同じ動作）
  const directReferrals = await prisma.mlmMember.findMany({
    where: { referrerId: member.id },
    include: {
      user: { select: { name: true, memberCode: true } },
      purchases: {
        where: { purchaseMonth: bonusMonth },
      }
    },
    orderBy: { memberCode: "asc" },
  });

  const directReferralSummary = directReferrals.map(r => {
    const selfPts = r.purchases
      .filter(p => ["1000", "2000"].includes(p.productCode))
      .reduce((s, p) => s + (p.totalPoints ?? 0), 0);
    const isWithdrawn = r.status === "withdrawn";
    const isActive = !isWithdrawn && selfPts >= 150;
    const memberNewPt = r.purchases
      .filter(p => p.productCode === "1000")
      .reduce((s, p) => s + (p.totalPoints ?? 0), 0);
    const memberContinuePt = r.purchases
      .filter(p => p.productCode === "2000")
      .reduce((s, p) => s + (p.totalPoints ?? 0), 0);
    return {
      memberCode: r.memberCode,
      name: r.user.name,
      status: r.status,
      selfPurchasePoints: selfPts,
      newPt: memberNewPt,
      continuePt: memberContinuePt,
      isActive,
      isWithdrawn,
      isO1Position: !r.memberCode.includes("-") || r.memberCode.endsWith("-01"),
      purchaseCount: r.purchases.length,
    };
  });

  // ボーナスエンジンと同じ判定: withdrawn除外した直下アクティブ数
  const directActiveCount = directReferralSummary.filter(r => r.isActive && !r.isWithdrawn).length;
  const newPositionCount = directReferralSummary.filter(r => r.newPt > 0 && !r.isWithdrawn).length;
  const newO1PositionCount = directReferralSummary.filter(r => r.newPt > 0 && r.isO1Position && !r.isWithdrawn).length;

  // ─── 傘下全体（7段）のポイント集計 ───
  // 直下紹介者経由でグループpt合計を簡易計算（DB生クエリ）
  // 傘下GP集計: withdrawn会員もツリー構造に含める（withdrawn経由の非withdrawnを正しくカウント）
  const groupPtRows = await prisma.$queryRawUnsafe<{ product_code: string; total_pts: bigint; member_count: bigint }[]>(`
    WITH RECURSIVE org AS (
      SELECT id, "memberCode", "referrerId", status, 1 as depth
      FROM mlm_members
      WHERE "referrerId" = ${member.id}

      UNION ALL

      SELECT m.id, m."memberCode", m."referrerId", m.status, org.depth + 1
      FROM mlm_members m
      INNER JOIN org ON org.id = m."referrerId"
      WHERE org.depth < 7
    )
    SELECT
      mp."productCode" as product_code,
      SUM(mp."totalPoints") as total_pts,
      COUNT(DISTINCT mp."mlmMemberId") as member_count
    FROM org
    JOIN mlm_purchases mp ON mp."mlmMemberId" = org.id
    WHERE mp."purchaseMonth" = '${bonusMonth}'
      AND mp."productCode" IN ('1000', '2000')
      AND org.status IN ('active', 'autoship', 'suspended')
    GROUP BY mp."productCode"
    ORDER BY mp."productCode"
  `);

  // 自己ptを含んだGP = 自己pt + 傘下pt（アクティブのみ）
  // ※ 簡易版（アクティブフィルタなし）
  const groupPtBreakdown = groupPtRows.map(r => ({
    productCode: r.product_code,
    totalPts: Number(r.total_pts),
    memberCount: Number(r.member_count),
  }));
  const groupPtFromSubtree = groupPtBreakdown.reduce((s, r) => s + r.totalPts, 0);
  const estimatedGroupPt = selfPurchasePoints + groupPtFromSubtree;

  // ─── 参照システム（viola-pure.biz）4月の期待値 ───
  const violaPureReference = {
    directActiveCount: 3,
    newPt: 300,
    continuePt: 30300,
    totalPt: 30600,
    newPositionCount: 2,
    newO1PositionCount: 2,
    currentPositionCount: 797,
    currentO1PositionCount: 651,
  };

  const latestBr = bonusResults[0];

  return NextResponse.json({
    member: {
      memberCode: member.memberCode,
      name: member.user.name,
      status: member.status,
      currentLevel: member.currentLevel,
      conditionAchieved: member.conditionAchieved,
      forcedLevel: (member as any).forcedLevel ?? (member as any).forceLevel,
      referrer: member.referrer ? {
        memberCode: member.referrer.memberCode,
        name: member.referrer.user.name,
      } : null,
      upline: member.upline ? {
        memberCode: member.upline.memberCode,
        name: member.upline.user.name,
      } : null,
    },
    bonusMonth,
    selfPurchase: {
      total: selfPurchasePoints,
      newPt,
      continuePt,
      products: selfPurchaseProducts,
    },
    directReferrals: {
      total: directReferrals.length,
      activeCount: directActiveCount,
      newPositionCount,
      newO1PositionCount,
      members: directReferralSummary,
    },
    groupPointEstimate: {
      selfPt: selfPurchasePoints,
      subtreePt: groupPtFromSubtree,
      estimatedGP: estimatedGroupPt,
      breakdown: groupPtBreakdown,
      note: "※傘下7段・アクティブフィルタなし（簡易集計）。実際のGPはボーナスエンジンの圧縮ロジック適用後の値",
    },
    bonusRuns,
    bonusResults: bonusResults.map((br: any) => ({
      bonusRunId: br.bonusRunId,
      bonusMonth: br.bonusRun.bonusMonth,
      runStatus: br.bonusRun.status,
      isActive: br.isActive,
      selfPurchasePoints: br.selfPurchasePoints,
      groupPoints: br.groupPoints,
      directActiveCount: br.directActiveCount,
      achievedLevel: br.achievedLevel,
      previousTitleLevel: br.previousTitleLevel,
      newTitleLevel: br.newTitleLevel,
      directBonus: br.directBonus,
      unilevelBonus: br.unilevelBonus,
      structureBonus: br.structureBonus,
      carryoverAmount: br.carryoverAmount,
      adjustmentAmount: br.adjustmentAmount,
      otherPositionAmount: br.otherPositionAmount,
      bonusTotal: br.bonusTotal,
      amountBeforeAdjustment: br.amountBeforeAdjustment,
      finalAmount: br.finalAmount,
      consumptionTax: br.consumptionTax,
      withholdingTax: br.withholdingTax,
      shortageAmount: br.shortageAmount,
      paymentAmount: br.paymentAmount,
      savingsPointsAdded: br.savingsPointsAdded,
      groupActiveCount: br.groupActiveCount,
      minLinePoints: br.minLinePoints,
      lineCount: br.lineCount,
      unilevelDetail: br.unilevelDetail,
    })),
    violaPureReference,
    // 差異分析
    analysis: {
      description: "viola-pure.biz との比較分析",
      directActive: {
        ours: directActiveCount,
        theirs: violaPureReference.directActiveCount,
        match: directActiveCount === violaPureReference.directActiveCount,
      },
      newPositionCount: {
        ours: newPositionCount,
        theirs: violaPureReference.newPositionCount,
        match: newPositionCount === violaPureReference.newPositionCount,
      },
      groupPoints: {
        oursBonusResult: latestBr?.groupPoints ?? null,
        estimatedGP: estimatedGroupPt,
        theirs: violaPureReference.totalPt,
        bonusResultMatch: latestBr ? latestBr.groupPoints === violaPureReference.totalPt : null,
      },
      selfPurchase: {
        ours: selfPurchasePoints,
        isActive: selfPurchasePoints >= 150,
      },
    }
  });
}
