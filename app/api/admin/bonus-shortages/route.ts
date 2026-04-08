import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-shortages?bonusMonth=2026-02
 * 指定月の過不足金一覧を取得
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
    const shortages = await prisma.bonusShortagePayment.findMany({
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

    const result = shortages.map((s) => ({
      id: s.id.toString(),
      bonusMonth: s.bonusMonth,
      mlmMemberId: s.mlmMemberId.toString(),
      memberCode: s.mlmMember.memberCode,
      memberName: s.mlmMember.user.name,
      companyName: s.mlmMember.companyName,
      amount: s.amount,
      comment: s.comment,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ shortages: result });
  } catch (error) {
    console.error("Error fetching bonus shortages:", error);
    return NextResponse.json({ error: "Failed to fetch shortages" }, { status: 500 });
  }
}

/**
 * POST /api/admin/bonus-shortages
 * 過不足金を新規登録
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, mlmMemberId, amount, comment } = body;

    if (!bonusMonth || !mlmMemberId || amount == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const shortage = await prisma.bonusShortagePayment.create({
      data: {
        bonusMonth,
        mlmMemberId: BigInt(mlmMemberId),
        amount: Number(amount),
        comment: comment || "",
      },
    });

    return NextResponse.json({
      success: true,
      shortageId: shortage.id.toString(),
    });
  } catch (error) {
    console.error("Error creating bonus shortage:", error);
    return NextResponse.json(
      { error: "Failed to create shortage" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/bonus-shortages
 * 過不足金を更新
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, amount, comment } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const shortage = await prisma.bonusShortagePayment.update({
      where: { id: BigInt(id) },
      data: {
        amount: amount != null ? Number(amount) : undefined,
        comment: comment !== undefined ? comment : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      shortageId: shortage.id.toString(),
    });
  } catch (error) {
    console.error("Error updating bonus shortage:", error);
    return NextResponse.json(
      { error: "Failed to update shortage" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bonus-shortages?id=123
 * 過不足金を削除
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
    await prisma.bonusShortagePayment.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bonus shortage:", error);
    return NextResponse.json(
      { error: "Failed to delete shortage" },
      { status: 500 }
    );
  }
}
