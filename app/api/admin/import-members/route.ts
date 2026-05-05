export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/route-guard"
import { prisma } from "@/lib/prisma"
import Iconv from "iconv-lite"

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────

interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// ──────────────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────────────

/** CSVの会員ID → memberCode (XXXXXX-NN 形式)
 *  末尾2桁を枝番 (NN) とし、それ以外をベースコードとする汎用変換
 *  例: 10234001 → 102340-01 / 10885802 → 108858-02 / 99901 → 999-01
 */
function idToMemberCode(mid: string): string {
  mid = mid.trim()
  if (mid.length < 3) return mid  // 変換不可
  const base = mid.slice(0, mid.length - 2)
  const pos  = mid.slice(-2)
  return `${base}-${pos}`
}

/** "YYYY/M/D" → Date (UTC 00:00:00) | null */
function parseDate(raw: string): Date | null {
  if (!raw?.trim()) return null
  const p = raw.trim().split("/")
  if (p.length !== 3) return null
  const y = parseInt(p[0], 10)
  const m = parseInt(p[1], 10) - 1
  const d = parseInt(p[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(Date.UTC(y, m, d))
}

/** CSVステータス → DB enum */
function toStatus(raw: string) {
  const map: Record<string, "active" | "autoship" | "withdrawn"> = {
    "活動中": "active",
    "オートシップ": "autoship",
    "退会": "withdrawn",
    "クーリングオフ": "withdrawn",
  }
  return map[raw.trim()] ?? "active"
}

/** 性別 → male / female / other / null */
function toGender(raw: string): string | null {
  const map: Record<string, string> = { "男性": "male", "女性": "female", "法人": "other" }
  return map[raw.trim()] ?? null
}

/** "レベルN" → number | null */
function toForceLevel(raw: string): number | null {
  const m = raw.match(/レベル(\d)/)
  return m ? parseInt(m[1], 10) : null
}

/** CP932 バイト列 → 文字列[][] (CSV パース) */
function parseCp932Csv(buffer: Buffer): string[][] {
  const text = Iconv.decode(buffer, "cp932")
  const rows: string[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ""
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === "," && !inQ) {
        cols.push(cur); cur = ""
      } else {
        cur += c
      }
    }
    cols.push(cur)
    rows.push(cols)
  }
  return rows
}

