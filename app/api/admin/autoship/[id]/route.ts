import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

type Params = { params: Promise<{ id: string }> };

/** GET: オートシップ実行詳細 + 注文一覧 */
export async function GET(_req: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;

  const run = await prisma.autoShipRun.findUnique({
    where: { id: BigInt(id) },
    include: {
      orders: {
        orderBy: { memberCode: "asc" },
      },
    },
  });
  if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  return NextResponse.json({
    id: run.id.toString(),
    targetMonth: run.targetMonth,
    paymentMethod: run.paymentMethod,
    status: run.status,
    totalCount: run.totalCount,
    paidCount: run.paidCount,
    failedCount: run.failedCount,
    totalAmount: run.totalAmount,
    exportedAt: run.exportedAt,
    importedAt: run.importedAt,
    completedAt: run.completedAt,
    note: run.note,
    createdAt: run.createdAt,
    orders: run.orders.map(o => ({
      id: o.id.toString(),
      memberCode: o.memberCode,
      memberName: o.memberName,
      memberNameKana: o.memberNameKana,
      memberPhone: o.memberPhone,
      memberEmail: o.memberEmail,
      memberPostal: o.memberPostal,
      memberAddress: o.memberAddress,
      productName: o.productName,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      totalAmount: o.totalAmount,
      points: o.points,
      paymentMethod: o.paymentMethod,
      status: o.status,
      paidAt: o.paidAt,
      failReason: o.failReason,
      bankName: o.bankName,
      branchName: o.branchName,
      accountType: o.accountType,
      accountNumber: o.accountNumber,
      accountHolder: o.accountHolder,
      deliveryNoteId: o.deliveryNoteId?.toString() ?? null,
    })),
  });
}

/** PATCH: ステータス・メモ更新 */
export async function PATCH(_req: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await _req.json();

  const updated = await prisma.autoShipRun.update({
    where: { id: BigInt(id) },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.note !== undefined && { note: body.note }),
    },
  });
  return NextResponse.json({ id: updated.id.toString(), status: updated.status });
}
