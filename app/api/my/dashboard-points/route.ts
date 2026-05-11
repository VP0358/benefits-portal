/**
 * 会員ダッシュボード用ポイント情報API
 * GET /api/my/dashboard-points
 *
 * 返却データ:
 * - mlmLastMonthPoints:    MLM先月ポイント（VPpt）
 * - mlmCurrentMonthPoints: MLM今月ポイント（VPpt、リアルタイム）
 * - savingsBonusPoints:    貯金ボーナス累計（会員DB MlmMember.savingsPoints と紐づけ）
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';
import { currentAndLastMonthJST } from '@/lib/japan-time';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = BigInt(session.user.id);

    // MLM会員情報取得（savingsPoints を含む）
    const mlmMember = await prisma.mlmMember.findFirst({
      where: { userId },
      select: { id: true, savingsPoints: true },
    });

    let mlmLastMonthPoints = 0;
    let mlmCurrentMonthPoints = 0;

    // MLMポイント計算（mlmPurchaseテーブルから取得）
    if (mlmMember) {
      const { currentMonth: currentMonthStr, lastMonth: lastMonthStr } = currentAndLastMonthJST();

      const [lastMonthAgg, currentMonthAgg] = await Promise.all([
        prisma.mlmPurchase.aggregate({
          where: { mlmMemberId: mlmMember.id, purchaseMonth: lastMonthStr },
          _sum: { totalPoints: true },
        }),
        prisma.mlmPurchase.aggregate({
          where: { mlmMemberId: mlmMember.id, purchaseMonth: currentMonthStr },
          _sum: { totalPoints: true },
        }),
      ]);

      mlmLastMonthPoints    = lastMonthAgg._sum.totalPoints    ?? 0;
      mlmCurrentMonthPoints = currentMonthAgg._sum.totalPoints ?? 0;
    }

    // 貯金ボーナス累計 — MlmMember.savingsPoints と直結
    const savingsBonusPoints = mlmMember?.savingsPoints ?? 0;

    return NextResponse.json({
      mlmLastMonthPoints,
      mlmCurrentMonthPoints,
      savingsBonusPoints,
    });

  } catch (error) {
    console.error('ダッシュボードポイント取得エラー:', error);
    return NextResponse.json(
      { error: 'ポイント情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
