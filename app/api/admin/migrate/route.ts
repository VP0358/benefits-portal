export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/migrate
 * 必要なDBマイグレーションを実行する（管理者専用）
 * bonus_results テーブルへの不足カラム追加
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { step: string; status: string; detail?: string }[] = [];

  // ADD COLUMN IF NOT EXISTS を安全に実行するヘルパー
  const addCol = async (step: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push({ step, status: "OK" });
    } catch (e) {
      results.push({ step, status: "SKIP", detail: String(e) });
    }
  };

  try {
    // ── bonus_results: 公開フラグ ──
    await addCol("bonus_results.isPublished",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false`);
    await addCol("bonus_results.publishedAt",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)`);

    // ── bonus_results: 貯金カラム ──
    await addCol("bonus_results.savingsPoints",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPoints" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.savingsPointsAdded",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPointsAdded" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.savingsPtAFromRegistration",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "savingsPtAFromRegistration" BOOLEAN NOT NULL DEFAULT false`);

    // ── bonus_results: 称号レベル ──
    await addCol("bonus_results.previousTitleLevel",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "previousTitleLevel" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.forcedLevel",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "forcedLevel" INTEGER NOT NULL DEFAULT 0`);

    // ── bonus_results: 組織データ ──
    await addCol("bonus_results.groupActiveCount",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "groupActiveCount" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.minLinePoints",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "minLinePoints" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.lineCount",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "lineCount" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.level1Lines",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level1Lines" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.level2Lines",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level2Lines" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.level3Lines",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "level3Lines" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.conditions",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "conditions" VARCHAR(500)`);

    // ── bonus_results: 支払い計算 ──
    await addCol("bonus_results.paymentAdjustmentRate",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentRate" DOUBLE PRECISION NOT NULL DEFAULT 0`);
    await addCol("bonus_results.paymentAdjustmentAmount",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAdjustmentAmount" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.amountBeforeAdjustment",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "amountBeforeAdjustment" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.finalAmount",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "finalAmount" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.withholdingTax",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "withholdingTax" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.serviceFee",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "serviceFee" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.paymentAmount",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "paymentAmount" INTEGER NOT NULL DEFAULT 0`);
    await addCol("bonus_results.adjustmentAmount",
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "adjustmentAmount" INTEGER NOT NULL DEFAULT 0`);

    // ── bonus_results: updatedAt に DEFAULT を付与 ──
    // 初期マイグレーションで NOT NULL DEFAULT なしで作られているため
    await addCol("bonus_results.updatedAt DEFAULT",
      `ALTER TABLE "bonus_results" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);

    // ── インデックス ──
    await addCol("index_isPublished",
      `CREATE INDEX IF NOT EXISTS "bonus_results_isPublished_idx" ON "bonus_results"("isPublished")`);

    // ══════════════════════════════════════════════════════════════
    // 会員別継続購入商品設定テーブル (mlm_member_autoship_items)
    // ══════════════════════════════════════════════════════════════
    await addCol("create_mlm_member_autoship_items",
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
      )`);
    await addCol("index_autoship_items_memberId",
      `CREATE INDEX IF NOT EXISTS "mlm_member_autoship_items_mlmMemberId_idx" ON "mlm_member_autoship_items"("mlmMemberId")`);
    await addCol("fk_autoship_items_member",
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'mlm_member_autoship_items_mlmMemberId_fkey'
        ) THEN
          ALTER TABLE "mlm_member_autoship_items"
            ADD CONSTRAINT "mlm_member_autoship_items_mlmMemberId_fkey"
            FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`);

    // ══════════════════════════════════════════════════════════════
    // 会員対応履歴メモテーブル (mlm_member_contact_memos)
    // ══════════════════════════════════════════════════════════════
    await addCol("create_mlm_member_contact_memos",
      `CREATE TABLE IF NOT EXISTS "mlm_member_contact_memos" (
        "id"           BIGSERIAL NOT NULL,
        "mlmMemberId"  BIGINT NOT NULL,
        "content"      TEXT NOT NULL,
        "category"     VARCHAR(50),
        "authorName"   VARCHAR(100),
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "mlm_member_contact_memos_pkey" PRIMARY KEY ("id")
      )`);
    await addCol("index_contact_memos_memberId",
      `CREATE INDEX IF NOT EXISTS "mlm_member_contact_memos_mlmMemberId_idx" ON "mlm_member_contact_memos"("mlmMemberId")`);
    await addCol("fk_contact_memos_member",
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'mlm_member_contact_memos_mlmMemberId_fkey'
        ) THEN
          ALTER TABLE "mlm_member_contact_memos"
            ADD CONSTRAINT "mlm_member_contact_memos_mlmMemberId_fkey"
            FOREIGN KEY ("mlmMemberId") REFERENCES "mlm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`);

    return NextResponse.json({
      success: true,
      message: "マイグレーション完了",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "マイグレーション失敗", detail: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate
 * 現在のDBカラム状態を確認する
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const colCheck = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bonus_results'
      ORDER BY column_name
    `;

    const cols = colCheck.map((r: { column_name: string }) => r.column_name);

    const required = [
      "isPublished", "publishedAt",
      "savingsPoints", "savingsPointsAdded", "savingsPtAFromRegistration",
      "previousTitleLevel", "forcedLevel",
      "groupActiveCount", "minLinePoints", "lineCount",
      "level1Lines", "level2Lines", "level3Lines",
      "paymentAdjustmentRate", "paymentAdjustmentAmount",
      "amountBeforeAdjustment", "finalAmount",
      "withholdingTax", "serviceFee", "paymentAmount", "adjustmentAmount",
      "updatedAt",
    ];

    const missing = required.filter(c => !cols.includes(c));

    return NextResponse.json({
      columns: cols,
      required,
      missing,
      needsMigration: missing.length > 0,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
