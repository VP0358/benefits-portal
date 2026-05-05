-- AlterTable: OrderItemにproductCodeとpointsカラムを追加
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "productCode" VARCHAR(50);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

-- Index追加
CREATE INDEX IF NOT EXISTS "OrderItem_productCode_idx" ON "OrderItem"("productCode");
