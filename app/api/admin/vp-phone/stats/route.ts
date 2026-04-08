import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * VP Phone契約統計データ取得API
 * GET /api/admin/vp-phone/stats
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

    // 全VP Phone申込を取得
    const allApplications = await prisma.vpPhoneApplication.findMany({
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

    const totalApplications = allApplications.length

    // ステータス別集計
    const pendingCount = allApplications.filter(a => a.status === 'pending').length
    const approvedCount = allApplications.filter(a => a.status === 'approved').length
    const rejectedCount = allApplications.filter(a => a.status === 'rejected').length
    const activeCount = allApplications.filter(a => a.status === 'active').length
    const canceledCount = allApplications.filter(a => a.status === 'canceled').length

    // キャリア別集計
    const carrierMap = new Map<string, number>()
    allApplications.forEach(app => {
      const carrier = app.carrier || '未設定'
      carrierMap.set(carrier, (carrierMap.get(carrier) || 0) + 1)
    })

    const carrierDistribution = Array.from(carrierMap.entries())
      .map(([carrier, count]) => ({ carrier, count }))
      .sort((a, b) => b.count - a.count)

    // プラン別集計
    const planMap = new Map<string, number>()
    allApplications.forEach(app => {
      const plan = app.plan || '未設定'
      planMap.set(plan, (planMap.get(plan) || 0) + 1)
    })

    const planDistribution = Array.from(planMap.entries())
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count)

    // 年齢分布（生年月日から計算）
    const ageRanges = [
      { range: '20歳未満', min: 0, max: 19 },
      { range: '20-29歳', min: 20, max: 29 },
      { range: '30-39歳', min: 30, max: 39 },
      { range: '40-49歳', min: 40, max: 49 },
      { range: '50-59歳', min: 50, max: 59 },
      { range: '60-69歳', min: 60, max: 69 },
      { range: '70歳以上', min: 70, max: 999 },
    ]

    const ageDistribution = ageRanges.map(ageRange => {
      const count = allApplications.filter(app => {
        if (!app.birthDate) return false
        const age = new Date().getFullYear() - new Date(app.birthDate).getFullYear()
        return age >= ageRange.min && age <= ageRange.max
      }).length
      return {
        range: ageRange.range,
        count
      }
    })

    // 性別分布
    const genderDistribution = [
      { gender: '男性', count: allApplications.filter(a => a.gender === 'male').length },
      { gender: '女性', count: allApplications.filter(a => a.gender === 'female').length },
      { gender: '未設定', count: allApplications.filter(a => !a.gender).length },
    ]

    // 都道府県別集計
    const prefectureMap = new Map<string, number>()
    allApplications.forEach(app => {
      const pref = app.prefecture || '未設定'
      prefectureMap.set(pref, (prefectureMap.get(pref) || 0) + 1)
    })

    const prefectureDistribution = Array.from(prefectureMap.entries())
      .map(([prefecture, count]) => ({ prefecture, count }))
      .sort((a, b) => b.count - a.count)

    // 月別申込数（過去12ヶ月）
    const now = new Date()
    const monthlyApplications = []
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth() + 1
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      
      const count = allApplications.filter(app => {
        const createdAt = new Date(app.createdAt)
        return createdAt.getFullYear() === year && createdAt.getMonth() + 1 === month
      }).length

      monthlyApplications.push({
        month: monthStr,
        count
      })
    }

    return NextResponse.json({
      totalApplications,
      pendingCount,
      approvedCount,
      rejectedCount,
      activeCount,
      canceledCount,
      carrierDistribution,
      planDistribution,
      ageDistribution,
      genderDistribution,
      prefectureDistribution,
      monthlyApplications
    })

  } catch (error) {
    console.error('VP Phone統計取得エラー:', error)
    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
