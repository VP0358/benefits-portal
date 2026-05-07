/**
 * MLMボーナス計算ロジック（VIOLA Pure 仕様）
 */

export const POINT_RATE = 100; // 1pt = 100円

// アクティブ判定に必要な最低購入pt
export const ACTIVE_MIN_POINTS = 150;

// アクティブ判定・ボーナス計算対象商品コード（スミサイ系）
// 商品コード1000: [新規]VIOLA Pure 翠彩-SUMISAI- 150pt
// 商品コード2000: VIOLA Pure 翠彩-SUMISAI-        150pt
export const ACTIVE_REQUIRED_PRODUCTS = ["1000", "2000"];

// ダイレクトボーナス対象商品コード
// 商品コード1000（[新規]VIOLA Pure 翠彩-SUMISAI-）のみ対象
export const DIRECT_BONUS_PRODUCT = "1000";
export const DIRECT_BONUS_AMOUNT = 2000; // 円/個

// ━━━ レベル達成条件（グループポイントレンジ） ━━━
// グループポイント = 当月自己購入pt + 傘下7段目までの当月購入pt（非アクティブは圧縮）
export const LEVEL_GP_RANGES = [
  { level: 0, minGP: 0,      maxGP: 299 },      // レベルなし: 0〜299pt
  { level: 1, minGP: 300,    maxGP: 4500 },      // LV.1: 300〜4500pt
  { level: 2, minGP: 4501,   maxGP: 15000 },     // LV.2: 4501〜15000pt
  { level: 3, minGP: 15001,  maxGP: 45000 },     // LV.3: 15001〜45000pt
  { level: 4, minGP: 45001,  maxGP: 150000 },    // LV.4: 45001〜150000pt
  { level: 5, minGP: 150001, maxGP: Infinity },   // LV.5: 150001pt〜
];

// ━━━ レベル達成条件（自己購入ポイント最低条件） ━━━
export const LEVEL_SELF_PT_MIN: Record<number, number> = {
  0: 0,
  1: 150, // 150pt以上（翠彩1個）
  2: 150, // 150pt以上（翠彩1個）
  3: 300, // 300pt以上（翠彩2個）
  4: 450, // 450pt以上（翠彩3個）
  5: 450, // 450pt以上（翠彩3個）
};

// ━━━ レベル達成条件（必要系列数） ━━━
export const LEVEL_REQUIRED_SERIES: Record<number, number> = {
  0: 0,
  1: 2, // 2系列以上
  2: 2, // 2系列以上
  3: 3, // 3系列以上
  4: 3, // 3系列以上
  5: 3, // 3系列以上
};

// ━━━ レベル達成条件（各系列7段以内に必要なレベル達成者） ━━━
// 各系列に最低1名必要なレベル達成者のレベル
export const LEVEL_REQUIRED_ACHIEVER: Record<number, number | null> = {
  0: null,
  1: null,  // LV.1: 不要
  2: 1,     // LV.2: 各系列にLV.1達成者1名以上
  3: 1,     // LV.3: 各系列にLV.1達成者1名以上
  4: 2,     // LV.4: 各系列にLV.2達成者1名以上
  5: 3,     // LV.5: 各系列にLV.3達成者1名以上
};

// ━━━ ユニレベルボーナス獲得段数制限 ━━━
// LV.1: 3段目まで、LV.2: 5段目まで、LV.3+: 7段目まで
export const UNILEVEL_MAX_DEPTH: Record<number, number> = {
  0: 0,
  1: 3,
  2: 5,
  3: 7,
  4: 7,
  5: 7,
};

// ━━━ ユニレベルボーナス算出率テーブル（レベル別） ━━━
// 仕様書（2026年版）準拠
// [1段目, 2段目, 3段目, 4段目, 5段目, 6段目, 7段目]
export const UNILEVEL_RATES: Record<number, number[]> = {
  0: [15, 7, 3,  0,  0,  0,  0],  // レベルなし（条件②未達でも1〜3段取得可）
  1: [15, 7, 3,  0,  0,  0,  0],  // LV.1: 3段目まで
  2: [15, 7, 4,  3,  1,  0,  0],  // LV.2: 5段目まで
  3: [15, 8, 5,  4,  2,  2,  1],  // LV.3: 7段目まで
  4: [15, 9, 6,  5,  3,  2,  1],  // LV.4: 7段目まで
  5: [15, 10, 7, 6,  4,  3,  2],  // LV.5: 7段目まで
};

