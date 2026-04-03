import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const contracts = await prisma.mobileContract.findMany({
    where: { referrerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const thisMonthCount = contracts.filter(c => c.contractMonth === currentMonth).length;
  const totalCount = contracts.length;
  const totalPoints = contracts.reduce((sum, c) => sum + c.pointAwarded, 0);

  return NextResponse.json({
    currentMonth,
    thisMonthCount,
    totalCount,
    totalPoints,
    contracts,
  });
}
