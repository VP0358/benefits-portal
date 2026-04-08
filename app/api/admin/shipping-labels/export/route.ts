// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // フィルター条件を構築(route.tsと同じロジック)
    const where: any = {}
    
    if (searchParams.get('shippingDateFrom')) {
      where.shippedAt = {
        ...where.shippedAt,
        gte: new Date(searchParams.get('shippingDateFrom')!)
      }
    }
    if (searchParams.get('shippingDateTo')) {
      where.shippedAt = {
        ...where.shippedAt,
        lte: new Date(searchParams.get('shippingDateTo')!)
      }
    }
    
    if (searchParams.get('joinDateFrom')) {
      where.memberJoinDate = {
        ...where.memberJoinDate,
        gte: new Date(searchParams.get('joinDateFrom')!)
      }
    }
    if (searchParams.get('joinDateTo')) {
      where.memberJoinDate = {
        ...where.memberJoinDate,
        lte: new Date(searchParams.get('joinDateTo')!)
      }
    }
    
    if (searchParams.get('orderMethod')) {
      where.orderMethod = searchParams.get('orderMethod')
    }
    
    if (searchParams.get('deliveryNumber')) {
      where.trackingNumber = {
        contains: searchParams.get('deliveryNumber')
      }
    }
    
    if (searchParams.get('desiredDeliveryDate')) {
      where.desiredDeliveryDate = new Date(searchParams.get('desiredDeliveryDate')!)
    }
    
    if (searchParams.get('recordNumber')) {
      where.recordNumber = {
        contains: searchParams.get('recordNumber')
      }
    }
    
    const labels = await prisma.shippingLabel.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // CSVヘッダー
    const headers = [
      '伝票番号',
      '注文番号',
      '配送先名',
      '配送先会社名',
      '配送先郵便番号',
      '配送先住所',
      '配送先電話番号',
      '配送先FAX',
      '注文者名',
      '法人名',
      '法人代表者',
      '注文者電話番号',
      '注文者FAX',
      '生年月日',
      '初回接触',
      'お客様ランク',
      '配送業者',
      '追跡番号',
      '配達方法',
      '配達時間',
      '配送センター',
      'オートシップNo',
      '金券番号',
      '配送希望日',
      '記録番号',
      '受注方法',
      'ステータス',
      '商品明細',
      '合計金額',
      '備考',
      '作成日時',
      '更新日時'
    ]
    
    // CSVデータ
    const rows = labels.map(label => {
      const carrier = 
        label.carrier === 'yamato' ? 'ヤマト運輸' :
        label.carrier === 'sagawa' ? '佐川急便' :
        label.carrier === 'japan_post' ? '日本郵便' : label.carrier
      
      const status =
        label.status === 'pending' ? '未印刷' :
        label.status === 'printed' ? '印刷済み' :
        label.status === 'shipped' ? '発送済み' :
        label.status === 'canceled' ? 'キャンセル' : label.status
      
      const products = label.order.orderItems
        .map(item => `${item.productName}(${item.quantity}個)`)
        .join('、')
      
      return [
        label.id.toString(),
        label.orderNumber,
        label.recipientName,
        label.recipientCompany || '',
        label.recipientPostal,
        label.recipientAddress,
        label.recipientPhone,
        label.recipientFax || '',
        label.ordererName || '',
        label.legalEntityName || '',
        label.representative || '',
        label.ordererPhone || '',
        label.ordererFax || '',
        label.ordererBirthDate ? new Date(label.ordererBirthDate).toLocaleDateString('ja-JP') : '',
        label.initialContact || '',
        label.customerRank || '',
        carrier,
        label.trackingNumber || '',
        label.deliveryType || '',
        label.deliveryTime || '',
        label.deliveryCenter || '',
        label.autoshipNo || '',
        label.voucherNumber || '',
        label.desiredDeliveryDate ? new Date(label.desiredDeliveryDate).toLocaleDateString('ja-JP') : '',
        label.recordNumber || '',
        label.orderMethod || '',
        status,
        products,
        `¥${label.order.totalAmount.toLocaleString()}`,
        label.note || '',
        new Date(label.createdAt).toLocaleString('ja-JP'),
        new Date(label.updatedAt).toLocaleString('ja-JP')
      ]
    })
    
    // CSV生成(Excel対応のBOM付きUTF-8)
    const BOM = '\uFEFF'
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // セル内容をダブルクォートでエスケープ
          const cellStr = String(cell).replace(/"/g, '""')
          return `"${cellStr}"`
        }).join(',')
      )
    ].join('\n')
    
    const blob = BOM + csvContent
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shipping-labels-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Failed to export CSV:', error)
    return NextResponse.json(
      { message: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
