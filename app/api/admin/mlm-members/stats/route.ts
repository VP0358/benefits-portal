import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { currentYearJST, nowJST } from '@/lib/japan-time'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * MLM会員統計データ取得API
 * GET /api/admin/mlm-members/stats
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

    // 全MLM会員を取得
    const allMembers = await prisma.mlmMember.findMany({
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

    const totalMembers = allMembers.length

    // ステータス別集計
    const activeMembersCount = allMembers.filter(m => m.status === 'active').length
    const suspendedMembersCount = allMembers.filter(m => m.status === 'suspended').length
    const inactiveMembersCount = allMembers.filter(m => m.status === 'inactive').length

    // 会員種別集計
    const businessMembersCount = allMembers.filter(m => m.memberType === 'business').length
    const consumerMembersCount = allMembers.filter(m => m.memberType === 'consumer').length

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
      const count = allMembers.filter(member => {
        if (!member.birthDate) return false
        const age = currentYearJST() - new Date(member.birthDate).getUTCFullYear()
        return age >= ageRange.min && age <= ageRange.max
      }).length
      return {
        range: ageRange.range,
        count
      }
    })

    // 性別分布
    const genderDistribution = [
      { gender: '男性', count: allMembers.filter(m => m.gender === 'male').length },
      { gender: '女性', count: allMembers.filter(m => m.gender === 'female').length },
      { gender: '未設定', count: allMembers.filter(m => !m.gender).length },
    ]

    // 都道府県別集計
    const prefectureMap = new Map<string, number>()
    allMembers.forEach(member => {
      const pref = member.prefecture || '未設定'
      prefectureMap.set(pref, (prefectureMap.get(pref) || 0) + 1)
    })

    const prefectureDistribution = Array.from(prefectureMap.entries())
      .map(([prefecture, count]) => ({ prefecture, count }))
      .sort((a, b) => b.count - a.count)

    // レベル別集計
    const levelMap = new Map<number, number>()
    allMembers.forEach(member => {
      const level = member.currentLevel || 0
      levelMap.set(level, (levelMap.get(level) || 0) + 1)
    })

    const levelDistribution = Array.from(levelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level)

    // 月別登録数（過去12ヶ月）
    const jstNow = nowJST();
    const jstY0  = jstNow.getUTCFullYear();
    const jstM0  = jstNow.getUTCMonth(); // 0-based
    const monthlyRegistrations = []
    for (let i = 11; i >= 0; i--) {
      // JST 基準で i ヶ月前の年月を計算
      const totalMonths = jstY0 * 12 + jstM0 - i;
      const year  = Math.floor(totalMonths / 12);
      const month = (totalMonths % 12) + 1; // 1-based
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      
      const count = allMembers.filter(member => {
        // createdAt は UTC Date。JST に換算して比較
        const jstCreated = new Date(new Date(member.createdAt).getTime() + 9*60*60*1000);
        return jstCreated.getUTCFullYear() === year && jstCreated.getUTCMonth() + 1 === month
      }).length

      monthlyRegistrations.push({
        month: monthStr,
        count
      })
    }

    // 支払い方法分布
    const paymentMethodMap = new Map<string, number>()
    allMembers.forEach(member => {
      const method = member.paymentMethod || 'unknown'
      const methodLabel = 
        method === 'credit_card' ? 'クレジットカード' :
        method === 'bank_transfer' ? '銀行振込' :
        method === 'bank_payment' ? '銀行支払い' :
        method === 'cash_on_delivery' ? '代金引換' :
        '未設定'
      paymentMethodMap.set(methodLabel, (paymentMethodMap.get(methodLabel) || 0) + 1)
    })

    const paymentMethodDistribution = Array.from(paymentMethodMap.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      totalMembers,
      activeMembersCount,
      suspendedMembersCount,
      inactiveMembersCount,
      businessMembersCount,
      consumerMembersCount,
      ageDistribution,
      genderDistribution,
      prefectureDistribution,
      levelDistribution,
      monthlyRegistrations,
      paymentMethodDistribution
    })

  } catch (error) {
    console.error('MLM統計取得エラー:', error)
    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
