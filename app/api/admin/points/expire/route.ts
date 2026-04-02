import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * ポイント失効処理
 * 
 * POST /api/admin/points/expire
 * Body: { userId?: string, expireAll?: boolean, description?: string }
 * 
 * - userId を指定 → その会員の失効可能なポイントを失効
 * - expireAll=true → 全会員対象（一括失効）
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json().catch(() => ({}));
  const { userId, expireAll, description } = json;

  if (!userId && !expireAll) {
    return NextResponse.json({ error: "userId or expireAll=true is required" }, { status: 400 });
  }

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const now = new Date();
  const desc = description ?? "ポイント失効処理";

  let expiredCount = 0;
  let totalExpiredPoints = 0;

  // 対象ウォレットを取得
  const wallets = await prisma.pointWallet.findMany({
    where: userId ? { userId: BigInt(userId) } : {},
    include: { user: true },
  });

  for (const wallet of wallets) {
    // 失効対象: 自動ポイント残高 > 0
    const expirePoints = Number(wallet.autoPointsBalance);
    if (expirePoints <= 0) continue;

    await prisma.$transaction(async (tx) => {
      // ウォレット更新
      const updatedWallet = await tx.pointWallet.update({
        where: { id: wallet.id },
        data: {
          autoPointsBalance: { decrement: expirePoints },
          availablePointsBalance: { decrement: expirePoints },
          expiredPointsBalance: { increment: expirePoints },
        },
      });

      // トランザクション記録
      await tx.pointTransaction.create({
        data: {
          userId: wallet.userId,
          transactionType: "expire",
          pointSourceType: "auto",
          points: -expirePoints,
          balanceAfter: updatedWallet.availablePointsBalance,
          description: desc,
          occurredAt: now,
          createdByType: "admin",
          createdById: adminId,
        },
      });
    });

    expiredCount++;
    totalExpiredPoints += expirePoints;
  }

  // 監査ログ
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "expire_points",
      targetTable: "pointWallet",
      targetId: userId ?? "all",
      beforeJson: null,
      afterJson: { expiredCount, totalExpiredPoints },
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    expiredCount,
    totalExpiredPoints,
    processedAt: now,
  });
}

/**
 * GET: 失効予定ポイント一覧プレビュー
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");

  const wallets = await prisma.pointWallet.findMany({
    where: {
      ...(userId ? { userId: BigInt(userId) } : {}),
      autoPointsBalance: { gt: 0 },
    },
    include: {
      user: { select: { id: true, name: true, memberCode: true, email: true } },
    },
    orderBy: { autoPointsBalance: "desc" },
  });

  const items = wallets.map(w => ({
    userId: w.userId.toString(),
    memberCode: w.user.memberCode,
    name: w.user.name,
    email: w.user.email,
    autoPointsBalance: Number(w.autoPointsBalance),
    availablePointsBalance: Number(w.availablePointsBalance),
  }));

  const totalAutoPoints = items.reduce((s, i) => s + i.autoPointsBalance, 0);

  return NextResponse.json({ items, totalAutoPoints, count: items.length });
}
