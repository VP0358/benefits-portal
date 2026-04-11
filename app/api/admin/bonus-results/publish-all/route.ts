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
 * 公開時：各会員に savingsBonusRate(3%)分の貯金ポイントを付与
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

    const willPublish = Boolean(isPublished);

    // 公開する場合：まだ非公開の確定済みボーナス結果を取得して貯金ポイントを付与
    if (willPublish) {
      // 貯金ボーナス設定を取得（デフォルト3%）
      const savingsConfig = await prisma.savingsBonusConfig.findFirst();
      const bonusRate = savingsConfig?.bonusRate ?? 3.0;

      // 未公開の確定済みボーナス結果を取得
      const unpublishedResults = await prisma.bonusResult.findMany({
        where: {
          bonusMonth,
          isPublished: false,
          bonusRun: { status: "confirmed" },
          paymentAmount: { gt: 0 },
        },
        include: {
          mlmMember: {
            select: {
              id: true,
              memberCode: true,
              userId: true,
            },
          },
        },
      });

      // 各会員に貯金ポイントを付与
      let totalSavingsPoints = 0;
      for (const result of unpublishedResults) {
        const paymentAmount = result.paymentAmount ?? 0;
        const savingsPoints = Math.floor(paymentAmount * (bonusRate / 100));

        if (savingsPoints > 0) {
          await prisma.pointWallet.upsert({
            where: { userId: result.mlmMember.userId },
            create: {
              userId: result.mlmMember.userId,
              externalPointsBalance: savingsPoints,
              availablePointsBalance: savingsPoints,
            },
            update: {
              externalPointsBalance: { increment: savingsPoints },
              availablePointsBalance: { increment: savingsPoints },
            },
          });

          // MLM会員の貯金ポイント累計を更新
          await prisma.mlmMember.update({
            where: { id: result.mlmMember.id },
            data: {
              savingsPoints: { increment: savingsPoints },
            },
          });

          // ボーナス結果に貯金ポイント付与数を記録
          await prisma.bonusResult.update({
            where: { id: result.id },
            data: {
              savingsPointsAdded: savingsPoints,
            },
          });

          totalSavingsPoints += savingsPoints;
          console.log(`💰 貯金ポイント付与: ${result.mlmMember.memberCode} +${savingsPoints}pt`);
        }
      }

      console.log(`✅ 一括貯金ポイント付与完了: ${unpublishedResults.length}名 合計${totalSavingsPoints}pt`);
    }

    // 確定済みのボーナスのみ対象として公開状態を更新
    const updated = await prisma.bonusResult.updateMany({
      where: {
        bonusMonth,
        bonusRun: { status: "confirmed" },
      },
      data: {
        isPublished: willPublish,
        publishedAt: willPublish ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updated.count,
      isPublished: willPublish,
      message: willPublish
        ? `${bonusMonth}のボーナス明細を${updated.count}件公開しました`
        : `${bonusMonth}のボーナス明細を${updated.count}件非公開にしました`,
    });
  } catch (error) {
    console.error("Error bulk-publishing bonus results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
