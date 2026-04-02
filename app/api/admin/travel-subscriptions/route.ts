import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

// 一覧取得
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as "pending" | "active" | "canceled" | "suspended" } : {};

  const [total, subs] = await Promise.all([
    prisma.travelSubscription.count({ where }),
    prisma.travelSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            memberCode: true,
            name: true,
            email: true,
            referrals: {
              where: { isActive: true },
              include: {
                referrer: { select: { id: true, memberCode: true, name: true } },
              },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const data = subs.map(s => ({
    id: s.id.toString(),
    planName: s.planName,
    monthlyFee: Number(s.monthlyFee),
    status: s.status,
    startedAt: s.startedAt?.toISOString() ?? null,
    confirmedAt: s.confirmedAt?.toISOString() ?? null,
    canceledAt: s.canceledAt?.toISOString() ?? null,
    note: s.note ?? null,
    createdAt: s.createdAt.toISOString(),
    user: {
      id: s.user.id.toString(),
      memberCode: s.user.memberCode,
      name: s.user.name,
      email: s.user.email,
      referrer: s.user.referrals[0]?.referrer
        ? {
            id: s.user.referrals[0].referrer.id.toString(),
            memberCode: s.user.referrals[0].referrer.memberCode,
            name: s.user.referrals[0].referrer.name,
          }
        : null,
    },
  }));

  return NextResponse.json({ total, page, pages: Math.ceil(total / limit), data });
}

// 新規登録
const createSchema = z.object({
  userId: z.string().min(1),
  planName: z.string().min(1).max(255),
  monthlyFee: z.number().nonnegative(),
  status: z.enum(["pending", "active", "canceled", "suspended"]).default("pending"),
  startedAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let userId: bigint;
  try { userId = BigInt(parsed.data.userId); } catch {
    return NextResponse.json({ error: "invalid userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const sub = await prisma.travelSubscription.create({
    data: {
      userId,
      planName: parsed.data.planName,
      monthlyFee: parsed.data.monthlyFee,
      status: parsed.data.status,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
      confirmedAt: parsed.data.confirmedAt ? new Date(parsed.data.confirmedAt) : null,
      note: parsed.data.note ?? null,
    },
  });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "create",
      targetTable: "travelSubscription",
      targetId: sub.id.toString(),
      afterJson: { planName: sub.planName, userId: userId.toString() },
    },
  }).catch(() => {});

  return NextResponse.json({
    id: sub.id.toString(),
    userId: sub.userId.toString(),
    planName: sub.planName,
    monthlyFee: Number(sub.monthlyFee),
    status: sub.status,
  }, { status: 201 });
}
