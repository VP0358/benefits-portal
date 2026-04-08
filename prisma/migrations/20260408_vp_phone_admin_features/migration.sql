-- AlterTable: VpPhoneApplication に申請管理フィールドを追加
ALTER TABLE "vp_phone_applications" ADD COLUMN "applicationSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "vp_phone_applications" ADD COLUMN "applicationSubmittedAt" TIMESTAMP(3);
ALTER TABLE "vp_phone_applications" ADD COLUMN "applicationSubmittedByAdminId" BIGINT;
ALTER TABLE "vp_phone_applications" ADD COLUMN "officeEmail" VARCHAR(255);
