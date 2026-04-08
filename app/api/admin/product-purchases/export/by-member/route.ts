// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"


import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 会員別CSV出力
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

    // CSVヘッダー
    const headers = [
      "注文1",
      "氏名",
      "注文確認日",
      "会員コード",
      "商品コード",
      "商品名",
      "数量",
      "金額"
    ]

    // CSVデータ生成
    const csvRows: string[] = [headers.join(",")]

    for (const purchase of purchases) {
      const row = [
        purchase.id.toString(),
        purchase.mlmMember.user.name,
        purchase.purchasedAt.toLocaleDateString("ja-JP"),
        purchase.mlmMember.user.memberCode,
        purchase.productCode,
        `"${purchase.productName.replace(/"/g, '""')}"`,
        purchase.quantity,
        purchase.unitPrice * purchase.quantity
      ]
      csvRows.push(row.join(","))
    }

    const csvContent = csvRows.join("\n")

    // BOM付きUTF-8でエンコード（Excel対応）
    const bom = "\uFEFF"
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="purchases_by_member_${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Error exporting CSV:", error)
    return NextResponse.json(
      { success: false, error: "Failed to export CSV" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
