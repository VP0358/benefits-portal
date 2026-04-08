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
import prisma from "@/lib/prisma";

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

    // MLMポイント計算（1pt = 100円）
    if (mlmMember) {
      const now = new Date();
      
      // 先月の範囲
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      
      // 今月の範囲（昨日まで）
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      // 先月の購入額集計
      const lastMonthOrders = await prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId,
          orderedAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd
          }
        },
        _sum: {
          totalAmount: true
        }
      });

      if (lastMonthOrders.length > 0 && lastMonthOrders[0]._sum.totalAmount) {
        mlmLastMonthPoints = Math.floor(lastMonthOrders[0]._sum.totalAmount / 100);
      }

      // 今月（昨日まで）の購入額集計
      const currentMonthOrders = await prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId,
          orderedAt: {
            gte: currentMonthStart,
            lte: yesterday
          }
        },
        _sum: {
          totalAmount: true
        }
      });

      if (currentMonthOrders.length > 0 && currentMonthOrders[0]._sum.totalAmount) {
        mlmCurrentMonthPoints = Math.floor(currentMonthOrders[0]._sum.totalAmount / 100);
      }
    }

    // 貯金ボーナスポイント（SAVpt）
    // TODO: 実際のボーナス計算ロジックに置き換え
    // 例: 自動積立や特定条件達成時のボーナス
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
