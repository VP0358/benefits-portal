-- CreateEnum
CREATE TYPE "MlmMemberType" AS ENUM ('business', 'preferred');
CREATE TYPE "MlmMemberStatus" AS ENUM ('active', 'autoship', 'lapsed', 'suspended', 'withdrawn', 'midCancel');
CREATE TYPE "BonusRunStatus" AS ENUM ('draft', 'confirmed', 'canceled');
CREATE TYPE "BonusType" AS ENUM ('direct', 'unilevel', 'structure', 'savings');

-- CreateTable: mlm_members
CREATE TABLE "mlm_members" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "memberCode" VARCHAR(50) NOT NULL,
    "memberType" "MlmMemberType" NOT NULL DEFAULT 'business',
    "status" "MlmMemberStatus" NOT NULL DEFAULT 'active',
    "uplineId" BIGINT,
    "referrerId" BIGINT,
    "matrixPosition" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "titleLevel" INTEGER NOT NULL DEFAULT 0,
    "conditionAchieved" BOOLEAN NOT NULL DEFAULT false,
    "forceActive" BOOLEAN NOT NULL DEFAULT false,
    "forceLevel" INTEGER,
    "contractDate" TIMESTAMP(3),
    "autoshipEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoshipStopDate" TIMESTAMP(3),
    "autoshipSuspendMonths" VARCHAR(100),
    "savingsPoints" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mlm_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: mlm_purchases
CREATE TABLE "mlm_purchases" (
    "id" BIGSERIAL NOT NULL,
    "mlmMemberId" BIGINT NOT NULL,
    "productCode" VARCHAR(20) NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "purchaseMonth" CHAR(7) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mlm_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bonus_runs
CREATE TABLE "bonus_runs" (
    "id" BIGSERIAL NOT NULL,
    "bonusMonth" CHAR(7) NOT NULL,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "status" "BonusRunStatus" NOT NULL DEFAULT 'draft',
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "totalActiveMembers" INTEGER NOT NULL DEFAULT 0,
    "totalBonusAmount" INTEGER NOT NULL DEFAULT 0,
    "executedByAdminId" BIGINT,
    "confirmedAt" TIMESTAMP(3),
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bonus_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bonus_results
CREATE TABLE "bonus_results" (
    "id" BIGSERIAL NOT NULL,
    "bonusRunId" BIGINT NOT NULL,
    "mlmMemberId" BIGINT NOT NULL,
    "bonusMonth" CHAR(7) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "selfPurchasePoints" INTEGER NOT NULL DEFAULT 0,
    "groupPoints" INTEGER NOT NULL DEFAULT 0,
    "directActiveCount" INTEGER NOT NULL DEFAULT 0,
    "achievedLevel" INTEGER NOT NULL DEFAULT 0,
    "previousTitleLevel" INTEGER NOT NULL DEFAULT 0,
    "newTitleLevel" INTEGER NOT NULL DEFAULT 0,
    "directBonus" INTEGER NOT NULL DEFAULT 0,
    "unilevelBonus" INTEGER NOT NULL DEFAULT 0,
    "structureBonus" INTEGER NOT NULL DEFAULT 0,
    "savingsBonus" INTEGER NOT NULL DEFAULT 0,
    "totalBonus" INTEGER NOT NULL DEFAULT 0,
    "unilevelDetail" JSONB,
    "savingsPointsAdded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bonus_results_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "mlm_members" ADD CONSTRAINT "mlm_members_userId_key" UNIQUE ("userId");
ALTER TABLE "mlm_members" ADD CONSTRAINT "mlm_members_memberCode_key" UNIQUE ("memberCode");
ALTER TABLE "bonus_runs" ADD CONSTRAINT "bonus_runs_bonusMonth_key" UNIQUE ("bonusMonth");
ALTER TABLE "bonus_results" ADD CONSTRAINT "bonus_results_bonusRunId_mlmMemberId_key" UNIQUE ("bonusRunId", "mlmMemberId");

-- Foreign Keys
ALTER TABLE "mlm_members" ADD CONSTRAINT "mlm_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mlm_members" ADD CONSTRAINT "mlm_members_uplineId_fkey" FOREIGN KEY ("uplineId") REFERENCES "mlm_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mlm_members" ADD CONSTRAINT "mlm_members_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "mlm_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mlm_purchases" ADD CONSTRAINT "mlm_purchases_mlmMemberId_fkey" FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bonus_results" ADD CONSTRAINT "bonus_results_bonusRunId_fkey" FOREIGN KEY ("bonusRunId") REFERENCES "bonus_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bonus_results" ADD CONSTRAINT "bonus_results_mlmMemberId_fkey" FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "mlm_members_uplineId_idx" ON "mlm_members"("uplineId");
CREATE INDEX "mlm_members_referrerId_idx" ON "mlm_members"("referrerId");
CREATE INDEX "mlm_members_status_idx" ON "mlm_members"("status");
CREATE INDEX "mlm_purchases_mlmMemberId_idx" ON "mlm_purchases"("mlmMemberId");
CREATE INDEX "mlm_purchases_purchaseMonth_idx" ON "mlm_purchases"("purchaseMonth");
CREATE INDEX "bonus_results_bonusMonth_idx" ON "bonus_results"("bonusMonth");
CREATE INDEX "bonus_results_mlmMemberId_idx" ON "bonus_results"("mlmMemberId");
