// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // フィルター条件を構築
    const where: any = {}
    
    // 発送日フィルター
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
    
    // 入会日フィルター
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
    
    // 受注方法フィルター
    if (searchParams.get('orderMethod')) {
      where.orderMethod = searchParams.get('orderMethod')
    }
    
    // 配達番号指定
    if (searchParams.get('deliveryNumber')) {
      where.trackingNumber = {
        contains: searchParams.get('deliveryNumber')
      }
    }
    
    // 配送希望日指定
    if (searchParams.get('desiredDeliveryDate')) {
      where.desiredDeliveryDate = new Date(searchParams.get('desiredDeliveryDate')!)
    }
    
    // 記録(伝票)
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
                mlmProduct: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // レスポンス用にデータを整形
    const formattedLabels = labels.map(label => ({
      id: label.id,
      orderId: label.orderId,
      orderNumber: label.orderNumber,
      carrier: label.carrier,
      trackingNumber: label.trackingNumber,
      status: label.status,
      
      // 注文者情報
      ordererName: label.ordererName,
      legalEntityName: label.legalEntityName,
      representative: label.representative,
      ordererPhone: label.ordererPhone,
      ordererFax: label.ordererFax,
      ordererBirthDate: label.ordererBirthDate,
      initialContact: label.initialContact,
      customerRank: label.customerRank,
      
      // 配送先情報
      recipientName: label.recipientName,
      recipientPhone: label.recipientPhone,
      recipientPostal: label.recipientPostal,
      recipientAddress: label.recipientAddress,
      recipientFax: label.recipientFax,
      recipientCompany: label.recipientCompany,
      
      // 配送オプション
      deliveryType: label.deliveryType,
      deliveryTime: label.deliveryTime,
      deliveryCenter: label.deliveryCenter,
      autoshipNo: label.autoshipNo,
      voucherNumber: label.voucherNumber,
      desiredDeliveryDate: label.desiredDeliveryDate,
      recordNumber: label.recordNumber,
      orderMethod: label.orderMethod,
      
      // 商品
      products: label.order.orderItems.map(item => ({
        id: item.id.toString(),
        code: item.mlmProduct?.productCode || '',
        name: item.productName,
        price: item.unitPrice,
        points: 0, // ポイントはOrderItemに無いため0
        quantity: item.quantity,
      })),
      
      // 計算
      subtotal: label.order.subtotalAmount,
      subtotal10: Math.floor(label.order.subtotalAmount * 1.1),
      totalAmount: label.order.totalAmount,
      totalPoints: 0,
      
      // その他
      note: label.note,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
    }))
    
    return NextResponse.json({ labels: formattedLabels })
  } catch (error) {
    console.error('Failed to fetch shipping labels:', error)
    return NextResponse.json(
      { message: 'Failed to fetch shipping labels' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    
    // まず注文を作成
    const order = await prisma.order.create({
      data: {
        userId: BigInt(1), // TODO: 実際のユーザーIDを使用
        orderNumber: `ORD-${Date.now()}`,
        status: 'pending',
        subtotalAmount: data.subtotal || 0,
        totalAmount: data.totalAmount || 0,
        usedPoints: 0,
      }
    })
    
    // 注文明細を作成
    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: BigInt(1), // TODO: 実際の商品IDを使用
            productName: product.name,
            unitPrice: product.price,
            quantity: product.quantity,
            lineAmount: product.price * product.quantity,
          }
        })
      }
    }
    
    // 発送伝票を作成
    const label = await prisma.shippingLabel.create({
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        carrier: data.carrier,
        trackingNumber: data.trackingNumber || null,
        status: data.status || 'pending',
        
        // 注文者情報
        ordererName: data.ordererName || null,
        legalEntityName: data.legalEntityName || null,
        representative: data.representative || null,
        ordererPhone: data.ordererPhone || null,
        ordererFax: data.ordererFax || null,
        ordererBirthDate: data.ordererBirthDate ? new Date(data.ordererBirthDate) : null,
        initialContact: data.initialContact || null,
        customerRank: data.customerRank || null,
        
        // 配送先情報
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        recipientPostal: data.recipientPostal || '',
        recipientAddress: data.recipientAddress || '',
        recipientFax: data.recipientFax || null,
        recipientCompany: data.recipientCompany || null,
        
        // 配送オプション
        deliveryType: data.deliveryType || null,
        deliveryTime: data.deliveryTime || null,
        deliveryCenter: data.deliveryCenter || null,
        autoshipNo: data.autoshipNo || null,
        voucherNumber: data.voucherNumber || null,
        desiredDeliveryDate: data.desiredDeliveryDateValue ? new Date(data.desiredDeliveryDateValue) : null,
        recordNumber: data.recordNumber || null,
        orderMethod: data.orderMethod || null,
        
        // その他
        note: data.note || null,
      }
    })
    
    return NextResponse.json({ label }, { status: 201 })
  } catch (error) {
    console.error('Failed to create shipping label:', error)
    return NextResponse.json(
      { message: 'Failed to create shipping label' },
      { status: 500 }
    )
  }
}
