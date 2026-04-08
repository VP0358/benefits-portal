// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(from: Date, to: Date) {
  const result: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    result.push(getMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

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
  const from = parseDate(searchParams.get("from"), new Date(now.getFullYear(), now.getMonth() - 11, 1));
  const to = parseDate(searchParams.get("to"), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

  const [orders, pointUsages, pointGrants] = await Promise.all([
    prisma.order.findMany({ where: { status: { not: "canceled" }, orderedAt: { gte: from, lte: to } }, select: { orderedAt: true, totalAmount: true, usedPoints: true } }),
    prisma.pointUsage.findMany({ where: { usedAt: { gte: from, lte: to } }, select: { usedAt: true, totalUsedPoints: true } }),
    prisma.pointTransaction.findMany({ where: { transactionType: "grant", pointSourceType: "auto", occurredAt: { gte: from, lte: to } }, select: { occurredAt: true, points: true } }),
  ]);

  const months = monthRange(from, to);
  const salesMap = new Map(months.map(m => [m, 0]));
  const usedMap = new Map(months.map(m => [m, 0]));
  const grantedMap = new Map(months.map(m => [m, 0]));

  for (const o of orders) {
    const k = getMonthKey(new Date(o.orderedAt));
    if (salesMap.has(k)) salesMap.set(k, (salesMap.get(k) ?? 0) + Number(o.totalAmount));
  }
  for (const u of pointUsages) {
    const k = getMonthKey(new Date(u.usedAt));
    if (usedMap.has(k)) usedMap.set(k, (usedMap.get(k) ?? 0) + Number(u.totalUsedPoints));
  }
  for (const g of pointGrants) {
    const k = getMonthKey(new Date(g.occurredAt));
    if (grantedMap.has(k)) grantedMap.set(k, (grantedMap.get(k) ?? 0) + Number(g.points));
  }

  return NextResponse.json({
    monthly: months.map(month => ({ month, sales: salesMap.get(month) ?? 0, usedPoints: usedMap.get(month) ?? 0, grantedPoints: grantedMap.get(month) ?? 0 })),
  });
}
