/**
 * ボーナス計算エンジン（VIOLA Pure 仕様 2026年版 v3）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ■ 計算単位
 *   必ず position_id（mlm_members.id）単位で計算する。
 *   01〜06を合算して計算しない。計算後に member_id 単位で集約する。
 *
 * ■ アクティブ判定
 *   商品コード1000 or 2000 を当月150pt以上購入 → ACTIVE
 *   forceActive=true → ACTIVE（購入なしでも）
 *
 * ■ 1. ダイレクトB
 *   当月直接紹介した人数（商品1000を購入した直紹介の「人数」）× ¥2,000
 *   ※「個数」ではなく「人数」
 *
 * ■ 2. ユニレベルB
 *   資格: (selfPt > 0 OR forceActive=true) AND 直ACT >= 2
 *   ※ forceActiveは自己購入済み扱いのみ。直ACT2名条件は満たさない
 *   ※ 強制タイトルは受給資格を付与しない（支払率のみ上げる）
 *   ツリー: uplineChildrenMap（uplineIdベース）
 *   非アクティブ: 段数消費なし（透過）
 *   withdrawn/lapsed(forceActive=false): 透過
 *
 * ■ 3. 組織構築B
 *   資格: ACTIVE AND 直ACT >= 2 AND 実績LV3以上 AND 01ポジション
 *   有PT系列 >= 3 必要（例外: 44504701・89248801 は1系列でも対象）
 *   段数制限なし。0pt系列は除外。有PT系列の中で最小PTを採用。
 *   最小系列PT × LV率 × 100
 *
 * ■ 4. 貯金B（SAVpt）
 *   01ポジション + 当月購入あり（アクティブ）なら対象
 *   ※ autoship限定ではない
 *   A: s商品購入PT × 20%（初回登録月限定・仮付与）
 *   B: AS購入PT × 5%
 *   C: 01番の獲得ポイント × 3%（directB+ULB+SB の円÷100）
 *   現金支払に含めない。savingsPointsAdded列のみに表示。
 *
 * ■ 5. 支払対象判定
 *   控除前取得額 = directB + ULB + SB
 *   3,000円未満 → 支払対象外（繰越）
 *   3,000円以上 → 支払対象。事務手数料440円控除。
 *   支払対象者数は37名（2026-04）
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
 * ■ 2パス計算
 *   Pass 1: 全会員の achievedLevel を先計算
 *   Pass 2: Pass1の結果で seriesAchieverMap を再構築し最終計算
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { prisma } from "./prisma";
import {
  isActiveMember,
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
  directBonusProductBuyers: number;  // 商品1000を購入した直紹介「人数」（ダイレクトB用）
  purchasedRequiredProduct: boolean; // 1000 or 2000 購入フラグ（アクティブ判定）
  autoshipInvoicePoints: number;     // オートシップ伝票の合計pt（貯金B用）
  hasAutoshipInvoice: boolean;       // 当月オートシップ伝票（入金あり）が1件以上あるか
  // sProductPt は計算時に selfPurchasePoints をそのまま使う
};

// 組織構築B例外（1系列でも対象）
const ORG_EXCEPTION_CODES = new Set(["44504701", "89248801"]);

/**
 * 01ポジション判定
 * memberCode の枝番部分が "01" かどうか
 */
function isFirstPosition(memberCode: string): boolean {
  const parts = memberCode.split("-");
  if (parts.length < 2) return true;
  return parts[parts.length - 1] === "01";
}

/**
 * 進捗コールバック付きボーナス計算（SSEストリーミング用ラッパー）
 */
export async function executeBonusCalculationWithProgress(
  bonusMonth: string,
  paymentAdjustmentRate: number | null = null,
  onProgress: (step: string) => void = () => {}
): Promise<{
  bonusRunId: bigint;
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
}> {
  return executeBonusCalculation(bonusMonth, paymentAdjustmentRate, onProgress);
}

/**
 * ボーナス計算メインエンジン v3
 * @param bonusMonth "YYYY-MM"
 */
