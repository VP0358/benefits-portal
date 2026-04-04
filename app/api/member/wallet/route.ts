import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  const wallet = await prisma.pointWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return NextResponse.json({
      availablePointsBalance: 0,
      autoPointsBalance: 0,
      manualPointsBalance: 0,
      externalPointsBalance: 0,
      usedPointsBalance: 0,
      expiredPointsBalance: 0,
    });
  }

  return NextResponse.json({
    availablePointsBalance: wallet.availablePointsBalance,
    autoPointsBalance: wallet.autoPointsBalance,
    manualPointsBalance: wallet.manualPointsBalance,
    externalPointsBalance: wallet.externalPointsBalance,
    usedPointsBalance: wallet.usedPointsBalance,
    expiredPointsBalance: wallet.expiredPointsBalance,
  });
}
