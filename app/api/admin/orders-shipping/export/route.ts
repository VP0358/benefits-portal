import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// CSV出力
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const memberCode = searchParams.get("memberCode")
    const status = searchParams.get("status")
    const carrier = searchParams.get("carrier")

    // 検索条件構築
    const where: any = {}

    if (startDate || endDate) {
      where.orderedAt = {}
      if (startDate) where.orderedAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.orderedAt.lte = end
      }
    }

    if (status) where.status = status

    if (memberCode) {
      where.user = {
        memberCode: { contains: memberCode }
      }
    }

    if (carrier) {
      where.shippingLabel = {
        carrier: carrier
      }
    }

    // データ取得
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
            email: true,
            phone: true,
            postalCode: true,
            address: true
          }
        },
        items: {
          include: {
            product: true
          }
        },
        shippingLabel: true
      },
      orderBy: {
        orderedAt: "desc"
      }
    })

    // CSVヘッダー
    const headers = [
      "注文番号",
      "注文日時",
      "会員コード",
      "会員名",
      "メールアドレス",
      "電話番号",
      "郵便番号",
      "住所",
      "商品コード",
      "商品名",
      "数量",
      "単価",
      "小計",
      "使用ポイント",
      "合計金額",
      "注文ステータス",
      "配送業者",
      "追跡番号",
      "発送ステータス",
      "発送日"
    ]

    // CSVデータ生成
    const csvRows: string[] = [headers.join(",")]

    for (const order of orders) {
      for (const item of order.items) {
        const row = [
          order.orderNumber,
          order.orderedAt.toLocaleString("ja-JP"),
          order.user.memberCode,
          order.user.name,
          order.user.email,
          order.user.phone || "",
          order.user.postalCode || "",
          `"${order.user.address?.replace(/"/g, '""') || ""}"`,
          item.product.code || "",
          item.productName,
          item.quantity,
          item.unitPrice,
          item.lineAmount,
          order.usedPoints,
          order.totalAmount,
          order.status,
          order.shippingLabel?.carrier || "",
          order.shippingLabel?.trackingNumber || "",
          order.shippingLabel?.status || "",
          order.shippingLabel?.shippedAt?.toLocaleDateString("ja-JP") || ""
        ]
        csvRows.push(row.join(","))
      }
    }

    const csvContent = csvRows.join("\n")

    // BOM付きUTF-8でエンコード（Excel対応）
    const bom = "\uFEFF"
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().split("T")[0]}.csv"`
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
