import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const updateSchema = z.object({
  planName: z.string().min(1).max(255).optional(),
  monthlyFee: z.number().nonnegative().optional(),
  status: z.enum(["pending", "active", "canceled", "suspended"]).optional(),
  startedAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
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
  const subId = parseId(id);
  if (!subId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sub = await prisma.travelSubscription.findUnique({ where: { id: subId } });
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data = parsed.data;
  const updated = await prisma.travelSubscription.update({
    where: { id: subId },
    data: {
      ...(data.planName !== undefined ? { planName: data.planName } : {}),
      ...(data.monthlyFee !== undefined ? { monthlyFee: data.monthlyFee } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.startedAt !== undefined ? { startedAt: data.startedAt ? new Date(data.startedAt) : null } : {}),
      ...(data.confirmedAt !== undefined ? { confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : null } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "update",
      targetTable: "travelSubscription",
      targetId: subId.toString(),
      beforeJson: { status: sub.status, planName: sub.planName },
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
  const subId = parseId(id);
  if (!subId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const sub = await prisma.travelSubscription.findUnique({ where: { id: subId } });
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.travelSubscription.update({
    where: { id: subId },
    data: { status: "canceled", canceledAt: new Date() },
  });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "cancel",
      targetTable: "travelSubscription",
      targetId: subId.toString(),
      beforeJson: { status: sub.status },
      afterJson: { status: "canceled" },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: updated.status });
}
