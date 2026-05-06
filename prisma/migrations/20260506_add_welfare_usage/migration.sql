-- CreateTable: welfare_usages
CREATE TABLE "welfare_usages" (
    "id"         BIGSERIAL NOT NULL,
    "menuId"     BIGINT NOT NULL,
    "userId"     BIGINT NOT NULL,
    "usedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note"       VARCHAR(500),
    "adminNote"  VARCHAR(500),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welfare_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "welfare_usages_menuId_idx" ON "welfare_usages"("menuId");
CREATE INDEX "welfare_usages_userId_idx" ON "welfare_usages"("userId");
CREATE INDEX "welfare_usages_usedAt_idx" ON "welfare_usages"("usedAt");

-- AddForeignKey
ALTER TABLE "welfare_usages" ADD CONSTRAINT "welfare_usages_menuId_fkey"
    FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "welfare_usages" ADD CONSTRAINT "welfare_usages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
