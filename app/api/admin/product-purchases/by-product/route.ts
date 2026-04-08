// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"


import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 商品別購入検索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const productCode = searchParams.get("productCode")
    const startMonth = searchParams.get("startMonth")
    const endMonth = searchParams.get("endMonth")

    // 検索条件構築
    const where: any = {}

    if (productCode) {
      where.productCode = productCode
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
    console.error("Error searching by product:", error)
    return NextResponse.json(
      { success: false, error: "Failed to search by product" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
