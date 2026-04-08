import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const menuSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).optional().nullable(),
  iconType: z.string().max(50).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  linkUrl: z.string().max(500).optional().nullable().default(""),
  menuType: z.string().max(50).default("url"),
  contentData: z.string().optional().nullable(),
  isActive: z.boolean(),
  isHighlight: z.boolean(),
  sortOrder: z.number().int().min(0),
});

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const menuId = parseId(id);
  if (!menuId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const menu = await prisma.menu.findUnique({ where: { id: menuId } });
  if (!menu) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ...menu, id: menu.id.toString() });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const menuId = parseId(id);
  if (!menuId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const json = await req.json();
  const parsed = menuSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = {
    ...parsed.data,
    imageUrl: parsed.data.imageUrl || null,
    linkUrl: parsed.data.linkUrl || "",
  };
  const menu = await prisma.menu.update({ where: { id: menuId }, data });
  return NextResponse.json({ ...menu, id: menu.id.toString() });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const menuId = parseId(id);
  if (!menuId) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  await prisma.menu.delete({ where: { id: menuId } });
  return NextResponse.json({ message: "deleted" });
}
