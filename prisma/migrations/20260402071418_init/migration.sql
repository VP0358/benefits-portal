-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'invited');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'operator');

-- CreateEnum
CREATE TYPE "PointSourceType" AS ENUM ('auto', 'manual', 'external');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('grant', 'adjust', 'external_import', 'use', 'expire', 'reversal');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('pending', 'active', 'canceled', 'suspended');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('scheduled', 'granted', 'canceled', 'reversed');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "memberCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReferral" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "referrerUserId" BIGINT NOT NULL,
    "relationType" VARCHAR(20) NOT NULL DEFAULT 'direct',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralHistory" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "referrerUserId" BIGINT NOT NULL,
    "actionType" VARCHAR(50) NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "operatedByAdminId" BIGINT,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(255),
    "iconType" VARCHAR(50),
    "imageUrl" VARCHAR(500),
    "linkUrl" VARCHAR(500) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" BIGSERIAL NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "storageDisk" VARCHAR(100) NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "publicUrl" VARCHAR(500) NOT NULL,
    "uploadedByType" VARCHAR(20) NOT NULL,
    "uploadedById" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileContract" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "contractNumber" VARCHAR(100) NOT NULL,
    "planName" VARCHAR(255) NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractReferralReward" (
    "id" BIGSERIAL NOT NULL,
    "contractId" BIGINT NOT NULL,
    "contractedUserId" BIGINT NOT NULL,
    "referrerUserId" BIGINT NOT NULL,
    "referralRelationId" BIGINT NOT NULL,
    "rewardMonth" CHAR(7) NOT NULL,
    "baseMonthlyFee" DECIMAL(10,2) NOT NULL,
    "rewardRate" DECIMAL(5,4) NOT NULL,
    "rewardPoints" INTEGER NOT NULL,
    "calculationTargetDate" TIMESTAMP(3) NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyRewardRun" (
    "id" BIGSERIAL NOT NULL,
    "rewardMonth" CHAR(7) NOT NULL,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "totalContracts" INTEGER NOT NULL DEFAULT 0,
    "totalReferrers" INTEGER NOT NULL DEFAULT 0,
    "totalRewardPoints" INTEGER NOT NULL DEFAULT 0,
    "executedByAdminId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyRewardRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointWallet" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "autoPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "manualPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "externalPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "availablePointsBalance" INTEGER NOT NULL DEFAULT 0,
    "usedPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "expiredPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "transactionType" "PointTransactionType" NOT NULL,
    "pointSourceType" "PointSourceType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "relatedUserId" BIGINT,
    "relatedContractId" BIGINT,
    "description" VARCHAR(255),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdByType" VARCHAR(20) NOT NULL,
    "createdById" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointUsage" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "orderId" BIGINT,
    "usedAutoPoints" INTEGER NOT NULL DEFAULT 0,
    "usedManualPoints" INTEGER NOT NULL DEFAULT 0,
    "usedExternalPoints" INTEGER NOT NULL DEFAULT 0,
    "totalUsedPoints" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "price" INTEGER NOT NULL,
    "imageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "orderNumber" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "subtotalAmount" INTEGER NOT NULL,
    "usedPoints" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" BIGSERIAL NOT NULL,
    "adminId" BIGINT,
    "actionType" VARCHAR(100) NOT NULL,
    "targetTable" VARCHAR(100) NOT NULL,
    "targetId" VARCHAR(100),
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" BIGSERIAL NOT NULL,
    "settingKey" VARCHAR(100) NOT NULL,
    "settingValue" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_memberCode_key" ON "User"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "UserReferral_userId_idx" ON "UserReferral"("userId");

-- CreateIndex
CREATE INDEX "UserReferral_referrerUserId_idx" ON "UserReferral"("referrerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_title_key" ON "Menu"("title");

-- CreateIndex
CREATE UNIQUE INDEX "MobileContract_contractNumber_key" ON "MobileContract"("contractNumber");

-- CreateIndex
CREATE INDEX "ContractReferralReward_contractedUserId_idx" ON "ContractReferralReward"("contractedUserId");

-- CreateIndex
CREATE INDEX "ContractReferralReward_referrerUserId_idx" ON "ContractReferralReward"("referrerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractReferralReward_contractId_referrerUserId_rewardMont_key" ON "ContractReferralReward"("contractId", "referrerUserId", "rewardMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PointWallet_userId_key" ON "PointWallet"("userId");

-- CreateIndex
CREATE INDEX "PointTransaction_userId_idx" ON "PointTransaction"("userId");

-- CreateIndex
CREATE INDEX "PointTransaction_relatedContractId_idx" ON "PointTransaction"("relatedContractId");

-- CreateIndex
CREATE INDEX "PointUsage_userId_idx" ON "PointUsage"("userId");

-- CreateIndex
CREATE INDEX "PointUsage_orderId_idx" ON "PointUsage"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_settingKey_key" ON "SiteSetting"("settingKey");

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileContract" ADD CONSTRAINT "MobileContract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractReferralReward" ADD CONSTRAINT "ContractReferralReward_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MobileContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointWallet" ADD CONSTRAINT "PointWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointUsage" ADD CONSTRAINT "PointUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointUsage" ADD CONSTRAINT "PointUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
