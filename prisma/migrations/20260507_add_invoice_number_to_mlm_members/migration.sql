-- AlterTable: MlmMember にインボイス登録番号を追加
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "invoiceNumber" VARCHAR(50);
