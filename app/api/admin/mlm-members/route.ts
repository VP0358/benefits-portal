// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';
import { generateMemberCode } from "@/lib/mlm-utils";
import { getMlmDisplayName } from "@/lib/mlm-display-name";
import bcrypt from "bcryptjs";

// 初期パスワード：全会員一律「0000」
// ※ ログイン後、会員自身がパスワードを変更してください
function generateInitialPassword(): string {
  return "0000";
}

// GET: MLM会員一覧取得（検索・フィルター対応）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const search      = url.searchParams.get("search") ?? "";
    const memberType  = url.searchParams.get("memberType") ?? "";
    const status      = url.searchParams.get("status") ?? "";
    const searchField = url.searchParams.get("searchField") ?? "all"; // all/memberCode/name/nickname/phone/postalCode/birthDate/contractDate
    const page        = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit       = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));
    const skip        = (page - 1) * limit;

    // 検索条件構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (memberType) where.memberType = memberType;
    if (status)     where.status     = status;

    if (search) {
      const orConditions = [];

      if (searchField === "all" || searchField === "memberCode") {
        orConditions.push({ memberCode: { contains: search } });
      }
      if (searchField === "all" || searchField === "name") {
        orConditions.push({ user: { name: { contains: search } } });
      }
      if (searchField === "all" || searchField === "email") {
        orConditions.push({ user: { email: { contains: search } } });
      }
      if (searchField === "all" || searchField === "phone") {
        orConditions.push({ user: { phone: { contains: search } } });
        orConditions.push({ mobile: { contains: search } });
      }
      if (searchField === "all" || searchField === "postalCode") {
        orConditions.push({ user: { postalCode: { contains: search } } });
      }
      if (searchField === "all" || searchField === "nickname") {
        orConditions.push({ user: { mlmRegistration: { nickname: { contains: search } } } });
      }
      if (searchField === "birthDate") {
        // 生年月日は日付文字列で部分一致（例: "1990-01"）
        try {
          const dateStart = new Date(search + (search.length === 7 ? "-01" : ""));
          const dateEnd   = new Date(dateStart);
          if (search.length === 7) {
            dateEnd.setMonth(dateEnd.getMonth() + 1);
          } else {
            dateEnd.setDate(dateEnd.getDate() + 1);
          }
          orConditions.push({ birthDate: { gte: dateStart, lt: dateEnd } });
        } catch {
          // 日付パース失敗時は無視
        }
      }
      if (searchField === "contractDate") {
        try {
          const dateStart = new Date(search + (search.length === 7 ? "-01" : ""));
          const dateEnd   = new Date(dateStart);
          if (search.length === 7) {
            dateEnd.setMonth(dateEnd.getMonth() + 1);
          } else {
            dateEnd.setDate(dateEnd.getDate() + 1);
          }
          orConditions.push({ contractDate: { gte: dateStart, lt: dateEnd } });
        } catch {
          // 日付パース失敗時は無視
        }
      }

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    const [members, total] = await Promise.all([
      prisma.mlmMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              email: true,
              phone: true,
              postalCode: true,
              mlmRegistration: {
                select: {
                  nickname: true,
                  birthDate: true,
                },
              },
            },
          },
          upline: {
            select: {
              memberCode: true,
              user: { select: { name: true } },
            },
          },
          referrer: {
            select: {
              memberCode: true,
              user: { select: { name: true } },
            },
          },
          _count: {
            select: { downlines: true, referrals: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.mlmMember.count({ where }),
    ]);

    // フロント向けにフラット化
    const rows = members.map((m) => ({
      id:                  m.id.toString(),
      userId:              m.userId.toString(),
      memberCode:          m.memberCode,
      memberType:          m.memberType,
      status:              m.status,
      currentLevel:        m.currentLevel,
      titleLevel:          m.titleLevel,
      conditionAchieved:   m.conditionAchieved,
      forceActive:         m.forceActive,
      forceLevel:          m.forceLevel,
      contractDate:        m.contractDate?.toISOString() ?? null,
      autoshipEnabled:     m.autoshipEnabled,
      autoshipStartDate:   m.autoshipStartDate?.toISOString() ?? null,
      autoshipStopDate:    m.autoshipStopDate?.toISOString() ?? null,
      autoshipSuspendMonths: m.autoshipSuspendMonths,
      paymentMethod:       m.paymentMethod,
      savingsPoints:       m.savingsPoints,
      userName:            getMlmDisplayName(m.user.name, m.companyName),
      userEmail:           m.user.email,
      userPhone:           m.user.phone ?? null,
      userPostalCode:      m.user.postalCode ?? null,
      nickname:            m.user.mlmRegistration?.nickname ?? null,
      birthDate:           m.birthDate?.toISOString() ?? m.user.mlmRegistration?.birthDate ?? null,
      downlineCount:       m._count.downlines,
      referralCount:       m._count.referrals,
      createdAt:           m.createdAt.toISOString(),
    }));

    return NextResponse.json({ members: rows, total }, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching MLM members:", errMsg);
    return NextResponse.json({ error: "Internal server error", detail: errMsg }, { status: 500 });
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
    if (!data.name) {
      return NextResponse.json(
        { error: "氏名は必須項目です" },
        { status: 400 }
      );
    }
    if (!data.email) {
      return NextResponse.json(
        { error: "メールアドレスは必須項目です" },
        { status: 400 }
      );
    }
    if (!data.disclosureDocNumber || !data.disclosureDocNumber.trim()) {
      return NextResponse.json(
        { error: "概要書面番号は必須項目です" },
        { status: 400 }
      );
    }

    // 概要書面番号の重複チェック
    const existingDocNumber = await prisma.mlmRegistration.findFirst({
      where: { disclosureDocNumber: data.disclosureDocNumber.trim() },
      include: { user: { include: { mlmMember: { select: { memberCode: true } } } } },
    });
    if (existingDocNumber) {
      const ownerCode = existingDocNumber.user?.mlmMember?.memberCode ?? "不明";
      return NextResponse.json(
        { error: `概要書面番号「${data.disclosureDocNumber.trim()}」は既に会員コード ${ownerCode} に登録されています。別の番号を入力してください。` },
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

    // 初期パスワード生成
    const initialPassword = generateInitialPassword();

    // トランザクションで User と MlmMember を作成
    const result = await prisma.$transaction(async (tx) => {
      // 1. User作成
      const user = await tx.user.create({
        data: {
          memberCode: memberCode,  // 自動生成済みの会員コードを使用
          name: data.name,
          nameKana: data.nameKana || null,
          email: data.email,
          passwordHash: await bcrypt.hash(initialPassword, 10),
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
          memberCode: memberCode,  // 自動生成済みの会員コードを使用
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
          // 概要書面番号
          disclosureDocNumber: data.disclosureDocNumber || null,
        },
      });

      // 3. MlmRegistration 作成（概要書面番号を含む）
      if (data.disclosureDocNumber) {
        await tx.mlmRegistration.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            disclosureDocNumber: data.disclosureDocNumber,
          },
          update: {
            disclosureDocNumber: data.disclosureDocNumber,
          },
        });
      }

      return { user, mlmMember };
    });

    return NextResponse.json(
      {
        message: "MLM会員を登録しました",
        member: { ...result.mlmMember, id: result.mlmMember.id.toString() },
        initialPassword, // 初期パスワードを返却
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating MLM member:", error);
    // Prismaのエラーコードで詳細なメッセージを返す
    if (error instanceof Error) {
      // 一意制約違反
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaError = error as any;
      if (prismaError.code === "P2002") {
        const fields: string[] = prismaError.meta?.target ?? [];
        if (fields.includes("email") || fields.includes("User_email_key")) {
          return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
        }
        if (fields.includes("memberCode") || fields.includes("MlmMember_memberCode_key")) {
          return NextResponse.json({ error: "この会員コードは既に使用されています" }, { status: 400 });
        }
        return NextResponse.json({ error: `重複エラー: ${fields.join(", ")} が既に存在します` }, { status: 400 });
      }
      // その他のPrismaエラー
      if (prismaError.code) {
        return NextResponse.json(
          { error: `データベースエラーが発生しました（コード: ${prismaError.code}）: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `登録に失敗しました: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "登録に失敗しました（原因不明のエラー）" },
      { status: 500 }
    );
  }
}
