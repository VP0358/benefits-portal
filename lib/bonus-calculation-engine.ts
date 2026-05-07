/**
 * ボーナス計算エンジン（VIOLA Pure 仕様 2026年版）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ■ アクティブ判定
 *   商品コード1000 or 2000 を当月150pt以上購入していること
 *
 * ■ ボーナス取得条件（ダイレクトボーナス以外）
 *   ① 当月アクティブであること
 *   ② 当月、直接紹介アクティブ数が2名以上であること
 *   ③ conditionAchieved（会員詳細＞条件）が「達成」であること
 *
 * ■ 計算対象商品
 *   商品コード1000: [新規]VIOLA Pure 翠彩-SUMISAI- 150pt
 *   商品コード2000: VIOLA Pure 翠彩-SUMISAI-        150pt
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ■ ボーナス種類
 *
 * ①ダイレクトボーナス
 *   条件: ① 当月アクティブのみ（②③不要）
 *   対象: 商品コード1000（[新規]翠彩）を「直接紹介した会員」が購入した個数 × ¥2,000
 *   ※ 圧縮計算なし（直接紹介の1段のみ）
 *
 * ②ユニレベルボーナス
 *   条件: ①②③すべて満たすこと
 *   対象: 商品コード1000・2000（傘下会員の購入pt）
 *   計算: 段数別ポイント × レベル別算出率 × ポイントレート¥100
 *   ※ 非アクティブポジションは圧縮
 *
 * ③組織構築ボーナス
 *   条件: ①②③ + 当月実績LV.3以上 + 01ポジション（memberCodeが"-01"で終わる）
 *   対象: 商品コード1000・2000
 *   計算: 最小系列ポイント（GP≥1の系列のみ比較）× レベル別率 × ¥100
 *
 * ④貯金ボーナス（SAVpt）
 *   01ポジションのみ累積可。以下3パターンの合計
 *   A. 01が商品1000を1個以上購入 → 自己購入pt × 20%
 *   B. オートシップ伝票（当月・入金あり）が1件以上 → AS伝票合計pt × 5%
 *   C. 当月ボーナスを取得（支払いボーダー未満含む） → グループポイント × 3%
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ■ レベル達成条件
 *   LV.0: 自己購入ptなし かつ GP 0〜299pt
 *   LV.1: 自己150pt以上 + GP 300〜4500pt   + 系列2以上
 *   LV.2: 自己150pt以上 + GP 4501〜15000pt + 系列2以上 + 各系列にLV.1達成者1名以上（7段以内）
 *   LV.3: 自己300pt以上 + GP 15001〜45000pt + 系列3以上 + 各系列にLV.1達成者1名以上（7段以内）
 *   LV.4: 自己450pt以上 + GP 45001〜150000pt + 系列3以上 + 各系列にLV.2達成者1名以上（7段以内）
 *   LV.5: 自己450pt以上 + GP 150001pt以上   + 系列3以上 + 各系列にLV.3達成者1名以上（7段以内）
 *
 * ※ GP = 当月自己購入pt + 傘下7段アクティブ購入ptの合計（非アクティブは圧縮）
 * ※ 系列 = ポジション存在する直下系列数（アクティブ/非アクティブ問わず）
 * ※ 当月非アクティブ → レベル消滅（称号レベルは降格しない）
 * ※ 強制レベル設定あり + 条件達成 → 強制レベルと実績レベルの上位を適用
 */

import { prisma } from "./prisma";
import {
  isActiveMember,
  isEligibleForBonus,
  calcAchievedLevel,
  calcUnilevelBonus,
  DIRECT_BONUS_AMOUNT,
  DIRECT_BONUS_PRODUCT,
  ACTIVE_REQUIRED_PRODUCTS,
  POINT_RATE,
  getUnilevelMaxDepth,
  STRUCTURE_BONUS_RATES,
} from "./mlm-bonus";

// ━━━ 型定義 ━━━

type MemberPurchaseData = {
  selfPurchasePoints: number;        // 自己購入pt合計（1000・2000）
  directBonusProductCount: number;   // 自分が購入した商品1000の個数（自己購入・ダイレクトボーナス計算は除外）
  purchasedRequiredProduct: boolean; // 1000 or 2000 購入フラグ（アクティブ判定）
  autoshipInvoicePoints: number;     // オートシップ伝票の合計pt（貯金ボーナスB用）
  hasAutoshipInvoice: boolean;       // 当月オートシップ伝票（入金あり）が1件以上あるか
};

