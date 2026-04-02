/**
 * 旅行サブスク 料金マスター
 *
 * pricingTier:
 *   "early"    = 初回申込者 50名まで
 *   "standard" = 申込者 51名から
 *
 * level: 1〜5
 */

export const TRAVEL_PRICING_TIERS = [
  { value: "early",    label: "初回申込者50名まで" },
  { value: "standard", label: "申込者51名から" },
] as const;

export type PricingTier = "early" | "standard";

export const TRAVEL_LEVEL_FEES: Record<PricingTier, Record<number, number>> = {
  early: {
    1: 2000,
    2: 1700,
    3: 1500,
    4: 1200,
    5: 1000,
  },
  standard: {
    1: 3000,
    2: 2700,
    3: 2500,
    4: 2000,
    5: 1500,
  },
};

export const TRAVEL_LEVELS = [1, 2, 3, 4, 5] as const;
export type TravelLevel = 1 | 2 | 3 | 4 | 5;

/** レベルと制度から月額を取得 */
export function getTravelFee(tier: PricingTier, level: number): number {
  return TRAVEL_LEVEL_FEES[tier]?.[level] ?? 0;
}

/** プラン名を生成 */
export function getTravelPlanName(tier: PricingTier, level: number): string {
  const tierLabel = tier === "early" ? "早期" : "通常";
  return `旅行サブスク Lv${level}（${tierLabel}）`;
}
