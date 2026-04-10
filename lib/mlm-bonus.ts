/**
 * MLMボーナス計算ロジック（CLAIR仕様）
 * 仕様書: CLAIRホールディングス株式会社 システム仕様書 2026/3/4版
 */

export const POINT_RATE = 100; // 1pt = 100円

// アクティブ判定に必要な最低購入pt
export const ACTIVE_MIN_POINTS = 150;

// アクティブ判定に必要な商品コード（スミサイ系）
export const ACTIVE_REQUIRED_PRODUCTS = ["1000", "2000"];

// ダイレクトボーナス対象商品コード
export const DIRECT_BONUS_PRODUCT = "s1000";
export const DIRECT_BONUS_AMOUNT = 2000; // 円/個

// ━━━ レベル達成条件（翠彩流通個数範囲）2026年3月4日版 ━━━
export const LEVEL_ITEM_RANGES = [
  { level: 0, min: 0,    max: 1 },
  { level: 1, min: 2,    max: 30 },
  { level: 2, min: 31,   max: 100 },
  { level: 3, min: 101,  max: 300 },
  { level: 4, min: 301,  max: 1000 },
  { level: 5, min: 1001, max: Infinity },
];

// ━━━ ユニレベルボーナス獲得段数制限 ━━━
// LV.1: 3段目まで、LV.2: 5段目まで、LV.3+: 7段目まで
export const UNILEVEL_MAX_DEPTH: Record<number, number> = {
  0: 0, // レベルなし → 獲得なし
  1: 3, // LV.1 → 3段目まで
  2: 5, // LV.2 → 5段目まで
  3: 7, // LV.3 → 7段目まで
  4: 7, // LV.4 → 7段目まで
  5: 7, // LV.5 → 7段目まで
};

// ━━━ ユニレベルボーナス算出率テーブル（レベル別）2026年3月4日版 ━━━
// スクリーンショット2枚目の表に基づく
export const UNILEVEL_RATES: Record<number, number[]> = {
  0: [0, 0, 0, 0, 0, 0, 0],       // レベルなし
  1: [15, 7, 3, 0, 0, 0, 0],      // LV.1 → 3段目まで
  2: [15, 7, 3, 1, 1, 0, 0],      // LV.2 → 5段目まで（実際の表の値）
  3: [15, 8, 5, 4, 2, 1, 1],      // LV.3 → 7段目まで（実際の表の値）
  4: [15, 9, 6, 5, 3, 2, 1],      // LV.4 → 7段目まで（実際の表の値）
  5: [15, 10, 7, 6, 4, 3, 2],     // LV.5 → 7段目まで（実際の表の値）
};

// ━━━ 組織構築ボーナス率（LV.3以上、01ポジションのみ） ━━━
export const STRUCTURE_BONUS_RATES: Record<number, number> = {
  3: 3,   // 3%
  4: 3.5, // 3.5%
  5: 4,   // 4%
};

// ━━━ 貯金ボーナス加算率 ━━━
export const SAVINGS_BONUS_RATE = 0.20; // s商品購入時: 自己購入ptの20%
export const AS_SAVINGS_RATE = 0.05;    // オートシップ伝票合計ptの5%

/**
 * 翠彩流通個数からレベルを計算（2026年3月4日版）
 * @param itemCount 7段目以内の総pt（翠彩流通個数）
 */
export function calcLevelFromItemCount(itemCount: number): number {
  for (let i = LEVEL_ITEM_RANGES.length - 1; i >= 0; i--) {
    if (itemCount >= LEVEL_ITEM_RANGES[i].min) {
      return LEVEL_ITEM_RANGES[i].level;
    }
  }
  return 0;
}

/**
 * @deprecated 旧仕様（グループポイントベース）→ 新仕様は翠彩流通個数ベース
 */
export function calcLevelFromGP(gp: number): number {
  // 後方互換性のため残す（1pt=1個として換算）
  return calcLevelFromItemCount(Math.floor(gp / 150));
}

