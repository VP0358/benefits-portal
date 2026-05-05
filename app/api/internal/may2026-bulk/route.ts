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

function generateOrderNumber(memberCode: string, month: string, productCode: string): string {
  const [year, mon] = month.split("-")
  const ym = `${year}${mon}`
  return `ORD-${ym}-${memberCode}-${productCode}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token  = searchParams.get("token")
  const mode   = searchParams.get("mode") || "check1"
  const offset = parseInt(searchParams.get("offset") || "0",   10)
  const limit  = parseInt(searchParams.get("limit")  || "100", 10)

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ======================================================
  // CHECK1: MlmPurchase (商品1000 2026-05) の確認
  // ======================================================
  if (mode === "check1") {
    const results = []
    for (const d of MAY_PURCHASE_DATA) {
      const member = await prisma.mlmMember.findFirst({
        where: { memberCode: d.memberCode },
        select: { id: true, memberCode: true },
      })
      if (!member) {
        results.push({ ...d, status: "NO_MEMBER" })
        continue
      }
      const existing = await prisma.mlmPurchase.findFirst({
        where: { mlmMemberId: member.id, productCode: PRODUCT_1000.code, purchaseMonth: d.month },
        select: { id: true },
      })
      results.push({
        ...d,
        status: existing ? "ALREADY_EXISTS" : "READY",
        memberId: member.id.toString(),
        existingPurchaseId: existing?.id.toString() ?? null,
      })
    }
    return NextResponse.json({ mode: "check1", total: MAY_PURCHASE_DATA.length, results })
  }

  // ======================================================
  // CHECK2: 伝票作成対象数の確認（offset/limit対応）
  // ======================================================
  if (mode === "check2") {
    const totalCount = await prisma.mlmPurchase.count({
      where: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } },
    })
    const purchases = await prisma.mlmPurchase.findMany({
      where: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } },
      include: {
        mlmMember: { select: { memberCode: true } },
      },
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
    })

    // 作成済みの注文番号を一括取得して高速化
    const orderNums = purchases.map(p =>
      generateOrderNumber(p.mlmMember.memberCode ?? "", p.purchaseMonth, p.productCode)
    )
    const existingOrders = await prisma.order.findMany({
      where: { orderNumber: { in: orderNums } },
      select: { orderNumber: true },
    })
    const existingSet = new Set(existingOrders.map(o => o.orderNumber))

    let needCreate = 0, alreadyExists = 0
    for (const p of purchases) {
      const orderNum = generateOrderNumber(p.mlmMember.memberCode ?? "", p.purchaseMonth, p.productCode)
      if (existingSet.has(orderNum)) { alreadyExists++ } else { needCreate++ }
    }

    return NextResponse.json({
      mode: "check2",
      pagination: { total: totalCount, offset, limit, batchSize: purchases.length, hasMore: offset + limit < totalCount },
      summary: { needCreate, alreadyExists },
    })
  }

  // ======================================================
  // STEP1: MlmPurchase 登録（商品1000 2026-05）
  // ======================================================
  if (mode === "step1") {
    let created = 0, skipped = 0, errors = 0
    const errs: object[] = []
    for (const d of MAY_PURCHASE_DATA) {
      try {
        const member = await prisma.mlmMember.findFirst({ where: { memberCode: d.memberCode }, select: { id: true } })
        if (!member) { errors++; errs.push({ ...d, reason: "NO_MEMBER" }); continue }
        const existing = await prisma.mlmPurchase.findFirst({
          where: { mlmMemberId: member.id, productCode: PRODUCT_1000.code, purchaseMonth: d.month },
          select: { id: true },
        })
        if (existing) { skipped++; continue }
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
            purchasedAt:    new Date(`${d.month}-01T00:00:00Z`),
          }
        })
        created++
      } catch (err) {
        errors++
        errs.push({ memberCode: d.memberCode, reason: String(err).slice(0, 200) })
      }
    }
    return NextResponse.json({ mode: "step1", summary: { created, skipped, errors }, errors: errs })
  }

  // ======================================================
  // STEP2: Order + OrderItem + ShippingLabel 作成（offset/limit対応）
  // ======================================================
  if (mode === "step2") {
    const [prod1000, prod2000] = await Promise.all([
      prisma.mlmProduct.findUnique({ where: { productCode: PRODUCT_1000.code }, select: { id: true } }),
      prisma.mlmProduct.findUnique({ where: { productCode: PRODUCT_2000.code }, select: { id: true } }),
    ])
    const productIdMap: Record<string, bigint | null> = {
      [PRODUCT_1000.code]: prod1000?.id ?? null,
      [PRODUCT_2000.code]: prod2000?.id ?? null,
    }
    const productPriceMap: Record<string, number> = {
      [PRODUCT_1000.code]: PRODUCT_1000.price,
      [PRODUCT_2000.code]: PRODUCT_2000.price,
    }
    const productNameMap: Record<string, string> = {
      [PRODUCT_1000.code]: PRODUCT_1000.name,
      [PRODUCT_2000.code]: PRODUCT_2000.name,
    }

    const totalCount = await prisma.mlmPurchase.count({
      where: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } },
    })
    const purchases = await prisma.mlmPurchase.findMany({
      where: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } },
      include: {
        mlmMember: {
          include: {
            user: {
              select: { id: true, memberCode: true, name: true, phone: true, address: true, postalCode: true },
            },
          },
        },
      },
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
    })

    // 既存注文番号を一括取得
    const orderNums = purchases
      .filter(p => p.mlmMember.user?.memberCode)
      .map(p => generateOrderNumber(p.mlmMember.user!.memberCode!, p.purchaseMonth, p.productCode))
    const existingOrders = await prisma.order.findMany({
      where: { orderNumber: { in: orderNums } },
      select: { orderNumber: true },
    })
    const existingSet = new Set(existingOrders.map(o => o.orderNumber))

    let created = 0, skipped = 0, errors = 0
    const errs: object[] = []

    for (const p of purchases) {
      const user = p.mlmMember.user
      if (!user?.memberCode) { errors++; continue }

      const orderNum = generateOrderNumber(user.memberCode, p.purchaseMonth, p.productCode)
      if (existingSet.has(orderNum)) { skipped++; continue }

      try {
        const unitPrice = productPriceMap[p.productCode] ?? p.unitPrice
        const prodName  = productNameMap[p.productCode] ?? p.productName
        const prodId    = productIdMap[p.productCode] ?? null
        const qty       = p.quantity
        const lineAmt   = unitPrice * qty
        const slipType  = p.productCode === PRODUCT_1000.code ? "new_member" : "one_time"
        const orderedAt = new Date(`${p.purchaseMonth}-01T00:00:00Z`)

        await prisma.order.create({
          data: {
            userId:         user.id,
            orderNumber:    orderNum,
            status:         "completed",
            slipType,
            paymentMethod:  "bank_transfer",
            paymentStatus:  "paid",
            shippingStatus: "shipped",
            subtotalAmount: lineAmt,
            totalAmount:    lineAmt,
            orderedAt,
            items: {
              create: {
                productId:   prodId,
                productName: prodName,
                unitPrice,
                quantity:    qty,
                lineAmount:  lineAmt,
              },
            },
            shippingLabel: {
              create: {
                orderNumber:      orderNum,
                recipientName:    user.name       ?? "",
                recipientPhone:   user.phone      ?? "",
                recipientPostal:  user.postalCode ?? "",
                recipientAddress: user.address    ?? "",
                status:           "shipped",
              },
            },
          },
        })
        created++
      } catch (err) {
        errors++
        errs.push({ orderNumber: orderNum, reason: String(err).slice(0, 200) })
      }
    }

    return NextResponse.json({
      mode: "step2",
      pagination: { total: totalCount, offset, limit, batchSize: purchases.length, hasMore: offset + limit < totalCount },
      summary: { created, skipped, errors },
      errors: errs.slice(0, 5),
    })
  }

  // ======================================================
  // STEP3: 枝番01の伝票に出荷事務手数料(4000)追加（offset/limit対応）
  // ======================================================
  if (mode === "step3") {
    const prod4000 = await prisma.mlmProduct.findUnique({
      where: { productCode: PRODUCT_4000.code },
      select: { id: true, price: true },
    })
    const feePrice     = prod4000?.price ?? 800
    const feeProductId = prod4000?.id ?? null

    const totalCount = await prisma.order.count({
      where: {
        user:  { memberCode: { endsWith: "01" } },
        items: {
          some: { mlmProduct: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } } },
          none: { mlmProduct: { productCode: PRODUCT_4000.code } },
        },
      },
    })
    const orders = await prisma.order.findMany({
      where: {
        user:  { memberCode: { endsWith: "01" } },
        items: {
          some: { mlmProduct: { productCode: { in: [PRODUCT_1000.code, PRODUCT_2000.code] } } },
          none: { mlmProduct: { productCode: PRODUCT_4000.code } },
        },
      },
      select: { id: true, orderNumber: true },
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
    })

    let added = 0, errors = 0
    const errs: object[] = []

    for (const order of orders) {
      try {
        await prisma.orderItem.create({
          data: {
            orderId:     order.id,
            productId:   feeProductId,
            productName: PRODUCT_4000.name,
            unitPrice:   feePrice,
            quantity:    1,
            lineAmount:  feePrice,
          },
        })
        await prisma.order.update({
          where: { id: order.id },
          data: {
            subtotalAmount: { increment: feePrice },
            totalAmount:    { increment: feePrice },
          },
        })
        added++
      } catch (err) {
        errors++
        errs.push({ orderId: order.id.toString(), orderNumber: order.orderNumber, reason: String(err).slice(0, 200) })
      }
    }

    return NextResponse.json({
      mode: "step3",
      pagination: { total: totalCount, offset, limit, batchSize: orders.length, hasMore: offset + limit < totalCount },
      summary: { added, errors },
      errors: errs.slice(0, 5),
    })
  }

  return NextResponse.json({ error: "mode must be check1/check2/step1/step2/step3" }, { status: 400 })
}
