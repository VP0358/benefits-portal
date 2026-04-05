import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  items: z.array(z.object({
    productId: z.union([z.string(), z.number()]),
    quantity: z.number().int().positive(),
  })).min(1),
  usePoints: z.number().int().min(0).default(0),
});

function toBigInt(v: string | number) { return BigInt(String(v)); }

function createOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${y}${m}${d}-${r}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { pointWallet: true } });
  if (!user?.pointWallet) return NextResponse.json({ error: "point wallet not found" }, { status: 404 });

  const wallet = user.pointWallet;

  const productIds = parsed.data.items.map(item => toBigInt(item.productId));
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });
  if (products.length !== parsed.data.items.length) return NextResponse.json({ error: "some products not found" }, { status: 400 });

  const lines = parsed.data.items.map(item => {
    const product = products.find(p => p.id === toBigInt(item.productId))!;
    return { product, quantity: item.quantity, lineAmount: product.price * item.quantity };
  });

  const subtotalAmount = lines.reduce((sum, line) => sum + line.lineAmount, 0);
  const requestedPoints = parsed.data.usePoints;

  if (requestedPoints > wallet.availablePointsBalance) return NextResponse.json({ error: "insufficient points" }, { status: 400 });
  if (requestedPoints > subtotalAmount) return NextResponse.json({ error: "points exceed subtotal" }, { status: 400 });

  let remain = requestedPoints;
  const autoUse = Math.min(wallet.autoPointsBalance, remain); remain -= autoUse;
  const manualUse = Math.min(wallet.manualPointsBalance, remain); remain -= manualUse;
  const externalUse = Math.min(wallet.externalPointsBalance, remain);

  const totalAmount = subtotalAmount - requestedPoints;
  const orderNumber = createOrderNumber();

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: { userId: user.id, orderNumber, status: "created", subtotalAmount, usedPoints: requestedPoints, totalAmount, orderedAt: new Date() },
    });

    for (const line of lines) {
      await tx.orderItem.create({
        data: { orderId: order.id, productId: line.product.id, productName: line.product.name, unitPrice: line.product.price, quantity: line.quantity, lineAmount: line.lineAmount },
      });
    }

    if (requestedPoints > 0) {
      const updatedWallet = await tx.pointWallet.update({
        where: { userId: user.id },
        data: {
          autoPointsBalance: wallet.autoPointsBalance - autoUse,
          manualPointsBalance: wallet.manualPointsBalance - manualUse,
          externalPointsBalance: wallet.externalPointsBalance - externalUse,
          availablePointsBalance: wallet.availablePointsBalance - requestedPoints,
          usedPointsBalance: wallet.usedPointsBalance + requestedPoints,
        },
      });

      await tx.pointUsage.create({
        data: { userId: user.id, orderId: order.id, usedAutoPoints: autoUse, usedManualPoints: manualUse, usedExternalPoints: externalUse, totalUsedPoints: requestedPoints, usedAt: new Date() },
      });

      await tx.pointTransaction.create({
        data: {
          userId: user.id, transactionType: "use", pointSourceType: "auto", points: -requestedPoints,
          balanceAfter: updatedWallet.availablePointsBalance, description: `注文 ${orderNumber} のポイント利用`,
          occurredAt: new Date(), createdByType: "member",
        },
      });
    }

    return order;
  });

  return NextResponse.json({
    message: "ordered", orderId: result.id.toString(), orderNumber: result.orderNumber, totalAmount: result.totalAmount, usedPoints: result.usedPoints,
  });
}
