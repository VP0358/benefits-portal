import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const { id } = await params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ error: "invalid order id" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { include: { pointWallet: true } } },
  });

  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });
  if (!order.user.pointWallet) return NextResponse.json({ error: "point wallet not found" }, { status: 404 });
  if (order.status === "canceled") return NextResponse.json({ error: "order already canceled" }, { status: 400 });

  const pointUsage = await prisma.pointUsage.findFirst({ where: { userId: order.userId, orderId: order.id } });

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: "canceled" } });
    let updatedWallet = order.user.pointWallet!;

    if (pointUsage && pointUsage.totalUsedPoints > 0) {
      updatedWallet = await tx.pointWallet.update({
        where: { userId: order.userId },
        data: {
          autoPointsBalance: { increment: pointUsage.usedAutoPoints },
          manualPointsBalance: { increment: pointUsage.usedManualPoints },
          externalPointsBalance: { increment: pointUsage.usedExternalPoints },
          availablePointsBalance: { increment: pointUsage.totalUsedPoints },
          usedPointsBalance: { decrement: pointUsage.totalUsedPoints },
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId: order.userId,
          transactionType: "reversal",
          pointSourceType: "auto",
          points: pointUsage.totalUsedPoints,
          balanceAfter: updatedWallet.availablePointsBalance,
          description: `管理者キャンセルによるポイント返却: ${order.orderNumber}`,
          occurredAt: new Date(),
          createdByType: "admin",
          createdById: adminId,
        },
      });
    }

    await tx.adminAuditLog.create({
      data: {
        adminId,
        actionType: "order_cancel_refund",
        targetTable: "orders",
        targetId: order.id.toString(),
        beforeJson: { orderStatus: order.status },
        afterJson: { orderStatus: "canceled", returnedPoints: pointUsage?.totalUsedPoints ?? 0 },
      },
    });

    return { updatedOrder, updatedWallet, returnedPoints: pointUsage?.totalUsedPoints ?? 0 };
  });

  return NextResponse.json({
    message: "canceled",
    orderId: result.updatedOrder.id.toString(),
    orderStatus: result.updatedOrder.status,
    returnedPoints: result.returnedPoints,
    availablePointsBalance: result.updatedWallet.availablePointsBalance,
  });
}
