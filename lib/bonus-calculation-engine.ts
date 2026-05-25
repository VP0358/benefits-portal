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
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ■ 重要実装ノート（2パス計算）
 *
 * LV.2以上の条件「各系列にLV.X達成者が1名以上」は、**当月の達成レベル**で判定する。
 * そのため計算は2パスで行う：
 *   Pass 1: 全会員の当月達成レベル（achievedLevel）を先に計算
 *   Pass 2: Pass 1の結果を使い、seriesAchieverMap（当月レベル）で再計算
 *
 * ※ Pass 1 で currentLevel（前月以前の称号）を参照すると、
 *   当月新たにLV.1になった会員を「LV.1達成者」として認識できず、
 *   LV.2以上の判定が不正確になる。
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
  directBonusProductCount: number;   // 自分が購入した商品1000の個数（ダイレクトボーナス計算用）
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
 * ボーナス計算メインエンジン
 * @param bonusMonth "YYYY-MM"
 * @param paymentAdjustmentRate 支払調整率（0.0〜1.0）、nullの場合は調整なし
 * @param onProgress 進捗コールバック（SSE送信用）
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
  console.log(`🚀 ボーナス計算開始: ${bonusMonth}`);
  onProgress("ボーナス計算を開始しました");

  // ────────────────────────────────────────────────────
  // 0. bonus_results テーブルの不足カラムを自動補完
  //    本番DBにマイグレーション未適用でも確実に動作させるため
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
    // 新規フィールド（2026年4月度修正分）
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
    console.warn("⚠️ bonus_settingsテーブルが見つかりません。デフォルト値を使用します:", e);
  }
  const resolvedSettings = {
    serviceFeeAmount: bonusSettings?.serviceFeeAmount ?? 440,
    minPayoutAmount:  bonusSettings?.minPayoutAmount  ?? 2560,
  };

  let savingsConfig: { registrationRate: number; autoshipRate: number; bonusRate: number } | null = null;
  try {
    savingsConfig = await prisma.savingsBonusConfig.findFirst({ orderBy: { id: "desc" } });
  } catch (e) {
    console.warn("⚠️ savings_bonus_configテーブルが見つかりません。デフォルト値を使用します:", e);
  }
  const savingsRegistrationRate = savingsConfig?.registrationRate ?? 20.0;
  const savingsAutoshipRate     = savingsConfig?.autoshipRate     ?? 5.0;
  const savingsBonusRate        = savingsConfig?.bonusRate        ?? 3.0;

  onProgress("設定データ読み込み完了");

  // ────────────────────────────────────────────────────
  // 2. 全MLM会員を取得
  //    ボーナス計算対象: active/autoship/suspended（退会者除く）
  //    組織ツリー用:     上記 + withdrawn（退会者）も含む
  //
  // ★ 重要バグ修正:
  //   withdrawn 会員を memberMap・childrenMap から除外すると、
  //   「退会者の紹介で入会した非退会者」がツリー上で孤立し、
  //   GP集計に含まれなくなる（過少計上バグ）。
  //   修正: withdrawn 会員もツリー構造のために取得するが、
  //   ボーナス計算（isActive 判定・報酬付与）の対象からは外す。
  // ────────────────────────────────────────────────────
  onProgress("会員データ読み込み中...");

  // ボーナス計算対象会員（退会者除く）
  const members = await prisma.mlmMember.findMany({
    where: { status: { in: ["active", "autoship", "suspended"] } },
    include: { user: { select: { name: true, email: true } } },
  });

  // 組織ツリー構造のためだけに取得する退会者（ボーナス計算対象外）
  const withdrawnMembers = await prisma.mlmMember.findMany({
    where: { status: "withdrawn" },
    select: {
      id: true,
      memberCode: true,
      referrerId: true,
      uplineId: true,
      currentLevel: true,
      forceActive: true,
      forceLevel: true,
      conditionAchieved: true,
      status: true,
    },
  });

  // 貯金ボーナスA（初回）判定用：今月より前に商品1000を購入済みの会員IDセット
  const [bonusMonthYear, bonusMonthMonth] = bonusMonth.split("-").map(Number);

  const pastProduct1000Purchases = await prisma.mlmPurchase.findMany({
    where: { productCode: "1000", purchaseMonth: { lt: bonusMonth } },
    select: { mlmMemberId: true },
    distinct: ["mlmMemberId"],
  });
  const hasPastProduct1000 = new Set(
    pastProduct1000Purchases.map((p: { mlmMemberId: bigint }) => p.mlmMemberId.toString())
  );

  // 前月BonusResultを取得（翌月チェック：A仮付与の消滅判定用）
  const prevMonthTotal = bonusMonthYear * 12 + (bonusMonthMonth - 1) - 1;
  const prevYear  = Math.floor(prevMonthTotal / 12);
  const prevMonth = (prevMonthTotal % 12) + 1;
  const prevBonusMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

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
    console.log(`📋 前月BonusResult取得成功: ${prevBonusResults.length}件`);
  } catch (e1) {
    console.warn("⚠️ 前月BonusResult取得失敗（フル版）:", e1 instanceof Error ? e1.message : String(e1));
    try {
      const fallback = await prisma.bonusResult.findMany({
        where: { bonusMonth: prevBonusMonth },
        select: { mlmMemberId: true, savingsPointsAdded: true },
      });
      prevBonusResults = fallback.map((r: { mlmMemberId: bigint; savingsPointsAdded: number }) => ({
        mlmMemberId: r.mlmMemberId,
        savingsPtAFromRegistration: null,
        savingsPointsAdded: r.savingsPointsAdded,
      }));
    } catch (e2) {
      console.warn("⚠️ 前月BonusResult取得完全失敗。A消滅チェックをスキップ:", e2 instanceof Error ? e2.message : String(e2));
      prevBonusResults = [];
    }
  }

  const prevHadRegistrationA = new Map<string, number>(
    prevBonusResults
      .filter((r) => r.savingsPtAFromRegistration === true)
      .map((r) => [r.mlmMemberId.toString(), r.savingsPointsAdded] as [string, number])
  );

  const WITHHOLDING_THRESHOLD = 120000;
  const WITHHOLDING_RATE      = 0.1021;

  console.log(`📊 対象会員数: ${members.length}名`);
  onProgress(`会員データロード完了（対象: ${members.length}名）`);

  // ────────────────────────────────────────────────────
  // 3. 対象月の購入データを取得
  // ────────────────────────────────────────────────────
  onProgress("購入データ読み込み中...");

  const purchases = await prisma.mlmPurchase.findMany({
    where: { purchaseMonth: bonusMonth },
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
        directBonusProductCount: 0,
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
    if (purchase.productCode === DIRECT_BONUS_PRODUCT) {
      data.directBonusProductCount += purchase.quantity;
    }
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

  onProgress("自己購入データ保存完了");

  // ────────────────────────────────────────────────────
  // 5. 組織構造マップを構築
  //    memberMap・childrenMap は「退会者含む全会員」で構築する
  //    （退会者を含めないと、退会者を経由する非退会者傘下がGPに含まれなくなる）
  // ────────────────────────────────────────────────────
  onProgress("組織データ構築中...");

  // memberMap: ボーナス計算対象 + 退会者（ツリー走査用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberMap = new Map<bigint, any>([
    ...members.map((m: any) => [m.id, m] as [bigint, any]),
    ...withdrawnMembers.map((m: any) => [m.id, { ...m, _isWithdrawn: true }] as [bigint, any]),
  ]);

  // ボーナス計算対象会員のIDセット（退会者を除外するため）
  const bonusEligibleMemberIds = new Set<bigint>(members.map((m: any) => m.id));

  // childrenMap: 退会者含む全会員の referrerId から構築
  const childrenMap = new Map<bigint, bigint[]>();
  const allMembersForTree = [...members, ...withdrawnMembers];
  for (const member of allMembersForTree) {
    if (member.referrerId) {
      if (!childrenMap.has(member.referrerId)) {
        childrenMap.set(member.referrerId, []);
      }
      childrenMap.get(member.referrerId)!.push(member.id);
    }
  }

  // ────────────────────────────────────────────────────
  // 6. 調整金を取得（繰越金と通常調整金を分離）
  // ────────────────────────────────────────────────────
  let adjustments: {
    mlmMemberId: bigint;
    amount: number;
    comment: string | null;
    adjustmentType: string;
  }[] = [];
  try {
    adjustments = await prisma.bonusAdjustment.findMany({
      where: { bonusMonth },
      select: { mlmMemberId: true, amount: true, comment: true, adjustmentType: true },
    });
  } catch (e) {
    console.warn("⚠️ bonus_adjustments取得失敗。調整金なしで続行:", e);
    adjustments = [];
  }

  // 繰越金（adjustmentType="carryover"）と通常調整金を分離
  const carryoverMap = new Map<bigint, number>(); // 繰越金
  const adjustmentMap = new Map<bigint, {
    total: number;
    items: { amount: number; comment: string | null; adjustmentType: string }[];
  }>();
  for (const adj of adjustments) {
    const key = adj.mlmMemberId;
    if (adj.adjustmentType === "carryover") {
      // 繰越金: carryoverMapに集計
      carryoverMap.set(key, (carryoverMap.get(key) ?? 0) + adj.amount);
    } else {
      // 通常調整金: adjustmentMapに集計
      if (!adjustmentMap.has(key)) adjustmentMap.set(key, { total: 0, items: [] });
      const entry = adjustmentMap.get(key)!;
      entry.total += adj.amount;
      entry.items.push({ amount: adj.amount, comment: adj.comment ?? null, adjustmentType: adj.adjustmentType });
    }
  }

  console.log(`💰 調整金対象会員: ${adjustmentMap.size}名 / 繰越金対象: ${carryoverMap.size}名（合計件数: ${adjustments.length}件）`);

  // ────────────────────────────────────────────────────
  // 6b. 過不足金を取得（前月BonusRunのBonusShortagePaymentから）
  // ────────────────────────────────────────────────────
  const shortageMap = new Map<bigint, number>();
  try {
    const prevRun = await prisma.bonusRun.findFirst({
      where: { bonusMonth: prevBonusMonth },
      select: { id: true },
    });
    if (prevRun) {
      const shortagePayments = await prisma.bonusShortagePayment.findMany({
        where: { bonusRunId: prevRun.id },
        select: { mlmMemberId: true, amount: true },
      });
      for (const sp of shortagePayments) {
        shortageMap.set(sp.mlmMemberId, (shortageMap.get(sp.mlmMemberId) ?? 0) + sp.amount);
      }
      console.log(`💸 過不足金取得: 前月BonusRun(id=${prevRun.id}) から ${shortagePayments.length}件`);
    } else {
      console.log(`💸 過不足金: 前月(${prevBonusMonth})のBonusRunが見つかりません`);
    }
  } catch (e) {
    console.warn("⚠️ BonusShortagePayment取得失敗（スキップ）:", e);
  }

  onProgress(`組織データ構築完了 / 調整金 ${adjustments.length}件読み込み完了`);

  // ────────────────────────────────────────────────────
  // 7. Pass 1: 全会員の「当月達成レベル」を先に計算する
  //
  // ★ 重要: LV.2以上の条件「各系列に LV.X 達成者が1名以上」は
  //   「当月の達成レベル」で判定しなければならない。
  //   currentLevel（DB上の称号レベル）は前月以前の値なので使えない。
  //   そのため Pass 1 で全員の achievedLevel を計算し、
  //   Pass 2 でそれを使って最終的なボーナス額を算出する。
  // ────────────────────────────────────────────────────
  onProgress("アクティブ判定・グループ集計中（Pass1）...");

  // Pass 1: アクティブ判定 + グループポイント + 当月達成レベル（currentLevel ベース）
  const pass1ResultMap = new Map<bigint, {
    isActive: boolean;
    groupPoints: number;
    directActiveCount: number;
    seriesCount: number;
    achievedLevel: number; // currentLevel ベースの暫定レベル（Pass2で上書き）
    selfPurchasePoints: number;
  }>();

  for (const member of members) {
    const purchaseData = memberPurchaseMap.get(member.id) ?? {
      selfPurchasePoints: 0,
      directBonusProductCount: 0,
      purchasedRequiredProduct: false,
      autoshipInvoicePoints: 0,
      hasAutoshipInvoice: false,
    };

    const isActive = isActiveMember({
      selfPoints: purchaseData.selfPurchasePoints,
      purchasedRequiredProduct: purchaseData.purchasedRequiredProduct,
      forceActive: member.forceActive || false,
    });

    // Pass 1 では currentLevel（DB値）で seriesAchieverMap を構築
    // childrenMap は退会者含む全会員で構築済み → 退会者経由の傘下もGPに含まれる
    const { groupPoints, directActiveCount, seriesCount, seriesAchieverMap } =
      calcGroupDataFull(member.id, childrenMap, memberPurchaseMap, memberMap, purchaseData.selfPurchasePoints, null, bonusEligibleMemberIds);

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
      isActive,
      groupPoints,
      directActiveCount,
      seriesCount,
      achievedLevel,
      selfPurchasePoints: purchaseData.selfPurchasePoints,
    });
  }

  // ────────────────────────────────────────────────────
  // 8. Pass 2: 当月達成レベルマップを使って seriesAchieverMap を再構築し
  //    最終的なボーナス計算を行う
  // ────────────────────────────────────────────────────
  onProgress("ボーナス計算中（Pass2・当月レベルで再評価）...");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  let totalActiveMembers = 0;
  let totalBonusAmount   = 0;

  for (const member of members) {
    const purchaseData = memberPurchaseMap.get(member.id) ?? {
      selfPurchasePoints: 0,
      directBonusProductCount: 0,
      purchasedRequiredProduct: false,
      autoshipInvoicePoints: 0,
      hasAutoshipInvoice: false,
    };

    const pass1 = pass1ResultMap.get(member.id)!;
    const isActive = pass1.isActive;
    if (isActive) totalActiveMembers++;

    // ★ Pass 2: pass1ResultMap（当月達成レベル）を seriesAchieverMap に使用
    // childrenMap は退会者含む全会員で構築済み → 退会者経由の傘下もGPに含まれる
    const { groupPoints, directActiveCount, seriesCount, seriesAchieverMap } =
      calcGroupDataFull(member.id, childrenMap, memberPurchaseMap, memberMap, purchaseData.selfPurchasePoints, pass1ResultMap, bonusEligibleMemberIds);

    // 当月実績レベル判定（Pass2: 当月達成レベルで判定）
    const naturalLevel = isActive
      ? calcAchievedLevel({ groupPoints, selfPurchasePoints: purchaseData.selfPurchasePoints, seriesCount, seriesAchieverMap })
      : 0;

    // 強制レベル適用
    const forceLevel = (member as any).forceLevel;
    let achievedLevel: number;
    if (!isActive) {
      achievedLevel = 0;
    } else if (forceLevel !== null && forceLevel !== undefined) {
      achievedLevel = Math.max(forceLevel, naturalLevel);
      console.log(`  🏅 強制レベル: ${(member as any).memberCode} force=${forceLevel} natural=${naturalLevel} → ${achievedLevel}`);
    } else {
      achievedLevel = naturalLevel;
    }

    // 称号レベル（降格なし・非アクティブは消滅）
    const previousTitleLevel = member.currentLevel || 0;
    const newTitleLevel = isActive ? Math.max(previousTitleLevel, achievedLevel) : 0;

    // ボーナス受取資格
    const conditionAchieved = member.conditionAchieved || false;
    const eligible = isEligibleForBonus({ isActive, directActiveCount, conditionAchieved });

    if (isActive) {
      console.log(
        `  👤 ${(member as any).memberCode}: active=${isActive} directActive=${directActiveCount} conditionAchieved=${conditionAchieved} eligible=${eligible} GP=${groupPoints} selfPt=${purchaseData.selfPurchasePoints} series=${seriesCount} level=${achievedLevel}`
      );
    }

    // ━━━ ①ダイレクトボーナス ━━━
    let directBonus = 0;
    if (isActive) {
      const directReferrals = childrenMap.get(member.id) || [];
      let directBonusProductTotal = 0;
      for (const referralId of directReferrals) {
        const referralPurchase = memberPurchaseMap.get(referralId);
        if (referralPurchase) directBonusProductTotal += referralPurchase.directBonusProductCount;
      }
      directBonus = directBonusProductTotal * DIRECT_BONUS_AMOUNT;
      if (directBonus > 0) {
        console.log(`  💸 ダイレクトB: ${(member as any).memberCode} 商品1000×${directBonusProductTotal}個 → ¥${directBonus.toLocaleString()}`);
      }
    }

    // ━━━ ②ユニレベルボーナス ━━━
    let unilevelResult = { total: 0, detail: {} as Record<number, number> };
    if (eligible) {
      const depthPoints = calcDepthPoints(member.id, childrenMap, memberPurchaseMap, memberMap, achievedLevel, bonusEligibleMemberIds);
      unilevelResult = calcUnilevelBonus(depthPoints, achievedLevel, directActiveCount);
      if (unilevelResult.total > 0) {
        console.log(`  📊 ユニレベルB: ${(member as any).memberCode} LV.${achievedLevel} → ¥${unilevelResult.total.toLocaleString()}`);
      }
    }

    // ━━━ ③組織構築ボーナス ━━━
    let structureBonus  = 0;
    let minSeriesPoints = 0;
    const memberCodeStr = (member as any).memberCode as string;
    const isFirstPos    = isFirstPosition(memberCodeStr);

    if (eligible && achievedLevel >= 3 && isFirstPos) {
      minSeriesPoints = calcMinSeriesPoints(member.id, childrenMap, memberPurchaseMap, memberMap, bonusEligibleMemberIds);
      const rate = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
      // ★ Bug #2 Fix: 組織構築ボーナスの基準はグループポイント（GP）
      //   旧: minSeriesPoints × rate × POINT_RATE（最小系列pt基準 → 誤り）
      //   正: groupPoints × rate × POINT_RATE（GP基準）
      //   例: 30,600pt × 4% × ¥100 = ¥122,400
      structureBonus = Math.floor(groupPoints * (rate / 100) * POINT_RATE);
      if (structureBonus > 0) {
        console.log(`  🏗️ 組織構築B: ${memberCodeStr} LV.${achievedLevel} GP=${groupPoints}pt × ${rate}% → ¥${structureBonus.toLocaleString()}（最小系列${minSeriesPoints}pt）`);
      }
    }

    // ━━━ ④貯金ボーナス（SAVpt） ━━━
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
      const prevAddedInt  = prevHadRegistrationA.get(memberIdStr) ?? 0;
      prevAConsumptionPt  = prevAddedInt;
      console.log(`  🔥 貯金A消滅: ${memberCodeStr} 前月A仮付与分 ${prevAddedInt / 10}pt 消滅`);
    }

    // A: 初回登録月・仮付与（ステータス不問）
    if (isFirstPos && isRegistrationMonth && !hasPastProduct1000.has(memberIdStr)) {
      if (purchaseData.directBonusProductCount >= 1) {
        const ptA = Math.floor(purchaseData.selfPurchasePoints * (savingsRegistrationRate / 100) * 10) / 10;
        savingsPointsAdded       += ptA;
        savingsPtAFromRegistration = true;
        console.log(`  💰 貯金A（初回仮付与）: ${memberCodeStr} 自己${purchaseData.selfPurchasePoints}pt × ${savingsRegistrationRate}% = ${ptA}pt`);
      }
    }

    // B・C: autoship かつ 当月アクティブのみ
    if (isFirstPos && memberStatus === "autoship" && isActive) {
      if (purchaseData.hasAutoshipInvoice && purchaseData.autoshipInvoicePoints > 0) {
        const ptB = Math.floor(purchaseData.autoshipInvoicePoints * (savingsAutoshipRate / 100) * 10) / 10;
        savingsPointsAdded += ptB;
        console.log(`  💰 貯金B: ${memberCodeStr} AS伝票${purchaseData.autoshipInvoicePoints}pt × ${savingsAutoshipRate}% = ${ptB}pt`);
      }
      const hasBonusThisMonth = (directBonus + unilevelResult.total + structureBonus) > 0;
      if (hasBonusThisMonth && groupPoints > 0) {
        const ptC = Math.floor(groupPoints * (savingsBonusRate / 100) * 10) / 10;
        savingsPointsAdded += ptC;
        console.log(`  💰 貯金C: ${memberCodeStr} GP=${groupPoints}pt × ${savingsBonusRate}% = ${ptC}pt`);
      }
    }

    savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;
    if (savingsPointsAdded > 0) console.log(`  💎 貯金合計: ${memberCodeStr} 今月+${savingsPointsAdded}pt`);

    // 貯金ポイント累計
    // ※ member.savingsPoints はDBに×10整数で保存されているので /10 でpt単位に戻す
    const previousSavingsPoints = (member.savingsPoints || 0) / 10;
    let newSavingsPoints: number;
    if (isRegistrationMonth && savingsPtAFromRegistration) {
      newSavingsPoints = Math.floor((previousSavingsPoints + savingsPointsAdded) * 10) / 10;
    } else if (memberStatus === "autoship" && isActive) {
      const prevAConsumptionReal = prevAConsumptionPt / 10;
      newSavingsPoints = Math.max(0, Math.floor((previousSavingsPoints - prevAConsumptionReal + savingsPointsAdded) * 10) / 10);
    } else {
      newSavingsPoints = 0;
    }

    // ━━━ ⑤合計ボーナス・支払い計算 ━━━
    //
    // 貯金ボーナス円換算：savingsPointsAdded（float pt）× POINT_RATE
    // ※ savingsPointsAdded はまだ×10スケール前のpt単位の値
    const savingsBonusYen   = Math.round(savingsPointsAdded * POINT_RATE);

    // ランクアップB・シェアB: 2026年4月度は未実装 → 0
    const rankUpBonus       = 0;
    const shareBonus        = 0;

    // 繰越金（adjustmentType="carryover"）
    const carryoverAmount   = carryoverMap.get(member.id) ?? 0;

    // 通常調整金
    const adjEntry          = adjustmentMap.get(member.id);
    const adjustmentAmount  = adjEntry ? adjEntry.total : 0;

    // 支払調整前取得額 = 全ボーナス合計
    // directB + unilevelB + rankUpB + shareB + structureB + savingsBonusYen + carryoverAmount + adjustmentAmount
    const amountBeforeAdjustment =
      directBonus + unilevelResult.total + rankUpBonus + shareBonus
      + structureBonus + savingsBonusYen + carryoverAmount + adjustmentAmount;

    const paymentAdjustmentAmount =
      paymentAdjustmentRate !== null ? Math.floor(amountBeforeAdjustment * paymentAdjustmentRate) : 0;
    const finalAmount = amountBeforeAdjustment - paymentAdjustmentAmount;

    // 10%消費税（内税）
    const consumptionTax = Math.floor(finalAmount / 11);

    const isCompany = !!(member as any).companyName;
    let withholdingTax = 0;
    if (!isCompany && finalAmount > WITHHOLDING_THRESHOLD) {
      withholdingTax = Math.floor((finalAmount - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE);
    }

    // 過不足金
    const shortageAmount    = shortageMap.get(member.id) ?? 0;

    const serviceFee        = finalAmount > resolvedSettings.minPayoutAmount ? resolvedSettings.serviceFeeAmount : 0;
    // 支払額: Math.max なし（負値を許容）。他ポジション過不足金はPost-Processで加算
    const paymentAmount     = finalAmount - withholdingTax - serviceFee + shortageAmount;

    totalBonusAmount += paymentAmount;

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
      otherPositionAmount:       0,   // Post-Processで集計
      otherPositionShortage:     0,   // Post-Processで集計
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
  //     非01ポジションの finalAmount を 01ポジションの otherPositionAmount に集計
  //     非01ポジションの shortageAmount を 01ポジションの otherPositionShortage に集計
  // ────────────────────────────────────────────────────
  onProgress("他ポジション集計中...");

  // baseCode でグループ化（memberCode の枝番を除いた部分）
  const baseCodeMap = new Map<string, typeof results[0][]>();
  for (const r of results) {
    const mc = (memberMap.get(r.mlmMemberId) as any).memberCode as string;
    const baseCode = mc.includes("-") ? mc.replace(/-\d+$/, "") : mc;
    if (!baseCodeMap.has(baseCode)) baseCodeMap.set(baseCode, []);
    baseCodeMap.get(baseCode)!.push(r);
  }

  for (const [, positions] of baseCodeMap) {
    if (positions.length <= 1) continue;
    // 01ポジションを探す（枝番なし or -01 で終わる）
    const pos01 = positions.find((r) => {
      const mc = (memberMap.get(r.mlmMemberId) as any).memberCode as string;
      return mc.endsWith("-01") || !mc.includes("-");
    });
    if (!pos01) continue;
    // 非01ポジションの finalAmount / shortageAmount を集計
    for (const pos of positions) {
      if (pos === pos01) continue;
      pos01.otherPositionAmount   += pos.finalAmount;
      pos01.otherPositionShortage += pos.shortageAmount;
    }
    // 01ポジションの paymentAmount を再計算（otherPositionShortageを加算）
    pos01.paymentAmount =
      pos01.finalAmount - pos01.withholdingTax - pos01.serviceFee
      + pos01.shortageAmount + pos01.otherPositionShortage;
  }

  // ────────────────────────────────────────────────────
  // 9. データベースに保存
  // ────────────────────────────────────────────────────
  onProgress("DBへの保存中... [BonusRun作成]");

  // 同月の既存 BonusRun があれば削除してから再作成（再計算対応）
  // BonusResult は cascade delete されるため別途削除不要
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

  // ────────────────────────────────────────────────────
  // BonusResult を createMany で一括 INSERT
  //
  // ★ 根本方針: f9ba06a（最後の動作確認済みバージョン）と同じ createMany を使用。
  //
  // ❌ 廃止した方式とその理由:
  //   - $transaction（array形式）: PrismaPg Driver Adapter 環境でタイムアウト
  //     オプションが無効になり、デフォルト5秒で全バッチ失敗（PR #57 で導入したバグ）
  //   - Promise.allSettled(30件並列): 接続プール max:5 に対して 30 接続を
  //     同時に奪い合い、デッドロック・タイムアウトが発生（PR #59 でも失敗）
  //
  // ✅ createMany を使う理由:
  //   - 1本の SQL（INSERT INTO ... VALUES (...), (...), ...）で全件を処理
  //   - DB接続を1本しか使わないため接続プール枯渇が起きない
  //   - $transaction のタイムアウト問題と無関係
  //   - f9ba06a で動作確認済みの唯一信頼できる方式
  // ────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────
  // 調整金にbonusRunIdを紐付け
  // ────────────────────────────────────────────────────
  if (adjustments.length > 0) {
    try {
      await prisma.bonusAdjustment.updateMany({
        where: { bonusMonth, bonusRunId: null },
        data:  { bonusRunId: bonusRun.id },
      });
      console.log(`🔗 調整金 ${adjustments.length}件をBonusRunに紐付けました`);
    } catch (e) {
      console.warn("⚠️ 調整金BonusRun紐付け失敗（スキップ）:", e);
    }
  }

  // ────────────────────────────────────────────────────
  // 10. 会員レベル・貯金ポイントを自動更新
  //     Promise.allSettled で並列実行（$transaction を使わない）
  // ────────────────────────────────────────────────────
  onProgress("終月処理中... (会員レベル・貯金ポイント更新)");

  let upgradedCount   = 0;
  let downgradedCount = 0;

  // 更新が必要な会員のみ抽出
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

  // シーケンシャルに update（f9ba06a と同じ方式）
  // $transaction / Promise.allSettled は使わない（接続プール枯渇・タイムアウトのため）
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
  console.log(`   総支払額: ¥${totalBonusAmount.toLocaleString()}`);
  console.log(`   レベルアップ: ${upgradedCount}名 / レベルダウン: ${downgradedCount}名`);

  onProgress(`最終処理完了（レベルアップ: ${upgradedCount}名）`);
  onProgress(`✅ 全処理完了: 対象 ${members.length}名 / アクティブ ${totalActiveMembers}名 / 総支払額 ¥${Math.floor(totalBonusAmount).toLocaleString()}`);

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
 * ・groupPoints  = 自己購入pt + 傘下7段目アクティブ購入ptの合計（非アクティブは圧縮）
 * ・directActiveCount = 直下でアクティブな会員数
 * ・seriesCount = 直下でポジションが存在する系列数（アクティブ/非アクティブ問わず）
 * ・seriesAchieverMap = 各直下系列(インデックス)内の最高達成レベル（7段以内）
 *
 * @param pass1ResultMap Pass1の当月達成レベルマップ。null の場合は currentLevel（DB値）を使用。
 *   LV.2以上の正確な判定には Pass1 結果を渡すこと。
 * @param bonusEligibleMemberIds ボーナス計算対象会員ID（withdrawn除外済み）のセット。
 *   withdrawn会員はツリー走査に含めるが、アクティブ・GP加算の対象外とする。
 */
function calcGroupDataFull(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
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
  const directChildren = childrenMap.get(memberId) || [];

  let groupPoints     = selfPurchasePoints;
  let directActiveCount = 0;
  const seriesAchieverMap: Record<number, number> = {};

  directChildren.forEach((childId, seriesIndex) => {
    const childMember = memberMap.get(childId);
    if (!childMember) return;

    // 退会者は直接系列としてカウントしない（seriesCountに含めない）
    // ただしツリー走査は継続してその傘下の非退会者をGPに含める
    const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);

    if (!childIsWithdrawn) {
      // 非退会者のみ系列としてカウント
      seriesAchieverMap[seriesIndex] = seriesAchieverMap[seriesIndex] ?? 0;

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

      // 達成レベル取得：Pass1結果があれば当月レベル、なければ currentLevel（DB値）
      const childLevel = pass1ResultMap
        ? (pass1ResultMap.get(childId)?.achievedLevel ?? 0)
        : (childMember.currentLevel || 0);

      if (childLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
        seriesAchieverMap[seriesIndex] = childLevel;
      }

      const subResult = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, 1, 7, pass1ResultMap, bonusEligibleMemberIds);
      groupPoints += subResult.groupPoints;

      if (subResult.maxLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
        seriesAchieverMap[seriesIndex] = subResult.maxLevel;
      }
    } else {
      // 退会者の場合: その傘下を圧縮して走査（退会者自身はGP非加算、系列非カウント）
      const subResult = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, 0, 7, pass1ResultMap, bonusEligibleMemberIds);
      groupPoints += subResult.groupPoints;
      // 退会者経由の傘下は系列としてカウントしない（仕様：退会者は組織ツリーから消えている）
    }
  });

  // seriesCount: 退会者を除く直下系列数
  const nonWithdrawnDirectCount = directChildren.filter(id => bonusEligibleMemberIds.has(id)).length;
  return { groupPoints, directActiveCount, seriesCount: nonWithdrawnDirectCount, seriesAchieverMap };
}