export async function executeBonusCalculation(
  bonusMonth: string,
  paymentAdjustmentRate: number | null = null,
  onProgress: (step: string) => void = () => {}
): Promise<{
  bonusRunId: bigint;
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
}> {
  console.log(`🚀 ボーナス計算開始 v3: ${bonusMonth}`);
  onProgress("ボーナス計算を開始しました");

  // ────────────────────────────────────────────────────
  // 0. bonus_results テーブルの不足カラムを自動補完
  // ────────────────────────────────────────────────────
  const ensureColumns = [
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPtAFromRegistration" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPoints" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPointsAdded" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "forcedLevel" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "previousTitleLevel" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "minLinePoints" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "lineCount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "groupActiveCount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentRate" DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "amountBeforeAdjustment" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "finalAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "withholdingTax" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "serviceFee" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "adjustmentAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "rankUpBonus" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "shareBonus" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "carryoverAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "otherPositionAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "consumptionTax" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "shortageAmount" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "otherPositionShortage" INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of ensureColumns) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* 既存カラムはスキップ */ }
  }

  // ────────────────────────────────────────────────────
  // 1. ボーナス設定・貯金ボーナス設定を取得
  // ────────────────────────────────────────────────────
  onProgress("設定データ読み込み中...");

  let bonusSettings: { serviceFeeAmount: number; minPayoutAmount: number } | null = null;
  try {
    bonusSettings = await prisma.bonusSettings.findFirst();
  } catch (e) {
    console.warn("⚠️ bonus_settingsテーブルが見つかりません:", e);
  }
  const resolvedSettings = {
    serviceFeeAmount: bonusSettings?.serviceFeeAmount ?? 440,
    minPayoutAmount:  bonusSettings?.minPayoutAmount  ?? 2560,
  };

  let savingsConfig: { registrationRate: number; autoshipRate: number; bonusRate: number } | null = null;
  try {
    savingsConfig = await prisma.savingsBonusConfig.findFirst({ orderBy: { id: "desc" } });
  } catch (e) {
    console.warn("⚠️ savings_bonus_configテーブルが見つかりません:", e);
  }
  const savingsRegistrationRate = savingsConfig?.registrationRate ?? 20.0;
  const savingsAutoshipRate     = savingsConfig?.autoshipRate     ?? 5.0;
  const savingsBonusRate        = savingsConfig?.bonusRate        ?? 3.0;

  onProgress("設定データ読み込み完了");

  // ────────────────────────────────────────────────────
  // 2. 全MLM会員を取得
  // ────────────────────────────────────────────────────
  onProgress("会員データ読み込み中...");

  // ボーナス計算対象会員（退会者除く）
  const members = await prisma.mlmMember.findMany({
    where: {
      OR: [
        { status: { in: ["active", "autoship", "suspended"] } },
        { status: "lapsed", forceActive: true },
      ],
    },
    include: { user: { select: { name: true, email: true } } },
  });

  // 組織ツリー用（透過ノード）
  const withdrawnMembers = await prisma.mlmMember.findMany({
    where: {
      OR: [
        { status: "withdrawn" },
        { status: "lapsed", forceActive: false },
      ],
    },
    select: {
      id: true, memberCode: true, referrerId: true, uplineId: true,
      currentLevel: true, forceActive: true, forceLevel: true,
      conditionAchieved: true, status: true,
    },
  });

  const [bonusMonthYear, bonusMonthMonth] = bonusMonth.split("-").map(Number);

  // 前月チェック用
  const prevMonthTotal = bonusMonthYear * 12 + (bonusMonthMonth - 1) - 1;
  const prevYear  = Math.floor(prevMonthTotal / 12);
  const prevMonth = (prevMonthTotal % 12) + 1;
  const prevBonusMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  // 過去に商品1000を購入済みの会員IDセット
  const pastProduct1000Purchases = await prisma.mlmPurchase.findMany({
    where: { productCode: "1000", purchaseMonth: { lt: bonusMonth } },
    select: { mlmMemberId: true },
    distinct: ["mlmMemberId"],
  });
  const hasPastProduct1000 = new Set(
    pastProduct1000Purchases.map((p: { mlmMemberId: bigint }) => p.mlmMemberId.toString())
  );

  // 前月BonusResult
  type PrevBonusResultItem = {
    mlmMemberId: bigint;
    savingsPtAFromRegistration: boolean | null;
    savingsPointsAdded: number;
  };
  let prevBonusResults: PrevBonusResultItem[] = [];
  try {
    prevBonusResults = await prisma.bonusResult.findMany({
      where: { bonusMonth: prevBonusMonth },
      select: { mlmMemberId: true, savingsPtAFromRegistration: true, savingsPointsAdded: true },
    }) as PrevBonusResultItem[];
  } catch (e1) {
    try {
      const fallback = await prisma.bonusResult.findMany({
        where: { bonusMonth: prevBonusMonth },
        select: { mlmMemberId: true, savingsPointsAdded: true },
      });
      prevBonusResults = fallback.map((r: { mlmMemberId: bigint; savingsPointsAdded: number }) => ({
        mlmMemberId: r.mlmMemberId, savingsPtAFromRegistration: null, savingsPointsAdded: r.savingsPointsAdded,
      }));
    } catch (e2) {
      console.warn("⚠️ 前月BonusResult取得失敗:", e2);
    }
  }
  const prevHadRegistrationA = new Map<string, number>(
    prevBonusResults
      .filter((r) => r.savingsPtAFromRegistration === true)
      .map((r) => [r.mlmMemberId.toString(), r.savingsPointsAdded] as [string, number])
  );

  const WITHHOLDING_THRESHOLD = 120000;
  const WITHHOLDING_RATE      = 0.1021;
  const MIN_PAYOUT_THRESHOLD  = 3000;

  console.log(`📊 対象会員数: ${members.length}名`);
  onProgress(`会員データロード完了（対象: ${members.length}名）`);

  // ────────────────────────────────────────────────────
  // 3. 対象月の購入データを取得
  //    キャンセル・クーリングオフ除外
  // ────────────────────────────────────────────────────
  onProgress("購入データ読み込み中...");

  const purchases = await prisma.mlmPurchase.findMany({
    where: {
      purchaseMonth: bonusMonth,
      purchaseStatus: { notIn: ["cooling_off", "canceled"] },
    },
    include: {
      mlmMember: { select: { id: true, memberCode: true } },
      order: { select: { id: true, slipType: true, paidAt: true, paymentStatus: true } },
    },
  });

  console.log(`💳 対象月購入件数: ${purchases.length}件`);
  onProgress(`売上データロード完了（${purchases.length}件）`);

  // ────────────────────────────────────────────────────
  // 4. 会員ごとの購入データを集計
  // ────────────────────────────────────────────────────
  onProgress("自己購入データ集計中...");

  const memberPurchaseMap = new Map<bigint, MemberPurchaseData>();
  for (const purchase of purchases) {
    const memberId = purchase.mlmMemberId;
    if (!memberPurchaseMap.has(memberId)) {
      memberPurchaseMap.set(memberId, {
        selfPurchasePoints: 0,
        directBonusProductBuyers: 0,
        purchasedRequiredProduct: false,
        autoshipInvoicePoints: 0,
        hasAutoshipInvoice: false,
      });
    }
    const data = memberPurchaseMap.get(memberId)!;

    if (ACTIVE_REQUIRED_PRODUCTS.includes(purchase.productCode)) {
      data.selfPurchasePoints += purchase.totalPoints || 0;
      data.purchasedRequiredProduct = true;
    }
    // ダイレクトB用: 商品1000を購入した「人数」カウントは後でchildrenMapで行う
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

  onProgress("自己購入データ集計完了");

  // ────────────────────────────────────────────────────
  // 5. 組織構造マップを構築
  // ────────────────────────────────────────────────────
  onProgress("組織データ構築中...");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberMap = new Map<bigint, any>([
    ...members.map((m: any) => [m.id, m] as [bigint, any]),
    ...withdrawnMembers.map((m: any) => [m.id, { ...m, _isWithdrawn: true }] as [bigint, any]),
  ]);

  const bonusEligibleMemberIds = new Set<bigint>(members.map((m: any) => m.id));

  const allMembersForTree = [...members, ...withdrawnMembers];

  // referrerIdベースのツリー（DAC計算用）
  const childrenMap = new Map<bigint, bigint[]>();
  for (const member of allMembersForTree) {
    if (member.referrerId) {
      if (!childrenMap.has(member.referrerId)) childrenMap.set(member.referrerId, []);
      childrenMap.get(member.referrerId)!.push(member.id);
    }
  }

  // uplineIdベースのツリー（GP・UL・SB計算用）
  const uplineChildrenMap = new Map<bigint, bigint[]>();
  for (const member of allMembersForTree) {
    if (member.uplineId) {
      if (!uplineChildrenMap.has(member.uplineId)) uplineChildrenMap.set(member.uplineId, []);
      uplineChildrenMap.get(member.uplineId)!.push(member.id);
    }
  }

  // ────────────────────────────────────────────────────
  // 6. 調整金を取得
  // ────────────────────────────────────────────────────
  let adjustments: { mlmMemberId: bigint; amount: number; comment: string | null; adjustmentType: string }[] = [];
  try {
    adjustments = await prisma.bonusAdjustment.findMany({
      where: { bonusMonth },
      select: { mlmMemberId: true, amount: true, comment: true, adjustmentType: true },
    });
  } catch (e) {
    console.warn("⚠️ bonus_adjustments取得失敗:", e);
  }

  const carryoverMap = new Map<bigint, number>();
  const adjustmentMap = new Map<bigint, { total: number; items: { amount: number; comment: string | null; adjustmentType: string }[] }>();
  for (const adj of adjustments) {
    const key = adj.mlmMemberId;
    if (adj.adjustmentType === "carryover") {
      carryoverMap.set(key, (carryoverMap.get(key) ?? 0) + adj.amount);
    } else {
      if (!adjustmentMap.has(key)) adjustmentMap.set(key, { total: 0, items: [] });
      const entry = adjustmentMap.get(key)!;
      entry.total += adj.amount;
      entry.items.push({ amount: adj.amount, comment: adj.comment ?? null, adjustmentType: adj.adjustmentType });
    }
  }

  // ────────────────────────────────────────────────────
  // 6b. 過不足金（前月BonusRun）
  // ────────────────────────────────────────────────────
  const shortageMap = new Map<bigint, number>();
  try {
    const prevRun = await prisma.bonusRun.findFirst({ where: { bonusMonth: prevBonusMonth }, select: { id: true } });
    if (prevRun) {
      const shortagePayments = await prisma.bonusShortagePayment.findMany({
        where: { bonusRunId: prevRun.id }, select: { mlmMemberId: true, amount: true },
      });
      for (const sp of shortagePayments) {
        shortageMap.set(sp.mlmMemberId, (shortageMap.get(sp.mlmMemberId) ?? 0) + sp.amount);
      }
    }
  } catch (e) {
    console.warn("⚠️ BonusShortagePayment取得失敗:", e);
  }

  onProgress(`組織データ構築完了 / 調整金 ${adjustments.length}件`);

  // ────────────────────────────────────────────────────
  // 7. Pass 1: 全会員の「当月達成レベル」を先計算
  // ────────────────────────────────────────────────────
  onProgress("アクティブ判定・グループ集計中（Pass1）...");

  const pass1ResultMap = new Map<bigint, {
    isActive: boolean; groupPoints: number; directActiveCount: number;
    seriesCount: number; achievedLevel: number; selfPurchasePoints: number;
  }>();

  for (const member of members) {
    const purchaseData = memberPurchaseMap.get(member.id) ?? {
      selfPurchasePoints: 0, directBonusProductBuyers: 0,
      purchasedRequiredProduct: false, autoshipInvoicePoints: 0, hasAutoshipInvoice: false,
    };

    const isActive = isActiveMember({
      selfPoints: purchaseData.selfPurchasePoints,
      purchasedRequiredProduct: purchaseData.purchasedRequiredProduct,
      forceActive: member.forceActive || false,
    });

    const { groupPoints, directActiveCount, seriesCount, seriesAchieverMap } =
      calcGroupDataFull(member.id, childrenMap, uplineChildrenMap, memberPurchaseMap, memberMap, purchaseData.selfPurchasePoints, null, bonusEligibleMemberIds);

    const naturalLevel = isActive
      ? calcAchievedLevel({ groupPoints, selfPurchasePoints: purchaseData.selfPurchasePoints, seriesCount, seriesAchieverMap })
      : 0;

    const forceLevel = (member as any).forceLevel;
    let achievedLevel: number;
    if (!isActive) {
      achievedLevel = 0;
    } else if (forceLevel !== null && forceLevel !== undefined) {
      achievedLevel = Math.max(forceLevel, naturalLevel);
    } else {
      achievedLevel = naturalLevel;
    }

    pass1ResultMap.set(member.id, {
      isActive, groupPoints, directActiveCount, seriesCount, achievedLevel,
      selfPurchasePoints: purchaseData.selfPurchasePoints,
    });
  }

  // ────────────────────────────────────────────────────
  // 8. Pass 2: 当月達成レベルマップで最終ボーナス計算
  // ────────────────────────────────────────────────────
  onProgress("ボーナス計算中（Pass2・当月レベルで再評価）...");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  let totalActiveMembers = 0;
  let totalBonusAmount   = 0;

  // デバッグ対象会員コード
  const DEBUG_CODES = new Set(["82179501", "44504701", "86820601", "93713601"]);

  for (const member of members) {
    const memberCodeStr = (member as any).memberCode as string;
    const isDebug = DEBUG_CODES.has(memberCodeStr);

    const purchaseData = memberPurchaseMap.get(member.id) ?? {
      selfPurchasePoints: 0, directBonusProductBuyers: 0,
      purchasedRequiredProduct: false, autoshipInvoicePoints: 0, hasAutoshipInvoice: false,
    };

    const pass1 = pass1ResultMap.get(member.id)!;
    const isActive = pass1.isActive;
    if (isActive) totalActiveMembers++;

    // Pass 2: 当月達成レベルで seriesAchieverMap 再構築
    const { groupPoints, directActiveCount, seriesCount, seriesAchieverMap } =
      calcGroupDataFull(member.id, childrenMap, uplineChildrenMap, memberPurchaseMap, memberMap, purchaseData.selfPurchasePoints, pass1ResultMap, bonusEligibleMemberIds);

    const naturalLevel = isActive
      ? calcAchievedLevel({ groupPoints, selfPurchasePoints: purchaseData.selfPurchasePoints, seriesCount, seriesAchieverMap })
      : 0;

    const forceLevel = (member as any).forceLevel;
    let achievedLevel: number;
    if (!isActive) {
      achievedLevel = 0;
    } else if (forceLevel !== null && forceLevel !== undefined) {
      achievedLevel = Math.max(forceLevel, naturalLevel);
    } else {
      achievedLevel = naturalLevel;
    }

    // 称号レベル（降格なし）
    const previousTitleLevel = member.currentLevel || 0;
    const newTitleLevel = isActive ? Math.max(previousTitleLevel, achievedLevel) : 0;

    const isFirstPos = isFirstPosition(memberCodeStr);

    // ━━━ ①ダイレクトB ━━━
    // 当月直接紹介した人数（商品1000を購入した直紹介の「人数」）× ¥2,000
    let directBonus = 0;
    if (isActive) {
      const directReferrals = childrenMap.get(member.id) || [];
      let directBonusPersonCount = 0;
      for (const referralId of directReferrals) {
        const referralPurchase = memberPurchaseMap.get(referralId);
        if (referralPurchase && referralPurchase.selfPurchasePoints > 0) {
          // 商品1000を当月購入した直紹介（人数カウント）
          // directBonusProductBuyersは別途集計するため、
          // ここでは購入データがある直紹介 = 商品1000を買った人と判断
          // 正確には商品1000の購入有無で判定
        }
        // 商品1000を当月購入した直紹介を人数カウント
        const refMember = memberMap.get(referralId);
        if (!refMember) continue;
        // その直紹介が商品1000を当月購入したか
        const hasProduct1000Purchase = purchases.some(
          p => p.mlmMemberId === referralId && p.productCode === DIRECT_BONUS_PRODUCT
        );
        if (hasProduct1000Purchase) directBonusPersonCount++;
      }
      directBonus = directBonusPersonCount * DIRECT_BONUS_AMOUNT;
      if (directBonus > 0 || isDebug) {
        console.log(`  💸 ダイレクトB: ${memberCodeStr} 直紹介商品1000購入者数=${directBonusPersonCount}名 → ¥${directBonus.toLocaleString()}`);
      }
    }

    // ━━━ ②ユニレベルB ━━━
    // 資格: (selfPt > 0 OR forceActive=true) AND 直ACT >= 2
    // conditionAchievedは不要
    const hasSelfPurchase = purchaseData.selfPurchasePoints > 0;
    const isForceActive   = (member as any).forceActive || false;
    const ulQualified     = (hasSelfPurchase || isForceActive) && directActiveCount >= 2;

    let unilevelResult = { total: 0, detail: {} as Record<number, number> };
    if (ulQualified) {
      const depthPoints = calcDepthPoints(member.id, uplineChildrenMap, memberPurchaseMap, memberMap, achievedLevel, bonusEligibleMemberIds);
      unilevelResult = calcUnilevelBonus(depthPoints, achievedLevel, directActiveCount);
      if (isDebug) {
        console.log(`  🔍 [UL-DEBUG] ${memberCodeStr}:`);
        console.log(`    selfPt=${purchaseData.selfPurchasePoints} forceActive=${isForceActive} directAct=${directActiveCount} level=${achievedLevel}`);
        console.log(`    depthPoints=${JSON.stringify(depthPoints)}`);
        console.log(`    unilevelDetail=${JSON.stringify(unilevelResult.detail)}`);
        console.log(`    calculatedUL=¥${unilevelResult.total.toLocaleString()}`);
      }
    }

    // ━━━ ③組織構築B ━━━
    // 資格: ACTIVE AND 直ACT >= 2 AND 実績LV3以上 AND 01ポジション
    // 有PT系列 >= 3 必要（例外: 44504701・89248801 は1系列でも対象）
    let structureBonus  = 0;
    let minSeriesPoints = 0;
    let orgPositiveSeriesCount = 0;

    // 組織構築Bの資格: isActive + directActiveCount >= 2 + level >= 3 + 01ポジション
    const isOrgException = ORG_EXCEPTION_CODES.has(memberCodeStr);
    const orgEligible = isActive && directActiveCount >= 2 && achievedLevel >= 3 && isFirstPos;

    if (orgEligible) {
      const { minPt, seriesCount: posSeries, seriesPtList } = calcMinSeriesPointsDetail(
        member.id, uplineChildrenMap, memberPurchaseMap, memberMap, bonusEligibleMemberIds
      );
      orgPositiveSeriesCount = posSeries;
      minSeriesPoints = minPt;

      if (isDebug) {
        console.log(`  🔍 [SB-DEBUG] ${memberCodeStr}:`);
        console.log(`    orgEligible=${orgEligible} isOrgException=${isOrgException}`);
        console.log(`    positiveSeriesCount=${posSeries} seriesPtList=${JSON.stringify(seriesPtList)}`);
        console.log(`    selectedMinSeriesPt=${minSeriesPoints}`);
      }

      // 有PT系列数チェック（例外は1系列でも通す）
      const minRequiredSeries = isOrgException ? 1 : 3;
      if (orgPositiveSeriesCount >= minRequiredSeries && minSeriesPoints > 0) {
        const rate = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
        structureBonus = Math.floor(minSeriesPoints * (rate / 100) * POINT_RATE);
        if (isDebug) {
          console.log(`    rate=${rate}% → SB=¥${structureBonus.toLocaleString()}`);
        }
      } else {
        if (isDebug) {
          console.log(`    有PT系列数${orgPositiveSeriesCount}が最低${minRequiredSeries}系列未満 or minSeries=0 → SB=0`);
        }
      }
      if (structureBonus > 0) {
        console.log(`  🏗️ 組織構築B: ${memberCodeStr} LV.${achievedLevel} 最小系列${minSeriesPoints}pt × ${STRUCTURE_BONUS_RATES[achievedLevel]}% → ¥${structureBonus.toLocaleString()}`);
      }
    }

    // ━━━ ④貯金B（SAVpt） ━━━
    // 01ポジション + 当月アクティブ（購入あり）なら対象
    // autoshipに限定しない
    let savingsPointsAdded        = 0;
    let savingsPtAFromRegistration = false;
    const memberStatus  = member.status;
    const memberIdStr   = member.id.toString();

    // 登録月判定（JST）
    const memberCreatedAt: Date  = (member as any).createdAt;
    const createdAtJST           = new Date(memberCreatedAt.getTime() + 9 * 60 * 60 * 1000);
    const createdMonthStr        = `${createdAtJST.getUTCFullYear()}-${String(createdAtJST.getUTCMonth() + 1).padStart(2, "0")}`;
    const isRegistrationMonth    = createdMonthStr === bonusMonth;

    // 前月A仮付与消滅チェック
    let prevAConsumptionPt = 0;
    if (prevHadRegistrationA.has(memberIdStr) && memberStatus !== "autoship") {
      prevAConsumptionPt = prevHadRegistrationA.get(memberIdStr) ?? 0;
      console.log(`  🔥 貯金A消滅: ${memberCodeStr} 前月A仮付与分 ${prevAConsumptionPt / 10}pt 消滅`);
    }

    // 01ポジション + 当月アクティブ（購入あり）なら貯金B発生
    // A: 初回登録月・仮付与（ステータス不問）
    if (isFirstPos && isRegistrationMonth && !hasPastProduct1000.has(memberIdStr)) {
      if (purchaseData.selfPurchasePoints > 0) {
        const ptA = Math.floor(purchaseData.selfPurchasePoints * (savingsRegistrationRate / 100) * 10) / 10;
        savingsPointsAdded        += ptA;
        savingsPtAFromRegistration = true;
        console.log(`  💰 貯金A（初回仮付与）: ${memberCodeStr} 自己${purchaseData.selfPurchasePoints}pt × ${savingsRegistrationRate}% = ${ptA}pt`);
      }
    }

    // B: AS購入PT × 5%（01ポジション + 当月アクティブ）
    if (isFirstPos && isActive && purchaseData.hasAutoshipInvoice && purchaseData.autoshipInvoicePoints > 0) {
      const ptB = Math.floor(purchaseData.autoshipInvoicePoints * (savingsAutoshipRate / 100) * 10) / 10;
      savingsPointsAdded += ptB;
      console.log(`  💰 貯金B(AS): ${memberCodeStr} AS伝票${purchaseData.autoshipInvoicePoints}pt × ${savingsAutoshipRate}% = ${ptB}pt`);
    }

    // C: 01番の獲得ポイント × 3%（01ポジション + 当月アクティブ）
    if (isFirstPos && isActive) {
      const earnedTotalYen = directBonus + unilevelResult.total + structureBonus;
      const earnedTotalPt  = Math.floor(earnedTotalYen / POINT_RATE);
      if (earnedTotalPt > 0) {
        const ptC = Math.floor(earnedTotalPt * (savingsBonusRate / 100) * 10) / 10;
        savingsPointsAdded += ptC;
        console.log(`  💰 貯金C(B): ${memberCodeStr} 獲得pt=${earnedTotalPt}pt × ${savingsBonusRate}% = ${ptC}pt`);
      }
    }

    savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;
    if (savingsPointsAdded > 0) console.log(`  💎 貯金合計: ${memberCodeStr} 今月+${savingsPointsAdded}pt`);

    // 貯金ポイント累計
    const previousSavingsPoints = (member.savingsPoints || 0) / 10;
    let newSavingsPoints: number;
    if (isFirstPos && isActive) {
      if (isRegistrationMonth && savingsPtAFromRegistration) {
        newSavingsPoints = Math.floor((previousSavingsPoints + savingsPointsAdded) * 10) / 10;
      } else if (memberStatus === "autoship") {
        const prevAConsumptionReal = prevAConsumptionPt / 10;
        newSavingsPoints = Math.max(0, Math.floor((previousSavingsPoints - prevAConsumptionReal + savingsPointsAdded) * 10) / 10);
      } else {
        // autoship以外でもアクティブなら今月分を加算
        newSavingsPoints = Math.floor((previousSavingsPoints + savingsPointsAdded) * 10) / 10;
      }
    } else {
      newSavingsPoints = previousSavingsPoints;
    }

    // ━━━ ⑤合計ボーナス・支払い計算 ━━━
    // 貯金ボーナスは現金支払に含めない
    const savingsBonusYen   = 0;
    const rankUpBonus       = 0;
    const shareBonus        = 0;
    const carryoverAmount   = carryoverMap.get(member.id) ?? 0;
    const adjEntry          = adjustmentMap.get(member.id);
    const adjustmentAmount  = adjEntry ? adjEntry.total : 0;

    // 控除前取得額 = directB + ULB + SB + 繰越 + 調整
    const amountBeforeAdjustment =
      directBonus + unilevelResult.total + rankUpBonus + shareBonus
      + structureBonus + carryoverAmount + adjustmentAmount;

    // 支払調整
    const paymentAdjustmentAmount =
      paymentAdjustmentRate !== null ? Math.floor(amountBeforeAdjustment / 1.1 * paymentAdjustmentRate) : 0;
    const finalAmount = amountBeforeAdjustment - paymentAdjustmentAmount;

    const consumptionTax = Math.floor(finalAmount / 11);
    const isCompany = !!(member as any).companyName;
    let withholdingTax = 0;
    if (!isCompany && finalAmount > WITHHOLDING_THRESHOLD) {
      withholdingTax = Math.floor((finalAmount - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE);
    }

    const shortageAmount = shortageMap.get(member.id) ?? 0;

    // 支払対象判定: 控除前取得額 >= 3,000円
    const isPayTarget = amountBeforeAdjustment >= MIN_PAYOUT_THRESHOLD;
    const serviceFee  = isPayTarget ? resolvedSettings.serviceFeeAmount : 0;
    const paymentAmount = isPayTarget
      ? finalAmount - withholdingTax - serviceFee + shortageAmount
      : 0 + shortageAmount;

    totalBonusAmount += paymentAmount;

    // デバッグ出力（4名 + 89248801）
    if (isDebug || memberCodeStr === "89248801") {
      console.log(`\n  ════════ [FULL-DEBUG] ${memberCodeStr} ════════`);
      console.log(`  position_id=${member.id}`);
      console.log(`  selfPt=${purchaseData.selfPurchasePoints} groupPt=${groupPoints}`);
      console.log(`  active=${isActive} forceActive=${isForceActive}`);
      console.log(`  directAct=${directActiveCount}`);
      console.log(`  monthlyLevel=${naturalLevel} forceLevel=${forceLevel ?? "N/A"} appliedLevel=${achievedLevel}`);
      console.log(`  --- ユニレベルB ---`);
      console.log(`  ulQualified=${ulQualified}`);
      for (let d = 1; d <= 7; d++) {
        const dp = calcDepthPoints(member.id, uplineChildrenMap, memberPurchaseMap, memberMap, achievedLevel, bonusEligibleMemberIds);
        console.log(`  depth${d}Pt=${dp[d] ?? 0}`);
        break; // 一回だけ計算
      }
      const dp2 = ulQualified ? calcDepthPoints(member.id, uplineChildrenMap, memberPurchaseMap, memberMap, achievedLevel, bonusEligibleMemberIds) : {};
      console.log(`  depthPoints=${JSON.stringify(dp2)}`);
      console.log(`  calculatedUL=¥${unilevelResult.total.toLocaleString()}`);
      console.log(`  --- 組織構築B ---`);
      console.log(`  orgEligible=${orgEligible} isOrgException=${isOrgException}`);
      console.log(`  positiveSeriesCount=${orgPositiveSeriesCount}`);
      console.log(`  selectedMinSeriesPt=${minSeriesPoints}`);
      console.log(`  orgRate=${STRUCTURE_BONUS_RATES[achievedLevel] ?? 0}%`);
      console.log(`  calculatedSB=¥${structureBonus.toLocaleString()}`);
      console.log(`  --- 貯金B ---`);
      const earnedTotalYen2 = directBonus + unilevelResult.total + structureBonus;
      console.log(`  sProductPt=${purchaseData.selfPurchasePoints} asProductPt=${purchaseData.autoshipInvoicePoints}`);
      console.log(`  bonusPointBase=${Math.floor(earnedTotalYen2 / POINT_RATE)}pt`);
      console.log(`  totalSavingPt=${savingsPointsAdded}`);
      console.log(`  --- 支払 ---`);
      console.log(`  grossBonusBeforeAdjustment=¥${amountBeforeAdjustment.toLocaleString()}`);
      console.log(`  isPayTarget=${isPayTarget} (threshold=¥${MIN_PAYOUT_THRESHOLD})`);
      console.log(`  carryoverAmount=¥${carryoverAmount.toLocaleString()}`);
      console.log(`  adminFee=¥${serviceFee.toLocaleString()}`);
      console.log(`  finalPaymentAmount=¥${paymentAmount.toLocaleString()}`);
      console.log(`  ════════════════════════════════`);
    }

    if (isActive) {
      console.log(
        `  👤 ${memberCodeStr}: active=${isActive} firstPos=${isFirstPos} dac=${directActiveCount} level=${achievedLevel} GP=${groupPoints} selfPt=${purchaseData.selfPurchasePoints} UL=¥${unilevelResult.total.toLocaleString()} SB=¥${structureBonus.toLocaleString()} directB=¥${directBonus.toLocaleString()} savPt=${savingsPointsAdded}`
      );
    }

    results.push({
      mlmMemberId:               member.id,
      bonusMonth,
      isActive,
      selfPurchasePoints:        purchaseData.selfPurchasePoints,
      groupPoints,
      directActiveCount,
      achievedLevel,
      forcedLevel:               forceLevel ?? 0,
      previousTitleLevel,
      newTitleLevel,
      directBonus,
      unilevelBonus:             unilevelResult.total,
      rankUpBonus,
      shareBonus,
      structureBonus,
      savingsBonusYen,
      carryoverAmount,
      adjustmentAmount,
      amountBeforeAdjustment,
      paymentAdjustmentRate:     paymentAdjustmentRate != null ? paymentAdjustmentRate * 100 : 0,
      paymentAdjustmentAmount,
      finalAmount,
      consumptionTax,
      withholdingTax,
      serviceFee,
      shortageAmount,
      otherPositionAmount:       0,
      otherPositionShortage:     0,
      paymentAmount,
      unilevelDetail:            unilevelResult.detail,
      savingsPointsAdded:        Math.min(2147483647, Math.max(0, Math.round(savingsPointsAdded * 10))),
      savingsPoints:             Math.min(2147483647, Math.max(0, Math.round(newSavingsPoints * 10))),
      savingsPtAFromRegistration,
      minLinePoints:             minSeriesPoints,
      lineCount:                 seriesCount,
    });
  }

  onProgress(`ボーナス計算完了（対象: ${members.length}名 / アクティブ: ${totalActiveMembers}名）`);

  // ────────────────────────────────────────────────────
  // 8b. Post-Process: 他ポジション集計
  //     非01ポジションの finalAmount を 01ポジションに合算
  // ────────────────────────────────────────────────────
  onProgress("他ポジション集計中...");

  const baseCodeMap = new Map<string, typeof results[0][]>();
  for (const r of results) {
    const mc = (memberMap.get(r.mlmMemberId) as any).memberCode as string;
    const baseCode = mc.includes("-") ? mc.replace(/-\d+$/, "") : mc;
    if (!baseCodeMap.has(baseCode)) baseCodeMap.set(baseCode, []);
    baseCodeMap.get(baseCode)!.push(r);
  }

  for (const [, positions] of baseCodeMap) {
    if (positions.length <= 1) continue;
    const pos01 = positions.find((r) => {
      const mc = (memberMap.get(r.mlmMemberId) as any).memberCode as string;
      return mc.endsWith("-01") || !mc.includes("-");
    });
    if (!pos01) continue;

    for (const pos of positions) {
      if (pos === pos01) continue;
      pos01.unilevelBonus        += pos.unilevelBonus;
      pos01.otherPositionAmount  += pos.finalAmount;
      pos01.otherPositionShortage+= pos.shortageAmount;
    }

    // 01ポジションの amountBeforeAdjustment 再計算
    pos01.amountBeforeAdjustment =
      pos01.directBonus + pos01.unilevelBonus + pos01.rankUpBonus + pos01.shareBonus
      + pos01.structureBonus + pos01.carryoverAmount + pos01.adjustmentAmount;
    const adjAmt = paymentAdjustmentRate !== null
      ? Math.floor(pos01.amountBeforeAdjustment / 1.1 * paymentAdjustmentRate) : 0;
    pos01.paymentAdjustmentAmount = adjAmt;
    pos01.finalAmount = pos01.amountBeforeAdjustment - adjAmt;
    pos01.consumptionTax = Math.floor(pos01.finalAmount / 11);
    const isCompany01 = !!(memberMap.get(pos01.mlmMemberId) as any).companyName;
    pos01.withholdingTax = (!isCompany01 && pos01.finalAmount > WITHHOLDING_THRESHOLD)
      ? Math.floor((pos01.finalAmount - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE) : 0;
    const isPayTarget01 = pos01.amountBeforeAdjustment >= MIN_PAYOUT_THRESHOLD;
    pos01.serviceFee = isPayTarget01 ? resolvedSettings.serviceFeeAmount : 0;
    pos01.paymentAmount = isPayTarget01
      ? pos01.finalAmount - pos01.withholdingTax - pos01.serviceFee
        + pos01.shortageAmount + pos01.otherPositionShortage
      : 0 + pos01.shortageAmount + pos01.otherPositionShortage;
  }

  // 支払対象者数を集計
  const payTargetCount = results.filter(r => r.amountBeforeAdjustment >= MIN_PAYOUT_THRESHOLD).length;
  console.log(`💰 支払対象者数: ${payTargetCount}名（控除前≥¥${MIN_PAYOUT_THRESHOLD}）`);

  // ────────────────────────────────────────────────────
  // 9. データベースに保存
  // ────────────────────────────────────────────────────
  onProgress("DBへの保存中... [BonusRun作成]");

  // 既存 BonusRun を削除してから再作成（再計算対応）
  const existingRun = await prisma.bonusRun.findFirst({ where: { bonusMonth } });
  if (existingRun) {
    await prisma.bonusRun.delete({ where: { id: existingRun.id } });
    console.log(`🗑️ 既存BonusRun削除: ${bonusMonth} (id=${existingRun.id})`);
    onProgress(`既存の計算結果を削除して再計算します`);
  }

  const bonusRun = await prisma.bonusRun.create({
    data: {
      bonusMonth,
      closingDate:            new Date(),
      status:                 "draft",
      paymentAdjustmentRate:  paymentAdjustmentRate != null ? paymentAdjustmentRate * 100 : 0,
      totalMembers:           members.length,
      totalActiveMembers,
      totalBonusAmount:       Math.floor(totalBonusAmount),
      capAdjustmentAmount:    0,
    },
  });

  onProgress(`BonusRun作成完了 (ID: ${bonusRun.id}) / BonusResult書き込み開始 [${results.length}件]`);

  await prisma.bonusResult.createMany({
    data: results.map((r) => ({
      bonusRunId:                bonusRun.id,
      mlmMemberId:               r.mlmMemberId,
      bonusMonth:                r.bonusMonth,
      isActive:                  r.isActive,
      selfPurchasePoints:        r.selfPurchasePoints,
      groupPoints:               r.groupPoints,
      directActiveCount:         r.directActiveCount,
      achievedLevel:             r.achievedLevel,
      forcedLevel:               r.forcedLevel,
      previousTitleLevel:        r.previousTitleLevel,
      newTitleLevel:             r.newTitleLevel,
      directBonus:               r.directBonus,
      unilevelBonus:             r.unilevelBonus,
      rankUpBonus:               r.rankUpBonus,
      shareBonus:                r.shareBonus,
      structureBonus:            r.structureBonus,
      carryoverAmount:           r.carryoverAmount,
      adjustmentAmount:          r.adjustmentAmount,
      amountBeforeAdjustment:    r.amountBeforeAdjustment,
      paymentAdjustmentRate:     r.paymentAdjustmentRate,
      paymentAdjustmentAmount:   r.paymentAdjustmentAmount,
      finalAmount:               r.finalAmount,
      consumptionTax:            r.consumptionTax,
      withholdingTax:            r.withholdingTax,
      serviceFee:                r.serviceFee,
      shortageAmount:            r.shortageAmount,
      otherPositionAmount:       r.otherPositionAmount,
      otherPositionShortage:     r.otherPositionShortage,
      paymentAmount:             r.paymentAmount,
      unilevelDetail:            r.unilevelDetail,
      minLinePoints:             r.minLinePoints,
      lineCount:                 r.lineCount,
      savingsPointsAdded:        r.savingsPointsAdded,
      savingsPoints:             r.savingsPoints,
      savingsPtAFromRegistration: r.savingsPtAFromRegistration,
    })),
  });

  console.log(`✅ BonusResult保存完了: ${results.length}件`);
  onProgress(`DB書き込み処理完了 (${results.length}件保存)`);

  // 調整金にbonusRunIdを紐付け
  if (adjustments.length > 0) {
    try {
      await prisma.bonusAdjustment.updateMany({
        where: { bonusMonth, bonusRunId: null },
        data:  { bonusRunId: bonusRun.id },
      });
    } catch (e) {
      console.warn("⚠️ 調整金BonusRun紐付け失敗（スキップ）:", e);
    }
  }

  // ────────────────────────────────────────────────────
  // 10. 会員レベル・貯金ポイントを更新
  // ────────────────────────────────────────────────────
  onProgress("終月処理中... (会員レベル・貯金ポイント更新)");

  let upgradedCount = 0, downgradedCount = 0;
  const memberUpdates: Array<{ id: bigint; data: Record<string, unknown> }> = [];
  for (const result of results) {
    const member = memberMap.get(result.mlmMemberId);
    if (!member) continue;

    const oldLevel  = member.currentLevel || 0;
    const newLevel  = result.newTitleLevel;
    const updateData: Record<string, unknown> = {};

    if (newLevel !== oldLevel) {
      updateData.currentLevel = newLevel;
      if (newLevel > oldLevel) upgradedCount++;
      else downgradedCount++;
    }

    const isFirstPos = isFirstPosition((member as any).memberCode);
    if (isFirstPos) {
      updateData.savingsPoints = result.savingsPoints;
    }

    if (Object.keys(updateData).length > 0) {
      memberUpdates.push({ id: result.mlmMemberId, data: updateData });
    }
  }

  let memberUpdateCount = 0;
  for (const u of memberUpdates) {
    await prisma.mlmMember.update({ where: { id: u.id }, data: u.data });
    memberUpdateCount++;
  }
  if (memberUpdates.length > 0) {
    onProgress(`会員情報更新: ${memberUpdateCount}/${memberUpdates.length}件完了`);
  }

  console.log(`✅ ボーナス計算完了: ${bonusMonth}`);
  console.log(`   対象会員: ${members.length}名`);
  console.log(`   アクティブ: ${totalActiveMembers}名`);
  console.log(`   支払対象: ${payTargetCount}名`);
  console.log(`   総支払額: ¥${totalBonusAmount.toLocaleString()}`);
  console.log(`   レベルアップ: ${upgradedCount}名 / レベルダウン: ${downgradedCount}名`);

  onProgress(`最終処理完了（レベルアップ: ${upgradedCount}名）`);
  onProgress(`✅ 全処理完了: 対象 ${members.length}名 / アクティブ ${totalActiveMembers}名 / 支払対象 ${payTargetCount}名 / 総支払額 ¥${Math.floor(totalBonusAmount).toLocaleString()}`);

  return {
    bonusRunId:          bonusRun.id,
    totalMembers:        members.length,
    totalActiveMembers,
    totalBonusAmount:    Math.floor(totalBonusAmount),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ヘルパー関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * グループポイント・直接紹介アクティブ数・系列情報を一括計算
 *
 * GP計算: uplineChildrenMap（uplineIdツリー）
 * DAC計算: childrenMap（referrerIdツリー）
 */
function calcGroupDataFull(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  selfPurchasePoints: number,
  pass1ResultMap: Map<bigint, { achievedLevel: number }> | null,
  bonusEligibleMemberIds: Set<bigint>
): {
  groupPoints: number;
  directActiveCount: number;
  seriesCount: number;
  seriesAchieverMap: Record<number, number>;
} {
  // GP計算: uplineChildrenMapを使用
  const uplineDirectChildren = uplineChildrenMap.get(memberId) || [];

  let groupPoints = selfPurchasePoints;
  const seriesAchieverMap: Record<number, number> = {};

  uplineDirectChildren.forEach((childId, seriesIndex) => {
    const childMember = memberMap.get(childId);
    if (!childMember) return;

    const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);

    if (!childIsWithdrawn) {
      seriesAchieverMap[seriesIndex] = seriesAchieverMap[seriesIndex] ?? 0;

      const childPurchase = purchaseMap.get(childId);
      const childIsActive = isActiveMember({
        selfPoints: childPurchase?.selfPurchasePoints ?? 0,
        purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
        forceActive: childMember.forceActive || false,
      });

      if (childIsActive) {
        groupPoints += childPurchase?.selfPurchasePoints ?? 0;
      }

      const childLevel = pass1ResultMap
        ? (pass1ResultMap.get(childId)?.achievedLevel ?? 0)
        : (childMember.currentLevel || 0);

      if (childLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
        seriesAchieverMap[seriesIndex] = childLevel;
      }

      const subResult = calcSubGroupPoints(childId, uplineChildrenMap, purchaseMap, memberMap, 1, 7, pass1ResultMap, bonusEligibleMemberIds);
      groupPoints += subResult.groupPoints;

      if (subResult.maxLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
        seriesAchieverMap[seriesIndex] = subResult.maxLevel;
      }
    } else {
      // 退会者: depth消費なし
      const subResult = calcSubGroupPoints(childId, uplineChildrenMap, purchaseMap, memberMap, 0, 7, pass1ResultMap, bonusEligibleMemberIds);
      groupPoints += subResult.groupPoints;
    }
  });

  // DAC計算: childrenMap（referrerIdツリー）
  const referrerDirectChildren = childrenMap.get(memberId) || [];
  let directActiveCount = 0;
  for (const childId of referrerDirectChildren) {
    const childMember = memberMap.get(childId);
    if (!childMember) continue;
    const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);
    if (childIsWithdrawn) continue;
    const childPurchase = purchaseMap.get(childId);
    const childIsActive = isActiveMember({
      selfPoints: childPurchase?.selfPurchasePoints ?? 0,
      purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
      forceActive: childMember.forceActive || false,
    });
    if (childIsActive) directActiveCount++;
  }

  // seriesCount: uplineIdツリーの直下数（LV達成判定用）
  const seriesCountAll = uplineDirectChildren.length;
  return { groupPoints, directActiveCount, seriesCount: seriesCountAll, seriesAchieverMap };
}

/**
 * 下位のグループポイントと最高レベルを再帰計算
 * 非アクティブも depth を消費（圧縮なし）
 * 退会者のみ depth を消費しない（透過）
 */
function calcSubGroupPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  currentDepth: number,
  maxDepth: number,
  pass1ResultMap: Map<bigint, { achievedLevel: number }> | null,
  bonusEligibleMemberIds: Set<bigint>
): { groupPoints: number; maxLevel: number } {
  if (currentDepth >= maxDepth) return { groupPoints: 0, maxLevel: 0 };

  const children = childrenMap.get(memberId) || [];
  let groupPoints = 0;
  let maxLevel    = 0;

  for (const childId of children) {
    const childMember   = memberMap.get(childId);
    const childPurchase = purchaseMap.get(childId);
    if (!childMember) continue;

    const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);

    if (childIsWithdrawn) {
      // 退会者: depth消費なし
      const sub = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, currentDepth, maxDepth, pass1ResultMap, bonusEligibleMemberIds);
      groupPoints += sub.groupPoints;
      if (sub.maxLevel > maxLevel) maxLevel = sub.maxLevel;
      continue;
    }

    const childIsActive = isActiveMember({
      selfPoints: childPurchase?.selfPurchasePoints ?? 0,
      purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
      forceActive: childMember.forceActive || false,
    });

    if (childIsActive) groupPoints += childPurchase?.selfPurchasePoints ?? 0;

    const childLevel = pass1ResultMap
      ? (pass1ResultMap.get(childId)?.achievedLevel ?? 0)
      : (childMember.currentLevel || 0);

    if (childLevel > maxLevel) maxLevel = childLevel;

    // 圧縮なし: 非アクティブでも depth+1
    const sub = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, currentDepth + 1, maxDepth, pass1ResultMap, bonusEligibleMemberIds);
    groupPoints += sub.groupPoints;
    if (sub.maxLevel > maxLevel) maxLevel = sub.maxLevel;
  }

  return { groupPoints, maxLevel };
}

