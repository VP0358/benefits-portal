import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isActiveMember,
  calcLevelFromGP,
  calcUnilevelBonus,
  calcStructureBonus,
  calcNewTitleLevel,
  checkLevelCondition,
  DIRECT_BONUS_PRODUCT,
  DIRECT_BONUS_AMOUNT,
  ACTIVE_REQUIRED_PRODUCTS,
  ACTIVE_MIN_POINTS,
  AS_SAVINGS_RATE,
  SAVINGS_BONUS_RATE,
} from "@/lib/mlm-bonus";

/** ボーナス計算実行（月次） */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bonusMonth, closingDate, mode = "calculate" } = body;
  // mode: "calculate" = 計算のみ(draft), "confirm" = 確定

  if (!bonusMonth || !/^\d{4}-\d{2}$/.test(bonusMonth)) {
    return NextResponse.json({ error: "bonusMonth は YYYY-MM 形式で指定してください" }, { status: 400 });
  }

  const adminId = BigInt(session.user.id ?? "0");

  try {
    // ━━━ 既存のRunをチェック ━━━
    const existingRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
    });
    if (existingRun?.status === "confirmed" && mode !== "rerun") {
      return NextResponse.json({ error: "この月のボーナスは既に確定済みです" }, { status: 409 });
    }

    // ━━━ 全MLM会員を取得（ビジネス会員のみ対象） ━━━
    const allMembers = await prisma.mlmMember.findMany({
      include: {
        user: { select: { name: true } },
        downlines: { select: { id: true } },
      },
    });

    // ━━━ 当月購入データ取得 ━━━
    const allPurchases = await prisma.mlmPurchase.findMany({
      where: { purchaseMonth: bonusMonth },
    });

    // 会員ごとの購入データをマップ化
    const purchaseMap = new Map<bigint, typeof allPurchases>();
    for (const p of allPurchases) {
      if (!purchaseMap.has(p.mlmMemberId)) purchaseMap.set(p.mlmMemberId, []);
      purchaseMap.get(p.mlmMemberId)!.push(p);
    }

    // ━━━ アクティブ判定 ━━━
    const [targetYear, targetMon] = bonusMonth.split("-").map(Number);
    const activeSet = new Set<bigint>();

    for (const m of allMembers) {
      const purchases = purchaseMap.get(m.id) ?? [];
      const selfPoints = purchases.reduce((s, p) => s + p.totalPoints, 0);
      const hasRequired = purchases.some((p) =>
        ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)
      );
      const active = isActiveMember({
        contractDate: m.contractDate,
        memberType: m.memberType,
        selfPoints,
        purchasedRequiredProduct: hasRequired,
        forceActive: m.forceActive,
        targetMonth: bonusMonth,
      });
      if (active) activeSet.add(m.id);
    }

    // ━━━ グループポイント計算（7段圧縮） ━━━
    // 各会員のマトリックス7段下位を再帰でたどり、非アクティブを圧縮
    type MemberNode = { id: bigint; uplineId: bigint | null };
    const memberMap = new Map<bigint, (typeof allMembers)[0]>();
    for (const m of allMembers) memberMap.set(m.id, m);

    // 深さ別に子をたどる（圧縮あり）
    function getDescendantPointsByDepth(
      memberId: bigint,
      currentDepth: number,
      maxDepth: number,
      result: Record<number, number>
    ) {
      if (currentDepth > maxDepth) return;
      const member = memberMap.get(memberId);
      if (!member) return;

      const directChildren = allMembers.filter((m) => m.uplineId === memberId);
      for (const child of directChildren) {
        if (activeSet.has(child.id)) {
          const childPurchases = purchaseMap.get(child.id) ?? [];
          const childPt = childPurchases.reduce((s, p) => s + p.totalPoints, 0);
          result[currentDepth] = (result[currentDepth] ?? 0) + childPt;
          // 子の下も探索
          getDescendantPointsByDepth(child.id, currentDepth + 1, maxDepth, result);
        } else {
          // 非アクティブ → 圧縮（同じ深さでその子を探索）
          getDescendantPointsByDepth(child.id, currentDepth, maxDepth, result);
        }
      }
    }

    // グループポイント（自己 + 7段下位）
    function calcGroupPoints(memberId: bigint): number {
      const selfPurchases = purchaseMap.get(memberId) ?? [];
      const selfPt = selfPurchases.reduce((s, p) => s + p.totalPoints, 0);
      const depthPt: Record<number, number> = {};
      getDescendantPointsByDepth(memberId, 1, 7, depthPt);
      return selfPt + Object.values(depthPt).reduce((a, b) => a + b, 0);
    }

    // ━━━ 各会員のボーナス計算 ━━━
    const bonusResultsData: {
      mlmMemberId: bigint;
      isActive: boolean;
      selfPurchasePoints: number;
      groupPoints: number;
      directActiveCount: number;
      achievedLevel: number;
      previousTitleLevel: number;
      newTitleLevel: number;
      directBonus: number;
      unilevelBonus: number;
      structureBonus: number;
      savingsBonus: number;
      totalBonus: number;
      unilevelDetail: Record<number, number>;
      savingsPointsAdded: number;
    }[] = [];

    for (const m of allMembers) {
      if (m.memberType !== "business") continue;

      const purchases = purchaseMap.get(m.id) ?? [];
      const selfPt = purchases.reduce((s, p) => s + p.totalPoints, 0);
      const isActive = activeSet.has(m.id);

      // グループポイント計算
      const gp = calcGroupPoints(m.id);

      // 直接紹介アクティブ数
      const directActiveCount = allMembers
        .filter((d) => d.referrerId === m.id)
        .filter((d) => activeSet.has(d.id)).length;

      // レベル達成チェック
      const conditionOk = checkLevelCondition(isActive, directActiveCount, m.conditionAchieved);
      const rawLevel = conditionOk ? calcLevelFromGP(gp) : 0;
      const achievedLevel = m.forceLevel != null ? m.forceLevel : rawLevel;

      // 称号レベル更新
      const newTitleLevel = calcNewTitleLevel(m.titleLevel, achievedLevel, isActive);

      // ダイレクトボーナス
      // 自分が直接紹介した会員がs1000を購入した数 × 2000円
      const directReferrals = allMembers.filter((d) => d.referrerId === m.id);
      let directBonus = 0;
      if (isActive) {
        for (const ref of directReferrals) {
          const refPurchases = purchaseMap.get(ref.id) ?? [];
          const s1000count = refPurchases
            .filter((p) => p.productCode === DIRECT_BONUS_PRODUCT)
            .reduce((s, p) => s + p.quantity, 0);
          directBonus += s1000count * DIRECT_BONUS_AMOUNT;
        }
      }

      // ユニレベルボーナス（アクティブかつ直接紹介2名以上）
      let unilevelBonus = 0;
      let unilevelDetail: Record<number, number> = {};
      if (isActive && directActiveCount >= 2) {
        const depthPt: Record<number, number> = {};
        getDescendantPointsByDepth(m.id, 1, 7, depthPt);
        const result = calcUnilevelBonus(depthPt, achievedLevel, conditionOk);
        unilevelBonus = result.total;
        unilevelDetail = result.detail;
      }

      // 組織構築ボーナス（LV.3以上、01ポジション）
      let structureBonus = 0;
      if (isActive && achievedLevel >= 3) {
        // 直下系列ごとのポイントを計算し最小値を取得
        const directChildren = allMembers.filter((d) => d.uplineId === m.id);
        if (directChildren.length > 0) {
          const seriesPoints = directChildren.map((child) => {
            const childDepthPt: Record<number, number> = {};
            const childSelfPt = (purchaseMap.get(child.id) ?? []).reduce(
              (s, p) => s + p.totalPoints, 0
            );
            getDescendantPointsByDepth(child.id, 1, 7, childDepthPt);
            return childSelfPt + Object.values(childDepthPt).reduce((a, b) => a + b, 0);
          });
          const minSeriesPt = Math.min(...seriesPoints);
          // 01ポジション判定（matrixPosition === 1）
          const isFirstPosition = m.matrixPosition === 1 || m.uplineId === null;
          structureBonus = calcStructureBonus(achievedLevel, minSeriesPt, isFirstPosition);
        }
      }

      // 貯金ポイント加算（s商品購入でselfPt × 20%）
      const hasSProduct = purchases.some((p) => p.productCode.startsWith("s"));
      let savingsPointsAdded = 0;
      if (isActive && hasSProduct) {
        savingsPointsAdded = Math.floor(selfPt * SAVINGS_BONUS_RATE);
      }
      // AS伝票分（autoshipEnabled かつ有効月）
      if (m.autoshipEnabled && isActive) {
        savingsPointsAdded += Math.floor(selfPt * AS_SAVINGS_RATE);
      }

      // 貯金ボーナス（1万pt単位で還元 → 今月は積み増しのみ、払い出しは別処理）
      const savingsBonus = 0; // 管理者が手動設定

      const totalBonus = directBonus + unilevelBonus + structureBonus + savingsBonus;

      bonusResultsData.push({
        mlmMemberId: m.id,
        isActive,
        selfPurchasePoints: selfPt,
        groupPoints: gp,
        directActiveCount,
        achievedLevel,
        previousTitleLevel: m.titleLevel,
        newTitleLevel,
        directBonus,
        unilevelBonus,
        structureBonus,
        savingsBonus,
        totalBonus,
        unilevelDetail,
        savingsPointsAdded,
      });
    }

    // ━━━ DB保存 ━━━
    const totalBonusAmount = bonusResultsData.reduce((s, r) => s + r.totalBonus, 0);
    const totalActiveMembers = bonusResultsData.filter((r) => r.isActive).length;

    const run = await prisma.$transaction(async (tx) => {
      // BonusRun upsert
      const bonusRun = await tx.bonusRun.upsert({
        where: { bonusMonth },
        create: {
          bonusMonth,
          closingDate: closingDate ? new Date(closingDate) : new Date(),
          status: mode === "confirm" ? "confirmed" : "draft",
          totalMembers: bonusResultsData.length,
          totalActiveMembers,
          totalBonusAmount,
          executedByAdminId: adminId,
          confirmedAt: mode === "confirm" ? new Date() : null,
        },
        update: {
          status: mode === "confirm" ? "confirmed" : "draft",
          totalMembers: bonusResultsData.length,
          totalActiveMembers,
          totalBonusAmount,
          executedByAdminId: adminId,
          confirmedAt: mode === "confirm" ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      // 既存の結果を削除して再作成
      await tx.bonusResult.deleteMany({ where: { bonusRunId: bonusRun.id } });

      await tx.bonusResult.createMany({
        data: bonusResultsData.map((r) => ({
          bonusRunId: bonusRun.id,
          mlmMemberId: r.mlmMemberId,
          bonusMonth,
          isActive: r.isActive,
          selfPurchasePoints: r.selfPurchasePoints,
          groupPoints: r.groupPoints,
          directActiveCount: r.directActiveCount,
          achievedLevel: r.achievedLevel,
          previousTitleLevel: r.previousTitleLevel,
          newTitleLevel: r.newTitleLevel,
          directBonus: r.directBonus,
          unilevelBonus: r.unilevelBonus,
          structureBonus: r.structureBonus,
          savingsBonus: r.savingsBonus,
          totalBonus: r.totalBonus,
          unilevelDetail: r.unilevelDetail as object,
          savingsPointsAdded: r.savingsPointsAdded,
          updatedAt: new Date(),
        })),
      });

      // 確定時：会員のタイトルレベルと貯金ptを更新
      if (mode === "confirm") {
        for (const r of bonusResultsData) {
          await tx.mlmMember.update({
            where: { id: r.mlmMemberId },
            data: {
              titleLevel: r.newTitleLevel,
              currentLevel: r.achievedLevel,
              savingsPoints: { increment: r.savingsPointsAdded },
            },
          });
        }
      }

      return bonusRun;
    });

    return NextResponse.json({
      success: true,
      bonusRunId: run.id.toString(),
      bonusMonth,
      status: run.status,
      totalMembers: bonusResultsData.length,
      totalActiveMembers,
      totalBonusAmount,
      message: mode === "confirm" ? "ボーナス計算を確定しました" : "ボーナス計算（下書き）が完了しました",
    });
  } catch (e) {
    console.error("bonus-run POST error:", e);
    return NextResponse.json({ error: "計算に失敗しました" }, { status: 500 });
  }
}

/** ボーナス計算結果一覧取得 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("month");

  try {
    if (bonusMonth) {
      // 特定月の詳細
      const run = await prisma.bonusRun.findUnique({
        where: { bonusMonth },
        include: {
          results: {
            include: {
              mlmMember: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
            orderBy: { totalBonus: "desc" },
          },
        },
      });

      if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

      return NextResponse.json({
        id: run.id.toString(),
        bonusMonth: run.bonusMonth,
        status: run.status,
        closingDate: run.closingDate.toISOString(),
        totalMembers: run.totalMembers,
        totalActiveMembers: run.totalActiveMembers,
        totalBonusAmount: run.totalBonusAmount,
        confirmedAt: run.confirmedAt?.toISOString() ?? null,
        results: run.results.map((r) => ({
          id: r.id.toString(),
          memberId: r.mlmMemberId.toString(),
          memberName: r.mlmMember.user.name,
          memberEmail: r.mlmMember.user.email,
          mlmMemberCode: r.mlmMember.memberCode,
          isActive: r.isActive,
          selfPurchasePoints: r.selfPurchasePoints,
          groupPoints: r.groupPoints,
          directActiveCount: r.directActiveCount,
          achievedLevel: r.achievedLevel,
          previousTitleLevel: r.previousTitleLevel,
          newTitleLevel: r.newTitleLevel,
          directBonus: r.directBonus,
          unilevelBonus: r.unilevelBonus,
          structureBonus: r.structureBonus,
          savingsBonus: r.savingsBonus,
          totalBonus: r.totalBonus,
          unilevelDetail: r.unilevelDetail,
          savingsPointsAdded: r.savingsPointsAdded,
        })),
      });
    }

    // 一覧
    const runs = await prisma.bonusRun.findMany({
      orderBy: { bonusMonth: "desc" },
      take: 24,
    });

    return NextResponse.json(
      runs.map((r) => ({
        id: r.id.toString(),
        bonusMonth: r.bonusMonth,
        status: r.status,
        totalMembers: r.totalMembers,
        totalActiveMembers: r.totalActiveMembers,
        totalBonusAmount: r.totalBonusAmount,
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error("bonus-run GET error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
