-- 貯金ボーナスA仮付与フラグをBonusResultに追加
-- 登録月に初回購入で付与されたA分を翌月チェックするためのフラグ

ALTER TABLE "bonus_results"
  ADD COLUMN IF NOT EXISTS "savingsPtAFromRegistration" BOOLEAN NOT NULL DEFAULT false;
