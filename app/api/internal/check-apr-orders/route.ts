export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "ChkApr2026-Viola1000";

export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberCodes = ["114942-01", "890155-01"];
  const results: Record<string, unknown>[] = [];

  for (const mc of memberCodes) {
    const user = await prisma.user.findUnique({
      where: { memberCode: mc },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        orders: {
          select: {
            orderNumber: true,
            slipType: true,
            orderedAt: true,
            status: true,
            note: true,
            items: {
              select: {
                productName: true,
                unitPrice: true,
                quantity: true,
              },
            },
          },
          orderBy: { orderedAt: "desc" },
        },
        mlmMember: {
          select: {
            id: true,
            status: true,
            contractDate: true,
            purchases: {
              select: {
                productCode: true,
                productName: true,
                purchaseMonth: true,
                points: true,
                purchasedAt: true,
              },
              orderBy: { purchasedAt: "desc" },
            },
          },
        },
      },
    });

    if (!user) {
      results.push({ memberCode: mc, exists: false });
    } else {
      results.push({
        memberCode: mc,
        exists: true,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        orderCount: user.orders.length,
        orders: user.orders,
        mlmStatus: user.mlmMember?.status,
        purchaseCount: user.mlmMember?.purchases.length ?? 0,
        purchases: user.mlmMember?.purchases,
      });
    }
  }

  return NextResponse.json({ results });
}
