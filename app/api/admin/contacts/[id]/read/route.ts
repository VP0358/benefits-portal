import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "../../../../route-guard";

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

// PATCH /api/admin/contacts/[id]/read  { isRead: true|false }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const cid = parseId(id);
  if (!cid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const { isRead } = await req.json();

  const updated = await prisma.contactInquiry.update({
    where: { id: cid },
    data: {
      isRead: Boolean(isRead),
      readAt: isRead ? new Date() : null,
    },
  });

  return NextResponse.json({ id: updated.id.toString(), isRead: updated.isRead });
}
