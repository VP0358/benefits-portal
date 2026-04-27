import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { currentAndLastMonthJST } from '@/lib/japan-time'

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

    const { currentMonth: currentMonthStr, lastMonth: lastMonthStr } = currentAndLastMonthJST()

    // 先月のmlmPurchaseポイント集計
    const lastMonthAgg = await prisma.mlmPurchase.aggregate({
      where: {
        mlmMemberId: user.mlmMember.id,
        purchaseMonth: lastMonthStr
      },
      _sum: {
        totalPoints: true,
        unitPrice: true,
        quantity: true
      }
    })

    // 今月のmlmPurchaseポイント集計
    const currentMonthAgg = await prisma.mlmPurchase.aggregate({
      where: {
        mlmMemberId: user.mlmMember.id,
        purchaseMonth: currentMonthStr
      },
      _sum: {
        totalPoints: true,
        unitPrice: true,
        quantity: true
      }
    })

    const lastMonthPoints = lastMonthAgg._sum.totalPoints ?? 0
    const currentMonthPoints = currentMonthAgg._sum.totalPoints ?? 0

    // 購入金額（unitPrice × quantity の合計）
    const lastMonthPurchaseAmount = (lastMonthAgg._sum.unitPrice ?? 0) * (lastMonthAgg._sum.quantity ?? 1)
    const currentMonthPurchaseAmount = (currentMonthAgg._sum.unitPrice ?? 0) * (currentMonthAgg._sum.quantity ?? 1)

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
