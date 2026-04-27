// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/mailer";
import { parseDateJST } from "@/lib/japan-time";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref is required" }, { status: 400 });
  const referrer = await prisma.user.findUnique({
    where: { referralCode: ref },
    select: { id: true, name: true, memberCode: true },
  });
  if (!referrer) return NextResponse.json({ error: "紹介コードが無効です" }, { status: 404 });
  return NextResponse.json(referrer);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    nameKana,
    birthDate,
    gender,
    email,
    mobile,
    postalCode,
    address,
    referralCode,
    disclosureDocNumber,
    // 任意
    companyName,
    companyNameKana,
    phone,
    // 配送先
    deliveryPostalCode,
    deliveryAddress,
    deliveryName,
    // 銀行口座
    bankCode,
    bankName,
    branchCode,
    branchName,
    accountType,
    accountNumber,
    accountHolder,
    // オートシップ
    autoshipEnabled,
    // 支払方法
    paymentMethod,
    password,
  } = body;

  if (!name || !email || !password || !mobile) {
    return NextResponse.json({ error: "必須項目が不足しています（氏名・メール・携帯電話・パスワード）" }, { status: 400 });
  }

  // 概要書面番号の必須チェック
  if (!disclosureDocNumber || String(disclosureDocNumber).trim() === "") {
    return NextResponse.json({ error: "概要書面番号は必須です。" }, { status: 400 });
  }

  // 概要書面番号の重複チェック
  const existingDisclosure = await prisma.mlmRegistration.findFirst({
    where: { disclosureDocNumber: String(disclosureDocNumber).trim() },
  });
  if (existingDisclosure) {
    return NextResponse.json(
      { error: "この概要書面番号はすでに使用されております。別の概要書面をご利用ください。" },
      { status: 409 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  // 会員コード自動生成: 6桁の連番 + 枝番01 (例: 100001-01)
  // 既存会員コードの最大値から次の番号を生成
  const lastMember = await prisma.mlmMember.findFirst({
    where: { memberCode: { regex: "^\\d{6}-01$" } },
    orderBy: { memberCode: "desc" },
  }).catch(() => null);

  let nextNum = 100001;
  if (lastMember?.memberCode) {
    const numPart = parseInt(lastMember.memberCode.split("-")[0], 10);
    if (!isNaN(numPart) && numPart >= 100001) {
      nextNum = numPart + 1;
    }
  }
  const memberCode = `${nextNum}-01`;

  const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // 紹介者を検索（URLパラメータの紹介コード経由）
  let referrerId: bigint | null = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (referrer) referrerId = referrer.id;
  }

  // 生年月日の変換（YYYY-MM-DD → DateTime）JST基準
  const birthDateTime: Date | null | undefined = birthDate ? parseDateJST(birthDate) : undefined;

  // 支払方法の変換（フロント値 → Prisma enum）
  type PaymentMethodType = "credit_card" | "bank_transfer" | "direct_debit";
  const paymentMethodMap: Record<string, PaymentMethodType> = {
    credit_card: "credit_card",
    bank_transfer: "bank_transfer",
    direct_debit: "direct_debit",
  };
  const prismaPaymentMethod: PaymentMethodType = paymentMethodMap[paymentMethod] ?? "bank_transfer";

  // トランザクションで会員登録 + 関連データ作成
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        nameKana,
        email,
        passwordHash: hashed,
        phone: phone || null,
        postalCode,
        address,
        referralCode: newReferralCode,
        memberCode,
      },
    });

    // 紹介者がいれば UserReferral を作成
    if (referrerId) {
      await tx.userReferral.create({
        data: {
          referrerUserId: referrerId,
          userId: newUser.id,
          isActive: true,
          validFrom: new Date(),
        },
      });
    }

    // ポイントウォレットを自動作成 + 登録時SAVボーナス付与（15,000円の20% = 3,000pt）
    const REGISTRATION_SAV_POINTS = Math.floor(15000 * 0.20); // 3000pt
    await tx.pointWallet.create({
      data: {
        userId: newUser.id,
        externalPointsBalance: REGISTRATION_SAV_POINTS,
        availablePointsBalance: REGISTRATION_SAV_POINTS,
      },
    });

    // MlmRegistration を作成（配送先・同意情報）
    await tx.mlmRegistration.create({
      data: {
        userId: newUser.id,
        birthDate: birthDate ?? null,
        disclosureDocNumber: disclosureDocNumber ?? null,
        deliveryPostalCode: deliveryPostalCode ?? null,
        deliveryAddress: deliveryAddress ?? null,
        deliveryName: deliveryName ?? null,
        agreedToTerms: true,
        agreedAt: new Date(),
        registeredViaMLM: Boolean(referralCode),
      },
    });

    // MlmMember を作成（銀行口座・オートシップ・個人情報）
    await tx.mlmMember.create({
      data: {
        userId: newUser.id,
        memberCode: newUser.memberCode ?? memberCode,
        memberType: "business",
        status: "active",
        // 個人情報
        birthDate: birthDateTime ?? null,
        gender: gender ?? null,
        mobile: mobile ?? null,
        companyName: companyName ?? null,
        companyNameKana: companyNameKana ?? null,
        // 銀行口座
        bankCode: bankCode ?? null,
        bankName: bankName ?? null,
        branchCode: branchCode ?? null,
        branchName: branchName ?? null,
        accountType: accountType ?? "普通",
        accountNumber: accountNumber ?? null,
        accountHolder: accountHolder ?? null,
        // オートシップ
        autoshipEnabled: Boolean(autoshipEnabled),
        // 支払方法
        paymentMethod: prismaPaymentMethod,
        // 契約日
        contractDate: new Date(),
      },
    });

    return newUser;
  });

  // 登録完了メール送信（SiteSettingからテンプレート取得）
  try {
    const [subjectSetting, htmlSetting, textSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { settingKey: "memberMailSubject" } }),
      prisma.siteSetting.findUnique({ where: { settingKey: "memberMailHtml" } }),
      prisma.siteSetting.findUnique({ where: { settingKey: "memberMailText" } }),
    ]);
    await sendWelcomeEmail({
      to: email,
      name,
      subject: subjectSetting?.settingValue ?? undefined,
      htmlBody: htmlSetting?.settingValue ?? undefined,
      textBody: textSetting?.settingValue ?? undefined,
    });
  } catch (mailErr) {
    console.error("[register POST] メール送信エラー:", mailErr);
  }

  return NextResponse.json(
    { id: user.id.toString(), memberCode: user.memberCode },
    { status: 201 }
  );
}
