// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { parseDateJST } from "@/lib/japan-time";

const updateSchema = z.object({
  planName: z.string().min(1).max(255).optional(),
  monthlyFee: z.number().nonnegative().optional(),
  status: z.enum(["pending", "active", "canceled", "suspended"]).optional(),
  startedAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  canceledAt: z.string().optional().nullable(),
});

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const contractId = parseId(id);
  if (!contractId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const contract = await prisma.mobileContract.findUnique({ where: { id: contractId } });
  if (!contract) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data = parsed.data;
  const updated = await prisma.mobileContract.update({
    where: { id: contractId },
    data: {
      ...(data.planName !== undefined ? { planName: data.planName } : {}),
      ...(data.monthlyFee !== undefined ? { monthlyFee: data.monthlyFee } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.startedAt !== undefined ? { startedAt: parseDateJST(data.startedAt) } : {}),
      ...(data.confirmedAt !== undefined ? { confirmedAt: parseDateJST(data.confirmedAt) } : {}),
      ...(data.canceledAt !== undefined ? { canceledAt: parseDateJST(data.canceledAt) } : {}),
    },
  });

  // 監査ログ
  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "update",
      targetTable: "mobileContract",
      targetId: contractId.toString(),
      beforeJson: { status: contract.status, planName: contract.planName },
      afterJson: { status: updated.status, planName: updated.planName },
    },
  }).catch(() => {});

  return NextResponse.json({
    ...updated,
    id: updated.id.toString(),
    userId: updated.userId.toString(),
    monthlyFee: Number(updated.monthlyFee),
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const contractId = parseId(id);
  if (!contractId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const contract = await prisma.mobileContract.findUnique({ where: { id: contractId } });
  if (!contract) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 解約処理（削除ではなくステータスをcanceledに）
  const updated = await prisma.mobileContract.update({
    where: { id: contractId },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "cancel",
      targetTable: "mobileContract",
      targetId: contractId.toString(),
      beforeJson: { status: contract.status },
      afterJson: { status: "canceled" },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: updated.status });
}
