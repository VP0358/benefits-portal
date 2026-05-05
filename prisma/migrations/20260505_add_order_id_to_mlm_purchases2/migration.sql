-- AddColumn: orderId to mlm_purchases
ALTER TABLE "mlm_purchases" ADD COLUMN IF NOT EXISTS "order_id" BIGINT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mlm_purchases_order_id_idx" ON "mlm_purchases"("order_id");
