/**
 * ボーナス計算エンジン V1（VIOLA Pure 仕様 2026年版）
 *
 * ━━━ 設計方針 ━━━
 * - 既存エンジン(bonus-calculation-engine.ts)は変更しない
 * - 計算ロジックを一から書き直し、CSVベースで100%検証済み
 * - DBデータをそのまま受け取る形式で動作
 *
 * ━━━ 計算単位 ━━━
 * - 必ず position_id (mlmMemberId) 単位で計算
 * - 82179501 と 82179502 は別ポジション
 * - baseCode統合は表示のみ（計算では行わない）
 *
 * ━━━ ツリー構造 ━━━
 * - uplineChildrenMap: uplineId ベース → GP・UL・SB計算用
 * - childrenMap (referrerId): 紹介者ベース → DAC(直接紹介アクティブ)計算用
 *
 * ━━━ ボーナス種別 ━━━
 * 1. ダイレクトB: 当月商品1000を購入した直紹介人数 × ¥2000
 * 2. ユニレベルB: (selfPt>0 OR forceActive) AND directAct>=2
 *    段別selfPt × 段率 × 100 （非アクティブ透過、退会透過）
 * 3. 組織構築B: ACTIVE AND directAct>=2 AND LV3以上 AND 01ポジション AND 有PT系列3+
 *    最小系列PT × LV率 × 100 （段数制限なし）
 * 4. 貯金B: 支払額に含めない（表示のみ）
 *
 * ━━━ 支払対象 ━━━
 * - directB + ULB + SB >= 3000円のみ
 * - 事務手数料440円控除
 *
 * ━━━ 例外 ━━━
 * - ORG_EXCEPTION_CODES: {"44504701", "89248801"} → SBの有PT系列1以上でOK
 *
 * ━━━ 2パス計算 ━━━
 * - Pass1: 全会員の achievedLevel を先計算（seriesAchieverMap構築用）
 * - Pass2: Pass1の結果を使って最終ボーナス計算
 */

import { prisma } from "./prisma";
import {
  UNILEVEL_RATES,
  UNILEVEL_MAX_DEPTH,
  STRUCTURE_BONUS_RATES,
  LEVEL_GP_RANGES,
  LEVEL_SELF_PT_MIN,
  LEVEL_REQUIRED_SERIES,
  LEVEL_REQUIRED_ACHIEVER,
  ACTIVE_REQUIRED_PRODUCTS,
  DIRECT_BONUS_PRODUCT,
  DIRECT_BONUS_AMOUNT,
  POINT_RATE,
} from "./mlm-bonus";

// ━━━ 定数 ━━━
const MIN_PAYOUT_THRESHOLD = 3000;  // 支払最低金額
const SERVICE_FEE = 440;            // 事務手数料
const WITHHOLDING_THRESHOLD = 120000;
const WITHHOLDING_RATE = 0.1021;

// 組織構築B例外コード（1系列でも対象）
const ORG_EXCEPTION_CODES = new Set(["44504701", "89248801"]);

// ━━━ 型定義 ━━━
type PurchaseData = {
  selfPurchasePoints: number;
  purchasedRequiredProduct: boolean;
  hasProduct1000: boolean;
  autoshipInvoicePoints: number;
  hasAutoshipInvoice: boolean;
};

type MemberData = {
  id: bigint;
  memberCode: string;
  status: string;
  uplineId: bigint | null;
  referrerId: bigint | null;
  currentLevel: number;
  forceActive: boolean;
  forceLevel: number | null;
  companyName?: string | null;
  createdAt: Date;
  savingsPoints: number;
};

type Pass1Result = {
  isActive: boolean;
  achievedLevel: number;
  selfPurchasePoints: number;
  directActiveCount: number;
  groupPoints: number;
  seriesCount: number;
};

// ━━━ ユーティリティ関数 ━━━

/**
 * 01ポジション判定
 * 例: "82179501" → slice(-2) === "01" → true
 * 例: "82179502" → slice(-2) === "02" → false
 * 例: "123456-01" → endsWith("-01") → true
 */
function isFirstPosition(memberCode: string): boolean {
  if (memberCode.includes("-")) return memberCode.endsWith("-01");
  if (memberCode.length >= 8) return memberCode.slice(-2) === "01";
  return true; // 短いコードは01扱い
}

/**
 * アクティブ判定
 * - forceActive=true → 無条件でアクティブ
 * - 退会(withdrawn)/失効(lapsed, forceActive=false) → 非アクティブ
 * - selfPt > 0 かつ required商品購入あり → アクティブ
 */
function isActive(
  status: string,
  selfPt: number,
  purchasedRequiredProduct: boolean,
  forceActive: boolean
): boolean {
  if (forceActive) return true;
  if (status === "withdrawn") return false;
  if (status === "lapsed") return false;
  return purchasedRequiredProduct && selfPt > 0;
}

/**
 * 退会/失効（透過ノード）判定
 * 退会者: ツリー探索でdepth消費なし
 */
function isWithdrawn(
  status: string,
  forceActive: boolean
): boolean {
  if (forceActive) return false; // forceActiveは透過しない
  return status === "withdrawn" || status === "lapsed";
}

// ━━━ ユニレベルB計算 ━━━

/**
 * 段別ポイントを計算（ユニレベルB用）
 * - uplineChildrenMap（uplineIdベース）を使用
 * - アクティブ会員のselfPtを段に積む
 * - 非アクティブ: depth消費なし（透過）
 * - 退会/失効: depth消費なし（透過）
 * - forceActive: アクティブ扱い（ただしselfPt=0の場合はpt加算なし）
 */
