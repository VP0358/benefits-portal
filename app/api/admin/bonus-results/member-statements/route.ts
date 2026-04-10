// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-results/member-statements?memberCode=XXXX
 * 特定会員のボーナス明細一覧を取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const memberCode = searchParams.get("memberCode");

  if (!memberCode) {
    return NextResponse.json({ error: "memberCode required" }, { status: 400 });
  }

  try {
    // 会員を検索
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // ボーナス結果を取得（過去24ヶ月分）
    const results = await prisma.bonusResult.findMany({
      where: {
        mlmMemberId: mlmMember.id,
      },
      include: {
        bonusRun: {
          select: {
            bonusMonth: true,
            status: true,
            note: true,
            paymentAdjustmentRate: true,
          },
        },
      },
      orderBy: { bonusMonth: "desc" },
      take: 24,
    });

    const statements = results.map((r) => ({
      bonusMonth: r.bonusMonth,
      paymentAmount: r.paymentAmount ?? 0,
      directBonus: r.directBonus ?? 0,
      unilevelBonus: r.unilevelBonus ?? 0,
      structureBonus: r.structureBonus ?? 0,
      savingsBonus: r.savingsBonus ?? 0,
      adjustmentAmount: r.adjustmentAmount ?? 0,
      withholdingTax: r.withholdingTax ?? 0,
      carryoverAmount: r.carryoverAmount ?? 0,
      isPublished: r.isPublished ?? false,
      note: r.bonusRun?.note ?? null,
      runStatus: r.bonusRun?.status ?? "draft",
    }));

    return NextResponse.json({ statements });
  } catch (error) {
    console.error("Error fetching member bonus statements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
