// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1).max(255),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { pointWallet: true } });
  if (!user?.pointWallet) return NextResponse.json({ error: "point wallet not found" }, { status: 404 });

  const useAmount = parsed.data.amount;
  const wallet = user.pointWallet;

  if (wallet.availablePointsBalance < useAmount) return NextResponse.json({ error: "insufficient points" }, { status: 400 });

  let remain = useAmount;
  const autoUse = Math.min(wallet.autoPointsBalance, remain); remain -= autoUse;
  const manualUse = Math.min(wallet.manualPointsBalance, remain); remain -= manualUse;
  const externalUse = Math.min(wallet.externalPointsBalance, remain);

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.pointWallet.update({
      where: { userId: user.id },
      data: {
        autoPointsBalance: wallet.autoPointsBalance - autoUse,
        manualPointsBalance: wallet.manualPointsBalance - manualUse,
        externalPointsBalance: wallet.externalPointsBalance - externalUse,
        availablePointsBalance: wallet.availablePointsBalance - useAmount,
        usedPointsBalance: wallet.usedPointsBalance + useAmount,
      },
    });

    const usage = await tx.pointUsage.create({
      data: { userId: user.id, usedAutoPoints: autoUse, usedManualPoints: manualUse, usedExternalPoints: externalUse, totalUsedPoints: useAmount, usedAt: new Date() },
    });

    await tx.pointTransaction.create({
      data: {
        userId: user.id, transactionType: "use", pointSourceType: "auto", points: -useAmount,
        balanceAfter: updatedWallet.availablePointsBalance, description: parsed.data.description,
        occurredAt: new Date(), createdByType: "member",
      },
    });

    return { updatedWallet, usage };
  });

  return NextResponse.json({ message: "used", usedPoints: useAmount, availablePointsBalance: result.updatedWallet.availablePointsBalance });
}
