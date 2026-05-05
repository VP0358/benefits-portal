export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { parseDateJST } from "@/lib/japan-time"

// ワンタイムトークン（使用後に即削除するため簡易認証）
const INTERNAL_TOKEN = "772n9dtvNelczhSBL6nVSyjw3geWrGK3bBeCZyvCrug"

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function parseCSVDate(raw: string): Date | null {
  if (!raw?.trim()) return null
  const p = raw.trim().split("/")
  if (p.length !== 3) return null
  const y = parseInt(p[0], 10)
  const m = parseInt(p[1], 10)
  const d = parseInt(p[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  return parseDateJST(iso)
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token")
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: string[] = []
  const errors: string[] = []

  // ── 登録する3名のデータ ──
  const members = [
    {
      csvId:       "11703501",
      name:        "大鋸 好美",
      nameKana:    "オオガガ ヨシミ",
      email:       "",
      password:    "0000",
      status:      "autoship" as const,
      gender:      "female",
      birthDate:   "1962/3/11",
      contractDate:"2026/5/2",
      firstPayDate:"2026/5/2",
      mobile:      "090-1637-8481",
      postalCode:  "9391853",
      prefecture:  "富山県",
      city:        "南砺市城端69",
      bankName:    "北陸",
      bankCode:    "0144",
      branchName:  "本店営業部",
      branchCode:  "101",
      accountType: "普通",
      accountNumber: "6104362",
      accountHolder: "ｵｵｶﾞﾖｼﾐ",
      creditCardId: "47524693",
      disclosureDocNumber: "127815826",
      referrerCsvId: "93713604",
      uplineCsvId:   "93713604",
    },
    {
      csvId:       "76700701",
      name:        "土屋 昭子",
      nameKana:    "ツチヤ アキコ",
      email:       "soreyukeatashi@icloud.com",
      password:    "798219",
      status:      "autoship" as const,
      gender:      "female",
      birthDate:   "1969/10/15",
      contractDate:"2026/5/2",
      firstPayDate:"2026/5/2",
      mobile:      "090-9509-0928",
      postalCode:  "7010221",
      prefecture:  "岡山県",
      city:        "岡山市南区藤田648-70",
      bankName:    "",
      bankCode:    "",
      branchName:  "",
      branchCode:  "",
      accountType: "",
      accountNumber: "",
      accountHolder: "",
      creditCardId: "WC76700701",
      disclosureDocNumber: "129555587",
      referrerCsvId: "28864601",
      uplineCsvId:   "28864601",
    },
    {
      csvId:       "80521901",
      name:        "栗林 大輝",
      nameKana:    "クリバヤシ ダイキ",
      email:       "",
      password:    "0000",
      status:      "active" as const,
      gender:      "male",
      birthDate:   "1991/6/15",
      contractDate:"2026/5/1",
      firstPayDate:"2026/5/1",
      mobile:      "080-3244-8653",
      postalCode:  "1350061",
      prefecture:  "東京都",
      city:        "江東区豊洲パークアクシス豊洲キャナル1420",
      bankName:    "三井住友",
      bankCode:    "0009",
      branchName:  "青山",
      branchCode:  "258",
      accountType: "普通",
      accountNumber: "706000",
      accountHolder: "ｸﾘﾊﾞﾔｼﾀﾞｲｷ",
      creditCardId: "",
      disclosureDocNumber: "115314636",
      referrerCsvId: "48344002",
      uplineCsvId:   "48344002",
    },
  ]

  for (const m of members) {
    const memberCode = (() => {
      const mid = m.csvId.trim()
      if (mid.length < 3) return mid
      return `${mid.slice(0, mid.length - 2)}-${mid.slice(-2)}`
    })()

    try {
      // 既存チェック
      const existing = await prisma.mlmMember.findUnique({ where: { memberCode } })
      if (existing) {
        results.push(`[スキップ] ${memberCode} ${m.name} (既に存在)`)
        continue
      }

      const finalEmail = m.email || `member-${m.csvId}@noemail.viola-pure.net`

      // メール重複チェック
      const emailConflict = await prisma.user.findFirst({ where: { email: finalEmail } })
      if (emailConflict) {
        errors.push(`[エラー] ${memberCode} ${m.name}: メール重複 ${finalEmail}`)
        continue
      }

      const passwordHash = await hash(m.password, 10)
      const birthDate    = parseCSVDate(m.birthDate)
      const contractDate = parseCSVDate(m.contractDate)
      const firstPayDate = parseCSVDate(m.firstPayDate)
      const addressStr   = [m.prefecture, m.city].filter(Boolean).join(" ")
      const paymentMethod = m.creditCardId ? "credit_card" : (m.bankCode && m.accountNumber ? "bank_transfer" : "credit_card")
      const autoshipEnabled = m.status === "autoship"

      const newUser = await prisma.user.create({
        data: {
          memberCode,
          name:       m.name,
          nameKana:   m.nameKana || undefined,
          email:      finalEmail,
          passwordHash,
          status:     "active",
          phone:      m.mobile || undefined,
          postalCode: m.postalCode || undefined,
          address:    addressStr || undefined,
        },
      })

      await prisma.mlmMember.create({
        data: {
          userId:          newUser.id,
          memberCode,
          memberType:      "business",
          status:          m.status,
          gender:          m.gender || undefined,
          birthDate:       birthDate ?? undefined,
          contractDate:    contractDate ?? undefined,
          firstPayDate:    firstPayDate ?? undefined,
          mobile:          m.mobile || undefined,
          prefecture:      m.prefecture || undefined,
          city:            m.city || undefined,
          bankName:        m.bankName || undefined,
          bankCode:        m.bankCode || undefined,
          branchName:      m.branchName || undefined,
          branchCode:      m.branchCode || undefined,
          accountType:     m.accountType || undefined,
          accountNumber:   m.accountNumber || undefined,
          accountHolder:   m.accountHolder || undefined,
          creditCardId:    m.creditCardId || undefined,
          paymentMethod,
          autoshipEnabled,
          autoshipStartDate: autoshipEnabled ? (contractDate ?? undefined) : undefined,
        },
      })

      // PointWallet 作成
      await prisma.pointWallet.create({
        data: {
          userId:                 newUser.id,
          autoPointsBalance:      0,
          manualPointsBalance:    0,
          externalPointsBalance:  0,
          availablePointsBalance: 0,
        },
      })

      // MlmRegistration (概要書面番号)
      if (m.disclosureDocNumber) {
        await prisma.mlmRegistration.upsert({
          where:  { userId: newUser.id },
          create: { userId: newUser.id, disclosureDocNumber: m.disclosureDocNumber },
          update: { disclosureDocNumber: m.disclosureDocNumber },
        })
      }

      results.push(`[新規作成] ${memberCode} ${m.name} (PW: ${m.password})`)
    } catch (e) {
      errors.push(`[エラー] ${memberCode} ${m.name}: ${e}`)
    }
  }

  // ── 紹介者・直上者の紐づけ ──
  const linkResults: string[] = []
  for (const m of members) {
    const memberCode = (() => {
      const mid = m.csvId.trim()
      return `${mid.slice(0, mid.length - 2)}-${mid.slice(-2)}`
    })()
    const toMC = (id: string) => `${id.slice(0, id.length - 2)}-${id.slice(-2)}`

    const member = await prisma.mlmMember.findUnique({ where: { memberCode }, select: { id: true } })
    if (!member) continue

    const upd: Record<string, bigint | null> = {}

    if (m.referrerCsvId && m.referrerCsvId !== m.csvId) {
      const ref = await prisma.mlmMember.findUnique({ where: { memberCode: toMC(m.referrerCsvId) }, select: { id: true } })
      if (ref) upd.referrerId = ref.id
      else linkResults.push(`[警告] 紹介者 ${toMC(m.referrerCsvId)} がDBに存在しません`)
    }
    if (m.uplineCsvId && m.uplineCsvId !== m.csvId) {
      const up = await prisma.mlmMember.findUnique({ where: { memberCode: toMC(m.uplineCsvId) }, select: { id: true } })
      if (up) upd.uplineId = up.id
      else linkResults.push(`[警告] 直上者 ${toMC(m.uplineCsvId)} がDBに存在しません`)
    }

    if (Object.keys(upd).length > 0) {
      try {
        await prisma.mlmMember.update({ where: { id: member.id }, data: upd })
        linkResults.push(`[紐づけ] ${memberCode} OK`)
      } catch (e) {
        linkResults.push(`[紐づけエラー] ${memberCode}: ${e}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    results,
    errors,
    linkResults,
  })
}
