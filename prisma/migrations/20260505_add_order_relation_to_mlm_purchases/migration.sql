-- MlmPurchase.orderId に Order テーブルへの外部キー制約を追加
-- （カラム自体は 20260505_add_order_id_to_mlm_purchases で追加済み）
ALTER TABLE "mlm_purchases"
  ADD CONSTRAINT "mlm_purchases_order_id_fkey"
  FOREIGN KEY ("order_id")
  REFERENCES "Order"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
