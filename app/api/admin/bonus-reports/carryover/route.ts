import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-reports/carryover?bonusMonth=2026-02
 * 繰越金リストを取得
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
        carryoverAmount: {
          gt: 0,
        },
      },
      include: {
        mlmMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { carryoverAmount: "desc" },
    });

    const carryover = results.map((r) => ({
      memberCode: r.mlmMember.memberCode,
      memberName: r.mlmMember.user.name,
      companyName: r.mlmMember.companyName,
      amount: r.carryoverAmount,
    }));

    return NextResponse.json({ carryover });
  } catch (error) {
    console.error("Error fetching carryover:", error);
    return NextResponse.json(
      { error: "Failed to fetch carryover" },
      { status: 500 }
    );
  }
}
