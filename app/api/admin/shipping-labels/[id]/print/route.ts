import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import PDFDocument from 'pdfkit'

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const label = await prisma.shippingLabel.findUnique({
      where: { id: BigInt(id) },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })
    
    if (!label) {
      return NextResponse.json(
        { message: 'Shipping label not found' },
        { status: 404 }
      )
    }
    
    // PDF生成
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    
    doc.on('data', (chunk) => chunks.push(chunk))
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })
    
    // タイトル
    doc.fontSize(20).text('発送伝票', { align: 'center' })
    doc.moveDown()
    
    // 差出人情報
    doc.fontSize(12).text('【差出人】', { underline: true })
    doc.fontSize(10)
    doc.text(`${label.senderName}`)
    doc.text(`〒${label.senderPostal}`)
    doc.text(`${label.senderAddress}`)
    doc.text(`TEL: ${label.senderPhone}`)
    doc.moveDown()
    
    // 配送先情報
    doc.fontSize(12).text('【配送先】', { underline: true })
    doc.fontSize(10)
    if (label.recipientCompany) {
      doc.text(`会社名: ${label.recipientCompany}`)
    }
    doc.text(`氏名: ${label.recipientName}`)
    doc.text(`〒${label.recipientPostal}`)
    doc.text(`住所: ${label.recipientAddress}`)
    doc.text(`TEL: ${label.recipientPhone}`)
    if (label.recipientFax) {
      doc.text(`FAX: ${label.recipientFax}`)
    }
    doc.moveDown()
    
    // 配送情報
    doc.fontSize(12).text('【配送情報】', { underline: true })
    doc.fontSize(10)
    doc.text(`伝票番号: ${label.id}`)
    doc.text(`注文番号: ${label.orderNumber}`)
    doc.text(`配送業者: ${
      label.carrier === 'yamato' ? 'ヤマト運輸' :
      label.carrier === 'sagawa' ? '佐川急便' :
      label.carrier === 'japan_post' ? '日本郵便' : label.carrier
    }`)
    if (label.trackingNumber) {
      doc.text(`追跡番号: ${label.trackingNumber}`)
    }
    if (label.deliveryTime) {
      doc.text(`配達希望時間: ${label.deliveryTime}`)
    }
    if (label.autoshipNo) {
      doc.text(`オートシップNo: ${label.autoshipNo}`)
    }
    doc.moveDown()
    
    // 商品情報
    doc.fontSize(12).text('【商品明細】', { underline: true })
    doc.fontSize(10)
    
    let y = doc.y
    const itemHeight = 20
    
    // ヘッダー
    doc.text('品名', 50, y)
    doc.text('数量', 300, y)
    doc.text('単価', 380, y)
    doc.text('小計', 480, y)
    y += itemHeight
    
    doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke()
    
    // 商品一覧
    label.order.orderItems.forEach((item) => {
      doc.text(item.productName, 50, y)
      doc.text(item.quantity.toString(), 300, y)
      doc.text(`¥${item.unitPrice.toLocaleString()}`, 380, y)
      doc.text(`¥${item.lineAmount.toLocaleString()}`, 480, y)
      y += itemHeight
    })
    
    doc.moveTo(50, y).lineTo(550, y).stroke()
    y += 10
    
    // 合計
    doc.fontSize(12)
    doc.text(`合計金額: ¥${label.order.totalAmount.toLocaleString()}`, 380, y, {
      width: 170,
      align: 'right'
    })
    
    // 備考
    if (label.note) {
      doc.moveDown(2)
      doc.fontSize(12).text('【備考】', { underline: true })
      doc.fontSize(10).text(label.note)
    }
    
    // フッター
    doc.fontSize(8)
    doc.text(
      `発行日: ${new Date().toLocaleDateString('ja-JP')}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    )
    
    doc.end()
    
    const pdfBuffer = await pdfPromise
    
    // 印刷済みステータスに更新
    await prisma.shippingLabel.update({
      where: { id: BigInt(id) },
      data: {
        status: 'printed',
        printedAt: new Date()
      }
    })
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shipping-label-${id}.pdf"`
      }
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    return NextResponse.json(
      { message: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