// ━━━ 組織構築ボーナス率（LV.3以上） ━━━
export const STRUCTURE_BONUS_RATES: Record<number, number> = {
  3: 3,
  4: 3.5,
  5: 4,
};

// ━━━ 貯金ボーナス加算率 ━━━
export const SAVINGS_BONUS_RATE = 0.20;
export const AS_SAVINGS_RATE = 0.05;

/**
 * グループポイントからレベルを計算
 * ただしレベル達成には自己購入pt・系列数・組織内達成者条件も必要
 * この関数はGPレンジのみでレベルを返す（上位判定はcalcAchievedLevelで行う）
 */
export function calcLevelFromGP(gp: number): number {
  for (let i = LEVEL_GP_RANGES.length - 1; i >= 0; i--) {
    if (gp >= LEVEL_GP_RANGES[i].minGP) {
      return LEVEL_GP_RANGES[i].level;
    }
  }
  return 0;
}

/**
 * @deprecated 旧仕様（翠彩流通個数ベース）→ 新仕様はグループポイントベース
 * 後方互換性のために残す
 */
export function calcLevelFromItemCount(itemCount: number): number {
  // 1個=150ptとして換算してGPベースに変換
  return calcLevelFromGP(itemCount * 150);
}

/**
 * アクティブ判定
 * 条件:
 *   ① 商品コード1000 or 2000（スミサイ）を当月購入していること
 *   ② 自己購入ポイントが150pt以上であること
 * ※ forceActive=true の場合は強制的にアクティブとみなす
 */
export function isActiveMember(params: {
  selfPoints: number;
  purchasedRequiredProduct: boolean;
  forceActive: boolean;
  contractDate?: Date | null;
  memberType?: string;
  targetMonth?: string;
}): boolean {
  if (params.forceActive) return true;
  if (!params.purchasedRequiredProduct) return false;
  if (params.selfPoints < ACTIVE_MIN_POINTS) return false;
  return true;
}

/**
 * 報酬受取資格判定（ボーナス取得条件）
 * 条件:
 *   ① 当月アクティブであること
 *   ② 当月、直接紹介アクティブ数が2名以上であること
 *   ③ conditionAchieved（会員詳細＞条件）が「達成」であること
 */
export function isEligibleForBonus(params: {
  isActive: boolean;
  directActiveCount: number;
  conditionAchieved: boolean;
}): boolean {
  return (
    params.isActive &&
    params.directActiveCount >= 2 &&
    params.conditionAchieved
  );
}

/**
 * レベル達成判定（全条件チェック）
 * GPレンジ + 自己購入pt + 系列数 + 組織内達成者 を総合判定
 * 
 * @param params.groupPoints グループポイント合計（自己 + 傘下7段圧縮後）
 * @param params.selfPurchasePoints 当月自己購入ポイント
 * @param params.seriesCount 系列数（ポジションが存在する直下系列数）
 * @param params.seriesAchieverMap 各系列の達成者レベルマップ { seriesIndex: maxLevel }
 */
export function calcAchievedLevel(params: {
  groupPoints: number;
  selfPurchasePoints: number;
  seriesCount: number;
  seriesAchieverMap: Record<number, number>; // 各系列の最高達成レベル
}): number {
  const { groupPoints, selfPurchasePoints, seriesCount, seriesAchieverMap } = params;

  // LV.5から順に判定（上位から）
  for (let lv = 5; lv >= 1; lv--) {
    const range = LEVEL_GP_RANGES.find(r => r.level === lv)!;
    const minSelfPt = LEVEL_SELF_PT_MIN[lv];
    const minSeries = LEVEL_REQUIRED_SERIES[lv];
    const requiredAchieverLevel = LEVEL_REQUIRED_ACHIEVER[lv];

    // GPレンジチェック
    if (groupPoints < range.minGP) continue;

    // 自己購入ptチェック
    if (selfPurchasePoints < minSelfPt) continue;

    // 系列数チェック
    if (seriesCount < minSeries) continue;

    // 組織内達成者チェック（LV.2以上）
    if (requiredAchieverLevel !== null) {
      // minSeries個の系列すべてに requiredAchieverLevel 以上の達成者が1名以上必要
      const seriesKeys = Object.keys(seriesAchieverMap).map(Number);
      if (seriesKeys.length < minSeries) continue;

      // 各系列がrequiredAchieverLevel以上を満たしているか確認
      const qualifiedSeries = seriesKeys.filter(
        (key) => seriesAchieverMap[key] >= requiredAchieverLevel
      );
      if (qualifiedSeries.length < minSeries) continue;
    }

    return lv;
  }

  // LV.1の最低条件（GP 300以上 + 自己150pt以上 + 系列2以上）
  if (
    groupPoints >= 300 &&
    selfPurchasePoints >= 150 &&
    seriesCount >= 2
  ) {
    return 1;
  }

  return 0;
}

