import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const contractSchema = z.object({
  userId: z.union([z.string(), z.number()]),
  contractNumber: z.string().min(1).max(100),
  planName: z.string().min(1).max(255),
  monthlyFee: z.number().nonnegative(),
  status: z.enum(["pending", "active", "canceled", "suspended"]),
  startedAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
});

function parseId(id: string | number) {
  try { return BigInt(String(id)); } catch { return null; }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = contractSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userId = parseId(parsed.data.userId);
  if (!userId) return NextResponse.json({ error: "invalid user id" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const contract = await prisma.mobileContract.create({
    data: {
      userId,
      contractNumber: parsed.data.contractNumber,
      planName: parsed.data.planName,
      monthlyFee: parsed.data.monthlyFee,
      status: parsed.data.status,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
      confirmedAt: parsed.data.confirmedAt ? new Date(parsed.data.confirmedAt) : null,
    },
  });

  return NextResponse.json({
    ...contract,
    id: contract.id.toString(),
    userId: contract.userId.toString(),
    monthlyFee: Number(contract.monthlyFee),
  }, { status: 201 });
}
