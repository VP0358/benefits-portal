/**
 * スタートアップ時自動マイグレーション
 * サーバー起動時 (instrumentation.ts) から呼ばれる
 * 全SQL は IF NOT EXISTS / DO $$ ... $$ 形式で冪等（何度実行しても安全）
 */

import { prisma } from "./prisma";

async function exec(label: string, sql: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`[startup-migrate] ✅ ${label}`);
  } catch (e) {
    // 既存テーブル/カラムの場合は SKIP（エラーではない）
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate column") ||
      msg.includes("42701") || // duplicate_column
      msg.includes("42P07")    // duplicate_table
    ) {
      console.log(`[startup-migrate] ⏭️  ${label} (already exists)`);
    } else {
      console.warn(`[startup-migrate] ⚠️  ${label}: ${msg}`);
    }
  }
}

export async function runStartupMigrations(): Promise<void> {
  console.log("[startup-migrate] 開始...");

  // ══════════════════════════════════════════════════════════════
  // 会員別継続購入商品設定 (mlm_member_autoship_items)
  // ══════════════════════════════════════════════════════════════
  await exec(
    "CREATE mlm_member_autoship_items",
    `CREATE TABLE IF NOT EXISTS "mlm_member_autoship_items" (
      "id"           BIGSERIAL NOT NULL,
      "mlmMemberId"  BIGINT NOT NULL,
      "productCode"  VARCHAR(20) NOT NULL,
      "productName"  VARCHAR(255) NOT NULL,
      "unitPrice"    INTEGER NOT NULL,
      "quantity"     INTEGER NOT NULL DEFAULT 1,
      "points"       INTEGER NOT NULL DEFAULT 0,
      "taxRate"      INTEGER NOT NULL DEFAULT 10,
      "feeAmount"    INTEGER NOT NULL DEFAULT 0,
      "sortOrder"    INTEGER NOT NULL DEFAULT 0,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "mlm_member_autoship_items_pkey" PRIMARY KEY ("id")
    )`
  );

  await exec(
    "INDEX mlm_member_autoship_items_mlmMemberId_idx",
    `CREATE INDEX IF NOT EXISTS "mlm_member_autoship_items_mlmMemberId_idx"
     ON "mlm_member_autoship_items"("mlmMemberId")`
  );

  await exec(
    "FK mlm_member_autoship_items → mlm_members",
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'mlm_member_autoship_items_mlmMemberId_fkey'
          AND table_name = 'mlm_member_autoship_items'
      ) THEN
        ALTER TABLE "mlm_member_autoship_items"
          ADD CONSTRAINT "mlm_member_autoship_items_mlmMemberId_fkey"
          FOREIGN KEY ("mlmMemberId")
          REFERENCES "mlm_members"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`
  );

  // ══════════════════════════════════════════════════════════════
  // 会員対応履歴メモ (mlm_member_contact_memos)
  // ══════════════════════════════════════════════════════════════
  await exec(
    "CREATE mlm_member_contact_memos",
    `CREATE TABLE IF NOT EXISTS "mlm_member_contact_memos" (
      "id"           BIGSERIAL NOT NULL,
      "mlmMemberId"  BIGINT NOT NULL,
      "content"      TEXT NOT NULL,
      "category"     VARCHAR(50),
      "authorName"   VARCHAR(100),
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "mlm_member_contact_memos_pkey" PRIMARY KEY ("id")
    )`
  );

  await exec(
    "INDEX mlm_member_contact_memos_mlmMemberId_idx",
    `CREATE INDEX IF NOT EXISTS "mlm_member_contact_memos_mlmMemberId_idx"
     ON "mlm_member_contact_memos"("mlmMemberId")`
  );

  await exec(
    "FK mlm_member_contact_memos → mlm_members",
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'mlm_member_contact_memos_mlmMemberId_fkey'
          AND table_name = 'mlm_member_contact_memos'
      ) THEN
        ALTER TABLE "mlm_member_contact_memos"
          ADD CONSTRAINT "mlm_member_contact_memos_mlmMemberId_fkey"
          FOREIGN KEY ("mlmMemberId")
          REFERENCES "mlm_members"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`
  );

  console.log("[startup-migrate] 完了");
}
