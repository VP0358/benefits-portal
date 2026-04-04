-- User テーブルに契約解除日時を追加
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);
