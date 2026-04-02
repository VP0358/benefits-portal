import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const userId = parseId(id);
  if (!userId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      pointWallet: true,
      referrals: {
        where: { isActive: true },
        include: { referrer: true },
      },
      contracts: true,
      pointLogs: {
        orderBy: { occurredAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id.toString(),
    memberCode: user.memberCode,
    name: user.name,
    email: user.email,
    status: user.status,
    createdAt: user.createdAt,
    pointWallet: user.pointWallet ? {
      ...user.pointWallet,
      id: user.pointWallet.id.toString(),
      userId: user.pointWallet.userId.toString(),
    } : null,
    referrals: user.referrals.map(r => ({
      id: r.id.toString(),
      referrerName: r.referrer.name,
      referrerEmail: r.referrer.email,
      isActive: r.isActive,
    })),
    contracts: user.contracts.map(c => ({
      ...c,
      id: c.id.toString(),
      userId: c.userId.toString(),
      monthlyFee: Number(c.monthlyFee),
    })),
    pointLogs: user.pointLogs.map(l => ({
      ...l,
      id: l.id.toString(),
      userId: l.userId.toString(),
    })),
  });
}
