-- AlterTable: Menu.imageUrl を VarChar(500) から Text に変更（Base64画像対応）
ALTER TABLE "Menu" ALTER COLUMN "imageUrl" TYPE TEXT;
