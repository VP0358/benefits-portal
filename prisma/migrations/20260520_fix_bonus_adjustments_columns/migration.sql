-- ════════════════════════════════════════════════════════════════════
-- bonus_adjustments テーブルの修正
-- 問題:
--   1. テーブル自体が存在しない場合がある（CREATE TABLE IF NOT EXISTS で対処）
--   2. カラム名が snake_case (bonus_run_id, bonus_month 等) で作成されているが
--      Prisma スキーマは @map なしの camelCase (bonusRunId, bonusMonth 等) を期待している
--      → camelCase カラムを追加し、snake_case から値をコピーして移行
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. bonus_adjustments テーブルを CREATE TABLE IF NOT EXISTS で作成
--    （存在しない本番 DB への対応）
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bonus_adjustments" (
    "id"             BIGSERIAL NOT NULL,
    "bonusRunId"     BIGINT,
    "mlmMemberId"    BIGINT NOT NULL,
    "bonusMonth"     CHAR(7) NOT NULL DEFAULT '',
    "adjustmentType" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "amount"         INTEGER NOT NULL DEFAULT 0,
    "comment"        VARCHAR(500),
    "isTaxable"      BOOLEAN NOT NULL DEFAULT true,
    "isLocked"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bonus_adjustments_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────────────
-- 2. camelCase カラムが存在しない場合に追加（Prisma スキーマに合わせる）
-- ────────────────────────────────────────────────────────────────────

-- bonusRunId (nullable BigInt)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_adjustments' AND column_name = 'bonusRunId'
    ) THEN
        ALTER TABLE "bonus_adjustments" ADD COLUMN "bonusRunId" BIGINT;
        -- snake_case カラムから値をコピー
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'bonus_adjustments' AND column_name = 'bonus_run_id'
        ) THEN
            UPDATE "bonus_adjustments" SET "bonusRunId" = "bonus_run_id";
        END IF;
    END IF;
END $$;

-- mlmMemberId (BigInt NOT NULL) - 初期テーブル作成時から存在する場合はスキップ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_adjustments' AND column_name = 'mlmMemberId'
    ) THEN
        ALTER TABLE "bonus_adjustments" ADD COLUMN "mlmMemberId" BIGINT NOT NULL DEFAULT 0;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'bonus_adjustments' AND column_name = 'mlm_member_id'
        ) THEN
            UPDATE "bonus_adjustments" SET "mlmMemberId" = "mlm_member_id";
        END IF;
    END IF;
END $$;

-- bonusMonth (Char(7))
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_adjustments' AND column_name = 'bonusMonth'
    ) THEN
        ALTER TABLE "bonus_adjustments" ADD COLUMN "bonusMonth" CHAR(7) NOT NULL DEFAULT '';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'bonus_adjustments' AND column_name = 'bonus_month'
        ) THEN
            UPDATE "bonus_adjustments" SET "bonusMonth" = "bonus_month";
        END IF;
    END IF;
END $$;

-- adjustmentType (varchar)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_adjustments' AND column_name = 'adjustmentType'
    ) THEN
        ALTER TABLE "bonus_adjustments" ADD COLUMN "adjustmentType" VARCHAR(50) NOT NULL DEFAULT 'manual';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'bonus_adjustments' AND column_name = 'adjustment_type'
        ) THEN
            UPDATE "bonus_adjustments" SET "adjustmentType" = "adjustment_type";
        END IF;
    END IF;
END $$;

-- isTaxable (boolean)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_adjustments' AND column_name = 'isTaxable'
    ) THEN
        ALTER TABLE "bonus_adjustments" ADD COLUMN "isTaxable" BOOLEAN NOT NULL DEFAULT true;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'bonus_adjustments' AND column_name = 'is_taxable'
        ) THEN
            UPDATE "bonus_adjustments" SET "isTaxable" = "is_taxable";
        END IF;
    END IF;
END $$;

-- isLocked (boolean)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_adjustments' AND column_name = 'isLocked'
    ) THEN
        ALTER TABLE "bonus_adjustments" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'bonus_adjustments' AND column_name = 'is_locked'
        ) THEN
            UPDATE "bonus_adjustments" SET "isLocked" = "is_locked";
        END IF;
    END IF;
END $$;

-- updatedAt (timestamp - NOT NULL が必要)
ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ────────────────────────────────────────────────────────────────────
-- 3. bonus_results に updatedAt が NOT NULL で存在するか確認・追加
--    createMany では @updatedAt が自動セットされないため DEFAULT を設定
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ────────────────────────────────────────────────────────────────────
-- 4. bonus_shortage_payments テーブルを CREATE TABLE IF NOT EXISTS で作成
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bonus_shortage_payments" (
    "id"          BIGSERIAL NOT NULL,
    "bonusRunId"  BIGINT NOT NULL,
    "mlmMemberId" BIGINT NOT NULL,
    "amount"      INTEGER NOT NULL DEFAULT 0,
    "comment"     VARCHAR(500),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bonus_shortage_payments_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────────────
-- 5. インデックス（冪等）
-- ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "bonus_adjustments_bonusRunId_idx"   ON "bonus_adjustments"("bonusRunId");
CREATE INDEX IF NOT EXISTS "bonus_adjustments_mlmMemberId_idx"  ON "bonus_adjustments"("mlmMemberId");
CREATE INDEX IF NOT EXISTS "bonus_adjustments_bonusMonth_idx"   ON "bonus_adjustments"("bonusMonth");
CREATE INDEX IF NOT EXISTS "bonus_shortage_payments_bonusRunId_idx"   ON "bonus_shortage_payments"("bonusRunId");
CREATE INDEX IF NOT EXISTS "bonus_shortage_payments_mlmMemberId_idx"  ON "bonus_shortage_payments"("mlmMemberId");
