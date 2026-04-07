-- CreateEnum: ShippingCarrier
CREATE TYPE "ShippingCarrier" AS ENUM ('yamato', 'sagawa', 'japan_post');
CREATE TYPE "ShippingLabelStatus" AS ENUM ('pending', 'printed', 'shipped', 'canceled');

-- CreateTable: shipping_labels
CREATE TABLE "shipping_labels" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "orderNumber" VARCHAR(100) NOT NULL,
    "carrier" "ShippingCarrier" NOT NULL DEFAULT 'yamato',
    "trackingNumber" VARCHAR(100),
    "status" "ShippingLabelStatus" NOT NULL DEFAULT 'pending',
    "recipientName" VARCHAR(255) NOT NULL,
    "recipientPhone" VARCHAR(30) NOT NULL,
    "recipientPostal" VARCHAR(10) NOT NULL,
    "recipientAddress" VARCHAR(500) NOT NULL,
    "senderName" VARCHAR(255) NOT NULL DEFAULT 'CLAIRホールディングス株式会社',
    "senderPostal" VARCHAR(10) NOT NULL DEFAULT '020-0026',
    "senderAddress" VARCHAR(500) NOT NULL DEFAULT '岩手県盛岡市開運橋通5-6 第五菱和ビル5F',
    "senderPhone" VARCHAR(30) NOT NULL DEFAULT '019-681-3667',
    "itemDescription" VARCHAR(255) NOT NULL DEFAULT 'VIOLA Pure 翠彩-SUMISAI-',
    "itemCount" INTEGER NOT NULL DEFAULT 1,
    "printedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "printedByAdminId" BIGINT,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipping_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable: mlm_registrations
CREATE TABLE "mlm_registrations" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "nickname" VARCHAR(100),
    "birthDate" VARCHAR(20),
    "disclosureDocNumber" VARCHAR(100),
    "bankName" VARCHAR(100),
    "bankBranch" VARCHAR(100),
    "bankAccountType" VARCHAR(20) DEFAULT '普通',
    "bankAccountNumber" VARCHAR(20),
    "bankAccountHolder" VARCHAR(100),
    "deliveryPostalCode" VARCHAR(10),
    "deliveryAddress" VARCHAR(500),
    "deliveryName" VARCHAR(255),
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "agreedAt" TIMESTAMP(3),
    "registeredViaMLM" BOOLEAN NOT NULL DEFAULT false,
    "mlmReferrerId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mlm_registrations_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "shipping_labels" ADD CONSTRAINT "shipping_labels_orderId_key" UNIQUE ("orderId");
ALTER TABLE "mlm_registrations" ADD CONSTRAINT "mlm_registrations_userId_key" UNIQUE ("userId");

-- Foreign Keys
ALTER TABLE "shipping_labels" ADD CONSTRAINT "shipping_labels_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mlm_registrations" ADD CONSTRAINT "mlm_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "shipping_labels_status_idx" ON "shipping_labels"("status");
CREATE INDEX "shipping_labels_carrier_idx" ON "shipping_labels"("carrier");
