// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  const transactions = await prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    transactions.map(t => ({
      id: t.id.toString(),
      transactionType: t.transactionType,
      pointSourceType: t.pointSourceType,
      points: t.points,
      balanceAfter: t.balanceAfter,
      description: t.description,
      occurredAt: t.occurredAt.toISOString(),
    }))
  );
}
