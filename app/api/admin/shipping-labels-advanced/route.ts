import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 伝票一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const deliveryType = searchParams.get("deliveryType")
    const carrier = searchParams.get("carrier")

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

    if (deliveryType) {
      where.deliveryType = deliveryType
    }

    if (carrier) {
      where.carrier = carrier
    }

    // 伝票データ取得
    const labels = await prisma.shippingLabel.findMany({
      where,
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
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // レスポンス整形
    const formattedLabels = labels.map((label) => ({
      id: Number(label.id),
      orderNumber: label.orderNumber,
      carrier: label.carrier,
      trackingNumber: label.trackingNumber,
      status: label.status,
      recipientName: label.recipientName,
      recipientPhone: label.recipientPhone,
      recipientPostal: label.recipientPostal,
      recipientAddress: label.recipientAddress,
      recipientFax: label.recipientFax,
      recipientCompany: label.recipientCompany,
      deliveryType: label.deliveryType,
      deliveryTime: label.deliveryTime,
      shippingFee: label.shippingFee,
      shippingFeeType: label.shippingFeeType,
      customerRank: label.customerRank,
      autoshipNo: label.autoshipNo,
      memberJoinDate: label.memberJoinDate?.toISOString() || null,
      birthDate: label.birthDate?.toISOString() || null,
      products: label.order.items.map((item) => ({
        name: item.productName,
        price: item.unitPrice,
        value: item.unitPrice,
        points: 0, // TODO: 商品ポイント取得
        quantity: item.quantity,
        subtotal: item.lineAmount
      })),
      createdAt: label.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      labels: formattedLabels,
      count: formattedLabels.length
    })
  } catch (error) {
    console.error("Error fetching labels:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch labels" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 伝票作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      autoshipNo,
      memberName,
      memberPhone,
      memberPostal,
      memberAddress,
      companyName,
      carrier,
      trackingNumber,
      shippingFeeType,
      deliveryTime,
      products
    } = body

    // 注文番号生成（簡易版）
    const orderNumber = `SL-${Date.now()}`

    // トランザクション: OrderとShippingLabelを同時作成
    const result = await prisma.$transaction(async (tx) => {
      // 仮の注文作成（実際にはユーザーIDが必要）
      const order = await tx.order.create({
        data: {
          userId: BigInt(1), // TODO: 実際のユーザーID
          orderNumber,
          status: "pending",
          subtotalAmount: products.reduce((sum: number, p: any) => sum + p.subtotal, 0),
          totalAmount: products.reduce((sum: number, p: any) => sum + p.subtotal, 0),
          orderedAt: new Date()
        }
      })

      // ShippingLabel作成
      const label = await tx.shippingLabel.create({
        data: {
          orderId: order.id,
          orderNumber,
          carrier: carrier || "yamato",
          trackingNumber,
          status: "pending",
          recipientName: memberName,
          recipientPhone: memberPhone,
          recipientPostal: memberPostal,
          recipientAddress: memberAddress,
          recipientCompany: companyName,
          deliveryTime,
          shippingFeeType: shippingFeeType || "free",
          shippingFee: shippingFeeType === "500" ? 500 : 0,
          autoshipNo
        }
      })

      return { order, label }
    })

    return NextResponse.json({
      success: true,
      message: "Label created successfully",
      label: {
        id: Number(result.label.id),
        orderNumber: result.label.orderNumber
      }
    })
  } catch (error) {
    console.error("Error creating label:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create label" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
