-- CreateEnum: AutoShipPaymentMethod
CREATE TYPE "AutoShipPaymentMethod" AS ENUM ('credit_card', 'bank_transfer');

-- CreateEnum: AutoShipRunStatus
CREATE TYPE "AutoShipRunStatus" AS ENUM ('draft', 'exported', 'imported', 'completed', 'canceled');

-- CreateEnum: AutoShipOrderStatus
CREATE TYPE "AutoShipOrderStatus" AS ENUM ('pending', 'paid', 'failed', 'canceled');

-- CreateTable: autoship_runs
CREATE TABLE "autoship_runs" (
    "id" BIGSERIAL NOT NULL,
    "targetMonth" CHAR(7) NOT NULL,
    "paymentMethod" "AutoShipPaymentMethod" NOT NULL,
    "status" "AutoShipRunStatus" NOT NULL DEFAULT 'draft',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "exportedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executedByAdminId" BIGINT,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autoship_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: delivery_notes
CREATE TABLE "delivery_notes" (
    "id" BIGSERIAL NOT NULL,
    "noteNumber" VARCHAR(50) NOT NULL,
    "targetMonth" CHAR(7) NOT NULL,
    "recipientName" VARCHAR(255) NOT NULL,
    "recipientPostal" VARCHAR(10),
    "recipientAddress" VARCHAR(500),
    "productCode" VARCHAR(20) NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "senderName" VARCHAR(255) NOT NULL DEFAULT 'CLAIRホールディングス株式会社',
    "senderPostal" VARCHAR(10) NOT NULL DEFAULT '020-0026',
    "senderAddress" VARCHAR(500) NOT NULL DEFAULT '岩手県盛岡市開運橋通5-6 第五菱和ビル5F',
    "senderPhone" VARCHAR(30) NOT NULL DEFAULT '019-681-3667',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: autoship_orders
CREATE TABLE "autoship_orders" (
    "id" BIGSERIAL NOT NULL,
    "autoShipRunId" BIGINT NOT NULL,
    "mlmMemberId" BIGINT NOT NULL,
    "targetMonth" CHAR(7) NOT NULL,
    "paymentMethod" "AutoShipPaymentMethod" NOT NULL,
    "memberCode" VARCHAR(50) NOT NULL,
    "memberName" VARCHAR(255) NOT NULL,
    "memberNameKana" VARCHAR(255),
    "memberPhone" VARCHAR(30),
    "memberEmail" VARCHAR(255),
    "memberPostal" VARCHAR(10),
    "memberAddress" VARCHAR(500),
    "productCode" VARCHAR(20) NOT NULL DEFAULT '2000',
    "productName" VARCHAR(255) NOT NULL DEFAULT 'VIOLA Pure 翠彩-SUMISAI-',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 16500,
    "totalAmount" INTEGER NOT NULL DEFAULT 16500,
    "points" INTEGER NOT NULL DEFAULT 150,
    "status" "AutoShipOrderStatus" NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "failReason" VARCHAR(255),
    "creditCardId" VARCHAR(100),
    "bankCode" VARCHAR(10),
    "bankName" VARCHAR(100),
    "branchCode" VARCHAR(10),
    "branchName" VARCHAR(100),
    "accountType" VARCHAR(10),
    "accountNumber" VARCHAR(20),
    "accountHolder" VARCHAR(100),
    "deliveryNoteId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autoship_orders_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "autoship_runs_targetMonth_paymentMethod_key" ON "autoship_runs"("targetMonth", "paymentMethod");
CREATE UNIQUE INDEX "delivery_notes_noteNumber_key" ON "delivery_notes"("noteNumber");
CREATE UNIQUE INDEX "autoship_orders_autoShipRunId_mlmMemberId_key" ON "autoship_orders"("autoShipRunId", "mlmMemberId");

-- CreateIndex
CREATE INDEX "autoship_runs_targetMonth_idx" ON "autoship_runs"("targetMonth");
CREATE INDEX "delivery_notes_targetMonth_idx" ON "delivery_notes"("targetMonth");
CREATE INDEX "autoship_orders_targetMonth_idx" ON "autoship_orders"("targetMonth");
CREATE INDEX "autoship_orders_status_idx" ON "autoship_orders"("status");
CREATE INDEX "autoship_orders_mlmMemberId_idx" ON "autoship_orders"("mlmMemberId");

-- AddForeignKey
ALTER TABLE "autoship_orders" ADD CONSTRAINT "autoship_orders_autoShipRunId_fkey" FOREIGN KEY ("autoShipRunId") REFERENCES "autoship_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "autoship_orders" ADD CONSTRAINT "autoship_orders_mlmMemberId_fkey" FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "autoship_orders" ADD CONSTRAINT "autoship_orders_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "delivery_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
