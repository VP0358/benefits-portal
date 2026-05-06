-- CreateTable: used_car_applications
CREATE TABLE "used_car_applications" (
  "id"          BIGSERIAL PRIMARY KEY,
  "memberId"    VARCHAR(50),
  "userId"      BIGINT,
  "name"        VARCHAR(100) NOT NULL,
  "phone"       VARCHAR(50)  NOT NULL,
  "email"       VARCHAR(255) NOT NULL,
  "referrerId"  BIGINT,
  "carType"     VARCHAR(100) NOT NULL,
  "grade"       VARCHAR(100) NOT NULL,
  "year"        VARCHAR(50)  NOT NULL,
  "mileage"     VARCHAR(50)  NOT NULL,
  "colors"      VARCHAR(255) NOT NULL,
  "budget"      VARCHAR(100) NOT NULL,
  "payment"     VARCHAR(100) NOT NULL,
  "drive"       VARCHAR(50),
  "studless"    BOOLEAN      NOT NULL DEFAULT false,
  "note"        VARCHAR(1000),
  "status"      VARCHAR(30)  NOT NULL DEFAULT 'pending',
  "adminNote"   VARCHAR(500),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "used_car_applications_userId_idx"     ON "used_car_applications"("userId");
CREATE INDEX "used_car_applications_referrerId_idx" ON "used_car_applications"("referrerId");
CREATE INDEX "used_car_applications_status_idx"     ON "used_car_applications"("status");
CREATE INDEX "used_car_applications_createdAt_idx"  ON "used_car_applications"("createdAt");

ALTER TABLE "used_car_applications"
  ADD CONSTRAINT "used_car_applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "used_car_applications"
  ADD CONSTRAINT "used_car_applications_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: insurance_applications
CREATE TABLE "insurance_applications" (
  "id"            BIGSERIAL PRIMARY KEY,
  "memberId"      VARCHAR(50),
  "userId"        BIGINT,
  "name"          VARCHAR(100) NOT NULL,
  "phone"         VARCHAR(50)  NOT NULL,
  "email"         VARCHAR(255) NOT NULL,
  "agency"        VARCHAR(100) NOT NULL,
  "insuranceType" VARCHAR(20)  NOT NULL,
  "products"      VARCHAR(500),
  "schedule1"     VARCHAR(200) NOT NULL,
  "schedule2"     VARCHAR(200) NOT NULL,
  "schedule3"     VARCHAR(200) NOT NULL,
  "note"          VARCHAR(1000),
  "status"        VARCHAR(30)  NOT NULL DEFAULT 'pending',
  "adminNote"     VARCHAR(500),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "insurance_applications_userId_idx"        ON "insurance_applications"("userId");
CREATE INDEX "insurance_applications_insuranceType_idx" ON "insurance_applications"("insuranceType");
CREATE INDEX "insurance_applications_agency_idx"        ON "insurance_applications"("agency");
CREATE INDEX "insurance_applications_status_idx"        ON "insurance_applications"("status");
CREATE INDEX "insurance_applications_createdAt_idx"     ON "insurance_applications"("createdAt");

ALTER TABLE "insurance_applications"
  ADD CONSTRAINT "insurance_applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
