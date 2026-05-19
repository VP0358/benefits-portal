-- Migration: Remove savingsBonus column from BonusResult
-- savingsBonus（円換算）は常に0固定で未使用のため削除。
-- 貯金ボーナスはポイント付与のみ（savingsPointsAdded）で管理する。

ALTER TABLE "BonusResult" DROP COLUMN IF EXISTS "savingsBonus";
