export const dynamic = 'force-dynamic'
export const revalidate = 0

import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/route-guard"

/**
 * GET /api/admin/mlm-members/contact-memos?memberCode=XXXXX
 * 対応履歴メモ一覧取得
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
    return NextResponse.json({ memos: [] })
  }

  const memos = await prisma.mlmMemberContactMemo.findMany({
    where: { mlmMemberId: mlmMember.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({
    memos: memos.map(m => ({
      id: m.id.toString(),
      content: m.content,
      category: m.category,
      authorName: m.authorName,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }))
  })
}

/**
 * POST /api/admin/mlm-members/contact-memos
 * 対応履歴メモを追加
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const { memberCode, content, category, authorName } = body

    if (!memberCode || !content || !content.trim()) {
      return NextResponse.json({ error: "memberCode と content は必須です" }, { status: 400 })
    }

    const mlmMember = await prisma.mlmMember.findUnique({ where: { memberCode } })
    if (!mlmMember) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 })
    }

    const memo = await prisma.mlmMemberContactMemo.create({
      data: {
        mlmMemberId: mlmMember.id,
        content: content.trim(),
        category: category || null,
        authorName: authorName || null,
      }
    })

    return NextResponse.json({
      success: true,
      memo: {
        id: memo.id.toString(),
        content: memo.content,
        category: memo.category,
        authorName: memo.authorName,
        createdAt: memo.createdAt.toISOString(),
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating contact memo:", error)
    return NextResponse.json({ error: "メモの追加に失敗しました" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/mlm-members/contact-memos?id=XXX
 * 対応履歴メモを削除
 */
export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "idは必須です" }, { status: 400 })
  }

  await prisma.mlmMemberContactMemo.delete({ where: { id: BigInt(id) } })
  return NextResponse.json({ success: true })
}
