// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import PDFDocument from "pdfkit"


const prisma = new PrismaClient()

// 発送ラベル印刷（PDF生成）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = BigInt(id)

    // 注文と配送情報を取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        },
        shippingLabel: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      )
    }

    // ShippingLabelが存在しない場合は作成
    let shippingLabel = order.shippingLabel
    if (!shippingLabel) {
      shippingLabel = await prisma.shippingLabel.create({
        data: {
          orderId: orderId,
          orderNumber: order.orderNumber,
          carrier: "yamato",
          status: "pending",
          recipientName: order.user.name,
          recipientPhone: order.user.phone || "",
          recipientPostal: order.user.postalCode || "",
          recipientAddress: order.user.address || ""
        }
      })
    }

    // PDF生成
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk) => chunks.push(chunk))

    // PDFヘッダー
    doc.fontSize(20).text("発送伝票", { align: "center" })
    doc.moveDown()

    // 注文情報
    doc.fontSize(12)
    doc.text(`注文番号: ${order.orderNumber}`)
    doc.text(`注文日: ${order.orderedAt.toLocaleDateString("ja-JP")}`)
    doc.moveDown()

    // 配送先情報
    doc.fontSize(14).text("【配送先】", { underline: true })
    doc.fontSize(12)
    doc.text(`氏名: ${shippingLabel.recipientName}`)
    doc.text(`電話: ${shippingLabel.recipientPhone}`)
    doc.text(`郵便番号: 〒${shippingLabel.recipientPostal}`)
    doc.text(`住所: ${shippingLabel.recipientAddress}`)
    doc.moveDown()

    // 差出人情報
    doc.fontSize(14).text("【差出人】", { underline: true })
    doc.fontSize(12)
    doc.text(`${shippingLabel.senderName}`)
    doc.text(`〒${shippingLabel.senderPostal}`)
    doc.text(`${shippingLabel.senderAddress}`)
    doc.text(`TEL: ${shippingLabel.senderPhone}`)
    doc.moveDown()

    // 配送情報
    doc.fontSize(14).text("【配送情報】", { underline: true })
    doc.fontSize(12)
    const carrierNames: Record<string, string> = {
      yamato: "ヤマト運輸",
      sagawa: "佐川急便",
      japan_post: "日本郵便"
    }
    doc.text(`配送業者: ${carrierNames[shippingLabel.carrier] || shippingLabel.carrier}`)
    if (shippingLabel.trackingNumber) {
      doc.text(`追跡番号: ${shippingLabel.trackingNumber}`)
    }
    doc.moveDown()

    // 商品情報
    doc.fontSize(14).text("【商品明細】", { underline: true })
    doc.fontSize(12)
    order.items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.productName} × ${item.quantity} = ¥${item.lineAmount.toLocaleString()}`
      )
    })
    doc.moveDown()
    doc.fontSize(14).text(`合計金額: ¥${order.totalAmount.toLocaleString()}`, { align: "right" })

    // 備考
    doc.moveDown()
    doc.fontSize(10)
    doc.text("※この伝票は配送用ラベルです。", { align: "center" })
    doc.text(`発行日時: ${new Date().toLocaleString("ja-JP")}`, { align: "center" })

    doc.end()

    // PDF完成を待つ
    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve())
    })

    const pdfBuffer = Buffer.concat(chunks)

    // ShippingLabelのprintedAt更新
    await prisma.shippingLabel.update({
      where: { id: shippingLabel.id },
      data: {
        status: "printed",
        printedAt: new Date()
      }
    })

    // PDFレスポンス
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shipping_label_${order.orderNumber}.pdf"`
      }
    })
  } catch (error) {
    console.error("Error generating shipping label:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate shipping label" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
