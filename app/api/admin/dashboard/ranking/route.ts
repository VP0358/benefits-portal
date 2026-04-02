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
  const from = parseDate(searchParams.get("from"), new Date(now.getFullYear(), now.getMonth(), 1));
  const to = parseDate(searchParams.get("to"), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

  const rows = await prisma.orderItem.groupBy({
    by: ["productId", "productName"],
    where: { order: { orderedAt: { gte: from, lte: to }, status: { not: "canceled" } } },
    _sum: { quantity: true, lineAmount: true },
    _count: { _all: true },
    orderBy: { _sum: { lineAmount: "desc" } },
    take: 10,
  });

  return NextResponse.json({
    ranking: rows.map((row, index) => ({
      rank: index + 1,
      productId: row.productId.toString(),
      productName: row.productName,
      orderCount: row._count._all,
      totalQuantity: row._sum.quantity ?? 0,
      totalSales: row._sum.lineAmount ?? 0,
    })),
  });
}
