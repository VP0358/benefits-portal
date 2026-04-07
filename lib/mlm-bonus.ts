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

// ━━━ レベル達成条件（グループポイント範囲） ━━━
export const LEVEL_GP_RANGES = [
  { level: 0, min: 0,       max: 299 },
  { level: 1, min: 300,     max: 4500 },
  { level: 2, min: 4501,    max: 15000 },
  { level: 3, min: 15001,   max: 45000 },
  { level: 4, min: 45001,   max: 150000 },
  { level: 5, min: 150001,  max: Infinity },
];

// ━━━ ユニレベルボーナス算出率テーブル ━━━
// conditionAchieved=true の場合のみレベル別に適用
// conditionAchieved=false の場合は共通（1段:15%, 2段:7%, 3段:3%）
export const UNILEVEL_RATES: Record<number, number[]> = {
  // [条件未達成 or レベルなし or LV1]
  0: [15, 7, 3, 0, 0, 0, 0],
  1: [15, 7, 3, 0, 0, 0, 0],
  2: [15, 7, 4, 3, 1, 0, 0],
  3: [15, 8, 5, 4, 2, 2, 1],
  4: [15, 9, 6, 5, 3, 2, 1],
  5: [15, 10, 7, 6, 4, 3, 2],
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
 * グループポイントからレベルを計算
 */
export function calcLevelFromGP(gp: number): number {
  for (let i = LEVEL_GP_RANGES.length - 1; i >= 0; i--) {
    if (gp >= LEVEL_GP_RANGES[i].min) {
      return LEVEL_GP_RANGES[i].level;
    }
  }
  return 0;
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
 * ユニレベルボーナス算出率を取得（段数ごと）
 * conditionAchieved=false の場合は0扱い（共通テーブル適用）
 */
export function getUnilevelRates(
  achievedLevel: number,
  conditionAchieved: boolean
): number[] {
  if (!conditionAchieved) return UNILEVEL_RATES[0];
  return UNILEVEL_RATES[achievedLevel] ?? UNILEVEL_RATES[0];
}

/**
 * ユニレベルボーナス計算（1段ごとのポイント × 算出率 × ポイントレート）
 * 非アクティブポジションは圧縮（スキップ）される前提でptが渡される
 */
export function calcUnilevelBonus(
  depthPoints: Record<number, number>, // { 1: pt, 2: pt, ... }
  achievedLevel: number,
  conditionAchieved: boolean
): { total: number; detail: Record<number, number> } {
  const rates = getUnilevelRates(achievedLevel, conditionAchieved);
  let total = 0;
  const detail: Record<number, number> = {};

  for (let depth = 1; depth <= 7; depth++) {
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
 * レベル達成条件チェック
 * ① 当月アクティブ
 * ② 直接紹介アクティブ数 2名以上
 * ③ conditionAchieved = true
 */
export function checkLevelCondition(
  isActive: boolean,
  directActiveCount: number,
  conditionAchievedFlag: boolean
): boolean {
  return isActive && directActiveCount >= 2 && conditionAchievedFlag;
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
