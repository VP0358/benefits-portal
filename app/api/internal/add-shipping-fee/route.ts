export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "AddShippingFee2026-Viola"

// 対象伝票：商品コード1000/2000 で作成した注文番号パターン
// ORD-{YYYYMM}-{memberCode}-{productCode}
const TARGET_PRODUCT_CODES = ["1000", "2000"]

// 出荷事務手数料
const FEE_PRODUCT_CODE = "4000"
const FEE_PRODUCT_NAME = "出荷事務手数料"
const FEE_PRICE = 880

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const mode  = searchParams.get("mode") || "check"
  const offset = parseInt(searchParams.get("offset") || "0", 10)
  const limit  = parseInt(searchParams.get("limit")  || "100", 10)

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 商品マスターから4000のproductIdを取得
  const feeProduct = await prisma.mlmProduct.findUnique({
    where: { productCode: FEE_PRODUCT_CODE },
    select: { id: true, productCode: true, name: true, price: true },
  })

  // 対象Order一覧（1000/2000 の OrderItem を持つ注文）
  const totalCount = await prisma.order.count({
    where: {
      items: {
        some: {
          mlmProduct: { productCode: { in: TARGET_PRODUCT_CODES } }
        }
      }
    }
  })

  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          mlmProduct: { productCode: { in: TARGET_PRODUCT_CODES } }
        }
      }
    },
    include: {
      user: { select: { memberCode: true, name: true } },
      items: {
        include: { mlmProduct: { select: { productCode: true } } }
      }
    },
    orderBy: { id: "asc" },
    skip: offset,
    take: limit,
  })

  const hasMore   = offset + limit < totalCount
  const nextOffset = offset + limit

  // ---- CHECK モード ----
  if (mode === "check") {
    const results = []
    let needAdd = 0, alreadyHas = 0

    for (const order of orders) {
      const hasFee = order.items.some(
        item => item.mlmProduct?.productCode === FEE_PRODUCT_CODE
      )
      if (hasFee) {
        alreadyHas++
        results.push({
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          memberCode: order.user?.memberCode,
          name: order.user?.name,
          status: "ALREADY_HAS_FEE",
        })
      } else {
        needAdd++
        results.push({
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          memberCode: order.user?.memberCode,
          name: order.user?.name,
          status: "NEED_ADD",
        })
      }
    }

    return NextResponse.json({
      mode: "check",
      pagination: { total: totalCount, offset, limit, batchSize: orders.length, hasMore, nextOffset },
      summary: { needAdd, alreadyHas },
      feeProduct: feeProduct ? { ...feeProduct, id: feeProduct.id.toString() } : null,
      results,
    })
  }

  // ---- ADD モード ----
  if (mode === "add") {
    const added   = []
    const skipped = []
    const errors  = []

    for (const order of orders) {
      // 既に4000 OrderItemがあればスキップ
      const hasFee = order.items.some(
        item => item.mlmProduct?.productCode === FEE_PRODUCT_CODE
      )
      if (hasFee) {
        skipped.push({
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
          memberCode: order.user?.memberCode,
          reason: "既に出荷事務手数料あり",
        })
        continue
      }

      try {
        // OrderItem追加
        const unitPrice  = feeProduct?.price ?? FEE_PRICE
        const productId  = feeProduct?.id ?? null

        if (productId) {
          await prisma.orderItem.create({
            data: {
              orderId:     order.id,
              productId,
              productName: FEE_PRODUCT_NAME,
              unitPrice,
              quantity:    1,
              lineAmount:  unitPrice,
            },
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.orderItem as any).create({
            data: {
              orderId:     order.id,
              productName: FEE_PRODUCT_NAME,
              unitPrice,
              quantity:    1,
              lineAmount:  unitPrice,
            },
          })
        }

        // Orderの合計金額を更新（subtotalAmount / totalAmount に加算）
        await prisma.order.update({
          where: { id: order.id },
          data: {
            subtotalAmount: { increment: unitPrice },
            totalAmount:    { increment: unitPrice },
          },
        })

        added.push({
          orderId:     order.id.toString(),
          orderNumber: order.orderNumber,
          memberCode:  order.user?.memberCode,
          name:        order.user?.name,
          addedPrice:  unitPrice,
        })
      } catch (err) {
        errors.push({
          orderId:     order.id.toString(),
          orderNumber: order.orderNumber,
          reason:      String(err).slice(0, 200),
        })
      }
    }

    return NextResponse.json({
      mode: "add",
      pagination: { total: totalCount, offset, limit, batchSize: orders.length, hasMore, nextOffset },
      summary: { added: added.length, skipped: skipped.length, errors: errors.length },
      added, skipped, errors,
    })
  }

  return NextResponse.json({ error: "mode must be check/add" }, { status: 400 })
}
