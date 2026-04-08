import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 旅行サブスク統計データ取得API
 * GET /api/admin/travel-subscriptions/stats
 */
export async function GET() {
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

    // 全旅行サブスク契約を取得
    const allSubscriptions = await prisma.travelSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      }
    })

    const totalSubscriptions = allSubscriptions.length

    // ステータス別集計
    const pendingCount = allSubscriptions.filter(s => s.status === 'pending').length
    const activeCount = allSubscriptions.filter(s => s.status === 'active').length
    const canceledCount = allSubscriptions.filter(s => s.status === 'canceled').length
    const suspendedCount = allSubscriptions.filter(s => s.status === 'suspended').length

    // レベル別集計
    const levelMap = new Map<number, number>()
    allSubscriptions.forEach(sub => {
      const level = sub.level || 1
      levelMap.set(level, (levelMap.get(level) || 0) + 1)
    })

    const levelDistribution = Array.from(levelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level)

    // プライシング層別集計
    const pricingTierMap = new Map<string, number>()
    allSubscriptions.forEach(sub => {
      const tier = sub.pricingTier || 'standard'
      pricingTierMap.set(tier, (pricingTierMap.get(tier) || 0) + 1)
    })

    const pricingTierDistribution = Array.from(pricingTierMap.entries())
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count)

    // 月額料金帯別集計
    const feeRanges = [
      { range: '~¥5,000', min: 0, max: 5000 },
      { range: '¥5,001-¥10,000', min: 5001, max: 10000 },
      { range: '¥10,001-¥15,000', min: 10001, max: 15000 },
      { range: '¥15,001-¥20,000', min: 15001, max: 20000 },
      { range: '¥20,001~', min: 20001, max: 9999999 },
    ]

    const monthlyFeeDistribution = feeRanges.map(feeRange => {
      const count = allSubscriptions.filter(sub => {
        const fee = Number(sub.monthlyFee)
        return fee >= feeRange.min && fee <= feeRange.max
      }).length
      return {
        range: feeRange.range,
        count
      }
    })

    // 年齢分布（会員情報から取得が必要なため、実際の実装ではUserテーブルの生年月日を参照）
    // 現在はダミーデータ
    const ageDistribution = [
      { range: '20歳未満', count: 0 },
      { range: '20-29歳', count: 0 },
      { range: '30-39歳', count: 0 },
      { range: '40-49歳', count: 0 },
      { range: '50-59歳', count: 0 },
      { range: '60-69歳', count: 0 },
      { range: '70歳以上', count: 0 },
    ]

    // 性別分布（会員情報から取得が必要）
    const genderDistribution = [
      { gender: '男性', count: 0 },
      { gender: '女性', count: 0 },
      { gender: '未設定', count: totalSubscriptions },
    ]

    // 都道府県別集計（会員情報から取得が必要）
    const prefectureDistribution = [
      { prefecture: '未設定', count: totalSubscriptions }
    ]

    // 月別契約数（過去12ヶ月）
    const now = new Date()
    const monthlySubscriptions = []
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth() + 1
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      
      const count = allSubscriptions.filter(sub => {
        const createdAt = new Date(sub.createdAt)
        return createdAt.getFullYear() === year && createdAt.getMonth() + 1 === month
      }).length

      monthlySubscriptions.push({
        month: monthStr,
        count
      })
    }

    return NextResponse.json({
      totalSubscriptions,
      pendingCount,
      activeCount,
      canceledCount,
      suspendedCount,
      levelDistribution,
      pricingTierDistribution,
      ageDistribution,
      genderDistribution,
      prefectureDistribution,
      monthlySubscriptions,
      monthlyFeeDistribution
    })

  } catch (error) {
    console.error('旅行サブスク統計取得エラー:', error)
    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
