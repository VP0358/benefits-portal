/**
 * ボーナス計算エンジン（CLAIR仕様 2026年3月4日版）
 * Phase 4: 月次バッチ処理エンジン実装
 */

import { prisma } from "./prisma";
import {
  calcLevelFromItemCount,
  isActiveMember,
  getUnilevelRates,
  getUnilevelMaxDepth,
  calcUnilevelBonus,
  DIRECT_BONUS_AMOUNT,
  DIRECT_BONUS_PRODUCT,
  ACTIVE_REQUIRED_PRODUCTS,
  POINT_RATE,
} from "./mlm-bonus";

/**
 * ボーナス計算メインエンジン
 * @param bonusMonth "YYYY-MM"
 * @param paymentAdjustmentRate 支払調整率（0.0〜1.0）、nullの場合は調整なし
 */
export async function executeBonusCalculation(
  bonusMonth: string,
  paymentAdjustmentRate: number | null = null
): Promise<{
  bonusRunId: bigint;
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
}> {
  console.log(`🚀 ボーナス計算開始: ${bonusMonth}`);

  // 1. ボーナス設定を取得
  const bonusSettings = await prisma.bonusSettings.findFirst();
  const savingsConfig = await prisma.savingsBonusConfig.findFirst();

  if (!bonusSettings || !savingsConfig) {
    throw new Error("ボーナス設定が見つかりません");
  }

  // 2. 全MLM会員を取得
  const members = await prisma.mlmMember.findMany({
    where: {
      status: {
        in: ["active", "suspended"], // アクティブ・停止中の会員を対象
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  console.log(`📊 対象会員数: ${members.length}名`);

  // 3. 対象月の購入データを取得
  const [year, month] = bonusMonth.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const purchases = await prisma.mlmPurchase.findMany({
    where: {
      purchaseMonth: bonusMonth,  // "YYYY-MM" 形式のインデックスを使用
    },
    include: {
      mlmMember: {
        select: {
          id: true,
          memberCode: true,
        },
      },
    },
  });

  console.log(`💳 対象月購入件数: ${purchases.length}件`);

  // 4. 会員ごとの購入データを集計
  const memberPurchaseMap = new Map<
    bigint,
    {
      selfPurchasePoints: number;
      directBonusCount: number; // s1000の購入個数
      purchasedRequiredProduct: boolean; // 1000 or 2000購入フラグ
      sumiSaiCount: number; // 翠彩流通個数（1000, 2000）
    }
  >();

  for (const purchase of purchases) {
    const memberId = purchase.mlmMemberId;
    if (!memberPurchaseMap.has(memberId)) {
      memberPurchaseMap.set(memberId, {
        selfPurchasePoints: 0,
        directBonusCount: 0,
        purchasedRequiredProduct: false,
        sumiSaiCount: 0,
      });
    }
    const data = memberPurchaseMap.get(memberId)!;
    data.selfPurchasePoints += purchase.points || 0;

    // s1000（登録料）のカウント
    if (purchase.productCode === DIRECT_BONUS_PRODUCT) {
      data.directBonusCount += purchase.quantity;
    }

    // アクティブ判定用商品（1000, 2000）
    if (ACTIVE_REQUIRED_PRODUCTS.includes(purchase.productCode)) {
      data.purchasedRequiredProduct = true;
      data.sumiSaiCount += purchase.quantity;
    }
  }

  // 5. 組織構造を構築（ユニレベル）
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const childrenMap = new Map<bigint, bigint[]>();

  for (const member of members) {
    // referrerId = ユニレベル紹介者（ボーナス計算はユニレベルライン基準）
    if (member.referrerId) {
      if (!childrenMap.has(member.referrerId)) {
        childrenMap.set(member.referrerId, []);
      }
      childrenMap.get(member.referrerId)!.push(member.id);
    }
  }

  // 6. 各会員のボーナス計算
  const results: any[] = [];
  let totalActiveMembers = 0;
  let totalBonusAmount = 0;

  for (const member of members) {
    const purchaseData = memberPurchaseMap.get(member.id) || {
      selfPurchasePoints: 0,
      directBonusCount: 0,
      purchasedRequiredProduct: false,
      sumiSaiCount: 0,
    };

    // アクティブ判定
    const isActive = isActiveMember({
      contractDate: member.contractDate,
      memberType: member.memberType,
      selfPoints: purchaseData.selfPurchasePoints,
      purchasedRequiredProduct: purchaseData.purchasedRequiredProduct,
      forceActive: member.forceActive || false,
      targetMonth: bonusMonth,
    });

    if (isActive) totalActiveMembers++;

    // グループポイント・直接紹介アクティブ数を計算
    const { groupPoints, directActiveCount } = calcGroupData(
      member.id,
      childrenMap,
      memberPurchaseMap,
      memberMap,
      bonusMonth
    );

    // 翠彩流通個数ベースのレベル判定
    const totalSumiSaiCount =
      purchaseData.sumiSaiCount +
      calcDownlineSumiSaiCount(member.id, childrenMap, memberPurchaseMap, 7); // 7段目以内
    const achievedLevel = calcLevelFromItemCount(totalSumiSaiCount);

    // ダイレクトボーナス計算
    const directBonus = purchaseData.directBonusCount * DIRECT_BONUS_AMOUNT;

    // ユニレベルボーナス計算
    const depthPoints = calcDepthPoints(
      member.id,
      childrenMap,
      memberPurchaseMap,
      memberMap,
      bonusMonth,
      achievedLevel
    );
    const unilevelResult = calcUnilevelBonus(
      depthPoints,
      achievedLevel,
      directActiveCount
    );

    // 組織構築ボーナス計算（LV3以上）
    let structureBonus = 0;
    if (achievedLevel >= 3 && isActive) {
      const minSeriesPoints = calcMinSeriesPoints(
        member.id,
        childrenMap,
        memberPurchaseMap
      );
      const rate = getStructureBonusRate(achievedLevel, bonusSettings);
      structureBonus = Math.floor(minSeriesPoints * (rate / 100) * POINT_RATE);
    }

    // 貯金ボーナス（月次コミッション3%）
    const totalCommission = directBonus + unilevelResult.total + structureBonus;
    const savingsBonus = Math.floor(
      totalCommission * (savingsConfig.bonusRate / 100)
    );

    // 合計ボーナス（貯金ボーナスは支払額には含めず別途積み立て）
    const totalBonus = directBonus + unilevelResult.total + structureBonus;

    // 支払調整
    const paymentAdjustmentAmount =
      paymentAdjustmentRate !== null
        ? Math.floor(totalBonus * paymentAdjustmentRate)
        : 0;

    const finalAmount = totalBonus - paymentAdjustmentAmount;

    // 源泉徴収税（10.21%）
    const withholdingTax = Math.floor(finalAmount * 0.1021);

    // 事務手数料
    const serviceFee =
      finalAmount > bonusSettings.minPayoutAmount
        ? bonusSettings.serviceFeeAmount
        : 0;

    // 支払額
    const paymentAmount = Math.max(0, finalAmount - withholdingTax - serviceFee);

    totalBonusAmount += paymentAmount;

    results.push({
      mlmMemberId: member.id,
      bonusMonth,
      isActive,
      selfPurchasePoints: purchaseData.selfPurchasePoints,
      groupPoints,
      directActiveCount,
      achievedLevel,
      previousTitleLevel: member.currentLevel || 0,
      newTitleLevel: isActive
        ? Math.max(member.currentLevel || 0, achievedLevel)
        : 0,
      directBonus,
      unilevelBonus: unilevelResult.total,
      structureBonus,
      savingsBonus,
      amountBeforeAdjustment: totalBonus,
      paymentAdjustmentRate: paymentAdjustmentRate || 0,
      paymentAdjustmentAmount,
      finalAmount,
      withholdingTax,
      serviceFee,
      paymentAmount,
      unilevelDetail: unilevelResult.detail,
      savingsPointsAdded: savingsBonus,
    });
  }

  // 7. データベースに保存
  const bonusRun = await prisma.bonusRun.create({
    data: {
      bonusMonth,
      closingDate: new Date(),
      status: "draft",
      paymentAdjustmentRate: paymentAdjustmentRate || 0,
      totalMembers: members.length,
      totalActiveMembers,
      totalBonusAmount: Math.floor(totalBonusAmount),
      capAdjustmentAmount: 0,
    },
  });

  // BonusResultを一括作成
  await prisma.bonusResult.createMany({
    data: results.map((r) => ({
      ...r,
      bonusRunId: bonusRun.id,
    })),
  });

  // 8. 会員レベルを自動更新（Phase 6: 昇格・降格判定）
  let upgradedCount = 0;
  let downgradedCount = 0;

  for (const result of results) {
    const member = memberMap.get(result.mlmMemberId);
    if (!member) continue;

    const oldLevel = member.currentLevel || 0;
    const newLevel = result.newTitleLevel;

    if (newLevel !== oldLevel) {
      await prisma.mlmMember.update({
        where: { id: result.mlmMemberId },
        data: { currentLevel: newLevel },
      });

      if (newLevel > oldLevel) {
        upgradedCount++;
        console.log(
          `  🎉 レベルアップ: ${member.memberCode} LV.${oldLevel} → LV.${newLevel}`
        );
      } else {
        downgradedCount++;
        console.log(
          `  ⬇️ レベルダウン: ${member.memberCode} LV.${oldLevel} → LV.${newLevel}`
        );
      }
    }
  }

  console.log(`✅ ボーナス計算完了: ${bonusMonth}`);
  console.log(`   対象会員: ${members.length}名`);
  console.log(`   アクティブ: ${totalActiveMembers}名`);
  console.log(`   総支払額: ¥${totalBonusAmount.toLocaleString()}`);
  console.log(`   レベルアップ: ${upgradedCount}名`);
  console.log(`   レベルダウン: ${downgradedCount}名`);

  return {
    bonusRunId: bonusRun.id,
    totalMembers: members.length,
    totalActiveMembers,
    totalBonusAmount: Math.floor(totalBonusAmount),
  };
}

/**
 * グループポイント・直接紹介アクティブ数を計算
 */
function calcGroupData(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, any>,
  memberMap: Map<bigint, any>,
  bonusMonth: string
): { groupPoints: number; directActiveCount: number } {
  const children = childrenMap.get(memberId) || [];
  let groupPoints = 0;
  let directActiveCount = 0;

  for (const childId of children) {
    const childPurchase = purchaseMap.get(childId);
    const childMember = memberMap.get(childId);

    if (!childPurchase || !childMember) continue;

    const childIsActive = isActiveMember({
      contractDate: childMember.contractDate,
      memberType: childMember.memberType,
      selfPoints: childPurchase.selfPurchasePoints,
      purchasedRequiredProduct: childPurchase.purchasedRequiredProduct,
      forceActive: childMember.forceActive || false,
      targetMonth: bonusMonth,
    });

    if (childIsActive) {
      directActiveCount++;
      groupPoints += childPurchase.selfPurchasePoints;
    }

    // 再帰的に下位のポイントも加算
    const childGroup = calcGroupData(
      childId,
      childrenMap,
      purchaseMap,
      memberMap,
      bonusMonth
    );
    groupPoints += childGroup.groupPoints;
  }

  return { groupPoints, directActiveCount };
}

/**
 * 下位の翠彩流通個数を計算（最大depth段まで）
 */
function calcDownlineSumiSaiCount(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, any>,
  maxDepth: number,
  currentDepth: number = 0
): number {
  if (currentDepth >= maxDepth) return 0;

  const children = childrenMap.get(memberId) || [];
  let total = 0;

  for (const childId of children) {
    const childPurchase = purchaseMap.get(childId);
    if (childPurchase) {
      total += childPurchase.sumiSaiCount;
    }
    total += calcDownlineSumiSaiCount(
      childId,
      childrenMap,
      purchaseMap,
      maxDepth,
      currentDepth + 1
    );
  }

  return total;
}

/**
 * 段数別ポイントを計算（ユニレベル）
 */
function calcDepthPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, any>,
  memberMap: Map<bigint, any>,
  bonusMonth: string,
  achievedLevel: number
): Record<number, number> {
  const maxDepth = getUnilevelMaxDepth(achievedLevel);
  const depthPoints: Record<number, number> = {};

  function traverse(currentId: bigint, depth: number) {
    if (depth > maxDepth) return;

    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      const childPurchase = purchaseMap.get(childId);
      const childMember = memberMap.get(childId);

      if (!childPurchase || !childMember) continue;

      const childIsActive = isActiveMember({
        contractDate: childMember.contractDate,
        memberType: childMember.memberType,
        selfPoints: childPurchase.selfPurchasePoints,
        purchasedRequiredProduct: childPurchase.purchasedRequiredProduct,
        forceActive: childMember.forceActive || false,
        targetMonth: bonusMonth,
      });

      if (childIsActive) {
        depthPoints[depth] = (depthPoints[depth] || 0) + childPurchase.selfPurchasePoints;
      }

      // 再帰
      traverse(childId, depth + 1);
    }
  }

  traverse(memberId, 1);
  return depthPoints;
}

/**
 * 最小系列ポイントを計算（組織構築ボーナス用）
 */
function calcMinSeriesPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, any>
): number {
  const children = childrenMap.get(memberId) || [];
  const seriesPoints: number[] = [];

  for (const childId of children) {
    let seriesTotal = 0;

    function traverse(currentId: bigint) {
      const purchase = purchaseMap.get(currentId);
      if (purchase) {
        seriesTotal += purchase.selfPurchasePoints;
      }

      const descendants = childrenMap.get(currentId) || [];
      for (const descId of descendants) {
        traverse(descId);
      }
    }

    traverse(childId);
    seriesPoints.push(seriesTotal);
  }

  return seriesPoints.length > 0 ? Math.min(...seriesPoints) : 0;
}

/**
 * 組織構築ボーナス率を取得（レベル別）
 */
function getStructureBonusRate(
  achievedLevel: number,
  bonusSettings: any
): number {
  switch (achievedLevel) {
    case 3:
      return bonusSettings.structureLv3Rate;
    case 4:
      return bonusSettings.structureLv4Rate;
    case 5:
      return bonusSettings.structureLv5Rate;
    default:
      return 0;
  }
}
