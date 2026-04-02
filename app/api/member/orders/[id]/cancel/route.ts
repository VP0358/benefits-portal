import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ error: "invalid order id" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { pointWallet: true } });
  if (!user?.pointWallet) return NextResponse.json({ error: "user or wallet not found" }, { status: 404 });

  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });
  if (order.status === "canceled") return NextResponse.json({ error: "order already canceled" }, { status: 400 });

  const pointUsage = await prisma.pointUsage.findFirst({ where: { userId: user.id, orderId: order.id } });

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: "canceled" } });
    let wallet = user.pointWallet!;

    if (pointUsage && pointUsage.totalUsedPoints > 0) {
      wallet = await tx.pointWallet.update({
        where: { userId: user.id },
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
          userId: user.id, transactionType: "reversal", pointSourceType: "auto",
          points: pointUsage.totalUsedPoints, balanceAfter: wallet.availablePointsBalance,
          description: `注文 ${order.orderNumber} キャンセルによるポイント返却`,
          occurredAt: new Date(), createdByType: "system",
        },
      });
    }

    return { updatedOrder, wallet };
  });

  return NextResponse.json({
    message: "canceled",
    orderId: result.updatedOrder.id.toString(),
    orderStatus: result.updatedOrder.status,
    returnedPoints: pointUsage?.totalUsedPoints ?? 0,
    availablePointsBalance: result.wallet.availablePointsBalance,
  });
}
