-- AlterTable: MlmMember に初回入金日・クレジットカード決済IDを追加
ALTER TABLE "mlm_members" ADD COLUMN "firstPayDate" TIMESTAMP(3);
ALTER TABLE "mlm_members" ADD COLUMN "creditCardId" VARCHAR(100);