function calcDepthPointsV1(
  rootId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>,
  memberMap: Map<bigint, MemberData>,
  achievedLevel: number
): Record<number, number> {
  const maxDepth = UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;
  if (maxDepth === 0) return {};

  const depthPoints: Record<number, number> = {};

  function traverse(currentId: bigint, depth: number): void {
    if (depth > maxDepth) return;

    const children = uplineChildrenMap.get(currentId) || [];
    for (const childId of children) {
      const child = memberMap.get(childId);
      if (!child) continue;

      const childPurchase = purchaseMap.get(childId);
      const childSelfPt = childPurchase?.selfPurchasePoints ?? 0;
      const childForceActive = child.forceActive;
      const childPurchasedRequired = childPurchase?.purchasedRequiredProduct ?? false;

      // 退会/失効（透過ノード）: depth消費なし
      if (isWithdrawn(child.status, childForceActive)) {
        traverse(childId, depth);
        continue;
      }

      const childIsActive = isActive(
        child.status, childSelfPt, childPurchasedRequired, childForceActive
      );

      if (childIsActive) {
        // アクティブ: selfPtを段に加算し、depth+1で再帰
        if (childSelfPt > 0) {
          depthPoints[depth] = (depthPoints[depth] || 0) + childSelfPt;
        }
        traverse(childId, depth + 1);
      } else {
        // 非アクティブ（ステータスは通常だがselfPt=0等）: depth消費なし（透過）
        traverse(childId, depth);
      }
    }
  }

  traverse(rootId, 1);
  return depthPoints;
}

/**
 * ユニレベルB計算
 * 資格: (selfPt > 0 OR forceActive) AND directAct >= 2
 */
function calcUnilevelBonusV1(
  memberId: bigint,
  selfPt: number,
  forceActive: boolean,
  directActiveCount: number,
  achievedLevel: number,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>,
  memberMap: Map<bigint, MemberData>
): { total: number; detail: Record<number, number> } {
  // 資格チェック
  if (directActiveCount < 2) return { total: 0, detail: {} };
  if (selfPt === 0 && !forceActive) return { total: 0, detail: {} };

  const depthPoints = calcDepthPointsV1(
    memberId, uplineChildrenMap, purchaseMap, memberMap, achievedLevel
  );

  const rates = UNILEVEL_RATES[achievedLevel] ?? UNILEVEL_RATES[0];
  const maxDepth = UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;

  let total = 0;
  const detail: Record<number, number> = {};

  for (let d = 1; d <= maxDepth; d++) {
    const pt = depthPoints[d] ?? 0;
    const rate = rates[d - 1] ?? 0;
    if (pt > 0 && rate > 0) {
      const bonus = Math.floor(pt * (rate / 100) * POINT_RATE);
      detail[d] = bonus;
      total += bonus;
    }
  }

  return { total, detail };
}

// ━━━ 組織構築B計算 ━━━

/**
 * 各直下系列のPTを段数無制限で合計
 * - uplineChildrenMap（uplineIdベース）を使用
 * - 退会/失効: 透過（depth消費なし）
 * - forceActive: depth消費あり・pt加算なし（存在するが購入ゼロとして扱う）
 * - アクティブ: selfPtを加算
 * - 非アクティブ: 加算なし（depth消費あり）
 */
function calcSeriesPointsV1(
  rootId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>,
  memberMap: Map<bigint, MemberData>
): { seriesPtList: number[]; minPt: number; seriesCount: number } {
  const directChildren = uplineChildrenMap.get(rootId) || [];
  const seriesPtList: number[] = [];

  for (const childId of directChildren) {
    let seriesTotal = 0;

    function traverseSeries(currentId: bigint): void {
      const mem = memberMap.get(currentId);
      if (!mem) return;

      const purchase = purchaseMap.get(currentId);
      const selfPt = purchase?.selfPurchasePoints ?? 0;
      const forceAct = mem.forceActive;
      const purchasedRequired = purchase?.purchasedRequiredProduct ?? false;

      // 退会/失効（透過ノード）: depth消費なし
      if (isWithdrawn(mem.status, forceAct)) {
        for (const descId of (uplineChildrenMap.get(currentId) || [])) {
          traverseSeries(descId);
        }
        return;
      }

      // forceActive: depth消費あり・pt加算なし
      if (forceAct) {
        for (const descId of (uplineChildrenMap.get(currentId) || [])) {
          traverseSeries(descId);
        }
        return;
      }

      // 通常会員: アクティブならpt加算
      const memberIsActive = isActive(mem.status, selfPt, purchasedRequired, false);
      if (memberIsActive) {
        seriesTotal += selfPt;
      }

      for (const descId of (uplineChildrenMap.get(currentId) || [])) {
        traverseSeries(descId);
      }
    }

    traverseSeries(childId);
    // 0ptの系列も含めて記録（seriesCountは全直下系列ルート数）
    seriesPtList.push(seriesTotal);
  }

  // seriesCount = 直下全系列ルート数（0pt含む）
  const seriesCount = directChildren.length;

  // minPt = 0pt除外した系列の最小値
  const nonZeroPts = seriesPtList.filter(pt => pt > 0);

  if (nonZeroPts.length === 0) {
    return { seriesPtList, minPt: 0, seriesCount };
  }

  return {
    seriesPtList,
    minPt: Math.min(...nonZeroPts),
    seriesCount,
  };
}

/**
 * 組織構築B計算
 * 資格:
 *   - ACTIVE
 *   - directAct >= 2
 *   - achievedLevel >= 3
 *   - 01ポジション
 *   - 有PT系列 >= 3（例外: 1以上）
 */
function calcStructureBonusV1(
  memberCode: string,
  memberIsActive: boolean,
  directActiveCount: number,
  achievedLevel: number,
  rootId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>,
  memberMap: Map<bigint, MemberData>
): { bonus: number; minSeriesPt: number; seriesCount: number; seriesPtList: number[] } {
  const zero = { bonus: 0, minSeriesPt: 0, seriesCount: 0, seriesPtList: [] };

  // 資格チェック
  if (!memberIsActive) return zero;
  if (directActiveCount < 2) return zero;
  if (achievedLevel < 3) return zero;
  if (!isFirstPosition(memberCode)) return zero;

  const { seriesPtList, minPt, seriesCount } = calcSeriesPointsV1(
    rootId, uplineChildrenMap, purchaseMap, memberMap
  );

  const isOrgException = ORG_EXCEPTION_CODES.has(memberCode);
  const minRequiredSeries = isOrgException ? 1 : 3;

  if (seriesCount < minRequiredSeries || minPt === 0) {
    return { bonus: 0, minSeriesPt: minPt, seriesCount, seriesPtList };
  }

  const rate = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
  const bonus = Math.floor(minPt * (rate / 100) * POINT_RATE);

  return { bonus, minSeriesPt: minPt, seriesCount, seriesPtList };
}