/**
 * 下位のグループポイントと最高レベルを再帰計算（圧縮あり）
 * 非アクティブポジションはスキップし下位に潜る（圧縮）
 * 退会者（withdrawn）はGP加算しないが、その下位は引き続き探索する
 *
 * @param currentDepth 現在の深さ（退会者を経由する場合は深さを消費しない）
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
      // 退会者: GP加算なし・レベル0・深さ消費なし → 子孫を同じ深さで探索
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

    // 達成レベル取得：Pass1結果があれば当月レベル、なければ currentLevel（DB値）
    const childLevel = pass1ResultMap
      ? (pass1ResultMap.get(childId)?.achievedLevel ?? 0)
      : (childMember.currentLevel || 0);

    if (childLevel > maxLevel) maxLevel = childLevel;

    const sub = calcSubGroupPoints(childId, childrenMap, purchaseMap, memberMap, currentDepth + 1, maxDepth, pass1ResultMap, bonusEligibleMemberIds);
    groupPoints += sub.groupPoints;
    if (sub.maxLevel > maxLevel) maxLevel = sub.maxLevel;
  }

  return { groupPoints, maxLevel };
}

/**
 * 段数別ポイントを計算（ユニレベルボーナス用）
 * アクティブな下位会員の購入ptを段数ごとに集計
 *
 * ★ Bug #3 Fix: 圧縮ロジックの修正
 *   旧: 非アクティブ会員の子孫を同じ段数で探索（圧縮）→ ¥131,850（過大）
 *   正: 非アクティブ会員は自身をスキップするが深さは消費する（depth+1で子孫探索）
 *       退会者（withdrawn）のみ圧縮扱い（深さ消費なし）
 *
 *   根拠（viola-pure.biz仕様）:
 *     ユニレベルは「ポジションの実際の段数」基準。非アクティブポジションは
 *     ボーナス対象外だが、その子孫の段数カウントは通常通り進む。
 *     VP社長の直下に非アクティブ会員がいても、その子孫は4段目以降に正しく配置される。
 */
function calcDepthPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  achievedLevel: number,
  bonusEligibleMemberIds: Set<bigint>
): Record<number, number> {
  const maxDepth    = getUnilevelMaxDepth(achievedLevel);
  const depthPoints: Record<number, number> = {};

  function traverse(currentId: bigint, depth: number) {
    if (depth > maxDepth) return;

    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      const childMember   = memberMap.get(childId);
      const childPurchase = purchaseMap.get(childId);
      if (!childMember) continue;

      // 退会者は圧縮（深さ消費なし）：退会者は組織から消えているため
      const childIsWithdrawn = !bonusEligibleMemberIds.has(childId);
      if (childIsWithdrawn) {
        traverse(childId, depth); // 退会者を透過して同じ深さで探索
        continue;
      }

      const childIsActive = isActiveMember({
        selfPoints: childPurchase?.selfPurchasePoints ?? 0,
        purchasedRequiredProduct: childPurchase?.purchasedRequiredProduct ?? false,
        forceActive: childMember.forceActive || false,
      });

      if (childIsActive) {
        // アクティブ: 当段数に加算し、次段数へ進む
        depthPoints[depth] = (depthPoints[depth] || 0) + (childPurchase?.selfPurchasePoints ?? 0);
        traverse(childId, depth + 1);
      } else {
        // 非アクティブ: ポイント加算なし、深さを消費して子孫を探索
        // （旧: depth据え置きで圧縮 → 誤り。正: depth+1で子孫の実際の段数を維持）
        traverse(childId, depth + 1);
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
 * 退会者（withdrawn）は透過扱い：その子孫は同じ系列として集計
 */
function calcMinSeriesPoints(
  memberId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, MemberPurchaseData>,
  memberMap: Map<bigint, any>,
  bonusEligibleMemberIds: Set<bigint>
): number {
  const children = childrenMap.get(memberId) || [];
  if (children.length === 0) return 0;

  const seriesPoints: number[] = [];

  for (const childId of children) {
    // 直下が退会者の場合はその系列として計上しない（退会者経由の子孫は直接系列として扱う）
    // ※ viola-pure.biz 仕様: 退会者は組織から消え、子孫が繰り上がる
    let seriesTotal = 0;

    function traverseSeries(currentId: bigint) {
      const purchase = purchaseMap.get(currentId);
      const mem      = memberMap.get(currentId);
      if (!mem) return;

      const isWithdrawn = !bonusEligibleMemberIds.has(currentId);
      if (!isWithdrawn) {
        const isActive = isActiveMember({
          selfPoints: purchase?.selfPurchasePoints ?? 0,
          purchasedRequiredProduct: purchase?.purchasedRequiredProduct ?? false,
          forceActive: mem.forceActive || false,
        });
        if (isActive) seriesTotal += purchase?.selfPurchasePoints ?? 0;
      }

      for (const descId of (childrenMap.get(currentId) || [])) {
        traverseSeries(descId);
      }
    }

    traverseSeries(childId);
    if (seriesTotal >= 1) seriesPoints.push(seriesTotal);
  }

  if (seriesPoints.length === 0) return 0;
  return Math.min(...seriesPoints);
}