/**
 * 商品コードがポイント付与対象かどうかを判定する
 * ポイント付与対象: 商品コードが数字のみで構成され、1000〜2999の範囲
 */
export function isPointGrantTarget(productCode: string): boolean {
  const codeNum = parseInt(productCode, 10);
  if (isNaN(codeNum)) return false;
  return codeNum >= 1000 && codeNum <= 2999;
}

/**
 * ユニレベルボーナス算出率を取得（段数ごと）
 */
export function getUnilevelRates(
  achievedLevel: number,
  directActiveCount: number
): number[] {
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
 * LV.3以上が対象、最小系列ポイント × 算出率 × ポイントレート
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
 * ただし非アクティブはリセット
 */
export function calcNewTitleLevel(
  currentTitleLevel: number,
  achievedLevel: number,
  isActive: boolean
): number {
  if (!isActive) return 0;
  return Math.max(currentTitleLevel, achievedLevel);
}

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
  business: "ビジネス会員",
  preferred: "愛用会員",
};

/**
 * 商品マスタ（仕様書準拠）
 */
export const MLM_PRODUCTS = [
  { code: "s1000", name: "登録料",                                      price: 3300,  points: 150 },
  { code: "1000",  name: "[新規]VIOLA Pure 翠彩-SUMISAI-",               price: 16500, points: 150 },
  { code: "1001",  name: "【使用不可】[翌月分]VIOLA Pure 翠彩-SUMISAI-",  price: 16500, points: 0   },
  { code: "1002",  name: "[新規・追加分]VIOLA Pure 翠彩-SUMISAI-",        price: 16500, points: 150 },
  { code: "1999",  name: "アクティブポイント",                             price: 0,     points: 150 },
  { code: "2000",  name: "VIOLA Pure 翠彩-SUMISAI-",                     price: 16500, points: 150 },
  { code: "4000",  name: "出荷事務手数料",                                 price: 880,   points: 0   },
];

/**
 * 連続非購入判定
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
  none:     { bg: "bg-white",   text: "text-slate-800", border: "border-slate-200", label: "" },
  warn_4:   { bg: "bg-white",   text: "text-blue-700",  border: "border-blue-300",  label: "失効予定（5ヶ月目）" },
  danger_5: { bg: "bg-red-500", text: "text-white",     border: "border-red-600",   label: "失効予定（6ヶ月目）" },
};

/**
 * 貯金ボーナス（SAVpt）計算 - 登録時
 */
export function calcRegistrationSavingsBonus(
  registrationPoints: number,
  registrationRate: number = 20.0
): number {
  return Math.floor(registrationPoints * (registrationRate / 100));
}

/**
 * 貯金ボーナス（SAVpt）計算 - オートシップ決済時
 */
export function calcAutoshipSavingsBonus(
  autoshipInvoicePoints: number,
  autoshipRate: number = 5.0
): number {
  return Math.floor(autoshipInvoicePoints * (autoshipRate / 100));
}

/**
 * 貯金ボーナス（SAVpt）計算 - 月次ボーナス計算時
 */
export function calcBonusSavingsPoints(
  totalCommission: number,
  bonusRate: number = 3.0
): number {
  const commissionPoints = Math.floor(totalCommission / POINT_RATE);
  return Math.floor(commissionPoints * (bonusRate / 100));
}

/**
 * 貯金ボーナス（SAVpt）換金可能判定
 */
export function calcCashableSavingsPoints(savingsPoints: number): {
  cashable: boolean;
  cashableAmount: number;
  remainingPoints: number;
} {
  const cashableUnits = Math.floor(savingsPoints / 10000);
  const cashableAmount = cashableUnits * 10000 * POINT_RATE;
  const remainingPoints = savingsPoints % 10000;
  return {
    cashable: cashableUnits > 0,
    cashableAmount,
    remainingPoints,
  };
}
