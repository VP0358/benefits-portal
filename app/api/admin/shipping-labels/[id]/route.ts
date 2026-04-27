// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'



export async function GET(
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
                mlmProduct: true
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
    
    return NextResponse.json({ label })
  } catch (error) {
    console.error('Failed to fetch shipping label:', error)
    return NextResponse.json(
      { message: 'Failed to fetch shipping label' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()
    
    const label = await prisma.shippingLabel.update({
      where: { id: BigInt(id) },
      data: {
        carrier: data.carrier,
        trackingNumber: data.trackingNumber || null,
        status: data.status,
        
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
    
    // 商品の更新は省略(必要に応じて実装)
    
    return NextResponse.json({ label })
  } catch (error) {
    console.error('Failed to update shipping label:', error)
    return NextResponse.json(
      { message: 'Failed to update shipping label' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.shippingLabel.delete({
      where: { id: BigInt(id) }
    })
    
    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Failed to delete shipping label:', error)
    return NextResponse.json(
      { message: 'Failed to delete shipping label' },
      { status: 500 }
    )
  }
}
