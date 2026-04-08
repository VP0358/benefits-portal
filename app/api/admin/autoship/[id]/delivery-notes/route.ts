// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * POST: 決済完了した注文に対して納品書を自動生成
 * GET:  納品書HTML一覧（印刷用）を返す
 */
export async function POST(_req: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;

  const run = await prisma.autoShipRun.findUnique({
    where: { id: BigInt(id) },
    include: { orders: { where: { status: "paid", deliveryNoteId: null } } },
  });
  if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  if (run.orders.length === 0) {
    return NextResponse.json({ error: "納品書未作成の決済済み注文がありません" }, { status: 400 });
  }

  const month = run.targetMonth; // "YYYY-MM"
  const monthCompact = month.replace("-", ""); // "YYYYMM"

  // 現在の最大連番取得
  const lastNote = await prisma.deliveryNote.findFirst({
    where: { noteNumber: { startsWith: `DN-${monthCompact}-` } },
    orderBy: { noteNumber: "desc" },
  });
  let seq = 1;
  if (lastNote) {
    const parts = lastNote.noteNumber.split("-");
    seq = parseInt(parts[2] ?? "0", 10) + 1;
  }

  const created: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const order of run.orders) {
      const noteNumber = `DN-${monthCompact}-${String(seq).padStart(4, "0")}`;
      seq++;

      const note = await tx.deliveryNote.create({
        data: {
          noteNumber,
          targetMonth: month,
          recipientName: order.memberName,
          recipientPostal: order.memberPostal ?? null,
          recipientAddress: order.memberAddress ?? null,
          productCode: order.productCode,
          productName: order.productName,
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          totalAmount: order.totalAmount,
        },
      });

      await tx.autoShipOrder.update({
        where: { id: order.id },
        data: { deliveryNoteId: note.id },
      });

      created.push(noteNumber);
    }
  });

  return NextResponse.json({ success: true, count: created.length, noteNumbers: created });
}

/** GET: 納品書一覧（印刷用HTMLデータ） */
export async function GET(_req: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;

  const run = await prisma.autoShipRun.findUnique({
    where: { id: BigInt(id) },
    include: {
      orders: {
        where: { status: "paid" },
        include: { deliveryNote: true },
        orderBy: { memberCode: "asc" },
      },
    },
  });
  if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const notes = run.orders
    .filter(o => o.deliveryNote)
    .map(o => ({
      noteNumber: o.deliveryNote!.noteNumber,
      targetMonth: run.targetMonth,
      recipientName: o.deliveryNote!.recipientName,
      recipientPostal: o.deliveryNote!.recipientPostal,
      recipientAddress: o.deliveryNote!.recipientAddress,
      productName: o.deliveryNote!.productName,
      quantity: o.deliveryNote!.quantity,
      unitPrice: o.deliveryNote!.unitPrice,
      totalAmount: o.deliveryNote!.totalAmount,
      senderName: o.deliveryNote!.senderName,
      senderPostal: o.deliveryNote!.senderPostal,
      senderAddress: o.deliveryNote!.senderAddress,
      senderPhone: o.deliveryNote!.senderPhone,
      issuedAt: o.deliveryNote!.issuedAt,
      memberCode: o.memberCode,
      memberPhone: o.memberPhone,
    }));

  return NextResponse.json(notes);
}