/**
 * アクティブ判定
 * ①契約締結日が当月末まで ②ビジネス会員 ③当月150pt以上 ④商品1000or2000を1個以上
 */
export function isActiveMember(params: {
  contractDate: Date | null;
  memberType: string;
  selfPoints: number;
  purchasedRequiredProduct: boolean;
  forceActive: boolean;
  targetMonth: string; // "YYYY-MM"
}): boolean {
  if (params.forceActive) return true;
  if (!params.contractDate) return false;
  if (params.memberType !== "business") return false;

  // ①契約締結日が対象月末まで
  const [y, m] = params.targetMonth.split("-").map(Number);
  const monthEnd = new Date(y, m, 0); // 月末日
  if (params.contractDate > monthEnd) return false;

  // ③150pt以上
  if (params.selfPoints < ACTIVE_MIN_POINTS) return false;

  // ④スミサイ購入あり
  if (!params.purchasedRequiredProduct) return false;

  return true;
}

/**
 * 商品コードがポイント付与対象かどうかを判定する
 * ポイント付与対象: 商品コードが数字のみで構成され、1000〜2999の範囲
 * ポイント付与対象外: s1000（登録料）等、範囲外のコード
 *
 * @param productCode 商品コード（例: "1000", "2000", "s1000"）
 * @returns ポイント付与対象の場合 true
 */
export function isPointGrantTarget(productCode: string): boolean {
  const codeNum = parseInt(productCode, 10)
  // 数字のみ && 1000〜2999の範囲
  if (isNaN(codeNum)) return false
  return codeNum >= 1000 && codeNum <= 2999
}

/**
 * ユニレベルボーナス算出率を取得（段数ごと）
 * 2026年3月4日版: レベル別に獲得段数が異なる
 * 直接紹介2人以上が購入していることが条件
 */
export function getUnilevelRates(
  achievedLevel: number,
  directActiveCount: number
): number[] {
  // 直接紹介2人以上が購入していない場合は獲得なし
  if (directActiveCount < 2) return UNILEVEL_RATES[0];
  
  return UNILEVEL_RATES[achievedLevel] ?? UNILEVEL_RATES[0];
}

/**
 * ユニレベルボーナス獲得可能な最大段数を取得
 */
export function getUnilevelMaxDepth(achievedLevel: number): number {
  return UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;
}

/**
 * ユニレベルボーナス計算（1段ごとのポイント × 算出率 × ポイントレート）
 * 2026年3月4日版: レベル別に獲得段数制限あり
 * 非アクティブポジションは圧縮（スキップ）される前提でptが渡される
 * @param depthPoints { 1: pt, 2: pt, ... }
 * @param achievedLevel 当月実績レベル
 * @param directActiveCount 直接紹介アクティブ数
 */
export function calcUnilevelBonus(
  depthPoints: Record<number, number>,
  achievedLevel: number,
  directActiveCount: number
): { total: number; detail: Record<number, number> } {
  const rates = getUnilevelRates(achievedLevel, directActiveCount);
  const maxDepth = getUnilevelMaxDepth(achievedLevel);
  let total = 0;
  const detail: Record<number, number> = {};

  // レベル別の獲得段数まで計算
  for (let depth = 1; depth <= maxDepth; depth++) {
    const pt = depthPoints[depth] ?? 0;
    const rate = rates[depth - 1] ?? 0;
    if (rate > 0 && pt > 0) {
      const bonus = Math.floor(pt * (rate / 100) * POINT_RATE);
      detail[depth] = bonus;
      total += bonus;
    }
  }
  return { total, detail };
}

/**
 * 組織構築ボーナス計算
 * LV.3以上かつ01ポジションのみ対象
 * 最小系列のポイント × 算出率 × ポイントレート
 */
