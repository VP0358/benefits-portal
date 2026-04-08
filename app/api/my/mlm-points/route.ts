import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 会員用MLMポイント取得API
 * GET /api/my/mlm-points
 * 
 * 返却データ:
 * - lastMonthPoints: 先月のMLMポイント
 * - currentMonthPoints: 今月の昨日時点のMLMポイント
 * - lastMonthPurchaseAmount: 先月の購入金額
 * - currentMonthPurchaseAmount: 今月の購入金額（昨日まで）
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        mlmMember: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    if (!user.mlmMember) {
      return NextResponse.json({
        lastMonthPoints: 0,
        currentMonthPoints: 0,
        lastMonthPurchaseAmount: 0,
        currentMonthPurchaseAmount: 0,
        message: 'MLM会員ではありません'
      })
    }

    // 先月の範囲を計算
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // 今月の範囲を計算（昨日まで）
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const currentMonthEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

    // 先月の購入データ取得
    const lastMonthOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        orderedAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      },
      include: {
        items: true
      }
    })

    // 今月の購入データ取得（昨日まで）
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        orderedAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      },
      include: {
        items: true
      }
    })

    // 先月の購入金額集計
    const lastMonthPurchaseAmount = lastMonthOrders.reduce((sum, order) => {
      return sum + order.totalAmount
    }, 0)

    // 今月の購入金額集計（昨日まで）
    const currentMonthPurchaseAmount = currentMonthOrders.reduce((sum, order) => {
      return sum + order.totalAmount
    }, 0)

    // ポイント計算（1pt = 100円）
    const lastMonthPoints = Math.floor(lastMonthPurchaseAmount / 100)
    const currentMonthPoints = Math.floor(currentMonthPurchaseAmount / 100)

    return NextResponse.json({
      lastMonthPoints,
      currentMonthPoints,
      lastMonthPurchaseAmount,
      currentMonthPurchaseAmount,
      memberCode: user.mlmMember.memberCode,
      memberName: user.name
    })

  } catch (error) {
    console.error('MLMポイント取得エラー:', error)
    return NextResponse.json(
      { error: 'MLMポイントの取得に失敗しました' },
      { status: 500 }
    )
  }
}
