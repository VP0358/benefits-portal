import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// CSV出力
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // 検索条件構築
    const where: any = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // 伝票データ取得
    const labels = await prisma.shippingLabel.findMany({
      where,
      include: {
        order: {
          include: {
            items: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // CSVヘッダー
    const headers = [
      "伝票番号",
      "オートシップNo",
      "宛先名",
      "会社名",
      "電話番号",
      "FAX",
      "郵便番号",
      "住所",
      "配送業者",
      "追跡番号",
      "配達方法",
      "配達希望時間",
      "送料",
      "送料区分",
      "顧客ランク",
      "ステータス",
      "作成日"
    ]

    // CSVデータ生成
    const csvRows: string[] = [headers.join(",")]

    for (const label of labels) {
      const carrierNames: Record<string, string> = {
        yamato: "ヤマト運輸",
        sagawa: "佐川急便",
        japan_post: "日本郵便"
      }

      const statusNames: Record<string, string> = {
        pending: "未印刷",
        printed: "印刷済み",
        shipped: "発送済み",
        canceled: "キャンセル"
      }

      const row = [
        label.orderNumber,
        label.autoshipNo || "",
        label.recipientName,
        label.recipientCompany || "",
        label.recipientPhone,
        label.recipientFax || "",
        label.recipientPostal,
        `"${label.recipientAddress.replace(/"/g, '""')}"`,
        carrierNames[label.carrier] || label.carrier,
        label.trackingNumber || "",
        label.deliveryType || "",
        label.deliveryTime || "",
        label.shippingFee,
        label.shippingFeeType,
        label.customerRank || "",
        statusNames[label.status] || label.status,
        label.createdAt.toLocaleDateString("ja-JP")
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
        "Content-Disposition": `attachment; filename="shipping_labels_${new Date().toISOString().split("T")[0]}.csv"`
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