export function calcStructureBonus(
  achievedLevel: number,
  minSeriesPoints: number,
  isFirstPosition: boolean
): number {
  if (!isFirstPosition) return 0;
  if (achievedLevel < 3) return 0;

  const rate = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
  return Math.floor(minSeriesPoints * (rate / 100) * POINT_RATE);
}

/**
 * 称号レベル更新
 * 新しい称号レベル = max(現在の称号レベル, 当月実績レベル)
 * ただし非アクティブ（失効後）はリセット
 */
export function calcNewTitleLevel(
  currentTitleLevel: number,
  achievedLevel: number,
  isActive: boolean
): number {
  if (!isActive) return 0; // 非アクティブは称号消滅
  return Math.max(currentTitleLevel, achievedLevel);
}

/**
 * レベル達成条件チェック（2026年3月4日版）
 * ① 当月アクティブ
 * ② 翠彩流通個数が条件範囲内
 * ③ 各レベル条件達成（LV.3以降は毎月条件達成が必要）
 * 
 * レベル別条件:
 * - LV.1: 系列2, 自己購入1個以上
 * - LV.2: 系列2, 自己購入1個以上, LV.1達成者各系列1名以上
 * - LV.3: 系列3, 自己購入2個以上, LV.1達成者各系列1名以上, 最小系列売上%付与3%
 * - LV.4: 系列3, 自己購入3個以上, LV.2達成者各系列1名以上, 最小系列売上%付与3.5%
 * - LV.5: 系列3, 自己購入3個以上, LV.3達成者各系列1名以上, 最小系列売上%付与4%
 */
export function checkLevelCondition(params: {
  level: number;
  isActive: boolean;
  seriesCount: number;
  selfPurchaseCount: number;
  seriesLevelAchievers: Record<number, number>; // { 1: count, 2: count, ... }
}): boolean {
  const { level, isActive, seriesCount, selfPurchaseCount, seriesLevelAchievers } = params;
  
  if (!isActive) return false;

  switch (level) {
    case 1:
      return seriesCount >= 2 && selfPurchaseCount >= 1;
    
    case 2:
      return seriesCount >= 2 && 
             selfPurchaseCount >= 1 && 
             (seriesLevelAchievers[1] ?? 0) >= 1;
    
    case 3:
      return seriesCount >= 3 && 
             selfPurchaseCount >= 2 && 
             (seriesLevelAchievers[1] ?? 0) >= 1;
    
    case 4:
      return seriesCount >= 3 && 
             selfPurchaseCount >= 3 && 
             (seriesLevelAchievers[2] ?? 0) >= 1;
    
    case 5:
      return seriesCount >= 3 && 
             selfPurchaseCount >= 3 && 
             (seriesLevelAchievers[3] ?? 0) >= 1;
    
    default:
      return false;
  }
}

/**
 * 連続非購入判定（スミサイ: コード1000, 1001, 1002, 2000）
 * 4ヶ月: 失効予定（5ヶ月目） → blue highlight
 * 5ヶ月: 失効予定（6ヶ月目） → red highlight
 */
export type NonPurchaseAlert = "none" | "warn_4" | "danger_5";

export function getNonPurchaseAlert(consecutiveMonths: number): NonPurchaseAlert {
  if (consecutiveMonths >= 5) return "danger_5";
  if (consecutiveMonths >= 4) return "warn_4";
  return "none";
}

export const NON_PURCHASE_ALERT_STYLES: Record<NonPurchaseAlert, {
  bg: string; text: string; border: string; label: string;
}> = {
  none:     { bg: "bg-white",     text: "text-slate-800", border: "border-slate-200", label: "" },
  warn_4:   { bg: "bg-white",     text: "text-blue-700",  border: "border-blue-300",  label: "失効予定（5ヶ月目）" },
  danger_5: { bg: "bg-red-500",   text: "text-white",     border: "border-red-600",   label: "失効予定（6ヶ月目）" },
};

/**
 * レベル表示名
 */
export const LEVEL_LABELS: Record<number, string> = {
  0: "レベルなし",
  1: "LV.1",
  2: "LV.2",
  3: "LV.3",
  4: "LV.4",
  5: "LV.5",
};

