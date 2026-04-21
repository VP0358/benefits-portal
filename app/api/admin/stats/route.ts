// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    // 当月の開始日・終了日
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      // MLM会員
      mlmTotal,
      mlmActive,
      mlmAutoship,
      mlmWithdrawn,
      mlmLapsed,
      mlmSuspended,
      mlmMidCancel,
      // 携帯契約
      mobileTotal,
      mobileActive,
      mobilePending,
      mobileCanceled,
      mobileSuspended,
      // 旅行契約
      travelTotal,
      travelActive,
      travelPending,
      travelCanceled,
      travelSuspended,
    ] = await Promise.all([
      // MLM
      prisma.mlmMember.count(),
      prisma.mlmMember.count({ where: { status: "active" } }),
      prisma.mlmMember.count({ where: { status: "autoship" } }),
      prisma.mlmMember.count({ where: { status: "withdrawn" } }),
      prisma.mlmMember.count({ where: { status: "lapsed" } }),
      prisma.mlmMember.count({ where: { status: "suspended" } }),
      prisma.mlmMember.count({ where: { status: "midCancel" } }),
      // 携帯
      prisma.mobileContract.count(),
      prisma.mobileContract.count({ where: { status: "active" } }),
      prisma.mobileContract.count({ where: { status: "pending" } }),
      prisma.mobileContract.count({ where: { status: "canceled" } }),
      prisma.mobileContract.count({ where: { status: "suspended" } }),
      // 旅行
      prisma.travelSubscription.count(),
      prisma.travelSubscription.count({ where: { status: "active" } }),
      prisma.travelSubscription.count({ where: { status: "pending" } }),
      prisma.travelSubscription.count({ where: { status: "canceled" } }),
      prisma.travelSubscription.count({ where: { status: "suspended" } }),
    ]);

    // 当月購入者件数：
    // 条件: OrderItem の商品コードが "1000" または "2000" を含む伝票があり、
    //       かつ Order.paymentStatus = "paid"、かつ orderedAt が当月
    // MLM会員（mlmMember）に紐づく userId で集計（会員単位のユニーク件数）
    const currentMonthBuyersRaw = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(DISTINCT mm."id") AS cnt
      FROM "mlm_members" mm
      INNER JOIN "Order" o ON o."userId" = mm."userId"
      INNER JOIN "OrderItem" oi ON oi."orderId" = o."id"
      INNER JOIN "mlm_products" mp ON mp."id" = oi."productId"
      WHERE mp."productCode" IN ('1000', '2000')
        AND o."paymentStatus" = 'paid'
        AND o."orderedAt" >= ${monthStart}
        AND o."orderedAt" < ${monthEnd}
    `;
    const currentMonthBuyers = Number(currentMonthBuyersRaw[0]?.cnt ?? 0);

    return NextResponse.json({
      mlm: {
        total: mlmTotal,
        active: mlmActive + mlmAutoship,         // アクティブ = active + autoship
        inactive: mlmWithdrawn + mlmLapsed + mlmSuspended + mlmMidCancel, // 非アクティブ
        breakdown: {
          active: mlmActive,
          autoship: mlmAutoship,
          withdrawn: mlmWithdrawn,
          lapsed: mlmLapsed,
          suspended: mlmSuspended,
          midCancel: mlmMidCancel,
        },
        currentMonthBuyers,
      },
      mobile: {
        total: mobileTotal,
        active: mobileActive + mobilePending,    // アクティブ = active + pending
        inactive: mobileCanceled + mobileSuspended,
        breakdown: {
          active: mobileActive,
          pending: mobilePending,
          canceled: mobileCanceled,
          suspended: mobileSuspended,
        },
      },
      travel: {
        total: travelTotal,
        active: travelActive + travelPending,    // アクティブ = active + pending
        inactive: travelCanceled + travelSuspended,
        breakdown: {
          active: travelActive,
          pending: travelPending,
          canceled: travelCanceled,
          suspended: travelSuspended,
        },
      },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
