export const dynamic   = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/app/api/admin/route-guard"

// 代理店リスト
export const AGENCY_LIST = [
  "ANHELO富山店",
  "ANHELO砺波店",
  "ANHELO遠野店",
  "ANHELO仙台店",
  "ANHELO群馬店",
  "ANHELO名古屋店",
  "ANHELO営業部",
]

// ステータスラベル
const STATUS_LABEL: Record<string, string> = {
  pending:    "申込中",
  active:     "有効",
  contacted:  "連絡済",
  contracted: "契約済",
  canceled:   "解約済",
  suspended:  "停止中",
}

function toStr(v: bigint | null | undefined) {
  return v != null ? v.toString() : null
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(req.url)
  const tab      = searchParams.get("tab")    ?? "all"    // all | mobile | travel | car | life | non_life
  const search   = searchParams.get("search") ?? ""
  const agency   = searchParams.get("agency") ?? ""
  const status   = searchParams.get("status") ?? ""
  const page     = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const limit    = 40
  const skip     = (page - 1) * limit

  // ── 個人検索モード ───────────────────────────────
  // searchがあるとき：全カテゴリから該当ユーザーの全契約を返す
  if (search.trim()) {
    const q = search.trim()
    // ユーザー検索条件
    const userWhere = {
      OR: [
        { memberCode: { contains: q, mode: "insensitive" as const } },
        { name:       { contains: q, mode: "insensitive" as const } },
        { email:      { contains: q, mode: "insensitive" as const } },
      ],
    }

    const [mobile, travel, cars, insurances] = await Promise.all([
      // 携帯契約
      prisma.mobileContract.findMany({
        where: { user: userWhere },
        include: {
          user:     { select: { id: true, memberCode: true, name: true, email: true } },
          referrer: { select: { id: true, memberCode: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      // 旅行サブスク
      prisma.travelSubscription.findMany({
        where: { user: userWhere },
        include: {
          user: {
            select: {
              id: true, memberCode: true, name: true, email: true,
              referrals: {
                where: { isActive: true },
                include: { referrer: { select: { id: true, memberCode: true, name: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      // 中古車
      prisma.usedCarApplication.findMany({
        where: {
          OR: [
            { user: userWhere },
            { name:     { contains: q, mode: "insensitive" } },
            { memberId: { contains: q, mode: "insensitive" } },
            { email:    { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          user:     { select: { id: true, memberCode: true, name: true, email: true } },
          referrer: { select: { id: true, memberCode: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      // 保険
      prisma.insuranceApplication.findMany({
        where: {
          OR: [
            { user: userWhere },
            { name:     { contains: q, mode: "insensitive" } },
            { memberId: { contains: q, mode: "insensitive" } },
            { email:    { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          user: { select: { id: true, memberCode: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ])

    const rows = [
      ...mobile.map(r => ({
        category: "mobile", categoryLabel: "携帯契約",
        id: r.id.toString(),
        memberCode: r.user.memberCode, userName: r.user.name, email: r.user.email,
        detail: r.planName + (r.contractNumber ? ` (${r.contractNumber})` : ""),
        status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
        referrerOrAgency: r.referrer ? `${r.referrer.memberCode} ${r.referrer.name}` : "―",
        createdAt: r.createdAt.toISOString(),
      })),
      ...travel.map(r => ({
        category: "travel", categoryLabel: "旅行サブスク",
        id: r.id.toString(),
        memberCode: r.user.memberCode, userName: r.user.name, email: r.user.email,
        detail: `${r.planName} Lv${r.level} ¥${Number(r.monthlyFee).toLocaleString()}/月`,
        status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
        referrerOrAgency: r.user.referrals[0]?.referrer
          ? `${r.user.referrals[0].referrer.memberCode} ${r.user.referrals[0].referrer.name}` : "―",
        createdAt: r.createdAt.toISOString(),
      })),
      ...cars.map(r => ({
        category: "car", categoryLabel: "中古車",
        id: r.id.toString(),
        memberCode: r.memberId ?? r.user?.memberCode ?? "―",
        userName: r.user?.name ?? r.name,
        email: r.user?.email ?? r.email,
        detail: `${r.carType} ${r.grade} ${r.year} ${r.mileage}km`,
        status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
        referrerOrAgency: r.referrer ? `${r.referrer.memberCode} ${r.referrer.name}` : "―",
        createdAt: r.createdAt.toISOString(),
      })),
      ...insurances.map(r => ({
        category: r.insuranceType === "life" ? "life" : "non_life",
        categoryLabel: r.insuranceType === "life" ? "生命保険" : "損害保険",
        id: r.id.toString(),
        memberCode: r.memberId ?? r.user?.memberCode ?? "―",
        userName: r.user?.name ?? r.name,
        email: r.user?.email ?? r.email,
        detail: r.insuranceType === "life" ? "生命保険相談"
          : `損害保険相談: ${r.products ? (() => { try { return JSON.parse(r.products).join("・") } catch { return r.products } })() : ""}`,
        status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
        referrerOrAgency: r.agency,
        createdAt: r.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return NextResponse.json({ rows, total: rows.length, page: 1, totalPages: 1, searchMode: true })
  }

  // ── タブ別一覧モード ─────────────────────────────
  const includeCategories = tab === "all"
    ? ["mobile", "travel", "car", "life", "non_life"]
    : [tab]

  // サマリー（各カテゴリ件数）
  const [mobileCount, travelCount, carCount, lifeCount, nonLifeCount] = await Promise.all([
    prisma.mobileContract.count(),
    prisma.travelSubscription.count(),
    prisma.usedCarApplication.count(),
    prisma.insuranceApplication.count({ where: { insuranceType: "life" } }),
    prisma.insuranceApplication.count({ where: { insuranceType: "non_life" } }),
  ])

  // 代理店別サマリー（保険のみ）
  const agencySummary: Record<string, { life: number; nonLife: number }> = {}
  for (const ag of AGENCY_LIST) agencySummary[ag] = { life: 0, nonLife: 0 }
  const agencyRows = await prisma.insuranceApplication.groupBy({
    by: ["agency", "insuranceType"],
    _count: { id: true },
  })
  for (const row of agencyRows) {
    if (!agencySummary[row.agency]) agencySummary[row.agency] = { life: 0, nonLife: 0 }
    if (row.insuranceType === "life") agencySummary[row.agency].life += row._count.id
    else agencySummary[row.agency].nonLife += row._count.id
  }

  // データ取得
  let rows: object[] = []
  let total = 0

  if (tab === "mobile" || tab === "all") {
    const mWhere: { status?: string } = {}
    if (status) mWhere.status = status
    const [cnt, data] = await Promise.all([
      prisma.mobileContract.count({ where: mWhere }),
      prisma.mobileContract.findMany({
        where: mWhere,
        include: {
          user:     { select: { id: true, memberCode: true, name: true, email: true } },
          referrer: { select: { id: true, memberCode: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "mobile" ? skip : 0,
        take:  tab === "mobile" ? limit : 10,
      }),
    ])
    if (tab === "mobile") total = cnt
    rows = [...rows, ...data.map(r => ({
      category: "mobile", categoryLabel: "携帯契約",
      id: r.id.toString(),
      memberCode: r.user.memberCode, userName: r.user.name, email: r.user.email,
      detail: r.planName + (r.contractNumber ? ` (${r.contractNumber})` : ""),
      monthlyFee: Number(r.monthlyFee),
      status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
      referrerOrAgency: r.referrer ? `${r.referrer.memberCode} ${r.referrer.name}` : "―",
      createdAt: r.createdAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
    }))]
  }

  if (tab === "travel" || tab === "all") {
    const tWhere: { status?: string } = {}
    if (status) tWhere.status = status
    const [cnt, data] = await Promise.all([
      prisma.travelSubscription.count({ where: tWhere }),
      prisma.travelSubscription.findMany({
        where: tWhere,
        include: {
          user: {
            select: {
              id: true, memberCode: true, name: true, email: true,
              referrals: {
                where: { isActive: true },
                include: { referrer: { select: { id: true, memberCode: true, name: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "travel" ? skip : 0,
        take:  tab === "travel" ? limit : 10,
      }),
    ])
    if (tab === "travel") total = cnt
    rows = [...rows, ...data.map(r => ({
      category: "travel", categoryLabel: "旅行サブスク",
      id: r.id.toString(),
      memberCode: r.user.memberCode, userName: r.user.name, email: r.user.email,
      detail: `${r.planName} Lv${r.level}`,
      monthlyFee: Number(r.monthlyFee),
      status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
      referrerOrAgency: r.user.referrals[0]?.referrer
        ? `${r.user.referrals[0].referrer.memberCode} ${r.user.referrals[0].referrer.name}` : "―",
      createdAt: r.createdAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
    }))]
  }

  if (tab === "car" || tab === "all") {
    const cWhere: { status?: string } = {}
    if (status) cWhere.status = status
    const [cnt, data] = await Promise.all([
      prisma.usedCarApplication.count({ where: cWhere }),
      prisma.usedCarApplication.findMany({
        where: cWhere,
        include: {
          user:     { select: { id: true, memberCode: true, name: true, email: true } },
          referrer: { select: { id: true, memberCode: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: tab === "car" ? skip : 0,
        take:  tab === "car" ? limit : 10,
      }),
    ])
    if (tab === "car") total = cnt
    rows = [...rows, ...data.map(r => ({
      category: "car", categoryLabel: "中古車",
      id: r.id.toString(),
      memberCode: r.memberId ?? r.user?.memberCode ?? "―",
      userName: r.user?.name ?? r.name,
      email: r.user?.email ?? r.email,
      detail: `${r.carType} ${r.grade} ${r.year}年 ${r.mileage}km`,
      status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
      referrerOrAgency: r.referrer ? `${r.referrer.memberCode} ${r.referrer.name}` : "―",
      createdAt: r.createdAt.toISOString(),
      startedAt: null,
    }))]
  }

  if (tab === "life" || tab === "non_life" || tab === "all") {
    const iWhere: { insuranceType?: string; agency?: string; status?: string } = {}
    if (tab === "life")     iWhere.insuranceType = "life"
    if (tab === "non_life") iWhere.insuranceType = "non_life"
    if (agency) iWhere.agency = agency
    if (status) iWhere.status = status
    const [cnt, data] = await Promise.all([
      prisma.insuranceApplication.count({ where: iWhere }),
      prisma.insuranceApplication.findMany({
        where: iWhere,
        include: {
          user: { select: { id: true, memberCode: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (tab === "life" || tab === "non_life") ? skip : 0,
        take:  (tab === "life" || tab === "non_life") ? limit : 10,
      }),
    ])
    if (tab === "life" || tab === "non_life") total = cnt
    rows = [...rows, ...data.map(r => ({
      category: r.insuranceType === "life" ? "life" : "non_life",
      categoryLabel: r.insuranceType === "life" ? "生命保険" : "損害保険",
      id: r.id.toString(),
      memberCode: r.memberId ?? r.user?.memberCode ?? "―",
      userName: r.user?.name ?? r.name,
      email: r.user?.email ?? r.email,
      detail: r.insuranceType === "life"
        ? `生命保険相談 | ${r.schedule1}`
        : `損害保険相談 ${r.products ? (() => { try { return JSON.parse(r.products).join("・") } catch { return r.products } })() : ""} | ${r.schedule1}`,
      status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
      referrerOrAgency: r.agency,
      createdAt: r.createdAt.toISOString(),
      startedAt: null,
    }))]
  }

  // all タブはcreatedAt降順でソート
  if (tab === "all") {
    rows = (rows as Array<{ createdAt: string } & Record<string, unknown>>)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(skip, skip + limit)
    total = mobileCount + travelCount + carCount + lifeCount + nonLifeCount
  }

  return NextResponse.json({
    rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: { mobile: mobileCount, travel: travelCount, car: carCount, life: lifeCount, nonLife: nonLifeCount },
    agencySummary,
    searchMode: false,
  })
}

// ── ステータス更新 PATCH ─────────────────────────────────
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { category, id, status, adminNote } = await req.json()
  const rid = BigInt(id)

  try {
    if (category === "mobile") {
      await prisma.mobileContract.update({ where: { id: rid }, data: { status, ...(adminNote !== undefined ? { note: adminNote } : {}) } })
    } else if (category === "travel") {
      await prisma.travelSubscription.update({ where: { id: rid }, data: { status } })
    } else if (category === "car") {
      await prisma.usedCarApplication.update({ where: { id: rid }, data: { status, ...(adminNote !== undefined ? { adminNote } : {}) } })
    } else if (category === "life" || category === "non_life") {
      await prisma.insuranceApplication.update({ where: { id: rid }, data: { status, ...(adminNote !== undefined ? { adminNote } : {}) } })
    } else {
      return NextResponse.json({ error: "unknown category" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[welfare-contracts PATCH]", err)
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
  }
}