/**
 * 会員タイプ表示
 */
export const MEMBER_TYPE_LABELS: Record<string, string> = {
  business:  "ビジネス会員",
  preferred: "愛用会員",
};

/**
 * 商品マスタ（仕様書準拠）
 */
export const MLM_PRODUCTS = [
  { code: "s1000", name: "登録料",                                    price: 3300,  points: 150 },
  { code: "1000",  name: "[新規]VIOLA Pure 翠彩-SUMISAI-",             price: 16500, points: 0   },
  { code: "1001",  name: "【使用不可】[翌月分]VIOLA Pure 翠彩-SUMISAI-", price: 16500, points: 0   },
  { code: "1002",  name: "[新規・追加分]VIOLA Pure 翠彩-SUMISAI-",      price: 16500, points: 150 },
  { code: "1999",  name: "アクティブポイント",                           price: 0,     points: 150 },
  { code: "2000",  name: "VIOLA Pure 翠彩-SUMISAI-",                   price: 16500, points: 150 },
  { code: "4000",  name: "出荷事務手数料",                               price: 880,   points: 0   },
];

/**
 * 貯金ボーナス（SAVpt）計算 - 登録時
 * s商品（登録料）購入時に自己購入ptの20%を貯金ポイントとして付与
 * 
 * @param registrationPoints 登録時の自己購入ポイント（s1000）
 * @param registrationRate 登録時貯金ボーナス率（デフォルト20%）
 * @returns 貯金ポイント（SAVpt）
 */
export function calcRegistrationSavingsBonus(
  registrationPoints: number,
  registrationRate: number = 20.0
): number {
  return Math.floor(registrationPoints * (registrationRate / 100));
}

/**
 * 貯金ボーナス（SAVpt）計算 - オートシップ決済時
 * オートシップ伝票の合計ポイントの5%を貯金ポイントとして付与
 * 
 * @param autoshipInvoicePoints オートシップ伝票の合計ポイント
 * @param autoshipRate オートシップ貯金ボーナス率（デフォルト5%）
 * @returns 貯金ポイント（SAVpt）
 */
export function calcAutoshipSavingsBonus(
  autoshipInvoicePoints: number,
  autoshipRate: number = 5.0
): number {
  return Math.floor(autoshipInvoicePoints * (autoshipRate / 100));
}

/**
 * 貯金ボーナス（SAVpt）計算 - 月次ボーナス計算時（毎月25日）
 * 月次コミッション（全ボーナス合計）の3%を貯金ポイントとして付与
 * 
 * @param totalCommission 当月コミッション合計（円）
 * @param bonusRate ボーナス計算時貯金ボーナス率（デフォルト3%）
 * @returns 貯金ポイント（SAVpt）
 */
export function calcBonusSavingsPoints(
  totalCommission: number,
  bonusRate: number = 3.0
): number {
  // コミッション（円）をポイント換算（1pt = ¥100）してから3%適用
  const commissionPoints = Math.floor(totalCommission / POINT_RATE);
  return Math.floor(commissionPoints * (bonusRate / 100));
}

/**
 * 貯金ボーナス（SAVpt）換金可能判定
 * 10,000pt単位で換金可能（オートシップ契約者のみ）
 * 
 * @param savingsPoints 貯金ポイント累計
 * @returns { cashable: boolean, cashableAmount: number, remainingPoints: number }
 */
export function calcCashableSavingsPoints(savingsPoints: number): {
  cashable: boolean;
  cashableAmount: number;
  remainingPoints: number;
} {
  const cashableUnits = Math.floor(savingsPoints / 10000);
  const cashableAmount = cashableUnits * 10000 * POINT_RATE; // 円換算
  const remainingPoints = savingsPoints % 10000;

  return {
    cashable: cashableUnits > 0,
    cashableAmount,
    remainingPoints,
  };
}