/**
 * 段数別ポイントを計算（ユニレベルB用）
 * ツリー: uplineChildrenMap（uplineIdベース）
 * 非アクティブ: ポイント加算なし・depth消費なし（透過）
 * withdrawn/lapsed(forceActive=false): depth消費なし（透過）
 * forceActive（lapsed）: アクティブ扱い（isActiveMember が true を返す）
 */
function calcDepthPoints(
  memberId: bigint,
  treeMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  achievedLevel: number,
  bonusEligibleMemberIds: Set<bigint>
): Record<number, number> {
  const maxDepth    = getUnilevelMaxDepth(achievedLevel);
  const depthPoints: Record<number, number> = {};

  function traverse(currentId: bigint, depth: number) {
    if (depth > maxDepth) return;

    const children = treeMap.get(currentId) || [];
    for (const childId of children) {
      const childMember   = memberMap.get(childId);
      const childPurchase = purchaseMap.get(childId);
      if (!childMember) continue;

      const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);
      if (childIsWithdrawn) {
        traverse(childId, depth);  // withdrawn: depth消費なし（透過）
        continue;
      }

      const childIsActive = isActiveMember({
        selfPoints: childPurchase?.selfPurchasePoints ?? 0,
        purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
        forceActive: childMember.forceActive || false,
      });

      if (childIsActive) {
        depthPoints[depth] = (depthPoints[depth] || 0) + (childPurchase?.selfPurchasePoints ?? 0);
        traverse(childId, depth + 1);
      } else {
        // 非アクティブ: depth消費なし（透過）
        traverse(childId, depth);
      }
    }
  }

  traverse(memberId, 1);
  return depthPoints;
}

