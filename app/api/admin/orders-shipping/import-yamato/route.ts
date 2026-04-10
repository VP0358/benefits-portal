export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// ヤマト運輸発送完了CSV取込
// CSV形式: 伝票番号,注文番号,発送日,追跡番号
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: "ファイルが選択されていません" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // ヘッダ行スキップ
      if (i === 0 && (line.includes("注文番号") || line.includes("伝票番号") || line.includes("OrderNo"))) continue

      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
      if (cols.length < 2) continue

      // CSVフォーマット: 注文番号, 発送日(YYYY-MM-DD or YYYY/MM/DD), 追跡番号
      const [orderNumber, shippedDateStr, trackingNumber] = cols

      try {
        const order = await prisma.order.findUnique({
          where: { orderNumber },
          include: { shippingLabel: true }
        })

        if (!order) {
          errors.push(`行${i+1}: 注文番号 "${orderNumber}" が見つかりません`)
          errorCount++
          continue
        }

        const shippedAt = shippedDateStr
          ? new Date(shippedDateStr.replace(/\//g, "-"))
          : new Date()

        // ShippingLabelの更新
        if (order.shippingLabel) {
          await prisma.shippingLabel.update({
            where: { id: order.shippingLabel.id },
            data: {
              trackingNumber: trackingNumber || order.shippingLabel.trackingNumber,
              shippedAt,
              status: "shipped",
            }
          })
        }

        // Orderの更新
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "shipped",
            shippingStatus: "shipped",
            updatedAt: new Date(),
          }
        })

        successCount++
      } catch (e) {
        errors.push(`行${i+1}: 処理エラー (${orderNumber})`)
        errorCount++
        console.error(e)
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errors: errors.slice(0, 20), // 最大20件のエラー
    })
  } catch (error) {
    console.error("Yamato CSV import error:", error)
    return NextResponse.json({ success: false, error: "CSVの取込に失敗しました" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