// ──────────────────────────────────────────────
// POST /api/admin/import-members
// multipart/form-data で CSV ファイルを受け取る
// ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const result: ImportResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 })
    }

    // ── CSV パース ──
    const buf = Buffer.from(await file.arrayBuffer())
    const rows = parseCp932Csv(buf)
    if (rows.length < 2) {
      return NextResponse.json({ error: "CSVが空です" }, { status: 400 })
    }

    const header = rows[0]
    const data   = rows.slice(1)
    const idx: Record<string, number> = {}
    header.forEach((h, i) => { idx[h.trim()] = i })

    const g = (row: string[], col: string) => (row[idx[col]] ?? "").trim()

    result.total = data.length

    // ── 既存 MlmMember を memberCode → id+userId マップ化 ──
    const existingMembers = await prisma.mlmMember.findMany({
      select: { id: true, memberCode: true, userId: true },
    })
    const existingMap = new Map(existingMembers.map(m => [m.memberCode, m]))

    // ── Pass 1: User + MlmMember の upsert ──
    for (const row of data) {
      const csvId = g(row, "会員ID")
      if (!csvId) continue

      const memberCode   = idToMemberCode(csvId)
      const name         = g(row, "名前").replace(/\u3000/g, " ").trim()
      const nameKana     = g(row, "フリガナ").replace(/\u3000/g, " ").trim()
      const email        = g(row, "Eメールアドレス").toLowerCase()
      const status       = toStatus(g(row, "ステイタス"))
      const gender       = toGender(g(row, "性別"))
      const birthDate    = parseDate(g(row, "生年月日"))
      const contractDate = parseDate(g(row, "契約締結日"))
      const firstPayDate = parseDate(g(row, "初回入金日"))
      const forceLevel   = toForceLevel(g(row, "強制レベル"))
      const forceActive  = g(row, "強制ACT") === "有効"
      const mobile       = g(row, "主要連絡先") || g(row, "連絡先")
      const postalCode   = g(row, "郵便番号")
      const prefecture   = g(row, "都道府県")
      const city         = g(row, "市区町村番地")
      const address2     = g(row, "建物名・部屋番号")
      const companyName      = g(row, "法人名")
      const companyNameKana  = g(row, "法人名カナ")
      const bankName     = g(row, "コミ銀行名")
      const bankCode     = g(row, "コミ銀行番号")
      const branchName   = g(row, "コミ支店名")
      const branchCode   = g(row, "コミ支店番号")
      const accountType  = g(row, "コミ預金種目")
      const accountNumber = g(row, "コミ口座番号")
      const accountHolder = g(row, "コミ口座名義")
      const creditCardId = g(row, "決済情報(クレディックス)")
      const autoshipEnabled = status === "autoship"

      // 支払方法
      const paymentMethod: "credit_card" | "bank_transfer" | "bank_payment" =
        creditCardId ? "credit_card"
        : (bankCode && accountNumber) ? "bank_transfer"
        : "credit_card"

      // ── 住所文字列 ──
      const addressStr = [prefecture, city, address2].filter(Boolean).join(" ").trim()

      const existing = existingMap.get(memberCode)

      if (existing) {
        // ── 既存会員: 更新 ──
        try {
          await prisma.user.update({
            where: { id: existing.userId },
            data: {
              ...(name      ? { name }      : {}),
              ...(nameKana  ? { nameKana }  : {}),
              ...(mobile    ? { phone: mobile } : {}),
              ...(postalCode ? { postalCode } : {}),
              ...(addressStr ? { address: addressStr } : {}),
            },
          })

          await prisma.mlmMember.update({
            where: { id: existing.id },
            data: {
              status,
              ...(gender       != null ? { gender }       : {}),
              ...(birthDate    != null ? { birthDate }    : {}),
              ...(contractDate != null ? { contractDate } : {}),
              ...(firstPayDate != null ? { firstPayDate } : {}),
              ...(forceLevel   != null ? { forceLevel }   : {}),
              forceActive,
              autoshipEnabled,
              paymentMethod,
              ...(mobile        ? { mobile }        : {}),
              ...(prefecture    ? { prefecture }    : {}),
              ...(city          ? { city }          : {}),
              ...(address2      ? { address2 }      : {}),
              ...(companyName   ? { companyName }   : {}),
              ...(companyNameKana ? { companyNameKana } : {}),
              ...(bankName      ? { bankName }      : {}),
              ...(bankCode      ? { bankCode }      : {}),
              ...(branchName    ? { branchName }    : {}),
              ...(branchCode    ? { branchCode }    : {}),
              ...(accountType   ? { accountType }   : {}),
              ...(accountNumber ? { accountNumber } : {}),
              ...(accountHolder ? { accountHolder } : {}),
              ...(creditCardId  ? { creditCardId }  : {}),
            },
          })
          result.updated++
        } catch (e) {
          result.errors.push(`[更新] ${memberCode}(${name}): ${e}`)
        }
        continue
      }

      // ── 新規会員: 作成 ──
      const finalEmail = email || `member-${csvId}@noemail.viola-pure.net`

      // メール重複チェック
      const emailConflict = await prisma.user.findFirst({
        where: { email: finalEmail },
        select: { id: true },
      })
      if (emailConflict) {
        // 既にそのメールで User が存在するが MlmMember が紐づいていないケース → スキップ
        result.skipped++
        result.errors.push(`[スキップ] ${memberCode}(${name}): メール重複 ${finalEmail}`)
        continue
      }

      try {
        const { hash } = await import("bcryptjs")
        const passwordHash = await hash("0000", 10)

        const newUser = await prisma.user.create({
          data: {
            memberCode,
            name:         name || memberCode,
            nameKana:     nameKana || undefined,
            email:        finalEmail,
            passwordHash,
            status:       "active",
            phone:        mobile   || undefined,
            postalCode:   postalCode || undefined,
            address:      addressStr || undefined,
          },
        })

        await prisma.mlmMember.create({
          data: {
            userId:          newUser.id,
            memberCode,
            memberType:      "business",
            status,
            gender:          gender ?? undefined,
            birthDate:       birthDate ?? undefined,
            contractDate:    contractDate ?? undefined,
            firstPayDate:    firstPayDate ?? undefined,
            forceLevel:      forceLevel ?? undefined,
            forceActive,
            autoshipEnabled,
            paymentMethod,
            mobile:          mobile        || undefined,
            prefecture:      prefecture    || undefined,
            city:            city          || undefined,
            address2:        address2      || undefined,
            companyName:     companyName   || undefined,
            companyNameKana: companyNameKana || undefined,
            bankName:        bankName      || undefined,
            bankCode:        bankCode      || undefined,
            branchName:      branchName    || undefined,
            branchCode:      branchCode    || undefined,
            accountType:     accountType   || undefined,
            accountNumber:   accountNumber || undefined,
            accountHolder:   accountHolder || undefined,
            creditCardId:    creditCardId  || undefined,
          },
        })

        await prisma.pointWallet.create({
          data: {
            userId:                 newUser.id,
            autoPointsBalance:      0,
            manualPointsBalance:    0,
            externalPointsBalance:  0,
            availablePointsBalance: 0,
          },
        })

        result.created++
      } catch (e) {
        result.errors.push(`[新規] ${memberCode}(${name}): ${e}`)
      }
    }

    // ── Pass 2: 紹介者・直上者の紐づけ ──
    let linkCount = 0
    for (const row of data) {
      const csvId      = g(row, "会員ID")
      if (!csvId) continue
      const memberCode = idToMemberCode(csvId)
      const refCsvId   = g(row, "紹介者ID")
      const upCsvId    = g(row, "直上者ID")
      if (!refCsvId && !upCsvId) continue

      const member = await prisma.mlmMember.findUnique({
        where: { memberCode },
        select: { id: true },
      })
      if (!member) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upd: Record<string, any> = {}

      if (refCsvId && refCsvId !== csvId) {
        const ref = await prisma.mlmMember.findUnique({
          where: { memberCode: idToMemberCode(refCsvId) },
          select: { id: true },
        })
        if (ref) upd.referrerId = ref.id
      }

      if (upCsvId && upCsvId !== csvId) {
        const up = await prisma.mlmMember.findUnique({
          where: { memberCode: idToMemberCode(upCsvId) },
          select: { id: true },
        })
        if (up) upd.uplineId = up.id
      }

      if (Object.keys(upd).length > 0) {
        try {
          await prisma.mlmMember.update({ where: { id: member.id }, data: upd })
          linkCount++
        } catch {
          // 紐づけ失敗は警告のみ
        }
      }
    }

    return NextResponse.json({
      success: true,
      result: { ...result, linkCount },
    })
  } catch (e) {
    console.error("import-members error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ──────────────────────────────────────────────
// GET /api/admin/import-members
// インポート前の件数確認（ドライラン）
// ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const formData = await req.formData().catch(() => null)
    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    if (action === "stats") {
      const total     = await prisma.mlmMember.count()
      const active    = await prisma.mlmMember.count({ where: { status: "active" } })
      const autoship  = await prisma.mlmMember.count({ where: { status: "autoship" } })
      const withdrawn = await prisma.mlmMember.count({ where: { status: "withdrawn" } })
      return NextResponse.json({ total, active, autoship, withdrawn })
    }

    return NextResponse.json({ message: "POST でCSVファイルをアップロードしてください" })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
