import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as "pending" | "active" | "canceled" | "suspended" } : {};

  const [total, contracts] = await Promise.all([
    prisma.mobileContract.count({ where }),
    prisma.mobileContract.findMany({
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

  const data = contracts.map(c => ({
    id: c.id.toString(),
    contractNumber: c.contractNumber,
    planName: c.planName,
    monthlyFee: Number(c.monthlyFee),
    status: c.status,
    startedAt: c.startedAt?.toISOString() ?? null,
    confirmedAt: c.confirmedAt?.toISOString() ?? null,
    canceledAt: c.canceledAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    // 報酬計算: 月額 × 1/4
    referralReward: Math.floor(Number(c.monthlyFee) / 4),
    user: {
      id: c.user.id.toString(),
      memberCode: c.user.memberCode,
      name: c.user.name,
      email: c.user.email,
      referrer: c.user.referrals[0]?.referrer
        ? {
            id: c.user.referrals[0].referrer.id.toString(),
            memberCode: c.user.referrals[0].referrer.memberCode,
            name: c.user.referrals[0].referrer.name,
          }
        : null,
    },
  }));

  return NextResponse.json({ total, page, pages: Math.ceil(total / limit), data });
}
