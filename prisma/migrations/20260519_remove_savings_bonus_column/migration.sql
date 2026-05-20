-- Migration: Remove savingsBonus column from BonusResult
-- savingsBonus（円換算）は常に0固定で未使用のため削除。
-- 貯金ボーナスはポイント付与のみ（savingsPointsAdded）で管理する。

-- テーブル名を正しく修正: "BonusResult" → "bonus_results" (@@mapで定義)
-- ※ DROP COLUMN IF EXISTS は PostgreSQL 9.x 以降では不可。DO $$ ... END $$ で安全に実行
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_results' AND column_name = 'savingsBonus'
    ) THEN
        ALTER TABLE "bonus_results" DROP COLUMN "savingsBonus";
    END IF;
END $$;
