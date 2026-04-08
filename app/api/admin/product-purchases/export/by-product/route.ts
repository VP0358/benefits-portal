// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
// 商品別CSV出力
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

    // CSVヘッダー
    const headers = [
      "注文ID",
      "氏名",
      "会員コード",
      "商品コード",
      "商品名",
      "購入数",
      "単価",
      "金額",
      "ポイント",
      "購入月"
    ]

    // CSVデータ生成
    const csvRows: string[] = [headers.join(",")]

    for (const purchase of purchases) {
      const row = [
        purchase.id.toString(),
        purchase.mlmMember.user.name,
        purchase.mlmMember.user.memberCode,
        purchase.productCode,
        `"${purchase.productName.replace(/"/g, '""')}"`,
        purchase.quantity,
        purchase.unitPrice,
        purchase.unitPrice * purchase.quantity,
        purchase.totalPoints,
        purchase.purchaseMonth
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
        "Content-Disposition": `attachment; filename="purchases_by_product_${new Date().toISOString().split("T")[0]}.csv"`
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
