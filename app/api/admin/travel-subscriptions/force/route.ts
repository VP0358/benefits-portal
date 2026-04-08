// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getTravelFee, getTravelPlanName } from "@/lib/travel-pricing";

/**
 * POST /api/admin/travel-subscriptions/force
 * 強制アクティブ / 強制非アクティブ / 解除
 *
 * body:
 *   { userId: string, action: "force_active" | "force_inactive" | "clear" }
 *
 * - "force_active"   : 未登録ならサブスクを新規作成してforceStatus="forced_active" / 既存ならforceStatus更新
 * - "force_inactive" : 既存サブスクのforceStatus="forced_inactive"
 * - "clear"          : forceStatus="none" に戻す
 */
const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["force_active", "force_inactive", "clear"]),
  // force_active時に新規作成する場合のオプション
  level: z.number().int().min(1).max(5).optional().default(1),
  pricingTier: z.enum(["early", "standard"]).optional().default("early"),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, action, level, pricingTier } = parsed.data;

  let targetUserId: bigint;
  try { targetUserId = BigInt(userId); } catch {
    return NextResponse.json({ error: "invalid userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // 既存サブスク（canceled以外）を取得
  const existing = await prisma.travelSubscription.findFirst({
    where: { userId: targetUserId, status: { not: "canceled" } },
    orderBy: { createdAt: "desc" },
  });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const now = new Date();

  let sub;

  if (action === "force_active") {
    if (existing) {
      // 既存レコードを強制アクティブに更新
      sub = await prisma.travelSubscription.update({
        where: { id: existing.id },
        data: {
          forceStatus: "forced_active",
          status: "active",
          startedAt: existing.startedAt ?? now,
          confirmedAt: existing.confirmedAt ?? now,
        },
      });
    } else {
      // 未登録 → 新規作成して強制アクティブ
      const fee = getTravelFee(pricingTier, level);
      const planName = getTravelPlanName(pricingTier, level);
      sub = await prisma.travelSubscription.create({
        data: {
          userId: targetUserId,
          planName,
          level,
          pricingTier,
          monthlyFee: fee,
          status: "active",
          forceStatus: "forced_active",
          startedAt: now,
          confirmedAt: now,
          note: "管理者による強制アクティブ",
        },
      });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        actionType: "force_active",
        targetTable: "travelSubscription",
        targetId: sub.id.toString(),
        afterJson: { forceStatus: "forced_active", userId: userId },
      },
    }).catch(() => {});

  } else if (action === "force_inactive") {
    if (!existing) {
      return NextResponse.json({ error: "サブスクが存在しません" }, { status: 404 });
    }
    sub = await prisma.travelSubscription.update({
      where: { id: existing.id },
      data: { forceStatus: "forced_inactive" },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        actionType: "force_inactive",
        targetTable: "travelSubscription",
        targetId: sub.id.toString(),
        afterJson: { forceStatus: "forced_inactive", userId: userId },
      },
    }).catch(() => {});

  } else {
    // clear
    if (!existing) {
      return NextResponse.json({ error: "サブスクが存在しません" }, { status: 404 });
    }
    sub = await prisma.travelSubscription.update({
      where: { id: existing.id },
      data: { forceStatus: "none" },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        actionType: "force_clear",
        targetTable: "travelSubscription",
        targetId: sub.id.toString(),
        afterJson: { forceStatus: "none", userId: userId },
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    id: sub.id.toString(),
    forceStatus: sub.forceStatus,
    status: sub.status,
  });
}
