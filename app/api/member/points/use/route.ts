// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// pointType:
//   "mpi" → autoPointsBalance から消費
//   "sav" → externalPointsBalance を先に消費し、不足分を manualPointsBalance から補充
const schema = z.object({
  amount:      z.number().int().positive(),
  description: z.string().min(1).max(255),
  pointType:   z.enum(["mpi", "sav"]).default("mpi"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json   = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { pointWallet: true } });
  if (!user?.pointWallet) return NextResponse.json({ error: "point wallet not found" }, { status: 404 });

  const useAmount   = parsed.data.amount;
  const pointType   = parsed.data.pointType;
  const wallet      = user.pointWallet;

  if (wallet.availablePointsBalance < useAmount)
    return NextResponse.json({ error: "insufficient points" }, { status: 400 });

  // ── 種別ごとに消費量を計算 ──────────────────────────────────────────
  let autoUse     = 0;
  let externalUse = 0;
  let manualUse   = 0;

  if (pointType === "mpi") {
    // MPIpt: autoPointsBalance のみ
    if (wallet.autoPointsBalance < useAmount)
      return NextResponse.json({ error: "MPIptの残高が不足しています" }, { status: 400 });
    autoUse = useAmount;

  } else {
    // SAVpt: external を先に消費、不足分は manual から補充
    const savBalance = Number(wallet.externalPointsBalance) + Number(wallet.manualPointsBalance);
    if (savBalance < useAmount)
      return NextResponse.json({ error: "SAVptの残高が不足しています" }, { status: 400 });
    externalUse = Math.min(Number(wallet.externalPointsBalance), useAmount);
    manualUse   = useAmount - externalUse;
  }

  // ── トランザクション ────────────────────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.pointWallet.update({
      where: { userId: user.id },
      data: {
        autoPointsBalance:     { decrement: autoUse },
        externalPointsBalance: { decrement: externalUse },
        manualPointsBalance:   { decrement: manualUse },
        availablePointsBalance:{ decrement: useAmount },
        usedPointsBalance:     { increment: useAmount },
      },
    });

    // pointUsage レコード（既存スキーマ互換）
    const usage = await tx.pointUsage.create({
      data: {
        userId:            user.id,
        usedAutoPoints:    autoUse,
        usedManualPoints:  manualUse,
        usedExternalPoints: externalUse,
        totalUsedPoints:   useAmount,
        usedAt:            new Date(),
      },
    });

    // pointTransaction レコード
    // pointSourceType: mpi→"auto"、sav→"external"（主消費元を記録）
    await tx.pointTransaction.create({
      data: {
        userId:          user.id,
        transactionType: "use",
        pointSourceType: pointType === "mpi" ? "auto" : "external",
        points:          -useAmount,
        balanceAfter:    updatedWallet.availablePointsBalance,
        description:     parsed.data.description,
        occurredAt:      new Date(),
        createdByType:   "member",
      },
    });

    return { updatedWallet, usage };
  });

  return NextResponse.json({
    message:                "used",
    usedPoints:             useAmount,
    availablePointsBalance: result.updatedWallet.availablePointsBalance,
  });
}
