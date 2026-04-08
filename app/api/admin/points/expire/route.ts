// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * ポイント失効処理（手動対応強化版）
 *
 * POST /api/admin/points/expire
 * Body:
 *   userId?    : string          – 特定会員のみ（省略時は全会員）
 *   expireAll? : boolean         – true = 全会員対象
 *   pointType? : "auto"|"manual"|"external"  – 省略時は全種別
 *   amount?    : number          – 一部指定pt（省略時は残高全額）
 *   description?: string
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json().catch(() => ({}));
  const {
    userId,
    expireAll,
    pointType,   // "auto" | "manual" | "external" | undefined(=all)
    amount,      // 一部指定pt (number | undefined)
    description,
  } = json;

  if (!userId && !expireAll) {
    return NextResponse.json(
      { error: "userId または expireAll=true が必要です" },
      { status: 400 }
    );
  }

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const now     = new Date();
  const desc    = description ?? "手動ポイント失効処理";

  let expiredCount       = 0;
  let totalExpiredPoints = 0;

  // 対象ウォレット取得（availablePointsBalance > 0 の会員のみ）
  const wallets = await prisma.pointWallet.findMany({
    where: {
      ...(userId ? { userId: BigInt(userId) } : {}),
      availablePointsBalance: { gt: 0 },
    },
    include: { user: true },
  });

  for (const wallet of wallets) {
    // ── 種別ごとの対象ポイント計算 ──────────────────────
    let autoExpire     = 0;
    let manualExpire   = 0;
    let externalExpire = 0;

    if (!pointType || pointType === "auto") {
      autoExpire = Number(wallet.autoPointsBalance);
    }
    if (!pointType || pointType === "manual") {
      manualExpire = Number(wallet.manualPointsBalance);
    }
    if (!pointType || pointType === "external") {
      externalExpire = Number(wallet.externalPointsBalance);
    }

    let totalExpire = autoExpire + manualExpire + externalExpire;
    if (totalExpire <= 0) continue;

    // ── 一部指定(amount)がある場合は按分して減算 ────────
    if (amount && amount > 0 && amount < totalExpire) {
      const ratio = amount / totalExpire;
      autoExpire     = Math.round(autoExpire     * ratio);
      manualExpire   = Math.round(manualExpire   * ratio);
      externalExpire = amount - autoExpire - manualExpire; // 端数調整
      totalExpire    = autoExpire + manualExpire + externalExpire;
    }

    // ── DB更新 ───────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.pointWallet.update({
        where: { id: wallet.id },
        data: {
          ...(autoExpire     > 0 ? { autoPointsBalance:     { decrement: autoExpire } }     : {}),
          ...(manualExpire   > 0 ? { manualPointsBalance:   { decrement: manualExpire } }   : {}),
          ...(externalExpire > 0 ? { externalPointsBalance: { decrement: externalExpire } } : {}),
          availablePointsBalance: { decrement: totalExpire },
          expiredPointsBalance:   { increment: totalExpire },
        },
      });

      // 失効トランザクション記録
      if (autoExpire > 0) {
        await tx.pointTransaction.create({
          data: {
            userId: wallet.userId,
            transactionType: "expire",
            pointSourceType: "auto",
            points:       -autoExpire,
            balanceAfter: updatedWallet.availablePointsBalance,
            description:  desc,
            occurredAt:   now,
            createdByType: "admin",
            createdById:   adminId,
          },
        });
      }
      if (manualExpire > 0) {
        await tx.pointTransaction.create({
          data: {
            userId: wallet.userId,
            transactionType: "expire",
            pointSourceType: "manual",
            points:       -manualExpire,
            balanceAfter: updatedWallet.availablePointsBalance,
            description:  desc,
            occurredAt:   now,
            createdByType: "admin",
            createdById:   adminId,
          },
        });
      }
      if (externalExpire > 0) {
        await tx.pointTransaction.create({
          data: {
            userId: wallet.userId,
            transactionType: "expire",
            pointSourceType: "external",
            points:       -externalExpire,
            balanceAfter: updatedWallet.availablePointsBalance,
            description:  desc,
            occurredAt:   now,
            createdByType: "admin",
            createdById:   adminId,
          },
        });
      }
    });

    expiredCount++;
    totalExpiredPoints += totalExpire;
  }

  // 監査ログ
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "expire_points_manual",
      targetTable: "pointWallet",
      targetId: userId ?? "all",
      beforeJson: undefined,
      afterJson: { expiredCount, totalExpiredPoints, pointType: pointType ?? "all", amount: amount ?? "full" },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, expiredCount, totalExpiredPoints, processedAt: now });
}

/**
 * GET: 失効可能ポイント一覧プレビュー（全種別）
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");

  const wallets = await prisma.pointWallet.findMany({
    where: {
      ...(userId ? { userId: BigInt(userId) } : {}),
      availablePointsBalance: { gt: 0 },
    },
    include: {
      user: { select: { id: true, name: true, memberCode: true, email: true } },
    },
    orderBy: { availablePointsBalance: "desc" },
  });

  const items = wallets.map(w => ({
    userId:                  w.userId.toString(),
    memberCode:              w.user.memberCode,
    name:                    w.user.name,
    email:                   w.user.email,
    autoPointsBalance:       Number(w.autoPointsBalance),
    manualPointsBalance:     Number(w.manualPointsBalance),
    externalPointsBalance:   Number(w.externalPointsBalance),
    availablePointsBalance:  Number(w.availablePointsBalance),
  }));

  const totalAutoPoints     = items.reduce((s, i) => s + i.autoPointsBalance, 0);
  const totalManualPoints   = items.reduce((s, i) => s + i.manualPointsBalance, 0);
  const totalExternalPoints = items.reduce((s, i) => s + i.externalPointsBalance, 0);

  return NextResponse.json({
    items,
    totalAutoPoints,
    totalManualPoints,
    totalExternalPoints,
    count: items.length,
  });
}
