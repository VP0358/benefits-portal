// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/contracts-org
 * 管理者用: 全会員の直紹介組織図データを返す
 * - 直紹介関係のある全会員ツリー
 * - 各会員の携帯契約・当月支払い状況
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 全UserReferral(直紹介関係)を取得
  const referrals = await prisma.userReferral.findMany({
    where: { isActive: true },
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          memberCode: true,
          avatarUrl: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          memberCode: true,
          avatarUrl: true,
          contracts: {
            where: { status: "active" },
            select: {
              id: true,
              planName: true,
              monthlyFee: true,
              startedAt: true,
              confirmedAt: true,
              status: true,
            },
            orderBy: { startedAt: "desc" },
          },
        },
      },
    },
    orderBy: [{ referrerUserId: "asc" }, { createdAt: "asc" }],
  });

  // referrerUserId ごとにグループ化
  const referrerMap = new Map<
    string,
    {
      referrer: { id: string; name: string; memberCode: string; avatarUrl: string | null };
      children: Array<{
        id: string;
        name: string;
        memberCode: string;
        avatarUrl: string | null;
        contracts: Array<{
          id: string;
          planName: string;
          monthlyFee: number;
          startedAt: string | null;
          confirmedAt: string | null;
          status: string;
          isPaidThisMonth: boolean;
        }>;
        hasActiveContract: boolean;
        hasPaidThisMonth: boolean;
      }>;
    }
  >();

  for (const r of referrals) {
    const referrerId = r.referrer.id.toString();

    if (!referrerMap.has(referrerId)) {
      referrerMap.set(referrerId, {
        referrer: {
          id: referrerId,
          name: r.referrer.name,
          memberCode: r.referrer.memberCode,
          avatarUrl: r.referrer.avatarUrl,
        },
        children: [],
      });
    }

    const contracts = r.user.contracts.map((c) => {
      const isPaidThisMonth =
        c.confirmedAt !== null &&
        c.confirmedAt >= monthStart &&
        c.confirmedAt < monthEnd;

      return {
        id: c.id.toString(),
        planName: c.planName,
        monthlyFee: Number(c.monthlyFee),
        startedAt: c.startedAt?.toISOString() ?? null,
        confirmedAt: c.confirmedAt?.toISOString() ?? null,
        status: c.status,
        isPaidThisMonth,
      };
    });

    referrerMap.get(referrerId)!.children.push({
      id: r.user.id.toString(),
      name: r.user.name,
      memberCode: r.user.memberCode,
      avatarUrl: r.user.avatarUrl,
      contracts,
      hasActiveContract: contracts.length > 0,
      hasPaidThisMonth: contracts.some((c) => c.isPaidThisMonth),
    });
  }

  // 合計集計
  let totalPaid = 0;
  let totalUnpaid = 0;
  let totalNoContract = 0;
  for (const group of referrerMap.values()) {
    for (const child of group.children) {
      if (child.hasPaidThisMonth) totalPaid++;
      else if (child.hasActiveContract) totalUnpaid++;
      else totalNoContract++;
    }
  }

  return NextResponse.json({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    groups: Array.from(referrerMap.values()),
    summary: {
      totalPaid,
      totalUnpaid,
      totalNoContract,
      totalMembers: referrals.length,
    },
  });
}
