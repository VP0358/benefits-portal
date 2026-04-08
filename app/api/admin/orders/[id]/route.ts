import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const schema = z.object({ status: z.string().min(1).max(30) });

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ error: "invalid order id" }, { status: 400 });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: true },
  });
  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });
  return NextResponse.json({
    ...order,
    id: order.id.toString(),
    userId: order.userId.toString(),
    user: { ...order.user, id: order.user.id.toString() },
    items: order.items.map(i => ({ ...i, id: i.id.toString(), orderId: i.orderId.toString(), productId: i.productId.toString() })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ error: "invalid order id" }, { status: 400 });
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: parsed.data.status } });
  return NextResponse.json({ ...updated, id: updated.id.toString() });
}
