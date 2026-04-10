// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import InvoicePrint from "./InvoicePrint"

interface PageProps {
  searchParams: Promise<{ orderId?: string; shippingLabelId?: string }>
}

export default async function InvoicePrintPage({ searchParams }: PageProps) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session as any)?.user?.role !== "admin") {
    redirect("/admin/login")
  }

  const { orderId, shippingLabelId } = await searchParams

  // shippingLabelId から注文を引く場合
  if (!orderId && !shippingLabelId) {
    return <div className="p-8 text-red-600">orderId または shippingLabelId パラメータが必要です</div>
  }

  let order = null

  if (orderId) {
    order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        user: {
          include: { mlmMember: true }
        },
        items: {
          include: { product: true }
        }
      }
    })
  } else if (shippingLabelId) {
    // ShippingLabel → Order の検索
    const label = await prisma.shippingLabel.findUnique({
      where: { id: BigInt(shippingLabelId) },
      include: {
        order: {
          include: {
            user: {
              include: { mlmMember: true }
            },
            items: {
              include: { product: true }
            }
          }
        }
      }
    })
    order = label?.order || null
  }

  if (!order) {
    return <div className="p-8 text-red-600">注文が見つかりません</div>
  }

  const user = order.user
  const mlmMember = user.mlmMember?.[0] || null
  const memberCode = mlmMember?.memberCode || "-"

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return ""
    return new Date(d).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric"
    })
  }

  const orderDate = formatDate(order.createdAt)
  const orderMonth = new Date(order.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long"
  }) + "度"

  // 商品明細
  interface OrderItem {
    id: bigint;
    productName: string;
    productCode?: string | null;
    product?: { code?: string | null; name?: string } | null;
    unitPrice: number;
    quantity: number;
    lineAmount: number;
    taxRate?: number | null;
  }
  
  const items = order.items.map((item: OrderItem) => {
    const productCode = item.product?.code || item.productCode || ""
    // 商品コードが数字の場合、1000〜2999はポイント対象品（翠彩等）
    const codeNum = parseInt(productCode)
    const is8percent = item.productName?.includes("※") || false
    return {
      id: Number(item.id),
      name: item.productName,
      code: productCode,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      amount: item.unitPrice * item.quantity,
      is8percent
    }
  })

  const shippingFee = 880

  let subtotal8 = 0
  let subtotal10 = 0
  items.forEach((item: { amount: number; is8percent: boolean }) => {
    if (item.is8percent) subtotal8 += item.amount
    else subtotal10 += item.amount
  })
  subtotal10 += shippingFee

  const tax8 = Math.floor(subtotal8 * 0.08)
  const tax10 = Math.floor(subtotal10 * 0.1)
  const totalAmount = subtotal8 + tax8 + subtotal10 + tax10

  const data = {
    orderId: order.id.toString(),
    orderNumber: order.orderNumber || order.id.toString(),
    memberCode,
    memberName: user.name || "",
    postalCode: user.postalCode || "",
    address: user.address || "",
    orderDate,
    orderMonth,
    items,
    shippingFee,
    subtotal8,
    tax8,
    subtotal10,
    tax10,
    totalAmount: Number(order.totalAmount) || totalAmount,
    note: order.note || ""
  }

  return <InvoicePrint data={data} />
}
