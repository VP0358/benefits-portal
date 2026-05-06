// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/travel-subscription
 * ログイン会員の旅行サブスク状態を返す
 *
 * forceStatus 優先ロジック:
 *   forced_active   → displayStatus = "active"    (強制アクティブ)
 *   forced_inactive → displayStatus = "inactive"  (強制非アクティブ)
 *   none            → status=active なら "active"、それ以外は "inactive"
 *   レコードなし    → displayStatus = "none"       (未登録)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.user.id) },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // 最新の旅行サブスクを取得（canceled以外を優先）
  const sub = await prisma.travelSubscription.findFirst({
    where: {
      userId: user.id,
      status: { not: "canceled" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      planName: true,
      level: true,
      pricingTier: true,
      monthlyFee: true,
      status: true,
      forceStatus: true,
      startedAt: true,
      confirmedAt: true,
    },
  });

  if (!sub) {
    return NextResponse.json({ displayStatus: "none", sub: null });
  }

  // 表示ステータスを決定
  let displayStatus: "active" | "inactive" | "none";
  if (sub.forceStatus === "forced_active") {
    displayStatus = "active";
  } else if (sub.forceStatus === "forced_inactive") {
    displayStatus = "inactive";
  } else {
    displayStatus = sub.status === "active" ? "active" : "inactive";
  }

  return NextResponse.json({
    displayStatus,
    sub: {
      id: sub.id.toString(),
      planName: sub.planName,
      level: sub.level,
      pricingTier: sub.pricingTier,
      monthlyFee: Number(sub.monthlyFee),
      status: sub.status,
      forceStatus: sub.forceStatus,
      startedAt: sub.startedAt?.toISOString() ?? null,
      confirmedAt: sub.confirmedAt?.toISOString() ?? null,
    },
  });
}
