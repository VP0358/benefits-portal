export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/migrate
 * 必要なDBマイグレーションを実行する（管理者専用）
 * bonus_results テーブルへの isPublished / publishedAt カラム追加など
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { step: string; status: string; detail?: string }[] = [];

  try {
    // Step 1: bonus_results に isPublished カラムを追加
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false`
      );
      results.push({ step: "bonus_results.isPublished", status: "OK" });
    } catch (e) {
      results.push({ step: "bonus_results.isPublished", status: "SKIP", detail: String(e) });
    }

    // Step 2: bonus_results に publishedAt カラムを追加
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)`
      );
      results.push({ step: "bonus_results.publishedAt", status: "OK" });
    } catch (e) {
      results.push({ step: "bonus_results.publishedAt", status: "SKIP", detail: String(e) });
    }

    // Step 3: インデックス追加
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "bonus_results_isPublished_idx" ON "bonus_results"("isPublished")`
      );
      results.push({ step: "index_isPublished", status: "OK" });
    } catch (e) {
      results.push({ step: "index_isPublished", status: "SKIP", detail: String(e) });
    }

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
    // bonus_results の isPublished カラムが存在するか確認
    const colCheck = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bonus_results'
      AND column_name IN ('isPublished', 'publishedAt')
      ORDER BY column_name
    `;

    const hasIsPublished = colCheck.some(r => r.column_name === "isPublished");
    const hasPublishedAt = colCheck.some(r => r.column_name === "publishedAt");

    return NextResponse.json({
      bonus_results: {
        isPublished: hasIsPublished,
        publishedAt: hasPublishedAt,
      },
      needsMigration: !hasIsPublished || !hasPublishedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
