-- CreateTable TravelSubscription
CREATE TABLE IF NOT EXISTS "TravelSubscription" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "planName" VARCHAR(255) NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TravelSubscription_userId_idx" ON "TravelSubscription"("userId");
CREATE INDEX IF NOT EXISTS "TravelSubscription_status_idx" ON "TravelSubscription"("status");

-- AddForeignKey
ALTER TABLE "TravelSubscription" ADD CONSTRAINT "TravelSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
