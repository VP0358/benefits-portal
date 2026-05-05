-- MlmPurchaseにorder_idカラムを追加（伝票との紐づけ用）
ALTER TABLE "mlm_purchases" ADD COLUMN IF NOT EXISTS "order_id" BIGINT;

-- 外部キー制約（Orderが削除されたらnullに設定）
ALTER TABLE "mlm_purchases"
  ADD CONSTRAINT "mlm_purchases_order_id_fkey"
  FOREIGN KEY ("order_id")
  REFERENCES "orders"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- インデックス追加
CREATE INDEX IF NOT EXISTS "mlm_purchases_order_id_idx" ON "mlm_purchases"("order_id");
