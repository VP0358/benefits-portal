import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "../../route-guard";

const sortSchema = z.object({
  items: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    sortOrder: z.number().int().min(1),
  })),
});

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = sortSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.menu.update({
        where: { id: BigInt(item.id) },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  return NextResponse.json({ message: "sorted", updatedCount: parsed.data.items.length });
}
