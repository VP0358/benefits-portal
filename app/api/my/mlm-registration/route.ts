// 動的レンダリングを強制
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = BigInt(session.user.id ?? "0");

  try {
    // ユーザー基本情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberCode: true,
        name: true,
        nameKana: true,
        email: true,
        phone: true,
        postalCode: true,
        address: true,
        status: true,
        referralCode: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // MLM会員情報を取得
    const mlmMember = await prisma.mlmMember.findUnique({
      where: { userId },
      include: {
        referrer: {
          select: {
            id: true,
            memberCode: true,
            user: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!mlmMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    return NextResponse.json({
      // 基本登録情報
      registration: {
        memberCode: user.memberCode,
        companyName: mlmMember.companyName ?? null,
        companyNameKana: mlmMember.companyNameKana ?? null,
        name: user.name,
        nameKana: user.nameKana ?? null,
        birthDate: mlmMember.birthDate?.toISOString() ?? null,
        gender: mlmMember.gender ?? null,
        email: user.email,
        phone: user.phone ?? null,
        mobile: mlmMember.mobile ?? null,
        postalCode: user.postalCode ?? null,
        address: user.address ?? null,
        prefecture: mlmMember.prefecture ?? null,
        city: mlmMember.city ?? null,
        address1: mlmMember.address1 ?? null,
        address2: mlmMember.address2 ?? null,
        referralCode: user.referralCode ?? null,
      },
      // 業務情報
      business: {
        status: mlmMember.status,
        memberType: mlmMember.memberType,
        currentLevel: mlmMember.currentLevel,
        titleLevel: mlmMember.titleLevel,
        conditionAchieved: mlmMember.conditionAchieved,
        forceActive: mlmMember.forceActive,
        forceLevel: mlmMember.forceLevel ?? null,
        contractDate: mlmMember.contractDate?.toISOString() ?? null,
        autoshipEnabled: mlmMember.autoshipEnabled,
        autoshipStartDate: mlmMember.autoshipStartDate?.toISOString() ?? null,
        autoshipStopDate: mlmMember.autoshipStopDate?.toISOString() ?? null,
        paymentMethod: mlmMember.paymentMethod,
        savingsPoints: mlmMember.savingsPoints,
        matrixPosition: mlmMember.matrixPosition,
        referrerId: mlmMember.referrerId?.toString() ?? null,
        referrerCode: mlmMember.referrer?.memberCode ?? null,
        referrerName: mlmMember.referrer?.user?.name ?? null,
        createdAt: mlmMember.createdAt.toISOString(),
        updatedAt: mlmMember.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      // 銀行口座情報
      bankAccount: {
        bankCode: mlmMember.bankCode ?? null,
        bankName: mlmMember.bankName ?? null,
        branchCode: mlmMember.branchCode ?? null,
        branchName: mlmMember.branchName ?? null,
        accountType: mlmMember.accountType ?? null,
        accountNumber: mlmMember.accountNumber ?? null,
        accountHolder: mlmMember.accountHolder ?? null,
      },
    });
  } catch (e) {
    console.error("mlm-registration error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
