// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"


const prisma = new PrismaClient()

// 受注・発送状況一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const memberCode = searchParams.get("memberCode")
    const status = searchParams.get("status")
    const carrier = searchParams.get("carrier")
    const keyword = searchParams.get("keyword")

    // 検索条件構築
    const where: any = {}

    // 日付範囲
    if (startDate || endDate) {
      where.orderedAt = {}
      if (startDate) where.orderedAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.orderedAt.lte = end
      }
    }

    // ステータス
    if (status) {
      where.status = status
    }

    // 会員コード
    if (memberCode) {
      where.user = {
        memberCode: {
          contains: memberCode
        }
      }
    }

    // 配送業者
    if (carrier) {
      where.shippingLabel = {
        carrier: carrier
      }
    }

    // 商品名・コードでの検索
    if (keyword) {
      where.items = {
        some: {
          OR: [
            { productName: { contains: keyword } },
            { productCode: { contains: keyword } }
          ]
        }
      }
    }

    // 注文データ取得
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
            email: true
          }
        },
        items: {
          select: {
            id: true,
            productName: true,
            unitPrice: true,
            quantity: true,
            lineAmount: true,
            product: {
              select: {
                name: true
              }
            }
          }
        },
        shippingLabel: {
          select: {
            id: true,
            carrier: true,
            trackingNumber: true,
            status: true,
            recipientName: true,
            recipientPhone: true,
            recipientPostal: true,
            recipientAddress: true,
            itemDescription: true,
            itemCount: true,
            printedAt: true,
            shippedAt: true
          }
        }
      },
      orderBy: {
        orderedAt: "desc"
      }
    })

    // レスポンス整形
    const formattedOrders = orders.map((order) => ({
      id: Number(order.id),
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalAmount: order.subtotalAmount,
      usedPoints: order.usedPoints,
      totalAmount: order.totalAmount,
      orderedAt: order.orderedAt.toISOString(),
      memberCode: order.user.memberCode,
      memberName: order.user.name,
      memberEmail: order.user.email,
      items: order.items.map((item) => ({
        id: Number(item.id),
        productName: item.productName,
        productCode: item.product.code || item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount
      })),
      shippingLabel: order.shippingLabel ? {
        id: Number(order.shippingLabel.id),
        carrier: order.shippingLabel.carrier,
        trackingNumber: order.shippingLabel.trackingNumber,
        status: order.shippingLabel.status,
        recipientName: order.shippingLabel.recipientName,
        recipientPhone: order.shippingLabel.recipientPhone,
        recipientPostal: order.shippingLabel.recipientPostal,
        recipientAddress: order.shippingLabel.recipientAddress,
        itemDescription: order.shippingLabel.itemDescription,
        itemCount: order.shippingLabel.itemCount,
        printedAt: order.shippingLabel.printedAt?.toISOString() || null,
        shippedAt: order.shippingLabel.shippedAt?.toISOString() || null
      } : null
    }))

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
