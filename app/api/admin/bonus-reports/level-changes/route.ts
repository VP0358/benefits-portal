import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-reports/level-changes?bonusMonth=2026-02
 * レベル昇格・降格者一覧を取得
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
    const results = await prisma.bonusResult.findMany({
      where: {
        bonusMonth,
        NOT: {
          previousTitleLevel: 0,
        },
      },
      include: {
        mlmMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { newTitleLevel: "desc" },
    });

    // レベル変動があったものだけフィルタ
    const levelChanges = results
      .filter((r) => r.previousTitleLevel !== r.newTitleLevel)
      .map((r) => ({
        memberCode: r.mlmMember.memberCode,
        memberName: r.mlmMember.user.name,
        previousLevel: r.previousTitleLevel,
        newLevel: r.newTitleLevel,
        changeType:
          r.newTitleLevel > r.previousTitleLevel ? "promotion" : "demotion",
      }));

    return NextResponse.json({ levelChanges });
  } catch (error) {
    console.error("Error fetching level changes:", error);
    return NextResponse.json(
      { error: "Failed to fetch level changes" },
      { status: 500 }
    );
  }
}
