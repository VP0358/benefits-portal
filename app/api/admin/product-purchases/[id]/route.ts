export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

// 購入ステータス更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const body = await request.json()
    const { purchaseStatus } = body

    const validStatuses = [
      "autoship", "one_time", "new_member", "cooling_off", "canceled",
      "out_of_stock", "out_of_stock_minus_1", "company_sale", "other"
    ]
    if (!validStatuses.includes(purchaseStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const purchase = await prisma.mlmPurchase.update({
      where: { id: BigInt(id) },
      data: { purchaseStatus },
      include: {
        mlmMember: {
          include: {
            user: {
              select: { name: true, memberCode: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      purchase: {
        id: Number(purchase.id),
        memberCode: purchase.mlmMember.user.memberCode,
        memberName: purchase.mlmMember.user.name,
        productCode: purchase.productCode,
        productName: purchase.productName,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        totalAmount: purchase.unitPrice * purchase.quantity,
        points: purchase.points,
        totalPoints: purchase.totalPoints,
        purchaseStatus: purchase.purchaseStatus,
        purchaseMonth: purchase.purchaseMonth,
        purchasedAt: purchase.purchasedAt.toISOString()
      }
    })
  } catch (error) {
    console.error("Error updating purchase status:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
