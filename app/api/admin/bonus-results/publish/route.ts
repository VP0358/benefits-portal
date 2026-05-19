// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/bonus-results/publish
 * ボーナス明細の公開/非公開を切替
 *
 * 公開時の貯金ポイント付与ロジック（修正済み）:
 *   ボーナス計算エンジンが計算した savingsPointsAdded（×10で整数保存）を使用。
 *   savingsPointsAdded ÷ 10 = 実際のポイント数（小数第1位まで）。
 *
 *   計算エンジンの内訳:
 *     A: 自己購入pt × 20%（商品1000を1個以上購入の場合）
 *     B: AS伝票合計pt × 5%（当月AS伝票・入金あり1件以上の場合）
 *     C: グループポイント × 3%（当月ボーナス取得者の場合）
 *
 *   ❌ 旧実装（誤り）: paymentAmount（支払金額・円）× 3% → 円をポイントに換算していた
 *   ✅ 新実装（正しい）: savingsPointsAdded ÷ 10 をそのままポイントとしてPointWalletに付与
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
      // 計算エンジンが算出した savingsPointsAdded（×10で整数保存）を取得
      // ÷10 で実際のポイント数（小数第1位まで）に戻す
      // PointWalletへの加算は整数のみ対応のため Math.floor で切り捨て
      const savingsPointsRaw = currentResult.savingsPointsAdded ?? 0; // ×10整数
      const savingsPoints = Math.floor(savingsPointsRaw / 10);        // 実ポイント（整数部）

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

        // savingsPointsAdded は計算エンジンの値をそのまま保持（上書きしない）

        console.log(`💰 貯金ポイント付与: ${memberCode} +${savingsPoints}pt (計算エンジン算出: ${savingsPointsRaw / 10}pt)`);
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
