// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const orders = await prisma.order.findMany({
    where: {
      ...(from || to ? { orderedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    include: { user: true },
    orderBy: { orderedAt: "desc" },
  });

  const header = ["注文番号", "状態", "会員番号", "会員名", "小計(円)", "利用ポイント", "支払額(円)", "注文日時"];
  const rows = orders.map(order => [
    order.orderNumber, order.status, order.user.memberCode, order.user.name,
    order.subtotalAmount, order.usedPoints, order.totalAmount, order.orderedAt.toISOString(),
  ]);

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orders.csv"',
    },
  });
}
