-- AlterTable Menu: add menuType and contentData columns
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "menuType" VARCHAR(50) NOT NULL DEFAULT 'url';
ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "contentData" TEXT;
-- Make linkUrl nullable / default empty
ALTER TABLE "Menu" ALTER COLUMN "linkUrl" SET DEFAULT '';
