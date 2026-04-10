export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// 納品書データ取得（IDカンマ区切り）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids") || ""
    const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n))

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "idsが必要です" }, { status: 400 })
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: ids.map(BigInt) } },
      include: {
        user: {
          select: {
            memberCode: true,
            name: true,
            nameKana: true,
            phone: true,
            postalCode: true,
            address: true,
            email: true,
            mlmMember: {
              select: {
                memberCode: true,
                paymentMethod: true,
                companyName: true,
                mobile: true,
                postalCode: true,
                prefecture: true,
                city: true,
                address1: true,
                address2: true,
              }
            }
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
            recipientCompany: true,
            itemDescription: true,
            itemCount: true,
            deliveryType: true,
            shippedAt: true,
            note: true,
          }
        }
      },
      orderBy: { orderedAt: "asc" },
    })

    const paymentMethodLabels: Record<string, string> = {
      bank_transfer: "口座振替", card: "カード", credit_card: "カード",
      direct_debit: "口座振替", cod: "代引き", bank_payment: "銀行振込",
      convenience: "コンビニ", other: "その他",
    }
    const slipTypeLabels: Record<string, string> = {
      new_member: "新規", one_time: "都度購入", autoship: "オートシップ",
      return: "返品", cooling_off: "クーリングオフ", exchange: "交換",
      cancel: "キャンセル", additional: "追加", present: "プレゼント",
      web: "Web", other: "その他",
    }

    const result = orders.map(o => {
      const mlm = o.user.mlmMember
      const pm = o.paymentMethod || mlm?.paymentMethod || ""
      // 配送先: ShippingLabelがあればそちら優先
      const recipientName    = o.shippingLabel?.recipientName    || o.user.name
      const recipientPostal  = o.shippingLabel?.recipientPostal  || o.user.postalCode || ""
      const recipientAddress = o.shippingLabel?.recipientAddress || o.user.address || ""
      const recipientPhone   = o.shippingLabel?.recipientPhone   || o.user.phone || ""
      const recipientCompany = o.shippingLabel?.recipientCompany || mlm?.companyName || ""

      return {
        id: Number(o.id),
        orderNumber: o.orderNumber,
        orderedAt: o.orderedAt.toISOString(),
        paidAt: o.paidAt?.toISOString() || null,
        slipType: o.slipType,
        slipTypeLabel: slipTypeLabels[o.slipType] || o.slipType,
        paymentMethod: pm,
        paymentMethodLabel: paymentMethodLabels[pm] || pm || "-",
        paymentStatus: o.paymentStatus,
        shippingStatus: o.shippingStatus,
        note: o.note || "",
        noteSlip: o.noteSlip || "",
        subtotalAmount: o.subtotalAmount,
        usedPoints: o.usedPoints,
        totalAmount: o.totalAmount,
        // 会員情報
        memberCode: mlm?.memberCode || o.user.memberCode,
        memberName: o.user.name,
        memberKana: o.user.nameKana || "",
        memberPhone: o.user.phone || "",
        memberEmail: o.user.email,
        // 配送先
        recipientName,
        recipientCompany,
        recipientPostal,
        recipientAddress,
        recipientPhone,
        // 商品
        items: o.items.map(i => ({
          id: Number(i.id),
          productCode: i.product?.code || "",
          productName: i.productName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          lineAmount: i.lineAmount,
        })),
        // 発送情報
        carrier: o.shippingLabel?.carrier || "yamato",
        trackingNumber: o.shippingLabel?.trackingNumber || "",
        shippedAt: o.shippingLabel?.shippedAt?.toISOString() || null,
        itemDescription: o.shippingLabel?.itemDescription || "VIOLA Pure 翠彩-SUMISAI-",
        itemCount: o.shippingLabel?.itemCount || o.items.reduce((s, i) => s + i.quantity, 0),
      }
    })

    return NextResponse.json({ success: true, orders: result, count: result.length })
  } catch (error) {
    console.error("delivery-note GET error:", error)
    return NextResponse.json({ success: false, error: "データ取得に失敗しました" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
