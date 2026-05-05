export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "FixShippingFee2026-Viola"

// 出荷事務手数料
const FEE_PRODUCT_CODE = "4000"

// 枝番を取得（memberCodeの末尾2桁）
// memberCode例: "10234001" → 末尾2桁 "01"
function getBranchNumber(memberCode: string): string {
  return memberCode.slice(-2)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token  = searchParams.get("token")
  const mode   = searchParams.get("mode") || "check"
  const offset = parseInt(searchParams.get("offset") || "0",  10)
  const limit  = parseInt(searchParams.get("limit")  || "100", 10)

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 商品コード1000/2000の伝票のうち、4000 OrderItemを持つものを対象にする
  const totalCount = await prisma.order.count({
    where: {
      items: {
        some: {
          mlmProduct: { productCode: FEE_PRODUCT_CODE }
        }
      }
    }
  })

  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          mlmProduct: { productCode: FEE_PRODUCT_CODE }
        }
      }
    },
    include: {
      user: { select: { memberCode: true, name: true } },
      items: {
        where: {
          mlmProduct: { productCode: FEE_PRODUCT_CODE }
        },
        include: { mlmProduct: { select: { productCode: true } } },
        orderBy: { id: "asc" }
      }
    },
    orderBy: { id: "asc" },
    skip: offset,
    take: limit,
  })

  const hasMore    = offset + limit < totalCount
  const nextOffset = offset + limit

  // ---- CHECK モード ----
  if (mode === "check") {
    let branch01_ok       = 0  // 枝番01 で4000が1件（正常）
    let branch01_dup      = 0  // 枝番01 で4000が2件以上（削除対象あり）
    let branch02to06_has  = 0  // 枝番02-06 で4000あり（全削除対象）
    let other             = 0
    const samples: object[] = []

    for (const order of orders) {
      const memberCode = order.user?.memberCode ?? ""
      const branch = getBranchNumber(memberCode)
      const feeItems = order.items // すでにFEE_PRODUCT_CODEでフィルタ済み
      const feeCount = feeItems.length

      const itemIds = feeItems.map(i => i.id.toString())

      if (branch === "01") {
        if (feeCount >= 2) {
          branch01_dup++
          if (samples.length < 3) samples.push({
            orderId: order.id.toString(), orderNumber: order.orderNumber,
            memberCode, name: order.user?.name, branch,
            feeCount, action: `4000を${feeCount - 1}件削除（1件残す）`, itemIds
          })
        } else {
          branch01_ok++
        }
      } else if (["02","03","04","05","06"].includes(branch)) {
        branch02to06_has++
        if (samples.length < 3) samples.push({
          orderId: order.id.toString(), orderNumber: order.orderNumber,
          memberCode, name: order.user?.name, branch,
          feeCount, action: `4000を全${feeCount}件削除`, itemIds
        })
      } else {
        other++
      }
    }

    return NextResponse.json({
      mode: "check",
      pagination: { total: totalCount, offset, limit, batchSize: orders.length, hasMore, nextOffset },
      summary: { branch01_ok, branch01_dup, branch02to06_has, other },
      samples,
    })
  }

  // ---- FIX モード ----
  if (mode === "fix") {
    let fixed01  = 0  // 枝番01の重複を削除した件数
    let removed02to06 = 0  // 枝番02-06から全削除した伝票数
    let totalDeleted = 0   // 削除したOrderItem総数
    const errors: object[] = []

    for (const order of orders) {
      const memberCode = order.user?.memberCode ?? ""
      const branch = getBranchNumber(memberCode)
      const feeItems = order.items
      const feeCount = feeItems.length

      try {
        if (branch === "01" && feeCount >= 2) {
          // 最初の1件を残し、残りを削除
          const toDelete = feeItems.slice(1).map(i => i.id)
          await prisma.orderItem.deleteMany({ where: { id: { in: toDelete } } })
          // Orderの合計から削除分を減算
          const deleteCount = toDelete.length
          const feePrice = feeItems[0].unitPrice
          await prisma.order.update({
            where: { id: order.id },
            data: {
              subtotalAmount: { decrement: feePrice * deleteCount },
              totalAmount:    { decrement: feePrice * deleteCount },
            }
          })
          fixed01++
          totalDeleted += deleteCount

        } else if (["02","03","04","05","06"].includes(branch) && feeCount >= 1) {
          // 全件削除
          const toDelete = feeItems.map(i => i.id)
          await prisma.orderItem.deleteMany({ where: { id: { in: toDelete } } })
          // Orderの合計から全額減算
          const feePrice = feeItems[0].unitPrice
          await prisma.order.update({
            where: { id: order.id },
            data: {
              subtotalAmount: { decrement: feePrice * feeCount },
              totalAmount:    { decrement: feePrice * feeCount },
            }
          })
          removed02to06++
          totalDeleted += feeCount
        }
      } catch (err) {
        errors.push({
          orderId:     order.id.toString(),
          orderNumber: order.orderNumber,
          memberCode,
          reason:      String(err).slice(0, 200),
        })
      }
    }

    return NextResponse.json({
      mode: "fix",
      pagination: { total: totalCount, offset, limit, batchSize: orders.length, hasMore, nextOffset },
      summary: { fixed01, removed02to06, totalDeleted, errors: errors.length },
      errors,
    })
  }

  return NextResponse.json({ error: "mode must be check/fix" }, { status: 400 })
}