// ━━━ グループポイント計算 ━━━

/**
 * グループポイント計算（GP）
 * - uplineChildrenMap を使用（LV達成判定用）
 * - 7段以内のアクティブ会員のselfPtを合計
 * - 退会者: 透過（depth消費なし）
 * - 非アクティブ: depth消費あり、PT加算なし
 */
function calcGroupPointsV1(
  rootId: bigint,
  selfPt: number,
  uplineChildrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>,
  memberMap: Map<bigint, MemberData>
): number {
  let gp = selfPt;

  function traverseGP(currentId: bigint, depth: number): void {
    if (depth > 7) return;
    const children = uplineChildrenMap.get(currentId) || [];
    for (const childId of children) {
      const child = memberMap.get(childId);
      if (!child) continue;
      const childPurchase = purchaseMap.get(childId);
      const childSelfPt = childPurchase?.selfPurchasePoints ?? 0;
      const childForceActive = child.forceActive;
      const childPurchasedRequired = childPurchase?.purchasedRequiredProduct ?? false;

      if (isWithdrawn(child.status, childForceActive)) {
        traverseGP(childId, depth); // 透過
        continue;
      }

      const childIsActive = isActive(
        child.status, childSelfPt, childPurchasedRequired, childForceActive
      );

      if (childIsActive) {
        gp += childSelfPt;
        traverseGP(childId, depth + 1);
      } else {
        traverseGP(childId, depth + 1); // 非アクティブ: depth消費あり
      }
    }
  }

  traverseGP(rootId, 1);
  return gp;
}

/**
 * 直接紹介アクティブ数（DAC）計算
 * - childrenMap（referrerId）を使用
 */
function calcDirectActiveCount(
  rootId: bigint,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>,
  memberMap: Map<bigint, MemberData>
): number {
  const directChildren = childrenMap.get(rootId) || [];
  let count = 0;
  for (const childId of directChildren) {
    const child = memberMap.get(childId);
    if (!child) continue;
    const childPurchase = purchaseMap.get(childId);
    const childSelfPt = childPurchase?.selfPurchasePoints ?? 0;
    const childForceActive = child.forceActive;
    const childPurchasedRequired = childPurchase?.purchasedRequiredProduct ?? false;

    if (isWithdrawn(child.status, childForceActive)) continue;

    const childIsActive = isActive(
      child.status, childSelfPt, childPurchasedRequired, childForceActive
    );
    if (childIsActive) count++;
  }
  return count;
}

// ━━━ レベル達成判定 ━━━

/**
 * seriesAchieverMap構築
 * 各系列（upline直下インデックス）の最高レベルを記録
 * Pass1結果またはcurrentLevelを使用
 */
function buildSeriesAchieverMap(
  rootId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>,
  memberMap: Map<bigint, MemberData>,
  pass1ResultMap: Map<bigint, Pass1Result> | null
): Record<number, number> {
  const directChildren = uplineChildrenMap.get(rootId) || [];
  const seriesAchieverMap: Record<number, number> = {};

  directChildren.forEach((childId, seriesIndex) => {
    const child = memberMap.get(childId);
    if (!child) return;

    if (isWithdrawn(child.status, child.forceActive)) return;

    seriesAchieverMap[seriesIndex] = seriesAchieverMap[seriesIndex] ?? 0;

    const childLevel = pass1ResultMap
      ? (pass1ResultMap.get(childId)?.achievedLevel ?? 0)
      : (child.currentLevel ?? 0);

    if (childLevel > seriesAchieverMap[seriesIndex]) {
      seriesAchieverMap[seriesIndex] = childLevel;
    }

    // 再帰的に系列内の最高レベルを確認
    function findMaxLevel(currentId: bigint, depth: number): void {
      if (depth > 7) return; // GPの7段と同じ深さ
      const children = uplineChildrenMap.get(currentId) || [];
      for (const descId of children) {
        const desc = memberMap.get(descId);
        if (!desc) continue;
        if (isWithdrawn(desc.status, desc.forceActive)) continue;

        const descLevel = pass1ResultMap
          ? (pass1ResultMap.get(descId)?.achievedLevel ?? 0)
          : (desc.currentLevel ?? 0);

        if (descLevel > (seriesAchieverMap[seriesIndex] ?? 0)) {
          seriesAchieverMap[seriesIndex] = descLevel;
        }
        findMaxLevel(descId, depth + 1);
      }
    }
    findMaxLevel(childId, 1);
  });

  return seriesAchieverMap;
}

/**
 * 直下upline系列数（有効系列数）
 * uplineChildrenMap の直下数を返す
 */
function calcSeriesCount(
  rootId: bigint,
  uplineChildrenMap: Map<bigint, bigint[]>
): number {
  return (uplineChildrenMap.get(rootId) || []).length;
}

/**
 * 達成レベルを計算
 * - GPレンジ + selfPt + seriesCount + seriesAchieverMap を総合判定
 * - forceLevel との比較で最終レベルを決定
 */
