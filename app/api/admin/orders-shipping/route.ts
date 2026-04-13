// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// 支払方法の表示名マップ
const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "口座振替",
  card: "カード",
  credit_card: "カード",
  direct_debit: "口座振替",
  cod: "代引き",
  bank_payment: "銀行振込",
  convenience: "コンビニ",
  other: "その他",
}

// 伝票種別の表示名マップ
const slipTypeLabels: Record<string, string> = {
  new_member: "新規",
  one_time: "都度購入",
  autoship: "オートシップ",
  return: "返品",
  cooling_off: "クーリングオフ",
  exchange: "交換",
  cancel: "キャンセル",
  additional: "追加",
  present: "プレゼント",
  web: "Web",
  other: "その他",
}

// 受注・発送状況一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const startDate      = searchParams.get("startDate")
    const endDate        = searchParams.get("endDate")
    const dateType       = searchParams.get("dateType") || "orderedAt" // orderedAt/paidAt/shippedAt
    const memberCode     = searchParams.get("memberCode")
    const status         = searchParams.get("status")
    const carrier        = searchParams.get("carrier")
    const keyword        = searchParams.get("keyword")
    const paymentMethod  = searchParams.get("paymentMethod")
    const slipType       = searchParams.get("slipType")
    const paymentStatus  = searchParams.get("paymentStatus")  // unpaid/paid/ignored
    const shippingStatus = searchParams.get("shippingStatus") // unshipped/shipped/ignored
    const outboxNo       = searchParams.get("outboxNo")
    const summaryOnly    = searchParams.get("summaryOnly") === "true"

    // サマリーのみ取得
    if (summaryOnly) {
      return await getSummary()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // 日付範囲
    if (startDate || endDate) {
      if (dateType === "paidAt") {
        where.paidAt = {}
        if (startDate) where.paidAt.gte = new Date(startDate)
        if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.paidAt.lte = e }
      } else if (dateType === "shippedAt") {
        where.shippingLabel = { shippedAt: {} }
        if (startDate) where.shippingLabel.shippedAt.gte = new Date(startDate)
        if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.shippingLabel.shippedAt.lte = e }
      } else {
        where.orderedAt = {}
        if (startDate) where.orderedAt.gte = new Date(startDate)
        if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.orderedAt.lte = e }
      }
    }

    if (status)         where.status = status
    if (paymentStatus)  where.paymentStatus = paymentStatus
    if (shippingStatus) where.shippingStatus = shippingStatus
    if (slipType)       where.slipType = slipType
    if (paymentMethod)  where.paymentMethod = paymentMethod
    if (outboxNo !== null) where.outboxNo = Number(outboxNo)

    if (memberCode) {
      where.user = {
        OR: [
          { memberCode: { contains: memberCode } },
          { mlmMember: { memberCode: { contains: memberCode } } }
        ]
      }
    }

    if (carrier) {
      where.shippingLabel = { ...(where.shippingLabel || {}), carrier }
    }

    if (keyword) {
      where.OR = [
        { orderNumber: { contains: keyword } },
        { user: { name: { contains: keyword } } },
        { items: { some: { productName: { contains: keyword } } } },
        { shippingLabel: { trackingNumber: { contains: keyword } } },
      ]
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
            email: true,
            mlmMember: { select: { memberCode: true, paymentMethod: true } }
          }
        },
        items: {
          select: {
            id: true,
            productName: true,
            unitPrice: true,
            quantity: true,
            lineAmount: true,
            product: { select: { code: true } }
          }
        },
        shippingLabel: {
          select: {
            id: true,
            carrier: true,
            trackingNumber: true,
            status: true,
            recipientName: true,
            recipientPhone: true,
            recipientPostal: true,
            recipientAddress: true,
            itemDescription: true,
            itemCount: true,
            deliveryType: true,
            printedAt: true,
            shippedAt: true,
          }
        }
      },
      orderBy: { orderedAt: "desc" },
      take: 500
    })

    const formattedOrders = orders.map((order) => {
      const mlm = order.user.mlmMember
      const pm = (order.paymentMethod || mlm?.paymentMethod || "")
      return {
        id: Number(order.id),
        orderNumber: order.orderNumber,
        status: order.status,
        slipType: order.slipType,
        slipTypeLabel: slipTypeLabels[order.slipType] || order.slipType,
        paymentMethod: pm,
        paymentMethodLabel: paymentMethodLabels[pm] || pm || "-",
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
        outboxNo: order.outboxNo,
        paidAt: order.paidAt?.toISOString() || null,
        note: order.note,
        noteSlip: order.noteSlip,
        subtotalAmount: order.subtotalAmount,
        usedPoints: order.usedPoints,
        totalAmount: order.totalAmount,
        orderedAt: order.orderedAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        memberCode: mlm?.memberCode || order.user.memberCode,
        memberName: order.user.name,
        memberEmail: order.user.email,
        items: order.items.map((item) => ({
          id: Number(item.id),
          productName: item.productName,
          productCode: item.product?.code || "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineAmount: item.lineAmount,
        })),
        shippingLabel: order.shippingLabel ? {
          id: Number(order.shippingLabel.id),
          carrier: order.shippingLabel.carrier,
          trackingNumber: order.shippingLabel.trackingNumber,
          status: order.shippingLabel.status,
          recipientName: order.shippingLabel.recipientName,
          recipientPhone: order.shippingLabel.recipientPhone,
          recipientPostal: order.shippingLabel.recipientPostal,
          recipientAddress: order.shippingLabel.recipientAddress,
          itemDescription: order.shippingLabel.itemDescription,
          itemCount: order.shippingLabel.itemCount,
          deliveryType: order.shippingLabel.deliveryType,
          printedAt: order.shippingLabel.printedAt?.toISOString() || null,
          shippedAt: order.shippingLabel.shippedAt?.toISOString() || null,
        } : null,
      }
    })

    return NextResponse.json({ success: true, orders: formattedOrders, count: formattedOrders.length })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// 未処理伝票サマリー取得
