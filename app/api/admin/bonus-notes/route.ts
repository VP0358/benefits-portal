import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-notes?bonusMonth=2026-02
 * ボーナス明細書備考を取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
      select: { note: true },
    });

    return NextResponse.json({
      note: bonusRun?.note || "",
    });
  } catch (error) {
    console.error("Error fetching bonus note:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus note" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bonus-notes
 * ボーナス明細書備考を保存
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, note } = body;

    if (!bonusMonth) {
      return NextResponse.json(
        { error: "bonusMonth required" },
        { status: 400 }
      );
    }

    // ボーナス実行が存在するか確認
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
    });

    if (!bonusRun) {
      return NextResponse.json(
        { error: "Bonus run not found for this month" },
        { status: 404 }
      );
    }

    // 備考を更新
    await prisma.bonusRun.update({
      where: { bonusMonth },
      data: { note: note || "" },
    });

    return NextResponse.json({
      success: true,
      message: "備考を保存しました",
    });
  } catch (error) {
    console.error("Error saving bonus note:", error);
    return NextResponse.json(
      { error: "Failed to save bonus note" },
      { status: 500 }
    );
  }
}