function calcAchievedLevelV1(
  isActiveFlag: boolean,
  groupPoints: number,
  selfPt: number,
  seriesCount: number,
  seriesAchieverMap: Record<number, number>,
  forceLevel: number | null
): number {
  if (!isActiveFlag) return 0;

  let naturalLevel = 0;

  // LV.5から順に判定
  for (let lv = 5; lv >= 1; lv--) {
    const range = LEVEL_GP_RANGES.find((r) => r.level === lv);
    if (!range) continue;
    const minSelfPt = LEVEL_SELF_PT_MIN[lv] ?? 0;
    const minSeries = LEVEL_REQUIRED_SERIES[lv] ?? 0;
    const requiredAchieverLevel = LEVEL_REQUIRED_ACHIEVER[lv];

    if (groupPoints < range.minGP) continue;
    if (selfPt < minSelfPt) continue;
    if (seriesCount < minSeries) continue;

    if (requiredAchieverLevel !== null) {
      const seriesKeys = Object.keys(seriesAchieverMap).map(Number);
      if (seriesKeys.length < minSeries) continue;
      const qualifiedSeries = seriesKeys.filter(
        (k) => seriesAchieverMap[k] >= requiredAchieverLevel
      );
      if (qualifiedSeries.length < minSeries) continue;
    }

    naturalLevel = lv;
    break;
  }

  // LV.1 最低条件チェック
  if (naturalLevel === 0) {
    if (groupPoints >= 300 && selfPt >= 150 && seriesCount >= 2) {
      naturalLevel = 1;
    }
  }

  // forceLevel との比較
  if (forceLevel !== null && forceLevel !== undefined) {
    return Math.max(naturalLevel, forceLevel);
  }

  return naturalLevel;
}

// ━━━ ダイレクトB計算 ━━━

/**
 * ダイレクトB計算
 * 当月、直紹介（referrerId）が商品1000を購入した人数 × ¥2000
 */
function calcDirectBonusV1(
  rootId: bigint,
  memberIsActive: boolean,
  childrenMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseData>
): number {
  if (!memberIsActive) return 0;
  const directChildren = childrenMap.get(rootId) || [];
  let count = 0;
  for (const childId of directChildren) {
    const childPurchase = purchaseMap.get(childId);
    if (childPurchase?.hasProduct1000) count++;
  }
  return count * DIRECT_BONUS_AMOUNT;
}

// ━━━ 進捗コールバック付きラッパー ━━━

export async function executeBonusCalculationV1WithProgress(
  bonusMonth: string,
  paymentAdjustmentRate: number | null = null,
  onProgress: (step: string) => void = () => {}
): Promise<{
  bonusRunId: bigint;
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
}> {
  return executeBonusCalculationV1(bonusMonth, paymentAdjustmentRate, onProgress);
}

// ━━━ メインエンジン ━━━

/**
 * ボーナス計算エンジン V1 メイン関数
 * @param bonusMonth "YYYY-MM"
 */
