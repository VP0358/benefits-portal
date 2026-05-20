-- ════════════════════════════════════════════════════════════════════
-- 包括的修正マイグレーション
-- 本番DBに適用すべき全カラム・テーブルの追加
-- 全コマンドは IF NOT EXISTS / DO $$ ... EXCEPTION WHEN ... END $$
-- 形式で冪等（何度実行しても安全）
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. bonus_settings テーブル（BonusSettings モデル）
--    ※ マイグレーションが存在しなかったため新規作成
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bonus_settings" (
    "id"                    SERIAL NOT NULL,
    "directBonusAmount"     INTEGER NOT NULL DEFAULT 2000,
    "unilevelLv1Rate1"      DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "unilevelLv1Rate2"      DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "unilevelLv1Rate3"      DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "unilevelLv2Rate1"      DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "unilevelLv2Rate2"      DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "unilevelLv2Rate3"      DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "unilevelLv2Rate4"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unilevelLv2Rate5"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unilevelLv3Rate1"      DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "unilevelLv3Rate2"      DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "unilevelLv3Rate3"      DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "unilevelLv3Rate4"      DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "unilevelLv3Rate5"      DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "unilevelLv3Rate6"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unilevelLv3Rate7"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unilevelLv4Rate1"      DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "unilevelLv4Rate2"      DOUBLE PRECISION NOT NULL DEFAULT 9.0,
    "unilevelLv4Rate3"      DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "unilevelLv4Rate4"      DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "unilevelLv4Rate5"      DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "unilevelLv4Rate6"      DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "unilevelLv4Rate7"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unilevelLv5Rate1"      DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "unilevelLv5Rate2"      DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "unilevelLv5Rate3"      DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "unilevelLv5Rate4"      DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "unilevelLv5Rate5"      DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "unilevelLv5Rate6"      DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "unilevelLv5Rate7"      DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "structureLv3Rate"      DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "structureLv4Rate"      DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "structureLv5Rate"      DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "activeThresholdPoints" INTEGER NOT NULL DEFAULT 150,
    "serviceFeeAmount"      INTEGER NOT NULL DEFAULT 440,
    "minPayoutAmount"       INTEGER NOT NULL DEFAULT 2560,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bonus_settings_pkey" PRIMARY KEY ("id")
);

-- bonus_settings にデフォルトレコードを挿入（存在しない場合のみ）
INSERT INTO "bonus_settings" (
    "updatedAt", "createdAt"
)
SELECT CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "bonus_settings");

-- ────────────────────────────────────────────────────────────────────
-- 2. savings_bonus_config テーブル（SavingsBonusConfig モデル）
--    ※ マイグレーションが存在しなかったため新規作成
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "savings_bonus_config" (
    "id"               SERIAL NOT NULL,
    "registrationRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "autoshipRate"     DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "bonusRate"        DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "savings_bonus_config_pkey" PRIMARY KEY ("id")
);

-- savings_bonus_config にデフォルトレコードを挿入（存在しない場合のみ）
INSERT INTO "savings_bonus_config" (
    "updatedAt", "createdAt"
)
SELECT CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "savings_bonus_config");

-- ────────────────────────────────────────────────────────────────────
-- 3. bonus_runs テーブルに不足カラムを追加
--    初期マイグレーションに paymentAdjustmentRate・capAdjustmentAmount が欠落
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "bonus_runs"
    ADD COLUMN IF NOT EXISTS "paymentAdjustmentRate" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "capAdjustmentAmount"   INTEGER NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────────────────────────────
-- 4. bonus_results テーブルに不足カラムを追加（冪等）
--    以前の 20260520_add_bonus_result_full_columns と統合済み
--    ※ IF NOT EXISTS で重複エラーを回避
-- ────────────────────────────────────────────────────────────────────

-- ボーナス金額
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "rankUpBonus"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "shareBonus"           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "carryoverAmount"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "adjustmentAmount"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "otherPositionAmount"  INTEGER NOT NULL DEFAULT 0;

-- 支払い計算
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "amountBeforeAdjustment"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentRate"   DOUBLE PRECISION;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "finalAmount"             INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "consumptionTax"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "withholdingTax"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "shortageAmount"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "otherPositionShortage"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "serviceFee"              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAmount"           INTEGER NOT NULL DEFAULT 0;

-- 組織データ
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "groupActiveCount"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "minLinePoints"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "lineCount"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level1Lines"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level2Lines"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level3Lines"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "forcedLevel"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "conditions"         VARCHAR(500);

-- 貯金ポイント
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPoints"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPointsAdded" INTEGER NOT NULL DEFAULT 0;

-- 貯金ボーナスA仮付与フラグ
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPtAFromRegistration" BOOLEAN NOT NULL DEFAULT false;

-- savingsBonus カラムを削除（未使用・schema から除外済み）
-- ※ DROP COLUMN は存在する場合のみ実行
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_results' AND column_name = 'savingsBonus'
    ) THEN
        ALTER TABLE "bonus_results" DROP COLUMN "savingsBonus";
    END IF;
END $$;

-- totalBonus カラムを削除（schema から除外済み・計算はコード側で実施）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bonus_results' AND column_name = 'totalBonus'
    ) THEN
        ALTER TABLE "bonus_results" DROP COLUMN "totalBonus";
    END IF;
END $$;

-- 公開管理（冪等）
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- インデックス（冪等）
CREATE INDEX IF NOT EXISTS "bonus_results_bonusMonth_idx"   ON "bonus_results"("bonusMonth");
CREATE INDEX IF NOT EXISTS "bonus_results_mlmMemberId_idx"  ON "bonus_results"("mlmMemberId");
CREATE INDEX IF NOT EXISTS "bonus_results_isPublished_idx"  ON "bonus_results"("isPublished");

-- ────────────────────────────────────────────────────────────────────
-- 5. mlm_members テーブルに companyName・companyNameKana が無ければ追加
--    （bonus-calculation-engine.ts で使用）
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "companyName"      VARCHAR(255);
ALTER TABLE "mlm_members" ADD COLUMN IF NOT EXISTS "companyNameKana"  VARCHAR(255);
