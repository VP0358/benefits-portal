export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-results/publish-all?bonusMonth=2026-03
 * 指定月の公開状態サマリーを取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bonusMonth = req.nextUrl.searchParams.get("bonusMonth");
  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    const [total, published] = await Promise.all([
      prisma.bonusResult.count({ where: { bonusMonth } }),
      prisma.bonusResult.count({ where: { bonusMonth, isPublished: true } }),
    ]);

    return NextResponse.json({
      bonusMonth,
      total,
      published,
      unpublished: total - published,
      allPublished: total > 0 && total === published,
    });
  } catch (error) {
    console.error("Error fetching publish status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/bonus-results/publish-all
 * 指定月の全会員ボーナス明細を一括公開（または一括非公開）
 * body: { bonusMonth: "2026-03", isPublished: true }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bonusMonth, isPublished } = await req.json();

    if (!bonusMonth) {
      return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
    }

    // 確定済みのボーナスのみ対象
    const updated = await prisma.bonusResult.updateMany({
      where: {
        bonusMonth,
        bonusRun: { status: "confirmed" },
      },
      data: {
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updated.count,
      isPublished: Boolean(isPublished),
      message: isPublished
        ? `${bonusMonth}のボーナス明細を${updated.count}件公開しました`
        : `${bonusMonth}のボーナス明細を${updated.count}件非公開にしました`,
    });
  } catch (error) {
    console.error("Error bulk-publishing bonus results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
