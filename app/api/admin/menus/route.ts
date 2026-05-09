// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const menuSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).optional().nullable(),
  iconType: z.string().max(50).optional().nullable(),
  imageUrl: z.string().max(5000000).optional().nullable().or(z.literal("")),  // Base64対応
  linkUrl: z.string().max(500).optional().nullable().default(""),
  menuType: z.string().max(50).default("url"),
  contentData: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isHighlight: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const menus = await prisma.menu.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(menus.map(m => ({ ...m, id: m.id.toString() })));
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = menuSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    imageUrl: parsed.data.imageUrl || null,
    linkUrl: parsed.data.linkUrl || "",
  };
  const menu = await prisma.menu.create({ data });
  return NextResponse.json({ ...menu, id: menu.id.toString() }, { status: 201 });
}
