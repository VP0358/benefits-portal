// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { nowJST, toJSTDate } from "@/lib/japan-time";

function getMonthKeyJST(date: Date) {
  const jst = toJSTDate(date);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(from: Date, to: Date) {
  const result: string[] = [];
  const fromJST = toJSTDate(from);
  const toJST   = toJSTDate(to);
  const cursor = new Date(Date.UTC(fromJST.getUTCFullYear(), fromJST.getUTCMonth(), 1));
  const end    = new Date(Date.UTC(toJST.getUTCFullYear(),   toJST.getUTCMonth(),   1));
  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    result.push(`${y}-${m}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
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
  const jstNow = nowJST();
  const jstY = jstNow.getUTCFullYear();
  const jstM = jstNow.getUTCMonth();
  const JST = 9 * 60 * 60 * 1000;
  const from = parseDate(searchParams.get("from"), new Date(Date.UTC(jstY, jstM - 11, 1) - JST));
  const to   = parseDate(searchParams.get("to"),   new Date(Date.UTC(jstY, jstM + 1, 0, 23, 59, 59, 999) - JST));

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
    const k = getMonthKeyJST(new Date(o.orderedAt));
    if (salesMap.has(k)) salesMap.set(k, (salesMap.get(k) ?? 0) + Number(o.totalAmount));
  }
  for (const u of pointUsages) {
    const k = getMonthKeyJST(new Date(u.usedAt));
    if (usedMap.has(k)) usedMap.set(k, (usedMap.get(k) ?? 0) + Number(u.totalUsedPoints));
  }
  for (const g of pointGrants) {
    const k = getMonthKeyJST(new Date(g.occurredAt));
    if (grantedMap.has(k)) grantedMap.set(k, (grantedMap.get(k) ?? 0) + Number(g.points));
  }

  return NextResponse.json({
    monthly: months.map(month => ({ month, sales: salesMap.get(month) ?? 0, usedPoints: usedMap.get(month) ?? 0, grantedPoints: grantedMap.get(month) ?? 0 })),
  });
}
