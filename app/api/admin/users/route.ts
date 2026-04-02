import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "../route-guard";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pointWallet: true,
      referrals: true,
    },
  });

  return NextResponse.json(
    users.map((user) => ({
      id: user.id.toString(),
      memberCode: user.memberCode,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      referralCount: user.referrals.length,
      availablePointsBalance: user.pointWallet?.availablePointsBalance ?? 0,
    }))
  );
}
