-- bonus_results テーブルに貯金関連カラムを確実に追加
-- 複数のマイグレーションで ADD COLUMN IF NOT EXISTS しているが、
-- 本番 DB に未適用の場合があるため、このマイグレーションで確実に適用する。

-- 貯金ポイント累計（×10整数保存）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPoints" INTEGER NOT NULL DEFAULT 0;

-- 今月追加貯金pt（×10整数保存）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPointsAdded" INTEGER NOT NULL DEFAULT 0;

-- 登録月A仮付与フラグ（翌月autoshipでなければ消滅）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPtAFromRegistration" BOOLEAN NOT NULL DEFAULT false;

-- 強制レベル
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "forcedLevel" INTEGER NOT NULL DEFAULT 0;

-- 組織データ系（欠損している可能性があるカラム）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "groupActiveCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "minLinePoints"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "lineCount"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level1Lines"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level2Lines"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level3Lines"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "conditions"       VARCHAR(500);

-- 支払い計算系
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentRate"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "amountBeforeAdjustment"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "finalAmount"             INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "withholdingTax"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "serviceFee"              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAmount"           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "adjustmentAmount"        INTEGER NOT NULL DEFAULT 0;

-- 称号レベル
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "previousTitleLevel" INTEGER NOT NULL DEFAULT 0;

-- 公開フラグ
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- updatedAt（DEFAULT なしで NOT NULL だとINSERT失敗するため DEFAULT を設定）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- 既存カラムに DEFAULT を付与（ADD COLUMN IF NOT EXISTS は既存カラムには影響しないため ALTER COLUMN で設定）
ALTER TABLE "bonus_results" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
