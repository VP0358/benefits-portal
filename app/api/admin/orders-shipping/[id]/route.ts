// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// 注文更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = BigInt(id)
    const body = await request.json()
    const { status, carrier, trackingNumber, shippingStatus } = body

    // 注文の存在確認
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shippingLabel: true }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      )
    }

    // トランザクション: 注文とshippingLabelを同時更新
    const result = await prisma.$transaction(async (tx) => {
      // 注文ステータス更新
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: status,
          updatedAt: new Date()
        }
      })

      // ShippingLabel更新または作成
      let shippingLabel
      if (order.shippingLabel) {
        // 既存のshippingLabel更新
        shippingLabel = await tx.shippingLabel.update({
          where: { orderId: orderId },
          data: {
            carrier: carrier,
            trackingNumber: trackingNumber || null,
            status: shippingStatus,
            shippedAt: shippingStatus === "shipped" ? new Date() : order.shippingLabel.shippedAt,
            updatedAt: new Date()
          }
        })
      } else {
        // ShippingLabelが存在しない場合は作成
        const user = await tx.user.findUnique({
          where: { id: order.userId }
        })

        if (!user) {
          throw new Error("User not found")
        }

        shippingLabel = await tx.shippingLabel.create({
          data: {
            orderId: orderId,
            orderNumber: order.orderNumber,
            carrier: carrier,
            trackingNumber: trackingNumber || null,
            status: shippingStatus,
            recipientName: user.name,
            recipientPhone: user.phone || "",
            recipientPostal: user.postalCode || "",
            recipientAddress: user.address || "",
            shippedAt: shippingStatus === "shipped" ? new Date() : null
          }
        })
      }

      return { order: updatedOrder, shippingLabel }
    })

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      data: result
    })
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 注文削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = BigInt(id)

    // 注文の存在確認
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      )
    }

    // 注文削除（CASCADE設定により関連データも削除される）
    await prisma.order.delete({
      where: { id: orderId }
    })

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete order" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
