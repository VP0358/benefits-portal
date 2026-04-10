-- AlterTable: mlm_members に個人情報・法人情報・銀行情報カラムを追加
-- (既存カラムがある場合はスキップ)

-- PaymentMethod ENUMを作成（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('credit_card', 'bank_transfer', 'bank_payment');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='companyName') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "companyName" VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='companyNameKana') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "companyNameKana" VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='birthDate') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "birthDate" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='gender') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "gender" VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='mobile') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "mobile" VARCHAR(30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='prefecture') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "prefecture" VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='city') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "city" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='address1') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "address1" VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='address2') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "address2" VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='note') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "note" VARCHAR(500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='firstPayDate') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "firstPayDate" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='creditCardId') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "creditCardId" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='bankCode') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "bankCode" VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='bankName') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "bankName" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='branchCode') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "branchCode" VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='branchName') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "branchName" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='accountType') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "accountType" VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='accountNumber') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "accountNumber" VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='accountHolder') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "accountHolder" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='savingsPoints') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "savingsPoints" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='autoshipSuspendMonths') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "autoshipSuspendMonths" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='titleLevel') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "titleLevel" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='conditionAchieved') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "conditionAchieved" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='forceActive') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "forceActive" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='forceLevel') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "forceLevel" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='matrixPosition') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "matrixPosition" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='autoshipStartDate') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "autoshipStartDate" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='autoshipStopDate') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "autoshipStopDate" TIMESTAMP(3);
  END IF;
  -- paymentMethod: ENUMまたはVARCHARで追加（どちらでもPrismaは動作する）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mlm_members' AND column_name='paymentMethod') THEN
    ALTER TABLE "mlm_members" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'credit_card';
  END IF;
END $$;
