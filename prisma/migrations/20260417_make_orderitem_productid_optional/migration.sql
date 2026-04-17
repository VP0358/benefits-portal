-- OrderItem.productId を NULL 許可に変更（商品マスター未登録の商品でも伝票作成可能にする）
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
