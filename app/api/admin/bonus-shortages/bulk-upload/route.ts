import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/bonus-shortages/bulk-upload
 * Excelから過不足金を一括登録
 * 
 * Body: {
 *   bonusMonth: "2026-02",
 *   items: [
 *     { memberCode: "M001", amount: -5000, comment: "過払い調整" },
 *     ...
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, items } = body;

    if (!bonusMonth || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "bonusMonth and items array required" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      try {
        const { memberCode, amount, comment } = item;

        if (!memberCode || amount == null) {
          results.failed++;
          results.errors.push(`会員コード ${memberCode || "不明"}: 必須項目が不足`);
          continue;
        }

        // 会員コードからMLMメンバーを検索
        const mlmMember = await prisma.mlmMember.findUnique({
          where: { memberCode },
        });

        if (!mlmMember) {
          results.failed++;
          results.errors.push(`会員コード ${memberCode}: 会員が見つかりません`);
          continue;
        }

        // 過不足金を作成
        await prisma.bonusShortagePayment.create({
          data: {
            bonusMonth,
            mlmMemberId: mlmMember.id,
            amount: Number(amount),
            comment: comment || "",
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`会員コード ${item.memberCode}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error bulk uploading bonus shortages:", error);
    return NextResponse.json(
      { error: "Failed to bulk upload" },
      { status: 500 }
    );
  }
}
