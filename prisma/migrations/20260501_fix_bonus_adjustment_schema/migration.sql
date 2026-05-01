-- BonusAdjustment テーブルに不足カラムを追加
-- bonusRunId を optional (nullable) に変更
ALTER TABLE "bonus_adjustments" ALTER COLUMN "bonus_run_id" DROP NOT NULL;

-- 不足カラムを追加
ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "bonus_month" CHAR(7) NOT NULL DEFAULT '';
ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "adjustment_type" VARCHAR(50) NOT NULL DEFAULT 'manual';
ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "is_taxable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN NOT NULL DEFAULT false;

-- インデックス追加
CREATE INDEX IF NOT EXISTS "bonus_adjustments_bonus_month_idx" ON "bonus_adjustments"("bonus_month");