async function getSummary() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const paymentMethods = ["bank_transfer", "card", "direct_debit", "cod", "bank_payment", "convenience", "other"]

  const buildSummaryRow = async (dateStart: Date, dateEnd: Date, rowType: "unpaid" | "unshipped") => {
    const row: Record<string, number> = {}
    for (const pm of paymentMethods) {
      const count = await prisma.order.count({
        where: {
          orderedAt: { gte: dateStart, lte: dateEnd },
          paymentMethod: pm,
          ...(rowType === "unpaid" ? { paymentStatus: "unpaid" } : { shippingStatus: "unshipped" })
        }
      })
      row[pm] = count
    }
    return row
  }

  // 未処理伝票カウント（当月以前の未入金）
  const prevUnpaidCount = await prisma.order.count({
    where: { orderedAt: { lt: thisMonthStart }, paymentStatus: "unpaid" }
  })

  const [thisUnpaid, thisUnshipped, lastUnpaid, lastUnshipped] = await Promise.all([
    buildSummaryRow(thisMonthStart, thisMonthEnd, "unpaid"),
    buildSummaryRow(thisMonthStart, thisMonthEnd, "unshipped"),
    buildSummaryRow(lastMonthStart, lastMonthEnd, "unpaid"),
    buildSummaryRow(lastMonthStart, lastMonthEnd, "unshipped"),
  ])

  // 総未入金・未発送
  const totalUnpaid = await prisma.order.count({ where: { paymentStatus: "unpaid" } })
  const totalUnshipped = await prisma.order.count({ where: { shippingStatus: "unshipped" } })

  // 出庫BOX件数
  const outboxCounts: Record<number, number> = {}
  for (let i = 1; i <= 10; i++) {
    outboxCounts[i] = await prisma.order.count({ where: { outboxNo: i } })
  }

  return NextResponse.json({
    success: true,
    summary: {
      prevUnpaidCount,
      totalUnpaid,
      totalUnshipped,
      thisMonth: { unpaid: thisUnpaid, unshipped: thisUnshipped },
      lastMonth: { unpaid: lastUnpaid, unshipped: lastUnshipped },
      paymentMethods,
      outboxCounts,
    }
  })
}

// 伝票削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 })
    await prisma.order.delete({ where: { id: BigInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Order delete error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// 一括更新（出庫BOX移動・入金日設定・発送ステータス変更等）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderIds, action, value } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: false, error: "orderIds required" }, { status: 400 })
    }

    const ids = orderIds.map(Number)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: any = {}

    switch (action) {
      case "setOutbox":
        updateData = { outboxNo: Number(value) }
        break
      case "setPaymentStatus":
        updateData = { paymentStatus: value }
        if (value === "paid") updateData.paidAt = new Date()
        break
      case "setShippingStatus":
        updateData = { shippingStatus: value }
        break
      case "setNote":
        updateData = { note: value }
        break
      case "setNoteSlip":
        updateData = { noteSlip: value }
        break
      case "setPaidAt":
        updateData = { paidAt: value ? new Date(value) : null, paymentStatus: "paid" }
        break
      case "clearPaidAt":
        updateData = { paidAt: null, paymentStatus: "unpaid" }
        break
      case "setShippedAt":
        updateData = { shippingStatus: "shipped" }
        // ShippingLabel の shippedAt を更新
        await prisma.shippingLabel.updateMany({
          where: { orderId: { in: ids.map(BigInt) } },
          data: { shippedAt: value ? new Date(value) : new Date(), status: "shipped" },
        })
        break
      case "setOrderedAt":
        updateData = { orderedAt: value ? new Date(value) : new Date() }
        break
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }

    await prisma.order.updateMany({
      where: { id: { in: ids.map(BigInt) } },
      data: updateData,
    })

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (error) {
    console.error("Bulk update error:", error)
    return NextResponse.json({ success: false, error: "Bulk update failed" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
