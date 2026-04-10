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
