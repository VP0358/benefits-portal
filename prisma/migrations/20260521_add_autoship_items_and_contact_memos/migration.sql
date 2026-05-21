-- CreateTable: 会員別継続購入商品設定
CREATE TABLE IF NOT EXISTS "mlm_member_autoship_items" (
    "id"           BIGSERIAL NOT NULL,
    "mlmMemberId"  BIGINT NOT NULL,
    "productCode"  VARCHAR(20) NOT NULL,
    "productName"  VARCHAR(255) NOT NULL,
    "unitPrice"    INTEGER NOT NULL,
    "quantity"     INTEGER NOT NULL DEFAULT 1,
    "points"       INTEGER NOT NULL DEFAULT 0,
    "taxRate"      INTEGER NOT NULL DEFAULT 10,
    "feeAmount"    INTEGER NOT NULL DEFAULT 0,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mlm_member_autoship_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mlm_member_autoship_items_mlmMemberId_idx" ON "mlm_member_autoship_items"("mlmMemberId");

-- AddForeignKey
ALTER TABLE "mlm_member_autoship_items"
    ADD CONSTRAINT "mlm_member_autoship_items_mlmMemberId_fkey"
    FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: 会員対応履歴メモ
CREATE TABLE IF NOT EXISTS "mlm_member_contact_memos" (
    "id"           BIGSERIAL NOT NULL,
    "mlmMemberId"  BIGINT NOT NULL,
    "content"      TEXT NOT NULL,
    "category"     VARCHAR(50),
    "authorName"   VARCHAR(100),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mlm_member_contact_memos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mlm_member_contact_memos_mlmMemberId_idx" ON "mlm_member_contact_memos"("mlmMemberId");

-- AddForeignKey
ALTER TABLE "mlm_member_contact_memos"
    ADD CONSTRAINT "mlm_member_contact_memos_mlmMemberId_fkey"
    FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
