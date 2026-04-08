import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ referralId: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { referralId } = await params;
  const id = parseId(referralId);
  if (!id) return NextResponse.json({ error: "invalid referral id" }, { status: 400 });

  const existing = await prisma.userReferral.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.userReferral.update({
    where: { id },
    data: { isActive: false, validTo: new Date() },
  });

  return NextResponse.json({ message: "deleted", referral: { ...updated, id: updated.id.toString() } });
}
