import { NextRequest, NextResponse } from "next/server"

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 月別購入一覧取得
export async function GET(request: NextRequest) {
  try {
    // 全購入データを取得
    const purchases = await prisma.mlmPurchase.findMany({
      orderBy: {
        purchaseMonth: "desc"
      }
    })

    // 商品コードごとに月別集計
    const monthlyMap: Record<string, {
      productCode: string
      productName: string
      months: Record<string, { quantity: number; amount: number; points: number }>
    }> = {}

    for (const purchase of purchases) {
      const key = purchase.productCode
      
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          productCode: purchase.productCode,
          productName: purchase.productName,
          months: {}
        }
      }

      const month = purchase.purchaseMonth
      if (!monthlyMap[key].months[month]) {
        monthlyMap[key].months[month] = {
          quantity: 0,
          amount: 0,
          points: 0
        }
      }

      monthlyMap[key].months[month].quantity += purchase.quantity
      monthlyMap[key].months[month].amount += purchase.unitPrice * purchase.quantity
      monthlyMap[key].months[month].points += purchase.totalPoints
    }

    const result = Object.values(monthlyMap)

    return NextResponse.json({
      success: true,
      purchases: result,
      count: result.length
    })
  } catch (error) {
    console.error("Error fetching monthly purchases:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch monthly purchases" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
