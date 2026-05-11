// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const adjustSchema = z.object({
  userId: z.union([z.string(), z.number()]),
  pointSourceType: z.enum(["manual", "external"]),
  mode: z.enum(["add", "subtract"]),
  points: z.number().int().positive(),
  description: z.string().min(1).max(255),
});

function parseId(id: string | number) {
  try { return BigInt(String(id)); } catch { return null; }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = adjustSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userId = parseId(parsed.data.userId);
  const adminId = guard.session?.user?.id ? parseId(guard.session.user.id) : null;
  if (!userId) return NextResponse.json({ error: "invalid user id" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { pointWallet: true } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // PointWalletが存在しない場合は自動作成（初回ポイント操作時）
  let wallet = user.pointWallet;
  if (!wallet) {
    wallet = await prisma.pointWallet.create({
      data: {
        userId,
        autoPointsBalance:      0,
        manualPointsBalance:    0,
        externalPointsBalance:  0,
        availablePointsBalance: 0,
        usedPointsBalance:      0,
        expiredPointsBalance:   0,
      },
    });
  }

  const delta = parsed.data.mode === "add" ? parsed.data.points : -parsed.data.points;

  const manualBalance = parsed.data.pointSourceType === "manual" ? wallet.manualPointsBalance + delta : wallet.manualPointsBalance;
  const externalBalance = parsed.data.pointSourceType === "external" ? wallet.externalPointsBalance + delta : wallet.externalPointsBalance;
  const availableBalance = wallet.availablePointsBalance + delta;

  if (manualBalance < 0 || externalBalance < 0 || availableBalance < 0) {
    return NextResponse.json({ error: "insufficient balance" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.pointWallet.update({
      where: { userId },
      data: { manualPointsBalance: manualBalance, externalPointsBalance: externalBalance, availablePointsBalance: availableBalance },
    });

    const transaction = await tx.pointTransaction.create({
      data: {
        userId,
        transactionType: "adjust",
        pointSourceType: parsed.data.pointSourceType,
        points: delta,
        balanceAfter: updatedWallet.availablePointsBalance,
        description: parsed.data.description,
        occurredAt: new Date(),
        createdByType: "admin",
        createdById: adminId,
      },
    });

    return { wallet: updatedWallet, transaction };
  });

  return NextResponse.json({
    wallet: { ...result.wallet, id: result.wallet.id.toString(), userId: result.wallet.userId.toString() },
    transaction: { ...result.transaction, id: result.transaction.id.toString() },
  }, { status: 201 });
}
