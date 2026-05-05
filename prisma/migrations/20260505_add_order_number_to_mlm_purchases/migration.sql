-- MlmPurchaseにorder_numberカラムを追加（伝票との安全な紐づけ用）
-- NULLの場合は一括登録データ（既存データは影響なし）
ALTER TABLE "mlm_purchases" ADD COLUMN IF NOT EXISTS "order_number" VARCHAR(100);

-- インデックス追加
CREATE INDEX IF NOT EXISTS "mlm_purchases_order_number_idx" ON "mlm_purchases"("order_number");
