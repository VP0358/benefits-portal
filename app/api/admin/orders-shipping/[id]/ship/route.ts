// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"


const prisma = new PrismaClient()

// 発送済みに更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = BigInt(id)

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

    // トランザクション: 注文と発送ラベルを同時更新
    await prisma.$transaction(async (tx) => {
      // 注文ステータスを「発送済」に更新
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "shipped",
          updatedAt: new Date()
        }
      })

      // ShippingLabelのステータスも更新
      if (order.shippingLabel) {
        await tx.shippingLabel.update({
          where: { orderId: orderId },
          data: {
            status: "shipped",
            shippedAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: "Order marked as shipped"
    })
  } catch (error) {
    console.error("Error marking order as shipped:", error)
    return NextResponse.json(
      { success: false, error: "Failed to mark order as shipped" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
