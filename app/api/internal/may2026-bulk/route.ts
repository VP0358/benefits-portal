export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "May2026Bulk-Viola"

// ① 2026年5月 商品1000 購入データ（CSVより）
const MAY_PURCHASE_DATA = [
  { memberCode: "50124001", name: "増田 卓也", month: "2026-05", quantity: 1 },
]

// 商品定義
const PRODUCT_1000 = { code: "1000", name: "[新規]VIOLA Pure 翠彩-SUMISAI-", price: 15000, pv: 150 }
const PRODUCT_2000 = { code: "2000", name: "VIOLA Pure 翠彩-SUMISAI-",       price: 16500, pv: 150 }
const PRODUCT_4000 = { code: "4000", name: "出荷事務手数料" }

function getBranchNumber(memberCode: string): string {
  return memberCode.slice(-2)
}

function generateOrderNumber(memberCode: string, month: string, productCode: string): string {
  const [year, mon] = month.split("-")
  const ym = `${year}${mon}`
  return `ORD-${ym}-${memberCode}-${productCode}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const mode  = searchParams.get("mode") || "check"

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ======================================================
  // CHECK モード
  // ======================================================
  if (mode === "check") {
    // --- ① 商品1000 MlmPurchase チェック ---
    const purchaseChecks = []
    for (const d of MAY_PURCHASE_DATA) {
      const member = await prisma.mlmMember.findFirst({
        where: { memberCode: d.memberCode },
        include: { user: { select: { id: true, name: true } } }
      })
      if (!member) {
        purchaseChecks.push({ ...d, status: "NO_MEMBER" })
        continue
      }
      const existing = await prisma.mlmPurchase.findFirst({
        where: { mlmMemberId: member.id, productCode: PRODUCT_1000.code, purchaseMonth: d.month }
      })
      purchaseChecks.push({
        ...d,
        status: existing ? "ALREADY_EXISTS" : "READY",
        memberId: member.id.toString(),
        existingId: existing?.id.toString() ?? null,
      })
    }

    // --- ② 伝票作成チェック（1000/2000で伝票未作成分）---
    const purchases1000 = await prisma.mlmPurchase.findMany({
      where: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } },
      include: { mlmMember: { include: { user: { select: { id: true, memberCode: true, name: true } } } } },
      orderBy: { id: "asc" },
    })

    let orderNeedCreate = 0, orderAlreadyExists = 0, orderNoUser = 0
    for (const p of purchases1000) {
      const memberCode = p.mlmMember.user?.memberCode ?? ""
      const orderNum = generateOrderNumber(memberCode, p.purchaseMonth, p.productCode)
      const existing = await prisma.order.findFirst({ where: { orderNumber: orderNum } })
      if (!p.mlmMember.user) { orderNoUser++; continue }
      if (existing) { orderAlreadyExists++ } else { orderNeedCreate++ }
    }

    return NextResponse.json({
      mode: "check",
      step1_purchases: {
        total: MAY_PURCHASE_DATA.length,
        results: purchaseChecks,
      },
      step2_orders: {
        totalPurchases: purchases1000.length,
        needCreate: orderNeedCreate,
        alreadyExists: orderAlreadyExists,
        noUser: orderNoUser,
      },
    })
  }

  // ======================================================
  // CREATE モード（①MlmPurchase + ②Order + ③ShippingFee）
  // ======================================================
  if (mode === "create") {
    const results: Record<string, unknown> = {}

    // --- STEP 1: MlmPurchase 登録 ---
    let p_created = 0, p_skipped = 0, p_errors = 0
    const p_errs: object[] = []
    for (const d of MAY_PURCHASE_DATA) {
      try {
        const member = await prisma.mlmMember.findFirst({ where: { memberCode: d.memberCode } })
        if (!member) { p_errors++; p_errs.push({ ...d, reason: "NO_MEMBER" }); continue }
        const existing = await prisma.mlmPurchase.findFirst({
          where: { mlmMemberId: member.id, productCode: PRODUCT_1000.code, purchaseMonth: d.month }
        })
        if (existing) { p_skipped++; continue }
        const purchasedAt = new Date(`${d.month}-01T00:00:00Z`)
        await prisma.mlmPurchase.create({
          data: {
            mlmMemberId:    member.id,
            productCode:    PRODUCT_1000.code,
            productName:    PRODUCT_1000.name,
            quantity:       d.quantity,
            unitPrice:      PRODUCT_1000.price,
            points:         PRODUCT_1000.pv,
            totalPoints:    d.quantity * PRODUCT_1000.pv,
            purchaseStatus: "one_time",
            purchaseMonth:  d.month,
            purchasedAt,
          }
        })
        p_created++
      } catch (err) {
        p_errors++
        p_errs.push({ memberCode: d.memberCode, reason: String(err).slice(0, 200) })
      }
    }
    results.step1_purchases = { created: p_created, skipped: p_skipped, errors: p_errors, errorDetail: p_errs }

    // --- STEP 2: Order + OrderItem + ShippingLabel 作成 ---
    // 商品マスター取得
    const prod1000 = await prisma.mlmProduct.findUnique({ where: { productCode: PRODUCT_1000.code } })
    const prod2000 = await prisma.mlmProduct.findUnique({ where: { productCode: PRODUCT_2000.code } })
    const prod4000 = await prisma.mlmProduct.findUnique({ where: { productCode: PRODUCT_4000.code } })

    const productMap: Record<string, typeof prod1000> = {
      [PRODUCT_1000.code]: prod1000,
      [PRODUCT_2000.code]: prod2000,
    }
    const productPriceMap: Record<string, number> = {
      [PRODUCT_1000.code]: PRODUCT_1000.price,
      [PRODUCT_2000.code]: PRODUCT_2000.price,
    }
    const productNameMap: Record<string, string> = {
      [PRODUCT_1000.code]: PRODUCT_1000.name,
      [PRODUCT_2000.code]: PRODUCT_2000.name,
    }

    const purchases = await prisma.mlmPurchase.findMany({
      where: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } },
      include: {
        mlmMember: {
          include: {
            user: {
              select: {
                id: true, memberCode: true, name: true, phone: true,
                email: true, postalCode: true, address: true,
              }
            }
          }
        }
      },
      orderBy: { id: "asc" },
    })

    let o_created = 0, o_skipped = 0, o_errors = 0
    const o_errs: object[] = []

    for (const p of purchases) {
      const user = p.mlmMember.user
      if (!user?.memberCode) { o_errors++; continue }

      const memberCode  = user.memberCode
      const orderNum    = generateOrderNumber(memberCode, p.purchaseMonth, p.productCode)
      const existing    = await prisma.order.findFirst({ where: { orderNumber: orderNum } })
      if (existing) { o_skipped++; continue }

      try {
        const prod    = productMap[p.productCode]
        const unitPrice = productPriceMap[p.productCode] ?? p.unitPrice
        const prodName  = productNameMap[p.productCode] ?? p.productName
        const qty       = p.quantity
        const lineAmt   = unitPrice * qty
        const slipType  = p.productCode === PRODUCT_1000.code ? "new_member" : "one_time"
        const orderedAt = new Date(`${p.purchaseMonth}-01T00:00:00Z`)

        await prisma.order.create({
          data: {
            userId:          user.id,
            orderNumber:     orderNum,
            status:          "completed",
            slipType,
            paymentMethod:   "bank_transfer",
            paymentStatus:   "paid",
            shippingStatus:  "shipped",
            subtotalAmount:  lineAmt,
            totalAmount:     lineAmt,
            orderedAt,
            items: {
              create: {
                productId:   prod?.id ?? null,
                productName: prodName,
                unitPrice,
                quantity:    qty,
                lineAmount:  lineAmt,
              }
            },
            shippingLabel: {
              create: {
                recipientName:    user.name ?? "",
                recipientPhone:   user.phone ?? "",
                recipientAddress: user.address ?? "",
                status:           "shipped",
              }
            },
          }
        })
        o_created++
      } catch (err) {
        o_errors++
        o_errs.push({ orderNumber: orderNum, reason: String(err).slice(0, 200) })
      }
    }
    results.step2_orders = { created: o_created, skipped: o_skipped, errors: o_errors, errorDetail: o_errs.slice(0, 5) }

    // --- STEP 3: 枝番01の新規伝票に出荷事務手数料(4000)を追加 ---
    // step2で新規作成した伝票(or まだ4000のない枝番01伝票)に追加
    const feePrice = prod4000?.price ?? 800
    const feeProductId = prod4000?.id ?? null

    // 枝番01ユーザーの、4000を持っていない1000/2000伝票を検索
    const ordersWithout4000 = await prisma.order.findMany({
      where: {
        user: { memberCode: { endsWith: "01" } },
        items: {
          some:  { mlmProduct: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } } },
          none:  { mlmProduct: { productCode: PRODUCT_4000.code } },
        }
      },
      include: {
        user: { select: { memberCode: true, name: true } },
      },
      orderBy: { id: "asc" },
    })

    let f_added = 0, f_errors = 0
    const f_errs: object[] = []

    for (const order of ordersWithout4000) {
      try {
        if (feeProductId) {
          await prisma.orderItem.create({
            data: {
              orderId:     order.id,
              productId:   feeProductId,
              productName: PRODUCT_4000.name,
              unitPrice:   feePrice,
              quantity:    1,
              lineAmount:  feePrice,
            }
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.orderItem as any).create({
            data: {
              orderId:     order.id,
              productName: PRODUCT_4000.name,
              unitPrice:   feePrice,
              quantity:    1,
              lineAmount:  feePrice,
            }
          })
        }
        await prisma.order.update({
          where: { id: order.id },
          data: {
            subtotalAmount: { increment: feePrice },
            totalAmount:    { increment: feePrice },
          }
        })
        f_added++
      } catch (err) {
        f_errors++
        f_errs.push({ orderId: order.id.toString(), reason: String(err).slice(0, 200) })
      }
    }
    results.step3_shippingFee = {
      targetOrders: ordersWithout4000.length,
      added: f_added,
      errors: f_errors,
      errorDetail: f_errs.slice(0, 5),
    }

    return NextResponse.json({ mode: "create", results })
  }

  return NextResponse.json({ error: "mode must be check/create" }, { status: 400 })
}
