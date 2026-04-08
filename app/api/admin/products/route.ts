// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const schema = z.object({
  code: z.string().max(50).optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional().nullable(),
  price: z.number().int().nonnegative(),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const list = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(list.map(p => ({ ...p, id: p.id.toString() })));
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = { 
    ...parsed.data, 
    code: parsed.data.code || null,
    imageUrl: parsed.data.imageUrl || null 
  };
  const product = await prisma.product.create({ data });
  return NextResponse.json({ ...product, id: product.id.toString() }, { status: 201 });
}
