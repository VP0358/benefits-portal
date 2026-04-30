-- BonusResultに公開管理フィールドを追加
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- インデックス追加（公開状態での絞り込みを高速化）
CREATE INDEX IF NOT EXISTS "bonus_results_isPublished_idx" ON "bonus_results"("isPublished");
