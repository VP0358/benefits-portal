/**
 * POST /api/admin/bonus-run/reset-savings
 * mlm_members.savingsPoints を全員0にリセットする緊急API
 * Integer overflowで積み上がった異常値をクリアする
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // mlm_members の savingsPoints を全員0にリセット
    const memberResult = await prisma.mlmMember.updateMany({
      data: { savingsPoints: 0 },
    });

    // bonus_results の savingsPoints / savingsPointsAdded も0にリセット
    await prisma.$executeRawUnsafe(
      `UPDATE "bonus_results" SET "savingsPoints" = 0, "savingsPointsAdded" = 0`
    );

    return NextResponse.json({
      ok: true,
      message: `savingsPointsをリセットしました（会員: ${memberResult.count}名）`,
      memberCount: memberResult.count,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
