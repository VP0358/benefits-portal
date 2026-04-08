import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { z } from "zod";

const updateSchema = z.object({
  status:    z.enum(["pending", "reviewing", "contracted", "rejected", "canceled"]).optional(),
  adminNote: z.string().max(500).optional().nullable(),
  mobileContractId: z.string().optional().nullable(),
  applicationSubmitted: z.boolean().optional(),
  officeEmail: z.string().max(255).optional().nullable(),
});

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

/**
 * PATCH /api/admin/vp-phone/[id]  – 申し込みステータス更新
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const appId = parseId(id);
  if (!appId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const application = await prisma.vpPhoneApplication.findUnique({ where: { id: appId } });
  if (!application) return NextResponse.json({ error: "not found" }, { status: 404 });

  const d = parsed.data;
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (d.status !== undefined) {
    updateData.status = d.status;
    if (d.status === "reviewing" || d.status === "contracted" || d.status === "rejected") {
      updateData.reviewedAt = now;
      updateData.reviewedByAdminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
    }
    if (d.status === "contracted") {
      updateData.contractedAt = now;
    }
  }
  if (d.adminNote !== undefined) updateData.adminNote = d.adminNote;
  if (d.mobileContractId !== undefined) {
    updateData.mobileContractId = d.mobileContractId ? BigInt(d.mobileContractId) : null;
  }
  if (d.applicationSubmitted !== undefined) {
    updateData.applicationSubmitted = d.applicationSubmitted;
    if (d.applicationSubmitted) {
      updateData.applicationSubmittedAt = now;
      updateData.applicationSubmittedByAdminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
    } else {
      updateData.applicationSubmittedAt = null;
      updateData.applicationSubmittedByAdminId = null;
    }
  }
  if (d.officeEmail !== undefined) updateData.officeEmail = d.officeEmail;

  const updated = await prisma.vpPhoneApplication.update({
    where: { id: appId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, memberCode: true } },
    },
  });

  // 監査ログ
  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "update_vp_phone_application",
      targetTable: "vp_phone_applications",
      targetId: appId.toString(),
      beforeJson: { status: application.status },
      afterJson: { status: updated.status, adminNote: updated.adminNote },
    },
  }).catch(() => {});

  return NextResponse.json({
    id:                    updated.id.toString(),
    status:                updated.status,
    adminNote:             updated.adminNote,
    reviewedAt:            updated.reviewedAt?.toISOString() ?? null,
    contractedAt:          updated.contractedAt?.toISOString() ?? null,
    applicationSubmitted:  updated.applicationSubmitted,
    applicationSubmittedAt: updated.applicationSubmittedAt?.toISOString() ?? null,
    officeEmail:           updated.officeEmail,
  });
}
