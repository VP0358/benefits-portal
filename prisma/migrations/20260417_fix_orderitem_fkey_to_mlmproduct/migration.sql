-- OrderItem.productId の外部キーを Product テーブルから MlmProduct(mlm_products) テーブルへ変更
-- 1. 既存の外部キー制約を削除
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

-- 2. productId を NULL 許可に変更（手入力商品対応）
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- 3. 新しい外部キー制約を mlm_products テーブルに向けて追加
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "mlm_products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
