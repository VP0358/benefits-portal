import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const createSchema = z.object({
  referrerUserId: z.union([z.string(), z.number()]),
  validFrom: z.string().optional(),
});

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const userId = parseId(id);
  if (!userId) return NextResponse.json({ error: "invalid user id" }, { status: 400 });

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const referrerUserId = parseId(String(parsed.data.referrerUserId));
  if (!referrerUserId) return NextResponse.json({ error: "invalid referrer user id" }, { status: 400 });
  if (userId === referrerUserId) return NextResponse.json({ error: "self referral is not allowed" }, { status: 400 });

  const [user, referrer] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { id: referrerUserId } }),
  ]);

  if (!user || !referrer) return NextResponse.json({ error: "user or referrer not found" }, { status: 404 });

  const exists = await prisma.userReferral.findFirst({
    where: { userId, referrerUserId, isActive: true },
  });
  if (exists) return NextResponse.json({ error: "active referral already exists" }, { status: 409 });

  const referral = await prisma.userReferral.create({
    data: {
      userId,
      referrerUserId,
      relationType: "direct",
      isActive: true,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : new Date(),
    },
    include: { referrer: true },
  });

  return NextResponse.json({
    ...referral,
    id: referral.id.toString(),
    userId: referral.userId.toString(),
    referrerUserId: referral.referrerUserId.toString(),
    referrer: { ...referral.referrer, id: referral.referrer.id.toString() },
  }, { status: 201 });
}