/**
 * 01ポジション判定
 * memberCode の枝番部分が "01" かどうかで判定
 * 例: "123456-01" → true, "123456-02" → false
 */
function isFirstPosition(memberCode: string): boolean {
  const parts = memberCode.split("-");
  if (parts.length < 2) return true; // 枝番なしは01とみなす
  return parts[parts.length - 1] === "01";
}

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

  // 1. ボーナス設定・貯金ボーナス設定を取得
  const bonusSettings = await prisma.bonusSettings.findFirst();
  if (!bonusSettings) {
    throw new Error("ボーナス設定が見つかりません");
  }

  // 貯金ボーナス設定（最新レコードを使用）
  const savingsConfig = await prisma.savingsBonusConfig.findFirst({
    orderBy: { id: "desc" },
  });
  const savingsRegistrationRate = savingsConfig?.registrationRate ?? 20.0;
  const savingsAutoshipRate     = savingsConfig?.autoshipRate     ?? 5.0;
  const savingsBonusRate        = savingsConfig?.bonusRate        ?? 3.0;

  // 2. 全MLM会員を取得（退会者以外）
  const members = await prisma.mlmMember.findMany({
    where: {
      status: { in: ["active", "autoship", "suspended"] },
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  // 源泉徴収税の閾値
  const WITHHOLDING_THRESHOLD = 120000; // 12万円
  const WITHHOLDING_RATE = 0.1021;      // 10.21%

  console.log(`📊 対象会員数: ${members.length}名`);

  // 3. 対象月の購入データを取得（Orderリレーション含む：オートシップ伝票判定用）
  const purchases = await prisma.mlmPurchase.findMany({
    where: { purchaseMonth: bonusMonth },
    include: {
      mlmMember: { select: { id: true, memberCode: true } },
      order: { select: { id: true, slipType: true, paidAt: true, paymentStatus: true } },
    },
  });

  console.log(`💳 対象月購入件数: ${purchases.length}件`);

  // 4. 会員ごとの購入データを集計
  const memberPurchaseMap = new Map<bigint, MemberPurchaseData>();

  for (const purchase of purchases) {
    const memberId = purchase.mlmMemberId;
    if (!memberPurchaseMap.has(memberId)) {
      memberPurchaseMap.set(memberId, {
        selfPurchasePoints: 0,
        directBonusProductCount: 0,
        purchasedRequiredProduct: false,
        autoshipInvoicePoints: 0,
        hasAutoshipInvoice: false,
      });
    }
    const data = memberPurchaseMap.get(memberId)!;

    // アクティブ判定対象商品（1000・2000）のpt集計
    if (ACTIVE_REQUIRED_PRODUCTS.includes(purchase.productCode)) {
      data.selfPurchasePoints += purchase.totalPoints || 0;
      data.purchasedRequiredProduct = true;
    }

    // 商品1000の購入個数（自分が購入した分 → ダイレクトボーナスは「直接紹介の購入」なので別途計算）
    if (purchase.productCode === DIRECT_BONUS_PRODUCT) {
      data.directBonusProductCount += purchase.quantity;
    }

    // オートシップ伝票の判定（伝票種別=autoship かつ 入金あり）
    if (
      purchase.order &&
      purchase.order.slipType === "autoship" &&
      (purchase.order.paidAt !== null || purchase.order.paymentStatus === "paid")
    ) {
      if (ACTIVE_REQUIRED_PRODUCTS.includes(purchase.productCode)) {
        data.autoshipInvoicePoints += purchase.totalPoints || 0;
      }
      data.hasAutoshipInvoice = true;
    }
  }

  // 5. 組織構造マップを構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberMap = new Map<bigint, any>(members.map((m: any) => [m.id, m]));

  // 直下の子会員一覧（referrerId基準 = ユニレベル組織）
  const childrenMap = new Map<bigint, bigint[]>();
  for (const member of members) {
    if (member.referrerId) {
      if (!childrenMap.has(member.referrerId)) {
        childrenMap.set(member.referrerId, []);
      }
      childrenMap.get(member.referrerId)!.push(member.id);
    }
  }

  // 6. 調整金を取得
  const adjustments = await prisma.bonusAdjustment.findMany({
    where: { bonusMonth },
  });

  const adjustmentMap = new Map<bigint, {
    total: number;
    items: { amount: number; comment: string | null; adjustmentType: string }[]
  }>();
  for (const adj of adjustments) {
    const key = adj.mlmMemberId;
    if (!adjustmentMap.has(key)) {
      adjustmentMap.set(key, { total: 0, items: [] });
    }
    const entry = adjustmentMap.get(key)!;
    entry.total += adj.amount;
    entry.items.push({
      amount: adj.amount,
      comment: adj.comment ?? null,
      adjustmentType: adj.adjustmentType,
    });
  }

  console.log(`💰 調整金対象会員: ${adjustmentMap.size}名（合計件数: ${adjustments.length}件）`);

  // 7. 各会員のボーナス計算
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  let totalActiveMembers = 0;
  let totalBonusAmount = 0;

  for (const member of members) {
    const purchaseData = memberPurchaseMap.get(member.id) ?? {
      selfPurchasePoints: 0,
      directBonusProductCount: 0,
      purchasedRequiredProduct: false,
      autoshipInvoicePoints: 0,
      hasAutoshipInvoice: false,
    };

    // ━━━ アクティブ判定 ━━━
    const isActive = isActiveMember({
      selfPoints: purchaseData.selfPurchasePoints,
      purchasedRequiredProduct: purchaseData.purchasedRequiredProduct,
      forceActive: member.forceActive || false,
    });

    if (isActive) totalActiveMembers++;

    // ━━━ グループポイント・直接紹介アクティブ数・系列情報を計算 ━━━
    const { groupPoints, directActiveCount, seriesCount, seriesAchieverMap } =
      calcGroupDataFull(
        member.id,
        childrenMap,
        memberPurchaseMap,
        memberMap,
        purchaseData.selfPurchasePoints // 自己購入ptをGPに含める
      );

    // ━━━ 当月実績レベル判定 ━━━
    const naturalLevel = isActive
      ? calcAchievedLevel({
          groupPoints,
          selfPurchasePoints: purchaseData.selfPurchasePoints,
          seriesCount,
          seriesAchieverMap,
        })
      : 0;

    // ━━━ 強制レベル適用 ━━━
    const forceLevel = (member as any).forceLevel;
    let achievedLevel: number;

    if (!isActive) {
      achievedLevel = 0;
    } else if (forceLevel !== null && forceLevel !== undefined) {
      achievedLevel = Math.max(forceLevel, naturalLevel);
      console.log(
        `  🏅 強制レベル適用: ${(member as any).memberCode} forceLevel=${forceLevel} naturalLevel=${naturalLevel} → achievedLevel=${achievedLevel}`
      );
    } else {
      achievedLevel = naturalLevel;
    }

    // ━━━ 称号レベル計算（降格なし・非アクティブは消滅） ━━━
    const previousTitleLevel = member.currentLevel || 0;
    const newTitleLevel = isActive
      ? Math.max(previousTitleLevel, achievedLevel)
      : 0;

    // ━━━ ボーナス受取資格判定 ━━━
    const conditionAchieved = member.conditionAchieved || false;
    const eligible = isEligibleForBonus({
      isActive,
      directActiveCount,
      conditionAchieved,
    });

    if (isActive) {
      console.log(
        `  👤 ${(member as any).memberCode}: active=${isActive} directActive=${directActiveCount} conditionAchieved=${conditionAchieved} eligible=${eligible} GP=${groupPoints} selfPt=${purchaseData.selfPurchasePoints} series=${seriesCount} level=${achievedLevel}`
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ①ダイレクトボーナス計算
    // 条件: ① 当月アクティブのみ（②③不要）
    // 計算: 「直接紹介している会員」が商品1000を購入した個数 × ¥2,000
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let directBonus = 0;
    if (isActive) {
      // 自分の直接紹介会員（referrals）が商品1000を購入した個数を合計
      const directReferrals = childrenMap.get(member.id) || [];
      let directBonusProductTotal = 0;
      for (const referralId of directReferrals) {
        const referralPurchase = memberPurchaseMap.get(referralId);
        if (referralPurchase) {
          directBonusProductTotal += referralPurchase.directBonusProductCount;
        }
      }
      directBonus = directBonusProductTotal * DIRECT_BONUS_AMOUNT;
      if (directBonus > 0) {
        console.log(
          `  💸 ダイレクトB: ${(member as any).memberCode} 直接紹介商品1000購入${directBonusProductTotal}個 → ¥${directBonus.toLocaleString()}`
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ②ユニレベルボーナス計算
    // 条件: ①②③すべて + achievedLevel >= 0（レベルなしでも1〜3段取得可）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let unilevelResult = { total: 0, detail: {} as Record<number, number> };
    if (eligible) {
      const depthPoints = calcDepthPoints(
        member.id,
        childrenMap,
        memberPurchaseMap,
        memberMap,
        achievedLevel
      );
      unilevelResult = calcUnilevelBonus(depthPoints, achievedLevel, directActiveCount);
      if (unilevelResult.total > 0) {
        console.log(
          `  📊 ユニレベルB: ${(member as any).memberCode} LV.${achievedLevel} → ¥${unilevelResult.total.toLocaleString()}`
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ③組織構築ボーナス計算
    // 条件: ①②③ + LV.3以上 + 01ポジション
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let structureBonus = 0;
    let minSeriesPoints = 0;
    const memberCodeStr = (member as any).memberCode as string;
    const isFirstPos = isFirstPosition(memberCodeStr);

    if (eligible && achievedLevel >= 3 && isFirstPos) {
      minSeriesPoints = calcMinSeriesPoints(
        member.id,
        childrenMap,
        memberPurchaseMap,
        memberMap
      );
      // 最小系列はGP≥1の系列のみで比較（仕様書準拠）
      const rate = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
      structureBonus = Math.floor(minSeriesPoints * (rate / 100) * POINT_RATE);
      if (structureBonus > 0) {
        console.log(
          `  🏗️ 組織構築B: ${memberCodeStr} LV.${achievedLevel} 最小系列${minSeriesPoints}pt × ${rate}% → ¥${structureBonus.toLocaleString()}`
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ④貯金ボーナス（SAVpt）計算
    // 01ポジションのみ対象。累積ポイントをMlmMember.savingsPointsで管理。
    // 以下3パターンの合算（小数点第2位切り捨て → 第1位まで表示）
    // A: 自己が商品1000を1個以上購入 → 自己購入pt × registrationRate(20%)
    // B: オートシップ伝票（当月・入金あり）1件以上 → AS伝票合計pt × autoshipRate(5%)
    // C: 当月ボーナス取得者 → グループポイント × bonusRate(3%)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let savingsPointsAdded = 0;
    const memberStatus = member.status;
    const isEligibleForSavings = isFirstPos &&
      (memberStatus === "active" || memberStatus === "autoship");

    if (isEligibleForSavings) {
      // A. 商品1000を1個以上購入していること
      if (purchaseData.directBonusProductCount >= 1) {
        const ptA = Math.floor(purchaseData.selfPurchasePoints * (savingsRegistrationRate / 100) * 10) / 10;
        savingsPointsAdded += ptA;
        console.log(
          `  💰 貯金B-A: ${memberCodeStr} 自己購入${purchaseData.selfPurchasePoints}pt × ${savingsRegistrationRate}% = ${ptA}pt`
        );
      }

      // B. オートシップ伝票（当月・入金あり）が1件以上
      if (purchaseData.hasAutoshipInvoice && purchaseData.autoshipInvoicePoints > 0) {
        const ptB = Math.floor(purchaseData.autoshipInvoicePoints * (savingsAutoshipRate / 100) * 10) / 10;
        savingsPointsAdded += ptB;
        console.log(
          `  💰 貯金B-B: ${memberCodeStr} AS伝票${purchaseData.autoshipInvoicePoints}pt × ${savingsAutoshipRate}% = ${ptB}pt`
        );
      }

      // C. 当月ボーナス取得者（①〜③のいずれかを取得、支払いボーダー未満含む）
      const hasBonusThisMonth = (directBonus + unilevelResult.total + structureBonus) > 0 || eligible;
      if (hasBonusThisMonth && groupPoints > 0) {
        const ptC = Math.floor(groupPoints * (savingsBonusRate / 100) * 10) / 10;
        savingsPointsAdded += ptC;
        console.log(
          `  💰 貯金B-C: ${memberCodeStr} GP=${groupPoints}pt × ${savingsBonusRate}% = ${ptC}pt`
        );
      }

      // 小数点第1位まで（第2位切り捨て）
      savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;

      if (savingsPointsAdded > 0) {
        console.log(
          `  💎 貯金B合計: ${memberCodeStr} 今月+${savingsPointsAdded}pt`
        );
      }
    }

    // 貯金ポイント累計（前月までの累計 + 今月追加）
    // ステータスが活動中・オートシップ以外の場合はリセット
    const previousSavingsPoints = member.savingsPoints || 0;
    const newSavingsPoints = isEligibleForSavings
      ? Math.floor((previousSavingsPoints + savingsPointsAdded) * 10) / 10
      : 0; // リセット

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⑤合計ボーナス・支払い計算
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const totalBonus = directBonus + unilevelResult.total + structureBonus;

    // 調整金
    const adjEntry = adjustmentMap.get(member.id);
    const adjustmentAmount = adjEntry ? adjEntry.total : 0;

    // 支払調整前取得額 = ボーナス合計 + 調整金
    const amountBeforeAdjustment = totalBonus + adjustmentAmount;

    // 支払調整
    const paymentAdjustmentAmount =
      paymentAdjustmentRate !== null
        ? Math.floor(amountBeforeAdjustment * paymentAdjustmentRate)
        : 0;

    const finalAmount = amountBeforeAdjustment - paymentAdjustmentAmount;

    // 源泉徴収税
    // 仕様: 支払調整前取得額が12万円を超えた場合、超えた金額に対して10.21%を差引く
    //       法人会員（companyNameあり）は対象外
    const isCompany = !!(member as any).companyName;
    let withholdingTax = 0;
    if (!isCompany && amountBeforeAdjustment > WITHHOLDING_THRESHOLD) {
      withholdingTax = Math.floor((amountBeforeAdjustment - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE);
    }

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
      forcedLevel: forceLevel ?? 0,
      previousTitleLevel,
      newTitleLevel,
      directBonus,
      unilevelBonus: unilevelResult.total,
      structureBonus,
      savingsBonus: 0,
      adjustmentAmount,
      amountBeforeAdjustment,
      paymentAdjustmentRate: paymentAdjustmentRate != null ? paymentAdjustmentRate * 100 : 0,
      paymentAdjustmentAmount,
      finalAmount,
      withholdingTax,
      serviceFee,
      paymentAmount,
      unilevelDetail: unilevelResult.detail,
      savingsPointsAdded: Math.round(savingsPointsAdded * 10), // × 10して整数保存
      savingsPoints: Math.round(newSavingsPoints * 10),        // 累計も × 10
      // 組織データ（BonusResult保存用）
      minLinePoints: minSeriesPoints,
      lineCount: seriesCount,
    });
  }

  // 8. データベースに保存
  const bonusRun = await prisma.bonusRun.create({
    data: {
      bonusMonth,
      closingDate: new Date(),
      status: "confirmed",
      confirmedAt: new Date(),
      paymentAdjustmentRate: paymentAdjustmentRate != null ? paymentAdjustmentRate * 100 : 0,
      totalMembers: members.length,
      totalActiveMembers,
      totalBonusAmount: Math.floor(totalBonusAmount),
      capAdjustmentAmount: 0,
    },
  });

  // BonusResultを一括作成
  await prisma.bonusResult.createMany({
    data: results.map((r) => ({
      bonusRunId: bonusRun.id,
      mlmMemberId: r.mlmMemberId,
      bonusMonth: r.bonusMonth,
      isActive: r.isActive,
      selfPurchasePoints: r.selfPurchasePoints,
      groupPoints: r.groupPoints,
      directActiveCount: r.directActiveCount,
      achievedLevel: r.achievedLevel,
      forcedLevel: r.forcedLevel,
      previousTitleLevel: r.previousTitleLevel,
      newTitleLevel: r.newTitleLevel,
      directBonus: r.directBonus,
      unilevelBonus: r.unilevelBonus,
      structureBonus: r.structureBonus,
      savingsBonus: r.savingsBonus,
      adjustmentAmount: r.adjustmentAmount,
      amountBeforeAdjustment: r.amountBeforeAdjustment,
      paymentAdjustmentRate: r.paymentAdjustmentRate,
      paymentAdjustmentAmount: r.paymentAdjustmentAmount,
      finalAmount: r.finalAmount,
      withholdingTax: r.withholdingTax,
      serviceFee: r.serviceFee,
      paymentAmount: r.paymentAmount,
      unilevelDetail: r.unilevelDetail,
      savingsPointsAdded: r.savingsPointsAdded,
      savingsPoints: r.savingsPoints,
      minLinePoints: r.minLinePoints,
      lineCount: r.lineCount,
    })),
  });

  // 調整金にbonusRunIdを紐付け
  if (adjustments.length > 0) {
    await prisma.bonusAdjustment.updateMany({
      where: { bonusMonth, bonusRunId: null },
      data: { bonusRunId: bonusRun.id },
    });
    console.log(`🔗 調整金 ${adjustments.length}件をBonusRunに紐付けました`);
  }

  // 9. 会員レベル・貯金ポイントを自動更新
  let upgradedCount = 0;
  let downgradedCount = 0;

  for (const result of results) {
    const member = memberMap.get(result.mlmMemberId);
    if (!member) continue;

    const oldLevel = member.currentLevel || 0;
    const newLevel = result.newTitleLevel;
    const newSavingsPt = result.savingsPoints;

    const updateData: Record<string, unknown> = {};

    // レベル更新
    if (newLevel !== oldLevel) {
      updateData.currentLevel = newLevel;
      if (newLevel > oldLevel) upgradedCount++;
      else downgradedCount++;
    }

    // 貯金ポイント更新（01ポジションのみ）
    const isFirstPos = isFirstPosition((member as any).memberCode);
    if (isFirstPos) {
      updateData.savingsPoints = newSavingsPt;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.mlmMember.update({
        where: { id: result.mlmMemberId },
        data: updateData,
      });
    }
  }

  console.log(`✅ ボーナス計算完了: ${bonusMonth}`);
  console.log(`   対象会員: ${members.length}名`);
  console.log(`   アクティブ: ${totalActiveMembers}名`);
  console.log(`   総支払額: ¥${totalBonusAmount.toLocaleString()}`);
  console.log(`   レベルアップ: ${upgradedCount}名 / レベルダウン: ${downgradedCount}名`);

  return {
    bonusRunId: bonusRun.id,
    totalMembers: members.length,
    totalActiveMembers,
    totalBonusAmount: Math.floor(totalBonusAmount),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ヘルパー関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * グループポイント・直接紹介アクティブ数・系列情報を一括計算
 *
 * ・groupPoints  = 自己購入pt + 傘下7段目アクティブ購入ptの合計（非アクティブは圧縮）
 * ・directActiveCount = 直下でアクティブな会員数
 * ・seriesCount = 直下でポジションが存在する系列数（アクティブ/非アクティブ問わず）
 * ・seriesAchieverMap = 各直下系列(インデックス)内の最高currentLevel（7段以内）
 */
function calcGroupDataFull(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  selfPurchasePoints: number  // 自己購入ptをGPに含める
): {
  groupPoints: number;
  directActiveCount: number;
  seriesCount: number;
  seriesAchieverMap: Record<number, number>;
} {
  const directChildren = childrenMap.get(memberId) || [];

  // GPに自己購入ptを加算（仕様: GP = 自己購入pt + 傘下7段目までの購入pt）
  let groupPoints = selfPurchasePoints;
  let directActiveCount = 0;
  const seriesAchieverMap: Record<number, number> = {};

  directChildren.forEach((childId, seriesIndex) => {
    const childMember = memberMap.get(childId);
    if (!childMember) return;

    // 系列の初期化
    seriesAchieverMap[seriesIndex] = seriesAchieverMap[seriesIndex] ?? 0;

    // 直下のアクティブ判定
    const childPurchase = purchaseMap.get(childId);
    const childIsActive = isActiveMember({
      selfPoints: childPurchase?.selfPurchasePoints ?? 0,
      purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
      forceActive: childMember.forceActive || false,
    });

    if (childIsActive) {
      directActiveCount++;
      groupPoints += childPurchase?.selfPurchasePoints ?? 0;
    }

    // 系列内の最高達成レベルを記録（currentLevelを参照）
    const childLevel = childMember.currentLevel || 0;
    if (childLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
      seriesAchieverMap[seriesIndex] = childLevel;
    }

    // 再帰的に下位（最大7段）を探索してGP加算・系列内達成者レベル更新
    const subResult = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, 1, 7);
    groupPoints += subResult.groupPoints;

    if (subResult.maxLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
      seriesAchieverMap[seriesIndex] = subResult.maxLevel;
    }
  });

  const seriesCount = directChildren.length;

  return { groupPoints, directActiveCount, seriesCount, seriesAchieverMap };
}

/**
 * 下位のグループポイントと最高レベルを再帰計算（圧縮あり）
 * 非アクティブポジションはスキップし下位に潜る（圧縮）
 */
function calcSubGroupPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  currentDepth: number,
  maxDepth: number
): { groupPoints: number; maxLevel: number } {
  if (currentDepth >= maxDepth) return { groupPoints: 0, maxLevel: 0 };

  const children = childrenMap.get(memberId) || [];
  let groupPoints = 0;
  let maxLevel = 0;

  for (const childId of children) {
    const childMember = memberMap.get(childId);
    if (!childMember) continue;

    const childPurchase = purchaseMap.get(childId);
    const childIsActive = isActiveMember({
      selfPoints: childPurchase?.selfPurchasePoints ?? 0,
      purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
      forceActive: childMember.forceActive || false,
    });

    if (childIsActive) {
      groupPoints += childPurchase?.selfPurchasePoints ?? 0;
    }

    const childLevel = childMember.currentLevel || 0;
    if (childLevel > maxLevel) maxLevel = childLevel;

    // 再帰
    const sub = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, currentDepth + 1, maxDepth);
    groupPoints += sub.groupPoints;
    if (sub.maxLevel > maxLevel) maxLevel = sub.maxLevel;
  }

  return { groupPoints, maxLevel };
}

/**
 * 段数別ポイントを計算（ユニレベルボーナス用）
 * アクティブな下位会員の購入ptを段数ごとに集計
 * 非アクティブは圧縮してスキップ（同じ段数のまま下位を探索）
 */
function calcDepthPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  achievedLevel: number
): Record<number, number> {
  const maxDepth = getUnilevelMaxDepth(achievedLevel);
  const depthPoints: Record<number, number> = {};

  function traverse(currentId: bigint, depth: number) {
    if (depth > maxDepth) return;

    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      const childMember = memberMap.get(childId);
      const childPurchase = purchaseMap.get(childId);

      if (!childMember) continue;

      const childIsActive = isActiveMember({
        selfPoints: childPurchase?.selfPurchasePoints ?? 0,
        purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
        forceActive: childMember.forceActive || false,
      });

      if (childIsActive) {
        // アクティブなら当段数に購入ptを加算
        depthPoints[depth] = (depthPoints[depth] || 0) + (childPurchase?.selfPurchasePoints ?? 0);
        // アクティブの下位を次の段数で探索
        traverse(childId, depth + 1);
      } else {
        // 非アクティブは圧縮：同じ段数のまま下位を探索
        traverse(childId, depth);
      }
    }
  }

  traverse(memberId, 1);
  return depthPoints;
}

/**
 * 最小系列ポイントを計算（組織構築ボーナス用）
 * 直下系列ごとにポイントを合計し、GP≥1の系列の中で最小値を返す
 * 仕様: 「グループボーナスが1pt以上の系列で比較し判定」
 */
function calcMinSeriesPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>
): number {
  const children = childrenMap.get(memberId) || [];
  if (children.length === 0) return 0;

  const seriesPoints: number[] = [];

  for (const childId of children) {
    let seriesTotal = 0;

    function traverseSeries(currentId: bigint) {
      const purchase = purchaseMap.get(currentId);
      const mem = memberMap.get(currentId);
      if (!mem) return;

      const isActive = isActiveMember({
        selfPoints: purchase?.selfPurchasePoints ?? 0,
        purchasedRequiredProduct: purchase?.purchasedRequiredProduct ?? false,
        forceActive: mem.forceActive || false,
      });

      if (isActive) {
        seriesTotal += purchase?.selfPurchasePoints ?? 0;
      }

      const descendants = childrenMap.get(currentId) || [];
      for (const descId of descendants) {
        traverseSeries(descId);
      }
    }

    traverseSeries(childId);

    // GP≥1の系列のみ比較対象に含める（仕様書準拠）
    if (seriesTotal >= 1) {
      seriesPoints.push(seriesTotal);
    }
  }

  if (seriesPoints.length === 0) return 0;
  return Math.min(...seriesPoints);
}
