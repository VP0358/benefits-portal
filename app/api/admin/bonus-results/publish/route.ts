// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/bonus-results/publish
 * ボーナス明細の公開/非公開を切替
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { memberCode, bonusMonth, isPublished } = await req.json();

    if (!memberCode || !bonusMonth) {
      return NextResponse.json({ error: "memberCode and bonusMonth required" }, { status: 400 });
    }

    // 会員を検索
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // ボーナス結果の公開状態を更新
    const updated = await prisma.bonusResult.updateMany({
      where: {
        mlmMemberId: mlmMember.id,
        bonusMonth,
      },
      data: {
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Bonus result not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      isPublished: Boolean(isPublished),
      message: isPublished ? "ボーナス明細を公開しました" : "ボーナス明細を非公開にしました",
    });
  } catch (error) {
    console.error("Error updating bonus result publish status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