/**
 * 最小系列ポイントを計算（組織構築B用）
 * uplineIdツリーの直下系列ごとにポイントを合計
 * 0pt系列を除外し、有PT系列の中で最小値を返す
 *
 * MAX_SERIES_DEPTH = 6（Fix11確定値）
 * forceActive会員: depth消費あり・pt加算なし（非透過）
 * withdrawn/lapsed(forceActive=false): 透過（depth消費なし）
 * 段数制限なし（仕様: 全系列を集計）
 */
function calcMinSeriesPoints(
  memberId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  bonusEligibleMemberIds: Set<bigint>
): number {
  return calcMinSeriesPointsDetail(memberId, uplineChildrenMap, purchaseMap, memberMap, bonusEligibleMemberIds).minPt;
}

/**
 * 最小系列ポイントの詳細計算（有PT系列数・系列PTリスト付き）
 */
function calcMinSeriesPointsDetail(
  memberId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  bonusEligibleMemberIds: Set<bigint>
): { minPt: number; seriesCount: number; seriesPtList: number[] } {
  const children = uplineChildrenMap.get(memberId) || [];
  if (children.length === 0) return { minPt: 0, seriesCount: 0, seriesPtList: [] };

  // ★ MAX_SERIES_DEPTH = 6（Fix11確定値）
  const MAX_SERIES_DEPTH = 6;

  const seriesPoints: number[] = [];

  for (const childId of children) {
    let seriesTotal = 0;

    const traverseSeries = (currentId: bigint, depth: number): void => {
      if (depth > MAX_SERIES_DEPTH) return;
      const purchase = purchaseMap.get(currentId);
      const mem      = memberMap.get(currentId);
      if (!mem) return;

      const isWithdrawn   = !bonusEligibleMemberIds.has(currentId);
      const isForceActive = mem.forceActive || false;

      if (isWithdrawn) {
        // 退会者（withdrawn/lapsed forceActive=false）: depth消費なし（透過）
        for (const descId of (uplineChildrenMap.get(currentId) || [])) {
          traverseSeries(descId, depth);
        }
        return;
      }

      if (isForceActive) {
        // forceActive: depth消費あり・pt加算なし
        for (const descId of (uplineChildrenMap.get(currentId) || [])) {
          traverseSeries(descId, depth + 1);
        }
        return;
      }

      // 通常会員: アクティブならpt加算
      const isActive = isActiveMember({
        selfPoints: purchase?.selfPurchasePoints ?? 0,
        purchasedRequiredProduct: purchase?.purchasedRequiredProduct ?? false,
        forceActive: false,
      });
      if (isActive) seriesTotal += purchase?.selfPurchasePoints ?? 0;

      for (const descId of (uplineChildrenMap.get(currentId) || [])) {
        traverseSeries(descId, depth + 1);
      }
    };

    traverseSeries(childId, 1);
    if (seriesTotal > 0) seriesPoints.push(seriesTotal);
  }

  if (seriesPoints.length === 0) return { minPt: 0, seriesCount: 0, seriesPtList: [] };
  return {
    minPt: Math.min(...seriesPoints),
    seriesCount: seriesPoints.length,
    seriesPtList: seriesPoints,
  };
}
