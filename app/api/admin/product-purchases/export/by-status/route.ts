// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"


import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const statusLabels: Record<string, string> = {
  autoship: "オートシップ",
  one_time: "定期購入",
  new_member: "入会時等",
  cooling_off: "クーリングオフ",
  canceled: "キャンセル",
  out_of_stock: "欠品",
  out_of_stock_minus_1: "欠品欠1",
  company_sale: "社販",
  other: "その他"
}

// ステータス別CSV出力
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const startMonth = searchParams.get("startMonth")
    const endMonth = searchParams.get("endMonth")
    const status = searchParams.get("status")

    // 検索条件構築
    const where: any = {}

    if (startMonth || endMonth) {
      where.purchaseMonth = {}
      if (startMonth) where.purchaseMonth.gte = startMonth
      if (endMonth) where.purchaseMonth.lte = endMonth
    }

    if (status) {
      where.purchaseStatus = status
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
      "ID",
      "会員コード",
      "氏名",
      "商品コード",
      "商品名",
      "数量",
      "単価",
      "合計金額",
      "ポイント",
      "合計ポイント",
      "ステータス",
      "購入月",
      "購入日"
    ]

    // CSVデータ生成
    const csvRows: string[] = [headers.join(",")]

    for (const purchase of purchases) {
      const row = [
        purchase.id.toString(),
        purchase.mlmMember.user.memberCode,
        purchase.mlmMember.user.name,
        purchase.productCode,
        `"${purchase.productName.replace(/"/g, '""')}"`,
        purchase.quantity,
        purchase.unitPrice,
        purchase.unitPrice * purchase.quantity,
        purchase.points,
        purchase.totalPoints,
        statusLabels[purchase.purchaseStatus] || purchase.purchaseStatus,
        purchase.purchaseMonth,
        purchase.purchasedAt.toLocaleDateString("ja-JP")
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
        "Content-Disposition": `attachment; filename="purchases_by_status_${new Date().toISOString().split("T")[0]}.csv"`
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
