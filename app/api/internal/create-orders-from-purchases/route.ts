export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "CreateOrders2026-Viola"

// 対象商品コード
const TARGET_PRODUCT_CODES = ["1000", "2000"]

// 商品コード→slipType マッピング
const SLIP_TYPE_MAP: Record<string, string> = {
  "1000": "new_member",
  "2000": "one_time",
}

// 商品コード→商品名マッピング（フォールバック用）
const PRODUCT_NAME_MAP: Record<string, string> = {
  "1000": "[新規]VIOLA Pure 翠彩-SUMISAI-",
  "2000": "VIOLA Pure 翠彩-SUMISAI-",
}

// 注文番号生成
function generateOrderNumber(memberCode: string, month: string, productCode: string): string {
  const monthStr = month.replace("-", "")
  return `ORD-${monthStr}-${memberCode}-${productCode}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const mode = searchParams.get("mode") || "check"
  const offset = parseInt(searchParams.get("offset") || "0", 10)
  const limit  = parseInt(searchParams.get("limit")  || "100", 10)

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 商品マスターからproductIdを取得
  const products = await prisma.mlmProduct.findMany({
    where: { productCode: { in: TARGET_PRODUCT_CODES } },
    select: { id: true, productCode: true, name: true, price: true, pv: true },
  })
  const productMap = Object.fromEntries(products.map(p => [p.productCode, p]))

  // 対象MlmPurchase一覧を取得（バッチ処理）
  const totalCount = await prisma.mlmPurchase.count({
    where: { productCode: { in: TARGET_PRODUCT_CODES } },
  })

  const purchases = await prisma.mlmPurchase.findMany({
    where: { productCode: { in: TARGET_PRODUCT_CODES } },
    include: {
      mlmMember: {
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              phone: true,
              postalCode: true,
              address: true,
              prefecture: true,
              city: true,
            }
          }
        }
      }
    },
    orderBy: [
      { mlmMemberId: "asc" },
      { purchaseMonth: "asc" },
    ],
    skip: offset,
    take: limit,
  })

  const hasMore = offset + limit < totalCount
  const nextOffset = offset + limit

  // ---- CHECK モード ----
  if (mode === "check") {
    const results = []
    let needCreate = 0, alreadyExists = 0, noUser = 0

    for (const purchase of purchases) {
      const user = purchase.mlmMember?.user
      if (!user) {
        noUser++
        results.push({
          purchaseId: purchase.id.toString(),
          memberCode: purchase.mlmMember?.memberCode || "?",
          productCode: purchase.productCode,
          month: purchase.purchaseMonth,
          status: "NO_USER",
        })
        continue
      }

      // 同一会員・同一月・同一商品コードの注文番号で伝票が既に存在するか確認
      const orderNumber = generateOrderNumber(user.memberCode, purchase.purchaseMonth, purchase.productCode)
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      })

      if (existingOrder) {
        alreadyExists++
        results.push({
          purchaseId: purchase.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          productCode: purchase.productCode,
          month: purchase.purchaseMonth,
          status: "ALREADY_EXISTS",
          orderId: existingOrder.id.toString(),
        })
      } else {
        needCreate++
        results.push({
          purchaseId: purchase.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          productCode: purchase.productCode,
          month: purchase.purchaseMonth,
          quantity: purchase.quantity,
          status: "NEED_CREATE",
        })
      }
    }

    return NextResponse.json({
      mode: "check",
      pagination: { total: totalCount, offset, limit, batchSize: purchases.length, hasMore, nextOffset },
      summary: { needCreate, alreadyExists, noUser },
      results,
    })
  }

  // ---- CREATE モード ----
  if (mode === "create") {
    const created = []
    const skipped = []
    const errors  = []

    for (const purchase of purchases) {
      const user = purchase.mlmMember?.user
      if (!user) {
        errors.push({
          purchaseId: purchase.id.toString(),
          reason: "MlmMember/Userが存在しない",
        })
        continue
      }

      const orderNumber = generateOrderNumber(user.memberCode, purchase.purchaseMonth, purchase.productCode)

      // 既存チェック
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      })
      if (existingOrder) {
        skipped.push({
          purchaseId: purchase.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          productCode: purchase.productCode,
          month: purchase.purchaseMonth,
          reason: "既に伝票が存在する",
        })
        continue
      }

      try {
        const product = productMap[purchase.productCode]
        const unitPrice = product?.price ?? purchase.unitPrice
        const productName = product?.name ?? PRODUCT_NAME_MAP[purchase.productCode] ?? purchase.productName
        const productId = product?.id ?? null
        const pv = product?.pv ?? purchase.points
        const quantity = purchase.quantity
        const lineAmount = unitPrice * quantity
        const slipType = SLIP_TYPE_MAP[purchase.productCode] ?? "one_time"

        // 伝票日時は購入月の1日
        const orderedAt = new Date(`${purchase.purchaseMonth}-01T00:00:00.000Z`)

        // Order作成
        const order = await prisma.order.create({
          data: {
            userId: user.id,
            orderNumber,
            status: "completed",
            slipType,
            paymentMethod: "bank_transfer",
            paymentStatus: "paid",
            shippingStatus: "shipped",
            outboxNo: 0,
            orderedAt,
            paidAt: orderedAt,
            subtotalAmount: lineAmount,
            totalAmount: lineAmount,
            usedPoints: 0,
            note: null,
            noteSlip: null,
          },
        })

        // OrderItem作成
        if (productId) {
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId,
              productName,
              unitPrice,
              quantity,
              lineAmount,
            },
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.orderItem as any).create({
            data: {
              orderId: order.id,
              productName,
              unitPrice,
              quantity,
              lineAmount,
            },
          })
        }

        // ShippingLabel作成
        const recipientAddress = [user.prefecture || "", user.city || ""]
          .filter(Boolean).join(" ") || user.address || ""

        await prisma.shippingLabel.create({
          data: {
            orderId: order.id,
            orderNumber,
            carrier: "yamato",
            status: "shipped",
            recipientName: user.name,
            recipientPhone: user.phone || "",
            recipientPostal: user.postalCode || "",
            recipientAddress,
            itemDescription: productName,
            itemCount: quantity,
            shippedAt: orderedAt,
          },
        })

        created.push({
          purchaseId: purchase.id.toString(),
          orderId: order.id.toString(),
          orderNumber,
          memberCode: user.memberCode,
          name: user.name,
          productCode: purchase.productCode,
          month: purchase.purchaseMonth,
          quantity,
          totalAmount: lineAmount,
        })
      } catch (err) {
        errors.push({
          purchaseId: purchase.id.toString(),
          memberCode: user.memberCode,
          productCode: purchase.productCode,
          month: purchase.purchaseMonth,
          reason: String(err).slice(0, 200),
        })
      }
    }

    return NextResponse.json({
      mode: "create",
      pagination: { total: totalCount, offset, limit, batchSize: purchases.length, hasMore, nextOffset },
      summary: { created: created.length, skipped: skipped.length, errors: errors.length },
      created, skipped, errors,
    })
  }

  return NextResponse.json({ error: "mode must be check/create" }, { status: 400 })
}
