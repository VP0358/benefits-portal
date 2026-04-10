// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
    const paymentMethod = searchParams.get("paymentMethod") // カード/口座振替/銀行振込/代引き/その他
    const slipType = searchParams.get("slipType")           // 伝票種別: autoship/one_time/new_member/cooling_off/return

    // 検索条件構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        mlmMember: {
          memberCode: { contains: memberCode }
        }
      }
    }

    // 配送業者
    if (carrier) {
      where.shippingLabel = {
        carrier: carrier
      }
    }

    // 支払方法（MlmMemberのpaymentMethodを検索）
    if (paymentMethod) {
      // paymentMethodのマッピング
      const pmMap: Record<string, string> = {
        "card": "credit_card",
        "bank_transfer": "bank_transfer",
        "bank_payment": "bank_payment",
        "cod": "cod",           // 代引き（将来対応）
        "other": "other"        // その他（将来対応）
      }
      const dbPaymentMethod = pmMap[paymentMethod] || paymentMethod
      
      if (where.user) {
        where.user = {
          ...where.user,
          mlmMember: {
            ...(where.user.mlmMember || {}),
            paymentMethod: dbPaymentMethod
          }
        }
      } else {
        where.user = {
          mlmMember: { paymentMethod: dbPaymentMethod }
        }
      }
    }

    // 伝票種別（ShippingLabel.deliveryTypeで検索）
    if (slipType) {
      const slipTypeMap: Record<string, string> = {
        "autoship": "autoship",
        "one_time": "one_time",       // 都度払い→都度購入
        "new_member": "new_member",   // 新規
        "cooling_off": "cooling_off", // クーリングオフ
        "return": "return"            // 返品
      }
      const dbSlipType = slipTypeMap[slipType] || slipType
      
      if (where.shippingLabel && typeof where.shippingLabel === 'object') {
        where.shippingLabel = {
          ...where.shippingLabel,
          deliveryType: dbSlipType
        }
      } else {
        where.shippingLabel = {
          deliveryType: dbSlipType
        }
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
            email: true,
            mlmMember: {
              select: {
                memberCode: true,
                paymentMethod: true
              }
            }
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
                code: true,
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
            deliveryType: true,
            orderMethod: true,
            printedAt: true,
            shippedAt: true
          }
        }
      },
      orderBy: {
        orderedAt: "desc"
      },
      take: 500
    })

    // レスポンス整形
    const formattedOrders = orders.map((order) => {
      const mlmMember = order.user.mlmMember
      const paymentMethodValue = mlmMember?.paymentMethod || null
      
      // 支払方法の表示名
      const paymentMethodLabel: Record<string, string> = {
        credit_card: "カード",
        bank_transfer: "口座振替",
        bank_payment: "銀行振込"
      }

      return {
        id: Number(order.id),
        orderNumber: order.orderNumber,
        status: order.status,
        subtotalAmount: order.subtotalAmount,
        usedPoints: order.usedPoints,
        totalAmount: order.totalAmount,
        orderedAt: order.orderedAt.toISOString(),
        memberCode: mlmMember?.memberCode || order.user.memberCode,
        memberName: order.user.name,
        memberEmail: order.user.email,
        paymentMethod: paymentMethodValue,
        paymentMethodLabel: paymentMethodLabel[paymentMethodValue || ""] || "-",
        items: order.items.map((item) => ({
          id: Number(item.id),
          productName: item.productName,
          productCode: item.product?.code || "",
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
          deliveryType: order.shippingLabel.deliveryType,
          orderMethod: order.shippingLabel.orderMethod,
          printedAt: order.shippingLabel.printedAt?.toISOString() || null,
          shippedAt: order.shippingLabel.shippedAt?.toISOString() || null
        } : null
      }
    })

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
