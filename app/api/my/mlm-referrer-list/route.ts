// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id ?? "0");

  try {
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      select: { id: true, memberCode: true },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // 直紹介（ユニレベルで自分が referrer の会員）を取得
    const directReferrals = await prisma.mlmMember.findMany({
      where: { referrerId: mlmMember.id },
      include: {
        user: {
          select: { name: true, email: true, createdAt: true },
        },
        // 法人名取得（companyNameはmlmMemberのフィールド、selectなし）
        // 当月・先月の購入
        purchases: {
          orderBy: { purchasedAt: "desc" },
          take: 20,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 現在月と先月を計算
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    // 直紹介のうちアクティブ数
    const activeCount = directReferrals.filter(
      (m) => m.status === "active"
    ).length;

    // 愛用会員（memberType === "favorite"）
    const favoriteCount = directReferrals.filter(
      (m) => m.memberType === "favorite"
    ).length;

    return NextResponse.json({
      totalCount: directReferrals.length,
      activeCount,
      favoriteCount,
      members: directReferrals.map((m) => {
        const currentMonthPurchases = m.purchases.filter(
          (p) => p.purchaseMonth === currentMonth
        );
        const lastMonthPurchases = m.purchases.filter(
          (p) => p.purchaseMonth === lastMonth
        );

        const currentMonthAmount = currentMonthPurchases.reduce(
          (sum, p) => sum + p.unitPrice * p.quantity,
          0
        );
        const currentMonthPoints = currentMonthPurchases.reduce(
          (sum, p) => sum + p.totalPoints,
          0
        );
        const lastMonthAmount = lastMonthPurchases.reduce(
          (sum, p) => sum + p.unitPrice * p.quantity,
          0
        );
        const lastMonthPoints = lastMonthPurchases.reduce(
          (sum, p) => sum + p.totalPoints,
          0
        );

        // 直紹介数（この会員が紹介した数は別途必要なため、ここでは0）
        return {
          id: m.id.toString(),
          memberCode: m.memberCode,
          name: getMlmDisplayName(m.user.name, m.companyName),
          memberType: m.memberType,
          status: m.status,
          currentLevel: m.currentLevel,
          titleLevel: m.titleLevel,
          contractDate: m.contractDate?.toISOString() ?? null,
          registeredAt: m.user.createdAt.toISOString(),
          currentMonthAmount,
          currentMonthPoints,
          lastMonthAmount,
          lastMonthPoints,
          isActive: m.status === "active",
        };
      }),
    });
  } catch (e) {
    console.error("mlm-referrer-list error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
