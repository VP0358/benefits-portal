// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
// 会員別購入検索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const memberCode = searchParams.get("memberCode")
    const startMonth = searchParams.get("startMonth")
    const endMonth = searchParams.get("endMonth")

    // 検索条件構築
    const where: any = {}

    if (memberCode) {
      where.mlmMember = {
        user: {
          memberCode: {
            contains: memberCode
          }
        }
      }
    }

    if (startMonth || endMonth) {
      where.purchaseMonth = {}
      if (startMonth) where.purchaseMonth.gte = startMonth
      if (endMonth) where.purchaseMonth.lte = endMonth
    }

    // 購入データ取得
    const purchases = await prisma.mlmPurchase.findMany({
      where,
      include: {
        mlmMember: {
          include: {
            user: {
              select: {
                name: true,
                memberCode: true
              }
            }
          }
        }
      },
      orderBy: {
        purchaseMonth: "desc"
      }
    })

    // レスポンス整形
    const formattedPurchases = purchases.map((purchase) => ({
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
    }))

    return NextResponse.json({
      success: true,
      purchases: formattedPurchases,
      count: formattedPurchases.length
    })
  } catch (error) {
    console.error("Error searching by member:", error)
    return NextResponse.json(
      { success: false, error: "Failed to search by member" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