export async function executeBonusCalculationV1(
  bonusMonth: string,
  paymentAdjustmentRate: number | null = null,
  onProgress: (step: string) => void = () => {}
): Promise<{
  bonusRunId: bigint;
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
}> {
  console.log(`🚀 [V1] ボーナス計算開始: ${bonusMonth}`);
  onProgress("V1エンジン: ボーナス計算を開始しました");

  // ────────────────────────────────────────────────────
  // Step 0: bonus_results テーブルの不足カラムを自動補完
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
  // Step 1: 設定データ読み込み
  // ────────────────────────────────────────────────────
  onProgress("V1: 設定データ読み込み中...");

  let bonusSettings: { serviceFeeAmount: number; minPayoutAmount: number } | null = null;
  try {
    bonusSettings = await prisma.bonusSettings.findFirst();
  } catch { /* デフォルト値を使用 */ }
  const resolvedSettings = {
    serviceFeeAmount: bonusSettings?.serviceFeeAmount ?? SERVICE_FEE,
    minPayoutAmount: bonusSettings?.minPayoutAmount ?? MIN_PAYOUT_THRESHOLD,
  };

  let savingsConfig: { registrationRate: number; autoshipRate: number; bonusRate: number } | null = null;
  try {
    savingsConfig = await prisma.savingsBonusConfig.findFirst({ orderBy: { id: "desc" } });
  } catch { /* デフォルト値を使用 */ }
  const savingsRegistrationRate = savingsConfig?.registrationRate ?? 20.0;
  const savingsAutoshipRate = savingsConfig?.autoshipRate ?? 5.0;
  const savingsBonusRate = savingsConfig?.bonusRate ?? 3.0;

  // ────────────────────────────────────────────────────
  // Step 2: 全MLM会員を取得
  // ────────────────────────────────────────────────────
  onProgress("V1: 会員データ読み込み中...");

  // ボーナス計算対象会員（退会・失効除く）
  const members = await prisma.mlmMember.findMany({
    where: {
      OR: [
        { status: { in: ["active", "autoship", "suspended"] } },
        { status: "lapsed", forceActive: true },
      ],
    },
    include: { user: { select: { name: true, email: true } } },
  });

  // 組織ツリー用（透過ノード: 退会・失効(forceActive=false)）
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
      conditionAchieved: true, status: true, companyName: true,
      createdAt: true, savingsPoints: true,
    },
  });

  const [bonusMonthYear, bonusMonthMonth] = bonusMonth.split("-").map(Number);

  // 過去に商品1000を購入済みの会員IDセット（貯金B判定用）
  const pastProduct1000Purchases = await prisma.mlmPurchase.findMany({
    where: { productCode: "1000", purchaseMonth: { lt: bonusMonth } },
    select: { mlmMemberId: true },
    distinct: ["mlmMemberId"],
  });
  const hasPastProduct1000 = new Set(
    pastProduct1000Purchases.map((p: { mlmMemberId: bigint }) => p.mlmMemberId.toString())
  );

  // 前月BonusResult（貯金B用）
  const prevMonthTotal = bonusMonthYear * 12 + (bonusMonthMonth - 1) - 1;
  const prevYear = Math.floor(prevMonthTotal / 12);
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
  } catch { /* スキップ */ }

  const prevHadRegistrationA = new Map<string, number>(
    prevBonusResults
      .filter((r) => r.savingsPtAFromRegistration === true)
      .map((r) => [r.mlmMemberId.toString(), r.savingsPointsAdded] as [string, number])
  );

  console.log(`📊 [V1] 対象会員数: ${members.length}名`);
  onProgress(`V1: 会員データロード完了（対象: ${members.length}名）`);

  // ────────────────────────────────────────────────────
  // Step 3: 対象月の購入データを取得
  // ────────────────────────────────────────────────────
  onProgress("V1: 購入データ読み込み中...");

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

  console.log(`💳 [V1] 対象月購入件数: ${purchases.length}件`);
  onProgress(`V1: 売上データロード完了（${purchases.length}件）`);

  // ────────────────────────────────────────────────────
  // Step 4: 会員ごとの購入データを集計
  // ────────────────────────────────────────────────────
  onProgress("V1: 自己購入データ集計中...");

  const purchaseMap = new Map<bigint, PurchaseData>();
  for (const purchase of purchases) {
    const memberId = purchase.mlmMemberId;
    if (!purchaseMap.has(memberId)) {
      purchaseMap.set(memberId, {
        selfPurchasePoints: 0,
        purchasedRequiredProduct: false,
        hasProduct1000: false,
        autoshipInvoicePoints: 0,
        hasAutoshipInvoice: false,
      });
    }
    const data = purchaseMap.get(memberId)!;

    // order_id=NULLの購入はselfPurchasePointsにカウントしない（Orderテーブルと紐付きのある購入のみ有効）
    if (ACTIVE_REQUIRED_PRODUCTS.includes(purchase.productCode) && purchase.order) {
      data.selfPurchasePoints += purchase.totalPoints || 0;
      data.purchasedRequiredProduct = true;
    }
    if (purchase.productCode === DIRECT_BONUS_PRODUCT) {
      data.hasProduct1000 = true;
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

  onProgress("V1: 自己購入データ集計完了");

  // ────────────────────────────────────────────────────
  // Step 5: 組織構造マップを構築
  // ────────────────────────────────────────────────────
  onProgress("V1: 組織データ構築中...");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberMap = new Map<bigint, MemberData>();
  const allMembersForTree = [...members, ...withdrawnMembers];

  for (const m of allMembersForTree) {
    memberMap.set(m.id, {
      id: m.id,
      memberCode: (m as any).memberCode,
      status: m.status,
      uplineId: m.uplineId ?? null,
      referrerId: m.referrerId ?? null,
      currentLevel: (m as any).currentLevel ?? 0,
      forceActive: m.forceActive || false,
      forceLevel: (m as any).forceLevel ?? null,
      companyName: (m as any).companyName ?? null,
      createdAt: (m as any).createdAt,
      savingsPoints: (m as any).savingsPoints ?? 0,
    });
  }

  // uplineIdベースのツリー（GP・UL・SB計算用）
  const uplineChildrenMap = new Map<bigint, bigint[]>();
  for (const m of allMembersForTree) {
    const uplineId = (m as any).uplineId;
    if (uplineId) {
      if (!uplineChildrenMap.has(uplineId)) uplineChildrenMap.set(uplineId, []);
      uplineChildrenMap.get(uplineId)!.push(m.id);
    }
  }

  // referrerIdベースのツリー（DAC計算用）
  const childrenMap = new Map<bigint, bigint[]>();
  for (const m of allMembersForTree) {
    const referrerId = (m as any).referrerId;
    if (referrerId) {
      if (!childrenMap.has(referrerId)) childrenMap.set(referrerId, []);
      childrenMap.get(referrerId)!.push(m.id);
    }
  }

  // ────────────────────────────────────────────────────
  // Step 6: 調整金・繰越金を取得
  // ────────────────────────────────────────────────────
  let adjustments: { mlmMemberId: bigint; amount: number; comment: string | null; adjustmentType: string }[] = [];
  try {
    adjustments = await prisma.bonusAdjustment.findMany({
      where: { bonusMonth },
      select: { mlmMemberId: true, amount: true, comment: true, adjustmentType: true },
    });
  } catch { /* スキップ */ }

  const carryoverMap = new Map<bigint, number>();
  const adjustmentMap = new Map<bigint, { total: number; items: { amount: number; comment: string | null; adjustmentType: string }[] }>();
  for (const adj of adjustments) {
    if (adj.adjustmentType === "carryover") {
      carryoverMap.set(adj.mlmMemberId, (carryoverMap.get(adj.mlmMemberId) ?? 0) + adj.amount);
    } else {
      if (!adjustmentMap.has(adj.mlmMemberId)) adjustmentMap.set(adj.mlmMemberId, { total: 0, items: [] });
      const entry = adjustmentMap.get(adj.mlmMemberId)!;
      entry.total += adj.amount;
      entry.items.push({ amount: adj.amount, comment: adj.comment ?? null, adjustmentType: adj.adjustmentType });
    }
  }

  // 過不足金（前月BonusRun）
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
  } catch { /* スキップ */ }

  onProgress(`V1: 組織データ構築完了 / 調整金 ${adjustments.length}件`);

  // ────────────────────────────────────────────────────
  // Step 7: Pass 1 - 全会員の「当月達成レベル」を先計算
  // ────────────────────────────────────────────────────
  onProgress("V1: Pass1 - アクティブ判定・レベル計算中...");

  const pass1ResultMap = new Map<bigint, Pass1Result>();

  for (const member of members) {
    const m = memberMap.get(member.id)!;
    const purchaseData = purchaseMap.get(member.id);
    const selfPt = purchaseData?.selfPurchasePoints ?? 0;
    const purchasedRequired = purchaseData?.purchasedRequiredProduct ?? false;

    const memberIsActive = isActive(m.status, selfPt, purchasedRequired, m.forceActive);

    const groupPoints = calcGroupPointsV1(
      member.id, selfPt, uplineChildrenMap, purchaseMap, memberMap
    );

    const directActiveCount = calcDirectActiveCount(
      member.id, childrenMap, purchaseMap, memberMap
    );

    const seriesCount = calcSeriesCount(member.id, uplineChildrenMap);
    const seriesAchieverMap = buildSeriesAchieverMap(
      member.id, uplineChildrenMap, memberMap, null // Pass1ではcurrentLevelを使用
    );

    const achievedLevel = calcAchievedLevelV1(
      memberIsActive, groupPoints, selfPt, seriesCount, seriesAchieverMap, m.forceLevel
    );

    pass1ResultMap.set(member.id, {
      isActive: memberIsActive,
      achievedLevel,
      selfPurchasePoints: selfPt,
      directActiveCount,
      groupPoints,
      seriesCount,
    });
  }

  // ────────────────────────────────────────────────────
  // Step 8: Pass 2 - 最終ボーナス計算
  // ────────────────────────────────────────────────────
  onProgress("V1: Pass2 - ボーナス計算中...");

  // デバッグ対象
  const DEBUG_CODES = new Set(["82179501", "44504701", "86820601", "93713601", "89248801"]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  let totalActiveMembers = 0;
  let totalBonusAmount = 0;

  for (const member of members) {
    const m = memberMap.get(member.id)!;
    const memberCodeStr = m.memberCode;
    const isDebug = DEBUG_CODES.has(memberCodeStr);

    const purchaseData = purchaseMap.get(member.id);
    const selfPt = purchaseData?.selfPurchasePoints ?? 0;
    const purchasedRequired = purchaseData?.purchasedRequiredProduct ?? false;

    const memberIsActive = isActive(m.status, selfPt, purchasedRequired, m.forceActive);
    if (memberIsActive) totalActiveMembers++;

    // Pass2: Pass1結果を使って seriesAchieverMap を再構築
    const groupPoints = calcGroupPointsV1(
      member.id, selfPt, uplineChildrenMap, purchaseMap, memberMap
    );

    const directActiveCount = calcDirectActiveCount(
      member.id, childrenMap, purchaseMap, memberMap
    );

    const seriesCount = calcSeriesCount(member.id, uplineChildrenMap);
    const seriesAchieverMap = buildSeriesAchieverMap(
      member.id, uplineChildrenMap, memberMap, pass1ResultMap // Pass2: Pass1結果を使用
    );

    const achievedLevel = calcAchievedLevelV1(
      memberIsActive, groupPoints, selfPt, seriesCount, seriesAchieverMap, m.forceLevel
    );

    // 称号レベル（降格なし）
    const previousTitleLevel = m.currentLevel || 0;
    const newTitleLevel = memberIsActive ? Math.max(previousTitleLevel, achievedLevel) : 0;

    const isFirstPos = isFirstPosition(memberCodeStr);

    // ━━━ ①ダイレクトB ━━━
    const directBonus = calcDirectBonusV1(
      member.id, memberIsActive, childrenMap, purchaseMap
    );

    // ━━━ ②ユニレベルB ━━━
    const unilevelResult = calcUnilevelBonusV1(
      member.id, selfPt, m.forceActive, directActiveCount, achievedLevel,
      uplineChildrenMap, purchaseMap, memberMap
    );

    // ━━━ ③組織構築B ━━━
    const structureResult = calcStructureBonusV1(
      memberCodeStr, memberIsActive, directActiveCount, achievedLevel,
      member.id, uplineChildrenMap, purchaseMap, memberMap
    );
    const structureBonus = structureResult.bonus;
    const minSeriesPoints = structureResult.minSeriesPt;
    const orgPositiveSeriesCount = structureResult.seriesCount;

    // ━━━ ④貯金B（SAVpt）━━━
    let savingsPointsAdded = 0;
    let savingsPtAFromRegistration = false;
    const memberStatus = m.status;
    const memberIdStr = member.id.toString();

    const memberCreatedAt: Date = (member as any).createdAt;
    const createdAtJST = new Date(memberCreatedAt.getTime() + 9 * 60 * 60 * 1000);
    const createdMonthStr = `${createdAtJST.getUTCFullYear()}-${String(createdAtJST.getUTCMonth() + 1).padStart(2, "0")}`;
    const isRegistrationMonth = createdMonthStr === bonusMonth;

    let prevAConsumptionPt = 0;
    if (prevHadRegistrationA.has(memberIdStr) && memberStatus !== "autoship") {
      prevAConsumptionPt = prevHadRegistrationA.get(memberIdStr) ?? 0;
    }

    // A: 初回登録月・仮付与
    if (isFirstPos && isRegistrationMonth && !hasPastProduct1000.has(memberIdStr)) {
      if (selfPt > 0) {
        const ptA = Math.floor(selfPt * (savingsRegistrationRate / 100) * 10) / 10;
        savingsPointsAdded += ptA;
        savingsPtAFromRegistration = true;
      }
    }

    // B: AS購入PT × 5%
    if (isFirstPos && memberIsActive && (purchaseData?.hasAutoshipInvoice ?? false) && (purchaseData?.autoshipInvoicePoints ?? 0) > 0) {
      const ptB = Math.floor((purchaseData!.autoshipInvoicePoints) * (savingsAutoshipRate / 100) * 10) / 10;
      savingsPointsAdded += ptB;
    }

    // C: 01番の獲得ポイント × 3%
    if (isFirstPos && memberIsActive) {
      const earnedTotalYen = directBonus + unilevelResult.total + structureBonus;
      const earnedTotalPt = Math.floor(earnedTotalYen / POINT_RATE);
      if (earnedTotalPt > 0) {
        const ptC = Math.floor(earnedTotalPt * (savingsBonusRate / 100) * 10) / 10;
        savingsPointsAdded += ptC;
      }
    }

    savingsPointsAdded = Math.floor(savingsPointsAdded * 10) / 10;

    // 貯金ポイント累計
    const previousSavingsPoints = (m.savingsPoints || 0) / 10;
    let newSavingsPoints: number;
    if (isFirstPos && memberIsActive) {
      if (isRegistrationMonth && savingsPtAFromRegistration) {
        newSavingsPoints = Math.floor((previousSavingsPoints + savingsPointsAdded) * 10) / 10;
      } else if (memberStatus === "autoship") {
        const prevAConsumptionReal = prevAConsumptionPt / 10;
        newSavingsPoints = Math.max(0, Math.floor((previousSavingsPoints - prevAConsumptionReal + savingsPointsAdded) * 10) / 10);
      } else {
        newSavingsPoints = Math.floor((previousSavingsPoints + savingsPointsAdded) * 10) / 10;
      }
    } else {
      newSavingsPoints = previousSavingsPoints;
    }

    // ━━━ ⑤合計ボーナス・支払い計算 ━━━
    const rankUpBonus = 0;
    const shareBonus = 0;
    const carryoverAmount = carryoverMap.get(member.id) ?? 0;
    const adjEntry = adjustmentMap.get(member.id);
    const adjustmentAmount = adjEntry ? adjEntry.total : 0;

    // 控除前取得額 = directB + ULB + SB + 繰越 + 調整
    const amountBeforeAdjustment =
      directBonus + unilevelResult.total + rankUpBonus + shareBonus
      + structureBonus + carryoverAmount + adjustmentAmount;

    // 支払調整
    const paymentAdjustmentAmount =
      paymentAdjustmentRate !== null ? Math.floor(amountBeforeAdjustment / 1.1 * paymentAdjustmentRate) : 0;
    const finalAmount = amountBeforeAdjustment - paymentAdjustmentAmount;

    const consumptionTax = Math.floor(finalAmount / 11);
    const isCompany = !!m.companyName;
    let withholdingTax = 0;
    if (!isCompany && finalAmount > WITHHOLDING_THRESHOLD) {
      withholdingTax = Math.floor((finalAmount - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE);
    }

    const shortageAmount = shortageMap.get(member.id) ?? 0;

    // 支払対象判定: 控除前取得額 >= 3,000円（01ポジションのみ最終的にカウント）
    const isPayTarget = amountBeforeAdjustment >= resolvedSettings.minPayoutAmount;
    const serviceFee = isPayTarget ? resolvedSettings.serviceFeeAmount : 0;
    const paymentAmount = isPayTarget
      ? finalAmount - withholdingTax - serviceFee + shortageAmount
      : 0 + shortageAmount;

    totalBonusAmount += paymentAmount;

    // デバッグ出力
    if (isDebug) {
      console.log(`\n  ════════ [V1-DEBUG] ${memberCodeStr} ════════`);
      console.log(`  selfPt=${selfPt} groupPt=${groupPoints} active=${memberIsActive} forceActive=${m.forceActive}`);
      console.log(`  directAct=${directActiveCount} seriesCount=${seriesCount} level=${achievedLevel} forceLevel=${m.forceLevel ?? "N/A"}`);
      const dp = calcDepthPointsV1(member.id, uplineChildrenMap, purchaseMap, memberMap, achievedLevel);
      console.log(`  depthPoints=${JSON.stringify(dp)}`);
      console.log(`  ULB=¥${unilevelResult.total} detail=${JSON.stringify(unilevelResult.detail)}`);
      console.log(`  SB=¥${structureBonus} minSeriesPt=${minSeriesPoints} seriesPtList=${JSON.stringify(structureResult.seriesPtList)}`);
      console.log(`  amountBeforeAdjustment=¥${amountBeforeAdjustment}`);
      console.log(`  paymentAmount=¥${paymentAmount}`);
      console.log(`  ════════════════════════════════`);
    }

    if (memberIsActive) {
      console.log(`  👤 [V1] ${memberCodeStr}: level=${achievedLevel} selfPt=${selfPt} dac=${directActiveCount} UL=¥${unilevelResult.total} SB=¥${structureBonus} DB=¥${directBonus}`);
    }

    results.push({
      mlmMemberId: member.id,
      bonusMonth,
      isActive: memberIsActive,
      selfPurchasePoints: selfPt,
      groupPoints,
      directActiveCount,
      achievedLevel,
      forcedLevel: m.forceLevel ?? 0,
      previousTitleLevel,
      newTitleLevel,
      directBonus,
      unilevelBonus: unilevelResult.total,
      rankUpBonus,
      shareBonus,
      structureBonus,
      savingsBonusYen: 0,
      carryoverAmount,
      adjustmentAmount,
      amountBeforeAdjustment,
      paymentAdjustmentRate: paymentAdjustmentRate != null ? paymentAdjustmentRate * 100 : 0,
      paymentAdjustmentAmount,
      finalAmount,
      consumptionTax,
      withholdingTax,
      serviceFee,
      shortageAmount,
      otherPositionAmount: 0,
      otherPositionShortage: 0,
      paymentAmount,
      unilevelDetail: unilevelResult.detail,
      savingsPointsAdded: Math.min(2147483647, Math.max(0, Math.round(savingsPointsAdded * 10))),
      savingsPoints: Math.min(2147483647, Math.max(0, Math.round(newSavingsPoints * 10))),
      savingsPtAFromRegistration,
      minLinePoints: minSeriesPoints,
      lineCount: seriesCount,
    });
  }

  onProgress(`V1: ボーナス計算完了（対象: ${members.length}名 / アクティブ: ${totalActiveMembers}名）`);

  // ────────────────────────────────────────────────────
  // Step 8b: 他ポジション集計
  // 非01ポジションの finalAmount を 01ポジションに合算
  // ────────────────────────────────────────────────────
  onProgress("V1: 他ポジション集計中...");

  const baseCodeMap = new Map<string, typeof results[0][]>();
  for (const r of results) {
    const mc = memberMap.get(r.mlmMemberId)!.memberCode;
    // baseCode: ハイフン付き → ハイフン前、ハイフンなし8桁 → 先頭6桁
    const baseCode = mc.includes("-")
      ? mc.replace(/-\d+$/, "")
      : mc.length >= 8 ? mc.slice(0, 6) : mc;
    if (!baseCodeMap.has(baseCode)) baseCodeMap.set(baseCode, []);
    baseCodeMap.get(baseCode)!.push(r);
  }

  for (const [, positions] of baseCodeMap) {
    if (positions.length <= 1) continue;
    const pos01 = positions.find((r) => {
      const mc = memberMap.get(r.mlmMemberId)!.memberCode;
      return isFirstPosition(mc);
    });
    if (!pos01) continue;

    for (const pos of positions) {
      if (pos === pos01) continue;
      pos01.unilevelBonus += pos.unilevelBonus;
      pos01.otherPositionAmount += pos.finalAmount;
      pos01.otherPositionShortage += pos.shortageAmount;
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

    const isCompany01 = !!memberMap.get(pos01.mlmMemberId)?.companyName;
    pos01.withholdingTax = (!isCompany01 && pos01.finalAmount > WITHHOLDING_THRESHOLD)
      ? Math.floor((pos01.finalAmount - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE) : 0;

    const isPayTarget01 = pos01.amountBeforeAdjustment >= resolvedSettings.minPayoutAmount;
    pos01.serviceFee = isPayTarget01 ? resolvedSettings.serviceFeeAmount : 0;
    pos01.paymentAmount = isPayTarget01
      ? pos01.finalAmount - pos01.withholdingTax - pos01.serviceFee
        + pos01.shortageAmount + pos01.otherPositionShortage
      : 0 + pos01.shortageAmount + pos01.otherPositionShortage;
  }

  // 支払対象者数（01ポジションのみ）
  const payTargetCount = results.filter((r) => {
    const mc = memberMap.get(r.mlmMemberId)!.memberCode;
    return isFirstPosition(mc) && r.amountBeforeAdjustment >= resolvedSettings.minPayoutAmount;
  }).length;
  console.log(`💰 [V1] 支払対象者数: ${payTargetCount}名（控除前≥¥${resolvedSettings.minPayoutAmount}、01ポジションのみ）`);

  // ────────────────────────────────────────────────────
  // Step 9: データベースに保存
  // ────────────────────────────────────────────────────
  onProgress("V1: DBへの保存中... [BonusRun作成]");

  // 既存 BonusRun を削除してから再作成
  const existingRun = await prisma.bonusRun.findFirst({ where: { bonusMonth } });
  if (existingRun) {
    await prisma.bonusRun.delete({ where: { id: existingRun.id } });
    console.log(`🗑️ [V1] 既存BonusRun削除: ${bonusMonth} (id=${existingRun.id})`);
    onProgress(`V1: 既存の計算結果を削除して再計算します`);
  }

  const bonusRun = await prisma.bonusRun.create({
    data: {
      bonusMonth,
      closingDate: new Date(),
      status: "draft",
      paymentAdjustmentRate: paymentAdjustmentRate != null ? paymentAdjustmentRate * 100 : 0,
      totalMembers: members.length,
      totalActiveMembers,
      totalBonusAmount: Math.floor(totalBonusAmount),
      capAdjustmentAmount: 0,
    },
  });

  onProgress(`V1: BonusRun作成完了 (ID: ${bonusRun.id}) / BonusResult書き込み開始 [${results.length}件]`);

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
      rankUpBonus: r.rankUpBonus,
      shareBonus: r.shareBonus,
      structureBonus: r.structureBonus,
      carryoverAmount: r.carryoverAmount,
      adjustmentAmount: r.adjustmentAmount,
      amountBeforeAdjustment: r.amountBeforeAdjustment,
      paymentAdjustmentRate: r.paymentAdjustmentRate,
      paymentAdjustmentAmount: r.paymentAdjustmentAmount,
      finalAmount: r.finalAmount,
      consumptionTax: r.consumptionTax,
      withholdingTax: r.withholdingTax,
      serviceFee: r.serviceFee,
      shortageAmount: r.shortageAmount,
      otherPositionAmount: r.otherPositionAmount,
      otherPositionShortage: r.otherPositionShortage,
      paymentAmount: r.paymentAmount,
      unilevelDetail: r.unilevelDetail,
      minLinePoints: r.minLinePoints,
      lineCount: r.lineCount,
      savingsPointsAdded: r.savingsPointsAdded,
      savingsPoints: r.savingsPoints,
      savingsPtAFromRegistration: r.savingsPtAFromRegistration,
    })),
  });

  console.log(`✅ [V1] BonusResult保存完了: ${results.length}件`);
  onProgress(`V1: DB書き込み処理完了 (${results.length}件保存)`);

  // 調整金にbonusRunIdを紐付け
  if (adjustments.length > 0) {
    try {
      await prisma.bonusAdjustment.updateMany({
        where: { bonusMonth, bonusRunId: null },
        data: { bonusRunId: bonusRun.id },
      });
    } catch { /* スキップ */ }
  }

  // ────────────────────────────────────────────────────
  // Step 10: 会員レベル・貯金ポイントを更新
  // ────────────────────────────────────────────────────
  onProgress("V1: 終月処理中... (会員レベル・貯金ポイント更新)");

  let upgradedCount = 0, downgradedCount = 0;
  const memberUpdates: Array<{ id: bigint; data: Record<string, unknown> }> = [];
  for (const result of results) {
    const m = memberMap.get(result.mlmMemberId);
    if (!m) continue;

    const oldLevel = m.currentLevel || 0;
    const newLevel = result.newTitleLevel;
    const updateData: Record<string, unknown> = {};

    if (newLevel !== oldLevel) {
      updateData.currentLevel = newLevel;
      if (newLevel > oldLevel) upgradedCount++;
      else downgradedCount++;
    }

    const isFirstPos = isFirstPosition(m.memberCode);
    if (isFirstPos) {
      updateData.savingsPoints = result.savingsPoints;
    }

    if (Object.keys(updateData).length > 0) {
      memberUpdates.push({ id: result.mlmMemberId, data: updateData });
    }
  }

  for (const u of memberUpdates) {
    await prisma.mlmMember.update({ where: { id: u.id }, data: u.data });
  }

  console.log(`✅ [V1] ボーナス計算完了: ${bonusMonth}`);
  console.log(`   対象会員: ${members.length}名`);
  console.log(`   アクティブ: ${totalActiveMembers}名`);
  console.log(`   支払対象: ${payTargetCount}名`);
  console.log(`   総支払額: ¥${totalBonusAmount.toLocaleString()}`);
  console.log(`   レベルアップ: ${upgradedCount}名 / レベルダウン: ${downgradedCount}名`);

  onProgress(`V1: 最終処理完了（レベルアップ: ${upgradedCount}名）`);
  onProgress(`✅ [V1] 全処理完了: 対象 ${members.length}名 / アクティブ ${totalActiveMembers}名 / 支払対象 ${payTargetCount}名 / 総支払額 ¥${Math.floor(totalBonusAmount).toLocaleString()}`);

  return {
    bonusRunId: bonusRun.id,
    totalMembers: members.length,
    totalActiveMembers,
    totalBonusAmount: Math.floor(totalBonusAmount),
  };
}
