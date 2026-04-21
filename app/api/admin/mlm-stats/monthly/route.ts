// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/app/api/admin/route-guard'

/**
 * MLM 月次統計データ取得 API
 * GET /api/admin/mlm-stats/monthly?year=2025&month=4
 *
 * 返却データ:
 *  - period          : 対象年月
 *  - snapshot        : その月末時点の各種集計
 *    - totalMembers, activeMembers, newMembers, churnedMembers
 *    - ageDistribution
 *    - genderDistribution
 *    - prefectureDistribution
 *    - levelDistribution
 *    - memberTypeDistribution
 *    - paymentMethodDistribution
 *    - autoshipStats (継続率・停止率・新規開始数 等)
 *    - bonusSummary  (受取人数・総支払額・平均支払額)
 *    - registrationTrend (過去12ヶ月の月別登録数)
 *    - retentionTrend    (過去12ヶ月の月末アクティブ数推移)
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = req.nextUrl
  const now = new Date()
  const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()),  10)
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10)

  // 対象月の開始・終了
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd   = new Date(year, month,     0, 23, 59, 59, 999)

  try {
    // ── 全会員（スナップショット用） ──────────────────────────────────
    const allMembers = await prisma.mlmMember.findMany({
      select: {
        id:              true,
        status:          true,
        memberType:      true,
        currentLevel:    true,
        paymentMethod:   true,
        gender:          true,
        prefecture:      true,
        birthDate:       true,
        autoshipEnabled: true,
        autoshipStartDate: true,
        autoshipStopDate:  true,
        autoshipSuspendMonths: true,
        createdAt:       true,
        contractDate:    true,
      }
    })

    // 対象月に登録された会員
    const newMembers = allMembers.filter(m => {
      const d = m.createdAt
      return d >= periodStart && d <= periodEnd
    })

    // ② 総会員数 = active + autoship ステータスの会員（活動中＋オートシップ）
    const activeAndAutoshipMembers = allMembers.filter(m => m.status === 'active' || m.status === 'autoship')
    // 旧: activeMembers (status=active のみ) → 後方互換のため残す
    const activeMembers = allMembers.filter(m => m.status === 'active')

    // ── 年齢分布 ──────────────────────────────────────────────────────
    const ageRanges = [
      { label: '20歳未満', min: 0,  max: 19  },
      { label: '20-29歳', min: 20, max: 29  },
      { label: '30-39歳', min: 30, max: 39  },
      { label: '40-49歳', min: 40, max: 49  },
      { label: '50-59歳', min: 50, max: 59  },
      { label: '60-69歳', min: 60, max: 69  },
      { label: '70歳以上', min: 70, max: 999 },
      { label: '未設定',  min: -1, max: -1  },
    ]

    const calcAge = (birthDate: Date | null): number | null => {
      if (!birthDate) return null
      const today = new Date(year, month - 1, periodEnd.getDate())
      let age = today.getFullYear() - birthDate.getFullYear()
      const m2 = today.getMonth() - birthDate.getMonth()
      if (m2 < 0 || (m2 === 0 && today.getDate() < birthDate.getDate())) age--
      return age
    }

    const ageDistribution = ageRanges.map(r => {
      const count = allMembers.filter(m => {
        const age = calcAge(m.birthDate)
        if (r.min === -1) return age === null
        if (age === null)  return false
        return age >= r.min && age <= r.max
      }).length
      return { label: r.label, count }
    })

    // ── 性別分布 ──────────────────────────────────────────────────────
    const genderDistribution = [
      { label: '男性',  count: allMembers.filter(m => m.gender === 'male').length   },
      { label: '女性',  count: allMembers.filter(m => m.gender === 'female').length },
      { label: 'その他', count: allMembers.filter(m => m.gender === 'other').length },
      { label: '未設定', count: allMembers.filter(m => !m.gender).length             },
    ]

    // ── 都道府県分布 ─────────────────────────────────────────────────
    const prefMap = new Map<string, number>()
    allMembers.forEach(m => {
      const p = m.prefecture || '未設定'
      prefMap.set(p, (prefMap.get(p) ?? 0) + 1)
    })
    const prefectureDistribution = Array.from(prefMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    // ── レベル分布 ────────────────────────────────────────────────────
    const levelMap = new Map<number, number>()
    allMembers.forEach(m => {
      const lv = m.currentLevel ?? 0
      levelMap.set(lv, (levelMap.get(lv) ?? 0) + 1)
    })
    const levelDistribution = Array.from(levelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level)

    // ── 会員種別分布 ──────────────────────────────────────────────────
    const memberTypeDistribution = [
      { label: 'ビジネス会員', count: allMembers.filter(m => m.memberType === 'business').length  },
      { label: 'コンシューマ',  count: allMembers.filter(m => m.memberType === 'consumer').length },
    ]

    // ── 支払い方法分布 ────────────────────────────────────────────────
    const methodLabel = (m: string | null) =>
      m === 'credit_card'     ? 'クレジットカード' :
      m === 'bank_transfer'   ? '銀行振込'       :
      m === 'bank_payment'    ? '銀行支払い'      :
      m === 'cash_on_delivery' ? '代金引換'       : '未設定'

    const payMap = new Map<string, number>()
    allMembers.forEach(m => {
      const lbl = methodLabel(m.paymentMethod)
      payMap.set(lbl, (payMap.get(lbl) ?? 0) + 1)
    })
    const paymentMethodDistribution = Array.from(payMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    // ── オートシップ統計 ──────────────────────────────────────────────
    const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`

    // 現在オートシップ有効（autoshipEnabled フラグ）
    const autoshipActive = allMembers.filter(m => m.autoshipEnabled).length

    // 対象月に停止（autoshipSuspendMonths に対象月が含まれる）
    const autoshipSuspendedThisMonth = allMembers.filter(m => {
      if (!m.autoshipSuspendMonths) return false
      return m.autoshipSuspendMonths.split(',').map(s => s.trim()).includes(targetMonthStr)
    }).length

    // 対象月に新規オートシップ開始
    const autoshipNewThisMonth = allMembers.filter(m => {
      if (!m.autoshipStartDate) return false
      const d = m.autoshipStartDate
      return d.getFullYear() === year && d.getMonth() + 1 === month
    }).length

    // 対象月に停止（autoshipStopDate が対象月内）
    const autoshipStoppedThisMonth = allMembers.filter(m => {
      if (!m.autoshipStopDate) return false
      const d = m.autoshipStopDate
      return d.getFullYear() === year && d.getMonth() + 1 === month
    }).length

    // ① オートシップ率 = 入金済みオートシップ伝票がある会員数 ÷ 総会員数（active+autoship）
    // 対象月内に slipType='autoship' かつ paymentStatus='paid' の伝票を持つ会員数を DB から直接集計
    // ※ テーブル名は "Order"（大文字）、mlm_members（スネークケース）
    const autoshipPaidMembersResult = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(DISTINCT mm.id) AS cnt
      FROM mlm_members mm
      INNER JOIN "Order" o ON o."userId" = mm."userId"
      WHERE o."slipType" = 'autoship'
        AND o."paymentStatus" = 'paid'
        AND o."paidAt" >= ${periodStart}
        AND o."paidAt" <= ${periodEnd}
        AND mm.status IN ('active', 'autoship')
    `
    const autoshipPaidMembersCount = Number(autoshipPaidMembersResult[0]?.cnt ?? 0)

    // ② 総会員数 = active + autoship ステータスの会員数
    const totalActiveAutoshipCount = activeAndAutoshipMembers.length

    // オートシップ率 = 入金済みオートシップ伝票がある会員数 ÷ 総会員数（active+autoship）
    const autoshipRetentionRate =
      totalActiveAutoshipCount > 0
        ? Math.round((autoshipPaidMembersCount / totalActiveAutoshipCount) * 1000) / 10
        : 0

    // オートシップ停止率（一時停止）
    const autoshipSuspendRate =
      autoshipActive > 0
        ? Math.round((autoshipSuspendedThisMonth / Math.max(autoshipActive, 1)) * 1000) / 10
        : 0

    const autoshipStats = {
      activeCount:            autoshipActive,
      paidAutoshipCount:      autoshipPaidMembersCount, // 入金済みオートシップ会員数
      retentionRate:          autoshipRetentionRate,    // %（入金済みオートシップ÷総会員数）
      suspendedThisMonth:     autoshipSuspendedThisMonth,
      suspendRate:            autoshipSuspendRate,       // %
      newStartThisMonth:      autoshipNewThisMonth,
      stoppedThisMonth:       autoshipStoppedThisMonth,
    }

    // ── ボーナスサマリー（対象月） ─────────────────────────────────
    let bonusSummary = {
      recipientCount: 0,
      totalAmount:    0,
      avgAmount:      0,
    }
    try {
      const bonusResults = await prisma.bonusResult.findMany({
        where: {
          bonusMonth: targetMonthStr,
          paymentAmount: { gt: 0 },
        },
        select: {
          mlmMemberId: true,
          paymentAmount: true,
        }
      })
      const recipientIds = new Set(bonusResults.map(b => b.mlmMemberId.toString()))
      const totalAmount  = bonusResults.reduce((s, b) => s + (b.paymentAmount ?? 0), 0)
      bonusSummary = {
        recipientCount: recipientIds.size,
        totalAmount,
        avgAmount: recipientIds.size > 0 ? Math.round(totalAmount / recipientIds.size) : 0,
      }
    } catch { /* BonusResult が存在しない場合は無視 */ }

    // ── 過去12ヶ月の登録数推移 ───────────────────────────────────────
    const registrationTrend: { month: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const mo = d.getMonth() + 1
      const label = `${y}-${String(mo).padStart(2, '0')}`
      const count = allMembers.filter(m => {
        return m.createdAt.getFullYear() === y && m.createdAt.getMonth() + 1 === mo
      }).length
      registrationTrend.push({ month: label, count })
    }

    // ── 過去12ヶ月のアクティブ会員数推移（月末時点で status=active or autoship の会員数を近似） ──
    // 厳密には月次スナップショットがないため、contractDate ベースの近似
    const retentionTrend: { month: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const mo = d.getMonth() + 1
      const label = `${y}-${String(mo).padStart(2, '0')}`
      // その月末時点で登録済みかつ現在アクティブ（active or autoship）な会員
      const monthEnd = new Date(y, mo, 0, 23, 59, 59, 999)
      const count = allMembers.filter(m =>
        (m.status === 'active' || m.status === 'autoship') && m.createdAt <= monthEnd
      ).length
      retentionTrend.push({ month: label, count })
    }

    // ── オートシップ継続率トレンド（過去12ヶ月） ──────────────────────
    // ※ トレンドはオートシップ有効数÷(active+autoship)で近似
    const autoshipTrend: { month: string; retentionRate: number; activeCount: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const mo = d.getMonth() + 1
      const label = `${y}-${String(mo).padStart(2, '0')}`
      const monthEnd = new Date(y, mo, 0, 23, 59, 59, 999)
      // その月末時点で active or autoship の会員数（総会員数基準）
      const totalAtMonth = allMembers.filter(m =>
        (m.status === 'active' || m.status === 'autoship') && m.createdAt <= monthEnd
      ).length
      // その月末時点でオートシップ有効な会員数
      const autoshipAtMonth = allMembers.filter(m => {
        if (!m.autoshipEnabled) return false
        if (!m.autoshipStartDate) return false
        if (m.autoshipStartDate > monthEnd) return false
        if (m.autoshipStopDate && m.autoshipStopDate <= monthEnd) return false
        return true
      }).length
      const rate = totalAtMonth > 0
        ? Math.round((autoshipAtMonth / totalAtMonth) * 1000) / 10
        : 0
      autoshipTrend.push({ month: label, retentionRate: rate, activeCount: autoshipAtMonth })
    }

    return NextResponse.json({
      period: { year, month, label: targetMonthStr },
      snapshot: {
        totalMembers:    totalActiveAutoshipCount,  // ② active+autoship の会員数を総会員数として返す
        activeMembers:   activeAndAutoshipMembers.length, // active+autoship
        newMembers:      newMembers.length,
        suspendedMembers: allMembers.filter(m => m.status === 'suspended').length,
        inactiveMembers:  allMembers.filter(m => m.status === 'inactive').length,
        allMembersTotal: allMembers.length, // 全ステータス含む総会員数（参考値）
      },
      ageDistribution,
      genderDistribution,
      prefectureDistribution,
      levelDistribution,
      memberTypeDistribution,
      paymentMethodDistribution,
      autoshipStats,
      bonusSummary,
      registrationTrend,
      retentionTrend,
      autoshipTrend,
    })

  } catch (error) {
    console.error('MLM月次統計エラー:', error)
    return NextResponse.json({ error: '統計データの取得に失敗しました' }, { status: 500 })
  }
}
