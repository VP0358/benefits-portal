// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-adjustments?bonusMonth=2026-02
 * 指定月の調整金一覧を取得（bonusMonth省略時は全件）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  try {
    const adjustments = await prisma.bonusAdjustment.findMany({
      where: bonusMonth ? { bonusMonth } : undefined,
      include: {
        mlmMember: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = adjustments.map((adj) => ({
      id: adj.id.toString(),
      bonusMonth: adj.bonusMonth,
      mlmMemberId: adj.mlmMemberId.toString(),
      memberCode: adj.mlmMember.memberCode,
      memberName: adj.mlmMember.user.name,
      companyName: adj.mlmMember.companyName,
      adjustmentType: adj.adjustmentType,
      amount: adj.amount,
      comment: adj.comment,
      isTaxable: adj.isTaxable,
      createdAt: adj.createdAt.toISOString(),
    }));

    return NextResponse.json({ adjustments: result });
  } catch (error) {
    console.error("Error fetching bonus adjustments:", error);
    return NextResponse.json({ error: "Failed to fetch adjustments" }, { status: 500 });
  }
}

/**
 * POST /api/admin/bonus-adjustments
 * 調整金を新規登録（memberCodeベース）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, memberCode, amount, comment, isTaxable } = body;

    if (!bonusMonth || !memberCode || amount == null) {
      return NextResponse.json(
        { error: "bonusMonth, memberCode, amount は必須です" },
        { status: 400 }
      );
    }

    // 会員コードからMLMメンバーを検索
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
      include: { user: true },
    });

    if (!mlmMember) {
      return NextResponse.json(
        { error: `会員コード「${memberCode}」が見つかりません` },
        { status: 404 }
      );
    }

    const adjustment = await prisma.bonusAdjustment.create({
      data: {
        bonusMonth,
        mlmMemberId: mlmMember.id,
        adjustmentType: "manual",
        amount: Number(amount),
        comment: comment || "",
        isTaxable: isTaxable ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      adjustmentId: adjustment.id.toString(),
      memberName: mlmMember.user.name,
    });
  } catch (error) {
    console.error("Error creating bonus adjustment:", error);
    return NextResponse.json(
      { error: "Failed to create adjustment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bonus-adjustments?id=123
 * 調整金を削除
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }

  try {
    await prisma.bonusAdjustment.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bonus adjustment:", error);
    return NextResponse.json(
      { error: "Failed to delete adjustment" },
      { status: 500 }
    );
  }
}
