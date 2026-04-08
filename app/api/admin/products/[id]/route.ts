import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional().nullable(),
  price: z.number().int().nonnegative(),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
});

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const pid = parseId(id);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id: pid } });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ...product, id: product.id.toString() });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const pid = parseId(id);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = { ...parsed.data, imageUrl: parsed.data.imageUrl || null };
  const updated = await prisma.product.update({ where: { id: pid }, data });
  return NextResponse.json({ ...updated, id: updated.id.toString() });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const pid = parseId(id);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  await prisma.product.update({ where: { id: pid }, data: { isActive: false } });
  return NextResponse.json({ message: "deleted" });
}
