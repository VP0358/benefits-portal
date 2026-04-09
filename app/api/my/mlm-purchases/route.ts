// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id ?? "0");

  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    const purchases = await prisma.mlmPurchase.findMany({
      where: { mlmMemberId: mlmMember.id },
      orderBy: { purchasedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      purchases: purchases.map((p) => ({
        id: p.id.toString(),
        productCode: p.productCode,
        productName: p.productName,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        points: p.points,
        totalPoints: p.totalPoints,
        purchaseStatus: p.purchaseStatus,
        purchaseMonth: p.purchaseMonth,
        purchasedAt: p.purchasedAt.toISOString(),
        totalAmount: p.unitPrice * p.quantity,
      })),
    });
  } catch (e) {
    console.error("mlm-purchases error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
