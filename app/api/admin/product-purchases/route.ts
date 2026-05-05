// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/route-guard"

/**
 * GET /api/admin/product-purchases?memberCode=XXXXX&month=YYYY-MM
 * 会員の購入データ一覧取得
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const memberCode = searchParams.get("memberCode")
  const month = searchParams.get("month")

  const where: Record<string, unknown> = {}
  if (memberCode) {
    const mlmMember = await prisma.mlmMember.findUnique({ where: { memberCode } })
    if (!mlmMember) {
      return NextResponse.json({ purchases: [] })
    }
    where.mlmMemberId = mlmMember.id
  }
  if (month) {
    where.purchaseMonth = month
  }

  const purchases = await prisma.mlmPurchase.findMany({
    where,
    include: {
      mlmMember: {
        include: { user: { select: { name: true } } }
      }
    },
    orderBy: [{ purchaseMonth: "desc" }, { purchasedAt: "asc" }],
    take: 200,
  })

  // purchasedAt のミリ秒部分が同じ = 同一伝票（msMarker = orderId % 1000）
  // 同一会員・同一月でmsが同じグループごとに orderNumber の代わりとして
  // 「購入日時（ミリ秒を除く）＋連番」で伝票を識別して表示する
  // ※ msMarker が 0 のものはバッチ登録データの可能性あり（orderNumberなし扱い）

  return NextResponse.json({
    purchases: purchases.map(p => ({
      id: p.id.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderId: (p as any).orderId ? (p as any).orderId.toString() : null,
      memberCode: p.mlmMember.memberCode,
      memberName: p.mlmMember.user.name,
      productCode: p.productCode,
      productName: p.productName,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      points: p.points,
      totalPoints: p.totalPoints,
      purchaseMonth: p.purchaseMonth,
      purchasedAt: p.purchasedAt.toISOString(),
    }))
  })
}

/**
 * POST /api/admin/product-purchases
 * 購入データ追加（会員コード指定）
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const { memberCode, productCode, productName, month, quantity, unitPrice, points } = body

    if (!memberCode || !productCode || !month) {
      return NextResponse.json(
        { success: false, error: "memberCode, productCode, monthは必須です" },
        { status: 400 }
      )
    }

    // 会員コードからMLM会員を取得
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
    })
    if (!mlmMember) {
      return NextResponse.json(
        { success: false, error: `会員コード ${memberCode} が見つかりません` },
        { status: 404 }
      )
    }

    const qty = quantity || 1
    const price = unitPrice || 0
    const pts = points || 0

    const purchase = await prisma.mlmPurchase.create({
      data: {
        mlmMemberId: mlmMember.id,
        productCode,
        productName: productName || productCode,
        quantity: qty,
        unitPrice: price,
        points: pts,
        totalPoints: qty * pts,
        purchaseStatus: "one_time",
        purchaseMonth: month,
        purchasedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id.toString(),
        memberCode,
        productCode: purchase.productCode,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        totalPoints: purchase.totalPoints,
        purchaseMonth: purchase.purchaseMonth,
      },
    })
  } catch (error) {
    console.error("Error adding purchase:", error)
    return NextResponse.json(
      { success: false, error: "購入データの追加に失敗しました" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/product-purchases?id=XXX
 * 購入データ削除
 */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })
  }

  await prisma.mlmPurchase.delete({ where: { id: BigInt(id) } })
  return NextResponse.json({ success: true })
}
