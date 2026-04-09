// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/referrer-info
 * ログインユーザーの紹介者情報を返す
 * VP未来phone申込フォームへの自動紐づけに使用
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  // UserReferral テーブルからこのユーザーの紹介者を探す
  const referralRelation = await prisma.userReferral.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      referrer: {
        select: {
          memberCode: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (referralRelation?.referrer) {
    return NextResponse.json({
      referrerCode: referralRelation.referrer.memberCode,
      referrerName: referralRelation.referrer.name,
    });
  }

  // MLMメンバーテーブルから紹介者を探す（フォールバック）
  const mlmMember = await prisma.mlmMember.findFirst({
    where: { userId },
    select: { referrerId: true },
  });

  if (mlmMember?.referrerId) {
    const referrerMlm = await prisma.mlmMember.findFirst({
      where: { id: mlmMember.referrerId },
      include: {
        user: {
          select: { memberCode: true, name: true },
        },
      },
    });
    if (referrerMlm?.user) {
      return NextResponse.json({
        referrerCode: referrerMlm.user.memberCode,
        referrerName: referrerMlm.user.name,
      });
    }
  }

  // 紹介者なし
  return NextResponse.json({ referrerCode: null, referrerName: null });
}
