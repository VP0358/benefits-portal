export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// 口座振替結果CSV取込
// CSV形式: 会員コード,注文番号,金額,結果(0=成功/1=失敗)
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
    let failCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (i === 0 && (line.includes("会員") || line.includes("注文") || line.includes("Code"))) continue

      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
      if (cols.length < 3) continue

      // CSVフォーマット: 注文番号, 入金日(YYYY-MM-DD), 結果(paid/unpaid/ng)
      const [orderNumber, paidDateStr, result] = cols

      try {
        const order = await prisma.order.findUnique({ where: { orderNumber } })
        if (!order) {
          errors.push(`行${i+1}: 注文番号 "${orderNumber}" が見つかりません`)
          errorCount++
          continue
        }

        const isPaid = result === "paid" || result === "0" || result === "success" || result === "成功"

        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: isPaid ? "paid" : "unpaid",
            paidAt: isPaid && paidDateStr
              ? new Date(paidDateStr.replace(/\//g, "-"))
              : isPaid ? new Date() : null,
            updatedAt: new Date(),
          }
        })

        if (isPaid) successCount++
        else failCount++
      } catch (e) {
        errors.push(`行${i+1}: 処理エラー (${orderNumber})`)
        errorCount++
        console.error(e)
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      errorCount,
      errors: errors.slice(0, 20),
    })
  } catch (error) {
    console.error("Debit CSV import error:", error)
    return NextResponse.json({ success: false, error: "CSVの取込に失敗しました" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
