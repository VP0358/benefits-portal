export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/migrate-bonus-adjustment
 * bonus_adjustmentsテーブルに不足カラムを追加するマイグレーション
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // 1. bonus_run_id を nullable に変更
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_adjustments" ALTER COLUMN "bonus_run_id" DROP NOT NULL`
      );
      results.push("✅ bonus_run_id を nullable に変更しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`⚠️ bonus_run_id nullable化: ${msg}`);
    }

    // 2. bonus_month カラム追加
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "bonus_month" CHAR(7) NOT NULL DEFAULT ''`
      );
      results.push("✅ bonus_month カラムを追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`⚠️ bonus_month: ${msg}`);
    }

    // 3. adjustment_type カラム追加
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "adjustment_type" VARCHAR(50) NOT NULL DEFAULT 'manual'`
      );
      results.push("✅ adjustment_type カラムを追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`⚠️ adjustment_type: ${msg}`);
    }

    // 4. is_taxable カラム追加
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "is_taxable" BOOLEAN NOT NULL DEFAULT true`
      );
      results.push("✅ is_taxable カラムを追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`⚠️ is_taxable: ${msg}`);
    }

    // 5. is_locked カラム追加
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_adjustments" ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN NOT NULL DEFAULT false`
      );
      results.push("✅ is_locked カラムを追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`⚠️ is_locked: ${msg}`);
    }

    // 6. bonus_month インデックス追加
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "bonus_adjustments_bonus_month_idx" ON "bonus_adjustments"("bonus_month")`
      );
      results.push("✅ bonus_month インデックスを追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`⚠️ index: ${msg}`);
    }

    // 7. 現在のテーブル構造を確認
    const columns = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string; is_nullable: string }[]>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'bonus_adjustments'
       ORDER BY ordinal_position`
    );

    return NextResponse.json({
      success: true,
      results,
      currentColumns: columns,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error), results }, { status: 500 });
  }
}
