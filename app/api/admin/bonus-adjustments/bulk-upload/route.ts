// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";



import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/bonus-adjustments/bulk-upload
 * Excelから調整金を一括登録
 * 
 * Body: {
 *   bonusMonth: "2026-02",
 *   items: [
 *     { memberCode: "M001", amount: 10000, comment: "特別調整", isTaxable: true },
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
        const { memberCode, amount, comment, isTaxable } = item;

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

        // 対象月のBonusRunを検索（あれば紐付け、なければnull）
        const bonusRun = await prisma.bonusRun.findUnique({
          where: { bonusMonth },
        });

        // 調整金を作成
        await prisma.bonusAdjustment.create({
          data: {
            bonusMonth,
            mlmMemberId: mlmMember.id,
            ...(bonusRun ? { bonusRunId: bonusRun.id } : {}),
            adjustmentType: "manual", // 手動入力
            amount: Number(amount),
            comment: comment || "",
            isTaxable: isTaxable ?? true,
            isLocked: false,
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
    console.error("Error bulk uploading bonus adjustments:", error);
    return NextResponse.json(
      { error: "Failed to bulk upload" },
      { status: 500 }
    );
  }
}
