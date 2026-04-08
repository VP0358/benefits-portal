// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { orderedAt: "desc" },
  });

  return NextResponse.json(
    orders.map(order => ({
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalAmount: order.subtotalAmount,
      usedPoints: order.usedPoints,
      totalAmount: order.totalAmount,
      orderedAt: order.orderedAt,
      items: order.items.map(item => ({
        id: item.id.toString(),
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineAmount: item.lineAmount,
      })),
    }))
  );
}
