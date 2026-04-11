// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/bonus-results/publish
 * ボーナス明細の公開/非公開を切替
 * 公開時：savingsBonusRate(3%)分の貯金ポイントを付与
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

    // 現在の公開状態を確認
    const currentResult = await prisma.bonusResult.findFirst({
      where: {
        mlmMemberId: mlmMember.id,
        bonusMonth,
      },
    });

    if (!currentResult) {
      return NextResponse.json({ error: "Bonus result not found" }, { status: 404 });
    }

    const wasPublished = currentResult.isPublished ?? false;
    const willPublish = Boolean(isPublished);

    // ボーナス結果の公開状態を更新
    await prisma.bonusResult.updateMany({
      where: {
        mlmMemberId: mlmMember.id,
        bonusMonth,
      },
      data: {
        isPublished: willPublish,
        publishedAt: willPublish ? new Date() : null,
      },
    });

    // 公開に切り替わった場合（非公開→公開）のみ貯金ポイントを付与
    if (willPublish && !wasPublished) {
      const paymentAmount = currentResult.paymentAmount ?? 0;

      // 貯金ボーナス設定を取得（デフォルト3%）
      const savingsConfig = await prisma.savingsBonusConfig.findFirst();
      const bonusRate = savingsConfig?.bonusRate ?? 3.0;

      const savingsPoints = Math.floor(paymentAmount * (bonusRate / 100));

      if (savingsPoints > 0) {
        // ポイントウォレットを更新
        await prisma.pointWallet.upsert({
          where: { userId: mlmMember.userId },
          create: {
            userId: mlmMember.userId,
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
          where: { id: mlmMember.id },
          data: {
            savingsPoints: { increment: savingsPoints },
          },
        });

        // ボーナス結果に貯金ポイント付与数を記録
        await prisma.bonusResult.updateMany({
          where: {
            mlmMemberId: mlmMember.id,
            bonusMonth,
          },
          data: {
            savingsPointsAdded: savingsPoints,
          },
        });

        console.log(`💰 貯金ポイント付与: ${memberCode} +${savingsPoints}pt (報酬${paymentAmount}円の${bonusRate}%)`);
      }
    }

    return NextResponse.json({
      success: true,
      isPublished: willPublish,
      message: willPublish ? "ボーナス明細を公開しました" : "ボーナス明細を非公開にしました",
    });
  } catch (error) {
    console.error("Error updating bonus result publish status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
