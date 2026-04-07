import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

type Params = { params: Promise<{ id: string }> };

/** PUT: 発送伝票更新（追跡番号・ステータス・配送先変更） */
export async function PUT(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const body = await request.json();
  const { trackingNumber, status, carrier, recipientName, recipientPhone, recipientPostal, recipientAddress, note } = body;

  const existing = await prisma.shippingLabel.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return NextResponse.json({ error: "発送伝票が見つかりません" }, { status: 404 });

  const now = new Date();
  const updated = await prisma.shippingLabel.update({
    where: { id: BigInt(id) },
    data: {
      ...(trackingNumber !== undefined && { trackingNumber }),
      ...(status && { status }),
      ...(carrier && { carrier }),
      ...(recipientName && { recipientName }),
      ...(recipientPhone !== undefined && { recipientPhone }),
      ...(recipientPostal !== undefined && { recipientPostal }),
      ...(recipientAddress !== undefined && { recipientAddress }),
      ...(note !== undefined && { note }),
      // ステータス変更に応じてタイムスタンプ更新
      ...(status === "printed" && !existing.printedAt && { printedAt: now }),
      ...(status === "shipped" && !existing.shippedAt && { shippedAt: now }),
    },
  });

  // 発送済みになったら注文ステータスも更新
  if (status === "shipped" && existing.status !== "shipped") {
    await prisma.order.update({
      where: { id: existing.orderId },
      data: { status: "shipped" },
    });
  }

  return NextResponse.json({ id: updated.id.toString(), status: updated.status });
}

/** DELETE: 発送伝票を削除（pending のみ） */
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const existing = await prisma.shippingLabel.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return NextResponse.json({ error: "発送伝票が見つかりません" }, { status: 404 });
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "印刷済みまたは発送済みの伝票は削除できません" }, { status: 400 });
  }

  await prisma.shippingLabel.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ success: true });
}
