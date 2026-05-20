-- Migration: bonus_results テーブルに不足カラムを追加
-- 初期マイグレーション(20260407_add_mlm_system)で作成されたbonus_resultsには
-- コードが参照する多くのカラムが欠落していたため、一括追加する

-- ボーナス金額（円）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "rankUpBonus"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "shareBonus"           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "carryoverAmount"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "adjustmentAmount"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "otherPositionAmount"  INTEGER NOT NULL DEFAULT 0;

-- 支払い計算
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "amountBeforeAdjustment"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentRate"   DOUBLE PRECISION;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "finalAmount"             INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "consumptionTax"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "withholdingTax"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "shortageAmount"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "otherPositionShortage"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "serviceFee"              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAmount"           INTEGER NOT NULL DEFAULT 0;

-- 組織データ
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "groupActiveCount"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "minLinePoints"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "lineCount"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level1Lines"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level2Lines"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level3Lines"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "forcedLevel"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "conditions"         VARCHAR(500);

-- 貯金ポイント累計
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPoints"      INTEGER NOT NULL DEFAULT 0;

-- 公開管理（20260430_add_bonus_result_publish_fieldsで追加済みだがIF NOT EXISTSで安全に）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt"   TIMESTAMP(3);

-- 登録月A仮付与フラグ（20260519_add_savings_pta_flagで追加済みだがIF NOT EXISTSで安全に）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPtAFromRegistration" BOOLEAN NOT NULL DEFAULT false;

-- インデックス（存在しない場合のみ作成）
CREATE INDEX IF NOT EXISTS "bonus_results_isPublished_idx" ON "bonus_results"("isPublished");
