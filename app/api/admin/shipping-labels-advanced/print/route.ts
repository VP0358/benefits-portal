import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import PDFDocument from "pdfkit"

const prisma = new PrismaClient()

// 伝票PDF一括印刷
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { labelIds } = body

    if (!labelIds || labelIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No label IDs provided" },
        { status: 400 }
      )
    }

    // 伝票データ取得
    const labels = await prisma.shippingLabel.findMany({
      where: {
        id: {
          in: labelIds.map((id: number) => BigInt(id))
        }
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (labels.length === 0) {
      return NextResponse.json(
        { success: false, error: "No labels found" },
        { status: 404 }
      )
    }

    // PDF生成
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk) => chunks.push(chunk))

    // 各伝票のPDF生成
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]
      
      if (i > 0) {
        doc.addPage()
      }

      // ヘッダー
      doc.fontSize(20).text("発送伝票", { align: "center" })
      doc.moveDown()

      // 伝票番号
      doc.fontSize(12)
      doc.text(`伝票番号: ${label.orderNumber}`)
      doc.text(`作成日: ${label.createdAt.toLocaleDateString("ja-JP")}`)
      doc.moveDown()

      // 配送先情報
      doc.fontSize(14).text("【配送先】", { underline: true })
      doc.fontSize(12)
      if (label.recipientCompany) {
        doc.text(`会社名: ${label.recipientCompany}`)
      }
      doc.text(`氏名: ${label.recipientName}`)
      doc.text(`電話: ${label.recipientPhone}`)
      if (label.recipientFax) {
        doc.text(`FAX: ${label.recipientFax}`)
      }
      doc.text(`郵便番号: 〒${label.recipientPostal}`)
      doc.text(`住所: ${label.recipientAddress}`)
      doc.moveDown()

      // 差出人情報
      doc.fontSize(14).text("【差出人】", { underline: true })
      doc.fontSize(12)
      doc.text(`${label.senderName}`)
      doc.text(`〒${label.senderPostal}`)
      doc.text(`${label.senderAddress}`)
      doc.text(`TEL: ${label.senderPhone}`)
      doc.moveDown()

      // 配送情報
      doc.fontSize(14).text("【配送情報】", { underline: true })
      doc.fontSize(12)
      const carrierNames: Record<string, string> = {
        yamato: "ヤマト運輸",
        sagawa: "佐川急便",
        japan_post: "日本郵便"
      }
      doc.text(`配送業者: ${carrierNames[label.carrier] || label.carrier}`)
      if (label.trackingNumber) {
        doc.text(`追跡番号: ${label.trackingNumber}`)
      }
      if (label.deliveryType) {
        doc.text(`配達方法: ${label.deliveryType}`)
      }
      if (label.deliveryTime) {
        doc.text(`配達希望時間: ${label.deliveryTime}`)
      }
      if (label.autoshipNo) {
        doc.text(`オートシップNo: ${label.autoshipNo}`)
      }
      doc.moveDown()

      // 商品明細
      doc.fontSize(14).text("【商品明細】", { underline: true })
      doc.fontSize(12)
      let totalAmount = 0
      label.order.items.forEach((item, index) => {
        doc.text(
          `${index + 1}. ${item.productName} × ${item.quantity} = ¥${item.lineAmount.toLocaleString()}`
        )
        totalAmount += item.lineAmount
      })
      doc.moveDown()
      
      // 送料
      if (label.shippingFee > 0) {
        doc.text(`送料: ¥${label.shippingFee.toLocaleString()}`)
        totalAmount += label.shippingFee
      } else {
        doc.text(`送料: 無料`)
      }
      
      doc.fontSize(14).text(`合計金額: ¥${totalAmount.toLocaleString()}`, { align: "right" })

      // 備考
      if (label.note) {
        doc.moveDown()
        doc.fontSize(10).text(`備考: ${label.note}`)
      }

      // フッター
      doc.moveDown()
      doc.fontSize(10)
      doc.text(`発行日時: ${new Date().toLocaleString("ja-JP")}`, { align: "center" })
    }

    doc.end()

    // PDF完成を待つ
    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve())
    })

    const pdfBuffer = Buffer.concat(chunks)

    // 印刷済みに更新
    await prisma.shippingLabel.updateMany({
      where: {
        id: {
          in: labelIds.map((id: number) => BigInt(id))
        }
      },
      data: {
        status: "printed",
        printedAt: new Date()
      }
    })

    // PDFレスポンス
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shipping_labels_${new Date().toISOString().split("T")[0]}.pdf"`
      }
    })
  } catch (error) {
    console.error("Error printing labels:", error)
    return NextResponse.json(
      { success: false, error: "Failed to print labels" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
