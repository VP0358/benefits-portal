// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/mailer";

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
  const { name, nameKana, email, password, phone, postalCode, address, referralCode } = body;

  if (!name || !email || !password || !phone) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const memberCode = "M" + Date.now().toString().slice(-8);
  const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // 紹介者を検索
  let referrerId: bigint | null = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (referrer) referrerId = referrer.id;
  }

  // トランザクションで会員登録 + 紹介リレーション作成
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        nameKana,
        email,
        passwordHash: hashed,
        phone,
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
