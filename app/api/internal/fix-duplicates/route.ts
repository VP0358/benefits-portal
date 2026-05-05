export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "FixDup2026-Viola56"

// 今回誤って登録したハイフンあり会員コード56件
const HYPHEN_CODES = [
  "102340-01","104865-01","105800-01","109055-01","110034-01",
  "137061-01","143726-01","173846-01","211776-01","214970-01",
  "218136-01","242373-01","265702-01","265820-01","270675-01",
  "288606-01","288646-01","339129-01","341850-01","358845-01",
  "372649-01","377796-01","402206-01","411021-01","420115-01",
  "424556-01","432767-01","433894-01","473791-01","474965-01",
  "488957-01","537718-01","599013-01","606493-01","609622-01",
  "616326-01","644327-01","663837-01","667975-01","684290-01",
  "774781-01","822124-01","830113-01","843472-01","844623-01",
  "864705-01","877844-01","882955-01","884051-01","892808-01",
  "910334-01","933955-01","937445-01","944821-01","949540-01",
  "957092-01",
]

// ハイフンあり → ハイフンなし変換
function toNoHyphen(mc: string): string {
  return mc.replace(/-/g, "")
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const mode = searchParams.get("mode") || "check"

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ---- CHECK モード ----
  if (mode === "check") {
    const results = []
    for (const mc of HYPHEN_CODES) {
      const noHyphen = toNoHyphen(mc)
      const hyphenUser = await prisma.user.findUnique({
        where: { memberCode: mc },
        include: {
          mlmMember: { include: { purchases: { where: { productCode: "1000" } } } },
          mlmRegistration: true,
        }
      })
      const noHyphenUser = await prisma.user.findUnique({
        where: { memberCode: noHyphen },
        include: {
          mlmMember: { include: { purchases: { where: { productCode: "1000" } } } },
        }
      })
      results.push({
        hyphenCode: mc,
        noHyphenCode: noHyphen,
        hyphenExists: !!hyphenUser,
        hyphenUserId: hyphenUser?.id?.toString(),
        hyphenPurchaseCount: hyphenUser?.mlmMember?.purchases?.length ?? 0,
        noHyphenExists: !!noHyphenUser,
        noHyphenUserId: noHyphenUser?.id?.toString(),
        noHyphenMlmExists: !!noHyphenUser?.mlmMember,
        noHyphenPurchaseCount: noHyphenUser?.mlmMember?.purchases?.length ?? 0,
      })
    }
    const summary = {
      total: results.length,
      hyphenExists: results.filter(r => r.hyphenExists).length,
      noHyphenExists: results.filter(r => r.noHyphenExists).length,
      bothExist: results.filter(r => r.hyphenExists && r.noHyphenExists).length,
      onlyHyphen: results.filter(r => r.hyphenExists && !r.noHyphenExists).length,
      onlyNoHyphen: results.filter(r => !r.hyphenExists && r.noHyphenExists).length,
    }
    return NextResponse.json({ mode: "check", summary, results })
  }

  // ---- DELETE モード: ハイフンあり56名を削除 ----
  if (mode === "delete") {
    const deleted = []
    const errors = []

    for (const mc of HYPHEN_CODES) {
      try {
        const user = await prisma.user.findUnique({
          where: { memberCode: mc },
          include: { mlmMember: { include: { purchases: true } } }
        })
        if (!user) {
          deleted.push({ memberCode: mc, status: "NOT_FOUND" })
          continue
        }
        // User削除（cascadeでMlmMember, MlmPurchase, PointWallet, MlmRegistration等も削除）
        await prisma.user.delete({ where: { memberCode: mc } })
        deleted.push({
          memberCode: mc,
          status: "DELETED",
          userId: user.id.toString(),
          hadMlm: !!user.mlmMember,
          purchaseCount: user.mlmMember?.purchases?.length ?? 0,
        })
      } catch (err) {
        errors.push({ memberCode: mc, reason: String(err) })
      }
    }

    return NextResponse.json({
      mode: "delete",
      summary: { total: HYPHEN_CODES.length, deleted: deleted.filter(d => d.status === "DELETED").length, errors: errors.length },
      deleted, errors,
    })
  }

  // ---- PURCHASE モード: ハイフンなし会員に購入履歴を登録 ----
  if (mode === "purchase") {
    // 購入月マップ（ハイフンなし会員コード）
    const PURCHASE_MAP: Record<string, string> = {
      "10234001": "2026-02", "10486501": "2026-03", "10580001": "2026-03",
      "10905501": "2026-02", "11003401": "2026-03", "13706101": "2026-01",
      "14372601": "2026-01", "17384601": "2026-02", "21177601": "2026-02",
      "21497001": "2026-02", "21813601": "2026-01", "24237301": "2026-03",
      "26570201": "2026-03", "26582001": "2026-03", "27067501": "2026-02",
      "28860601": "2026-03", "28864601": "2026-02", "33912901": "2026-02",
      "34185001": "2026-02", "35884501": "2026-03", "37264901": "2026-02",
      "37779601": "2026-02", "40220601": "2026-03", "41102101": "2026-02",
      "42011501": "2026-03", "42455601": "2026-02", "43276701": "2026-01",
      "43389401": "2025-12", "47379101": "2026-01", "47496501": "2026-03",
      "48895701": "2026-02", "53771801": "2026-03", "59901301": "2026-03",
      "60649301": "2025-12", "60962201": "2026-02", "61632601": "2026-02",
      "64432701": "2026-01", "66383701": "2026-01", "66797501": "2026-02",
      "68429001": "2026-02", "77478101": "2026-02", "82212401": "2026-03",
      "83011301": "2026-02", "84347201": "2026-02", "84462301": "2025-12",
      "86470501": "2026-01", "87784401": "2026-03", "88295501": "2026-03",
      "88405101": "2026-01", "89280801": "2026-02", "91033401": "2026-02",
      "93395501": "2026-01", "93744501": "2026-02", "94482101": "2026-03",
      "94954001": "2026-02", "95709201": "2026-01",
    }

    const PRODUCT_CODE = "1000"
    const PRODUCT_NAME = "[新規]VIOLA Pure 翠彩-SUMISAI-"
    const UNIT_PRICE = 15000
    const POINTS = 150

    const created = []
    const skipped = []
    const errors = []

    for (const [noHyphenCode, purchaseMonth] of Object.entries(PURCHASE_MAP)) {
      try {
        const mlm = await prisma.mlmMember.findUnique({
          where: { memberCode: noHyphenCode },
          include: {
            purchases: { where: { productCode: PRODUCT_CODE, purchaseMonth } }
          }
        })
        if (!mlm) {
          errors.push({ memberCode: noHyphenCode, reason: "MlmMemberが存在しない" })
          continue
        }
        if (mlm.purchases.length > 0) {
          skipped.push({ memberCode: noHyphenCode, month: purchaseMonth, reason: "既に購入履歴あり" })
          continue
        }
        const purchasedAt = new Date(`${purchaseMonth}-01T00:00:00.000Z`)
        const purchase = await prisma.mlmPurchase.create({
          data: {
            mlmMemberId: mlm.id,
            productCode: PRODUCT_CODE,
            productName: PRODUCT_NAME,
            quantity: 1,
            unitPrice: UNIT_PRICE,
            points: POINTS,
            totalPoints: POINTS,
            purchaseStatus: "one_time",
            purchaseMonth,
            purchasedAt,
          }
        })
        created.push({ memberCode: noHyphenCode, month: purchaseMonth, purchaseId: purchase.id.toString() })
      } catch (err) {
        errors.push({ memberCode: noHyphenCode, reason: String(err) })
      }
    }

    return NextResponse.json({
      mode: "purchase",
      summary: { total: Object.keys(PURCHASE_MAP).length, created: created.length, skipped: skipped.length, errors: errors.length },
      created, skipped, errors,
    })
  }

  return NextResponse.json({ error: "mode must be check/delete/purchase" }, { status: 400 })
}
