import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 管理者用MLMポイント取得API
 * GET /api/admin/mlm-points?memberCode=123456-01
 * 
 * クエリパラメータ:
 * - memberCode: MLM会員コード（必須）
 * 
 * 返却データ:
 * - lastMonthPoints: 先月のMLMポイント
 * - currentMonthPoints: 今月の昨日時点のMLMポイント
 * - lastMonthPurchaseAmount: 先月の購入金額
 * - currentMonthPurchaseAmount: 今月の購入金額（昨日まで）
 * - memberCode: 会員コード
 * - memberName: 会員名
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 管理者チェック
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!admin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const memberCode = searchParams.get('memberCode')

    if (!memberCode) {
      return NextResponse.json({ error: '会員コードが必要です' }, { status: 400 })
    }

    // MLM会員情報取得
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
      include: {
        user: true
      }
    })

    if (!mlmMember) {
      return NextResponse.json({ error: '会員が見つかりません' }, { status: 404 })
    }

    // 先月・今月の月文字列を計算
    const now = new Date()
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 先月のmlmPurchaseポイント集計
    const lastMonthAgg = await prisma.mlmPurchase.aggregate({
      where: {
        mlmMemberId: mlmMember.id,
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
        mlmMemberId: mlmMember.id,
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
      memberCode: mlmMember.memberCode,
      memberName: mlmMember.user.name
    })

  } catch (error) {
    console.error('MLMポイント取得エラー:', error)
    return NextResponse.json(
      { error: 'MLMポイントの取得に失敗しました' },
      { status: 500 }
    )
  }
}
