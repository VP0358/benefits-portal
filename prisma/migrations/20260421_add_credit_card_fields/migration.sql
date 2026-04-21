-- クレジットカード情報の追加フィールド（クレディックス 2枠目・3枠目）
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardExpiry"  VARCHAR(10);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardLast4"   VARCHAR(4);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardId2"     VARCHAR(100);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardExpiry2" VARCHAR(10);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardLast4_2" VARCHAR(4);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardId3"     VARCHAR(100);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardExpiry3" VARCHAR(10);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "creditCardLast4_3" VARCHAR(4);
