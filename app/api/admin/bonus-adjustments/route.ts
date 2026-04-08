import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-adjustments?bonusMonth=2026-02
 * 指定月の調整金一覧を取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    const adjustments = await prisma.bonusAdjustment.findMany({
      where: { bonusMonth },
      include: {
        mlmMember: {
          include: {
            user: true,
          },
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
 * 調整金を新規登録
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      bonusMonth,
      mlmMemberId,
      adjustmentType,
      amount,
      comment,
      isTaxable,
    } = body;

    if (!bonusMonth || !mlmMemberId || !adjustmentType || amount == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adjustment = await prisma.bonusAdjustment.create({
      data: {
        bonusMonth,
        mlmMemberId: BigInt(mlmMemberId),
        adjustmentType,
        amount: Number(amount),
        comment: comment || "",
        isTaxable: isTaxable ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      adjustmentId: adjustment.id.toString(),
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
 * PUT /api/admin/bonus-adjustments
 * 調整金を更新
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, amount, comment, isTaxable } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const adjustment = await prisma.bonusAdjustment.update({
      where: { id: BigInt(id) },
      data: {
        amount: amount != null ? Number(amount) : undefined,
        comment: comment !== undefined ? comment : undefined,
        isTaxable: isTaxable !== undefined ? isTaxable : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      adjustmentId: adjustment.id.toString(),
    });
  } catch (error) {
    console.error("Error updating bonus adjustment:", error);
    return NextResponse.json(
      { error: "Failed to update adjustment" },
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
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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
