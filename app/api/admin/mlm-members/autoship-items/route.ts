export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/route-guard"

/**
 * GET /api/admin/mlm-members/autoship-items?memberCode=XXXXX
 * 会員別継続購入商品設定一覧取得
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const memberCode = searchParams.get("memberCode")

  if (!memberCode) {
    return NextResponse.json({ error: "memberCodeは必須です" }, { status: 400 })
  }

  const mlmMember = await prisma.mlmMember.findUnique({ where: { memberCode } })
  if (!mlmMember) {
    return NextResponse.json({ items: [] })
  }

  const items = await prisma.mlmMemberAutoshipItem.findMany({
    where: { mlmMemberId: mlmMember.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({
    items: items.map(i => ({
      id: i.id.toString(),
      productCode: i.productCode,
      productName: i.productName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      points: i.points,
      taxRate: i.taxRate,
      feeAmount: i.feeAmount,
      sortOrder: i.sortOrder,
    }))
  })
}

/**
 * POST /api/admin/mlm-members/autoship-items
 * 継続購入商品設定を追加
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const { memberCode, productCode, productName, unitPrice, quantity, points, taxRate, feeAmount, sortOrder } = body

    if (!memberCode || !productCode || !productName || unitPrice === undefined) {
      return NextResponse.json({ error: "memberCode, productCode, productName, unitPriceは必須です" }, { status: 400 })
    }

    const mlmMember = await prisma.mlmMember.findUnique({ where: { memberCode } })
    if (!mlmMember) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 })
    }

    const item = await prisma.mlmMemberAutoshipItem.create({
      data: {
        mlmMemberId: mlmMember.id,
        productCode,
        productName,
        unitPrice: Number(unitPrice),
        quantity: Number(quantity ?? 1),
        points: Number(points ?? 0),
        taxRate: Number(taxRate ?? 10),
        feeAmount: Number(feeAmount ?? 0),
        sortOrder: Number(sortOrder ?? 0),
      }
    })

    return NextResponse.json({
      success: true,
      item: {
        id: item.id.toString(),
        productCode: item.productCode,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        points: item.points,
        taxRate: item.taxRate,
        feeAmount: item.feeAmount,
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating autoship item:", error)
    return NextResponse.json({ error: "設定の追加に失敗しました" }, { status: 500 })
  }
}

/**
 * PUT /api/admin/mlm-members/autoship-items
 * 継続購入商品設定を更新（全件置換）
 */
export async function PUT(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const { memberCode, items } = body

    if (!memberCode || !Array.isArray(items)) {
      return NextResponse.json({ error: "memberCode と items（配列）は必須です" }, { status: 400 })
    }

    const mlmMember = await prisma.mlmMember.findUnique({ where: { memberCode } })
    if (!mlmMember) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 })
    }

    // 全件削除してから再作成（置換）
    await prisma.mlmMemberAutoshipItem.deleteMany({ where: { mlmMemberId: mlmMember.id } })

    if (items.length > 0) {
      await prisma.mlmMemberAutoshipItem.createMany({
        data: items.map((i: {
          productCode: string
          productName: string
          unitPrice: number
          quantity?: number
          points?: number
          taxRate?: number
          feeAmount?: number
          sortOrder?: number
        }, idx: number) => ({
          mlmMemberId: mlmMember.id,
          productCode: i.productCode,
          productName: i.productName,
          unitPrice: Number(i.unitPrice),
          quantity: Number(i.quantity ?? 1),
          points: Number(i.points ?? 0),
          taxRate: Number(i.taxRate ?? 10),
          feeAmount: Number(i.feeAmount ?? 0),
          sortOrder: Number(i.sortOrder ?? idx),
        }))
      })
    }

    return NextResponse.json({ success: true, count: items.length })
  } catch (error) {
    console.error("Error updating autoship items:", error)
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/mlm-members/autoship-items?id=XXX
 * 継続購入商品設定を削除
 */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "idは必須です" }, { status: 400 })
  }

  await prisma.mlmMemberAutoshipItem.delete({ where: { id: BigInt(id) } })
  return NextResponse.json({ success: true })
}
