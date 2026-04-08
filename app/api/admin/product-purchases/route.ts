import { NextRequest, NextResponse } from "next/server"

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 購入データ追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productCode, productName, month, quantity, amount, points } = body

    if (!productCode || !month) {
      return NextResponse.json(
        { success: false, error: "Product code and month are required" },
        { status: 400 }
      )
    }

    // ダミーデータとして保存（実際には特定の会員に紐づける）
    // TODO: 実際の実装では会員IDを指定して保存する
    const purchase = await prisma.mlmPurchase.create({
      data: {
        mlmMemberId: BigInt(1), // ダミー会員ID
        productCode,
        productName,
        quantity: quantity || 1,
        unitPrice: amount || 0,
        points: points || 0,
        totalPoints: (quantity || 1) * (points || 0),
        purchaseStatus: "one_time",
        purchaseMonth: month,
        purchasedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      purchase: {
        id: Number(purchase.id),
        productCode: purchase.productCode,
        quantity: purchase.quantity,
        amount: purchase.unitPrice * purchase.quantity,
        points: purchase.totalPoints
      }
    })
  } catch (error) {
    console.error("Error adding purchase:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add purchase" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
