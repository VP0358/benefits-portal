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
      select: {
        id: true,
        autoshipEnabled: true,
        autoshipStartDate: true,
        autoshipStopDate: true,
        autoshipSuspendMonths: true,
        paymentMethod: true,
      },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // オートシップ注文履歴を取得
    const orders = await prisma.autoShipOrder.findMany({
      where: { mlmMemberId: mlmMember.id },
      orderBy: { targetMonth: "desc" },
      select: {
        id: true,
        targetMonth: true,
        productName: true,
        quantity: true,
        unitPrice: true,
        totalAmount: true,
        points: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
      take: 60,
    });

    return NextResponse.json({
      autoshipEnabled: mlmMember.autoshipEnabled,
      autoshipStartDate: mlmMember.autoshipStartDate?.toISOString() ?? null,
      autoshipStopDate: mlmMember.autoshipStopDate?.toISOString() ?? null,
      paymentMethod: mlmMember.paymentMethod,
      suspendMonths: mlmMember.autoshipSuspendMonths
        ? mlmMember.autoshipSuspendMonths.split(",").map((s) => s.trim())
        : [],
      orders: orders.map((o) => ({
        id: o.id.toString(),
        targetMonth: o.targetMonth,
        productName: o.productName,
        quantity: o.quantity,
        unitPrice: o.unitPrice,
        totalAmount: o.totalAmount,
        points: o.points,
        status: o.status,
        paidAt: o.paidAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("mlm-autoship error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
