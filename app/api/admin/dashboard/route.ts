import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const from = parseDate(searchParams.get("from"), defaultFrom);
  const to = parseDate(searchParams.get("to"), defaultTo);

  const [totalSales, orderCount, totalUsedPoints, totalAvailablePoints, orderStatusBreakdown, totalGrantedAutoPoints, userCount, menuCount] = await Promise.all([
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "canceled" }, orderedAt: { gte: from, lte: to } } }),
    prisma.order.count({ where: { orderedAt: { gte: from, lte: to } } }),
    prisma.pointUsage.aggregate({ _sum: { totalUsedPoints: true }, where: { usedAt: { gte: from, lte: to } } }),
    prisma.pointWallet.aggregate({ _sum: { availablePointsBalance: true } }),
    prisma.order.groupBy({ by: ["status"], where: { orderedAt: { gte: from, lte: to } }, _count: { _all: true } }),
    prisma.pointTransaction.aggregate({ _sum: { points: true }, where: { transactionType: "grant", pointSourceType: "auto", occurredAt: { gte: from, lte: to } } }),
    prisma.user.count(),
    prisma.menu.count(),
  ]);

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      totalSales: totalSales._sum.totalAmount ?? 0,
      orderCount,
      totalUsedPoints: totalUsedPoints._sum.totalUsedPoints ?? 0,
      totalAvailablePoints: totalAvailablePoints._sum.availablePointsBalance ?? 0,
      totalGrantedAutoPoints: totalGrantedAutoPoints._sum.points ?? 0,
      userCount,
      menuCount,
    },
    orderStatusBreakdown: orderStatusBreakdown.map(item => ({ status: item.status, count: item._count._all })),
  });
}
