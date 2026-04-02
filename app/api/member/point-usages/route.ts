import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const usages = await prisma.pointUsage.findMany({
    where: { userId: user.id },
    include: {
      order: { select: { id: true, orderNumber: true, status: true, totalAmount: true, orderedAt: true } },
    },
    orderBy: { usedAt: "desc" },
  });

  return NextResponse.json(
    usages.map(u => ({
      id: u.id.toString(),
      totalUsedPoints: u.totalUsedPoints,
      usedAutoPoints: u.usedAutoPoints,
      usedManualPoints: u.usedManualPoints,
      usedExternalPoints: u.usedExternalPoints,
      usedAt: u.usedAt,
      order: u.order ? { ...u.order, id: u.order.id.toString() } : null,
    }))
  );
}
