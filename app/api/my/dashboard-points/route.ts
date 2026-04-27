/**
 * 会員ダッシュボード用ポイント情報API
 * GET /api/my/dashboard-points
 * 
 * 返却データ:
 * - mlmLastMonthPoints: MLM先月ポイント（VPpt）
 * - mlmCurrentMonthPoints: MLM今月昨日現在までのポイント（VPpt）
 * - savingsBonusPoints: 貯金ボーナスポイント（SAVpt）
 * - mobileReferralPoints: 携帯紹介ポイント（MPIpt）
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

    // MLM会員情報取得
    const mlmMember = await prisma.mlmMember.findFirst({
      where: { userId }
    });

    let mlmLastMonthPoints = 0;
    let mlmCurrentMonthPoints = 0;

    // MLMポイント計算（mlmPurchaseテーブルから取得）
    if (mlmMember) {
      const { currentMonth: currentMonthStr, lastMonth: lastMonthStr } = currentAndLastMonthJST();

      // 先月のmlmPurchaseポイント集計
      const lastMonthAgg = await prisma.mlmPurchase.aggregate({
        where: {
          mlmMemberId: mlmMember.id,
          purchaseMonth: lastMonthStr
        },
        _sum: {
          totalPoints: true
        }
      });

      // 今月のmlmPurchaseポイント集計
      const currentMonthAgg = await prisma.mlmPurchase.aggregate({
        where: {
          mlmMemberId: mlmMember.id,
          purchaseMonth: currentMonthStr
        },
        _sum: {
          totalPoints: true
        }
      });

      mlmLastMonthPoints = lastMonthAgg._sum.totalPoints ?? 0;
      mlmCurrentMonthPoints = currentMonthAgg._sum.totalPoints ?? 0;
    }

    // 貯金ボーナスポイント（SAVpt）
    // TODO: 実際のボーナス計算ロジックに置き換え
    const savingsBonusPoints = 0;

    // 携帯紹介ポイント（MPIpt）
    // VpPhoneApplicationテーブルから自分が紹介した契約を集計
    const mobileReferrals = await prisma.vpPhoneApplication.count({
      where: {
        referrerId: userId,
        status: 'contracted' // 契約済みのみカウント
      }
    });

    // 1契約につき1000ポイント（仮定）
    const mobileReferralPoints = mobileReferrals * 1000;

    return NextResponse.json({
      mlmLastMonthPoints,
      mlmCurrentMonthPoints,
      savingsBonusPoints,
      mobileReferralPoints
    });

  } catch (error) {
    console.error('ダッシュボードポイント取得エラー:', error);
    return NextResponse.json(
      { error: 'ポイント情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
