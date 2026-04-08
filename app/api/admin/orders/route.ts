// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, memberCode: true, name: true, email: true } },
      items: true,
    },
    orderBy: { orderedAt: "desc" },
  });

  return NextResponse.json(
    orders.map((order) => ({
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalAmount: order.subtotalAmount,
      usedPoints: order.usedPoints,
      totalAmount: order.totalAmount,
      orderedAt: order.orderedAt,
      user: { id: order.user.id.toString(), memberCode: order.user.memberCode, name: order.user.name, email: order.user.email },
      items: order.items.map(item => ({ ...item, id: item.id.toString(), orderId: item.orderId.toString(), productId: item.productId.toString() })),
    }))
  );
}
