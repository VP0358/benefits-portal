CREATE TABLE IF NOT EXISTS "ContactInquiry" (
  "id"             BIGSERIAL PRIMARY KEY,
  "name"           VARCHAR(100) NOT NULL,
  "phone"          VARCHAR(30) NOT NULL,
  "email"          VARCHAR(255) NOT NULL,
  "content"        TEXT NOT NULL,
  "menuTitle"      VARCHAR(255),
  "isRead"         BOOLEAN NOT NULL DEFAULT false,
  "readAt"         TIMESTAMP,
  "readByAdminId"  BIGINT,
  "userId"         BIGINT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "ContactInquiry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactInquiry_isRead_idx" ON "ContactInquiry"("isRead");
CREATE INDEX IF NOT EXISTS "ContactInquiry_userId_idx"  ON "ContactInquiry"("userId");
CREATE INDEX IF NOT EXISTS "ContactInquiry_createdAt_idx" ON "ContactInquiry"("createdAt" DESC);
