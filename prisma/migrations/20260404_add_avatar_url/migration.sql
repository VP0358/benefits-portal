-- AddColumn avatarUrl to User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500);
