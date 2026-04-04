-- TravelSubscription に forceStatus フィールドを追加
-- 'none'     = 通常（自動判定）
-- 'forced_active'   = 管理者が強制アクティブ
-- 'forced_inactive' = 管理者が強制非アクティブ
ALTER TABLE "TravelSubscription" ADD COLUMN "forceStatus" VARCHAR(20) NOT NULL DEFAULT 'none';
