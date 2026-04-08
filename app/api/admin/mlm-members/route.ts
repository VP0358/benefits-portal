// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateMemberCode } from "@/lib/mlm-utils";

// GET: MLM会員一覧取得
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const members = await prisma.mlmMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            memberCode: true,
            name: true,
            email: true,
          },
        },
        upline: {
          select: {
            memberCode: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        referrer: {
          select: {
            memberCode: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error fetching MLM members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: MLM会員新規登録
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    // バリデーション
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    // 会員コード生成（指定がない場合）
    let memberCode = data.memberCode;
    if (!memberCode) {
      // 上流者が指定されている場合、その配下に追加
      let uplineId: bigint | null = null;
      if (data.uplineMemberCode) {
        const upline = await prisma.mlmMember.findUnique({
          where: { memberCode: data.uplineMemberCode },
        });
        if (upline) {
          uplineId = upline.id;
        }
      }
      memberCode = await generateMemberCode(uplineId);
    }

    // 会員コードの重複チェック
    const existingMember = await prisma.mlmMember.findUnique({
      where: { memberCode: memberCode },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "この会員コードは既に使用されています" },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 400 }
      );
    }

    // 直上者・紹介者の確認
    let uplineId: bigint | null = null;
    let referrerId: bigint | null = null;

    if (data.uplineMemberCode) {
      const upline = await prisma.mlmMember.findUnique({
        where: { memberCode: data.uplineMemberCode },
      });
      if (!upline) {
        return NextResponse.json(
          { error: "直上者の会員コードが見つかりません" },
          { status: 400 }
        );
      }
      uplineId = upline.id;
    }

    if (data.referrerMemberCode) {
      const referrer = await prisma.mlmMember.findUnique({
        where: { memberCode: data.referrerMemberCode },
      });
      if (!referrer) {
        return NextResponse.json(
          { error: "紹介者の会員コードが見つかりません" },
          { status: 400 }
        );
      }
      referrerId = referrer.id;
    }

    // トランザクションで User と MlmMember を作成
    const result = await prisma.$transaction(async (tx) => {
      // 1. User作成
      const user = await tx.user.create({
        data: {
          memberCode: data.memberCode,
          name: data.name,
          nameKana: data.nameKana || null,
          email: data.email,
          passwordHash: "$2a$10$dummyhashforadmincreateduser", // 仮パスワード
          phone: data.phone || null,
          postalCode: data.postalCode || null,
          address: [
            data.prefecture,
            data.city,
            data.address1,
            data.address2,
          ]
            .filter(Boolean)
            .join(" ") || null,
          status: data.status === "inactive" ? "suspended" : "active",
        },
      });

      // 2. MlmMember作成
      const mlmMember = await tx.mlmMember.create({
        data: {
          userId: user.id,
          memberCode: data.memberCode,
          memberType: data.memberType || "business",
          status: data.status || "active",
          uplineId,
          referrerId,
          matrixPosition: data.matrixPosition || 1,
          currentLevel: data.currentLevel || 0,
          titleLevel: data.titleLevel || 0,
          forceActive: data.forceActive || false,
          forceLevel: data.forceLevel || null,
          contractDate: data.contractDate ? new Date(data.contractDate) : null,
          autoshipEnabled: data.autoshipEnabled || false,
          autoshipStartDate: data.autoshipStartDate
            ? new Date(data.autoshipStartDate)
            : null,
          paymentMethod: data.paymentMethod || "credit_card",
          note: data.note || null,
          // 銀行情報
          bankCode: data.bankCode || null,
          bankName: data.bankName || null,
          branchCode: data.branchCode || null,
          branchName: data.branchName || null,
          accountType: data.accountType || null,
          accountNumber: data.accountNumber || null,
          accountHolder: data.accountHolder || null,
          // 法人情報
          companyName: data.companyName || null,
          companyNameKana: data.companyNameKana || null,
          // 追加の個人情報
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          gender: data.gender || null,
          mobile: data.mobile || null,
          prefecture: data.prefecture || null,
          city: data.city || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
        },
      });

      return { user, mlmMember };
    });

    return NextResponse.json(
      {
        message: "MLM会員を登録しました",
        member: result.mlmMember,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating MLM member:", error);
    return NextResponse.json(
      { error: "登録に失敗しました" },
      { status: 500 }
    );
  }
}
