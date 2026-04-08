// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/org-chart
 * ログイン会員の直紹介組織図データを返す
 * - 自分の情報
 * - 直紹介した会員リスト（各会員の有効な携帯契約・当月支払済判定付き）
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 自分の情報を取得
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      memberCode: true,
      avatarUrl: true,
    },
  });
  if (!me) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // 直紹介した会員を取得（UserReferralテーブル経由）
  const referrals = await prisma.userReferral.findMany({
    where: { referrerUserId: me.id, isActive: true },
    include: {
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
              startedAt: true,
              confirmedAt: true,
              monthlyFee: true,
              status: true,
            },
            orderBy: { startedAt: "desc" },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const members = referrals.map((r) => {
    const contracts = r.user.contracts.map((c) => {
      // 当月の支払い済み判定: confirmedAt が今月内にある場合 = 支払済
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

    // この会員の当月支払い済み契約が1件以上あるか
    const hasPaidThisMonth = contracts.some((c) => c.isPaidThisMonth);
    // 有効な契約が1件以上あるか
    const hasActiveContract = contracts.length > 0;

    return {
      id: r.user.id.toString(),
      name: r.user.name,
      memberCode: r.user.memberCode,
      avatarUrl: r.user.avatarUrl,
      contracts,
      hasActiveContract,
      hasPaidThisMonth,
    };
  });

  return NextResponse.json({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    me: {
      id: me.id.toString(),
      name: me.name,
      memberCode: me.memberCode,
      avatarUrl: me.avatarUrl,
    },
    members,
  });
}
