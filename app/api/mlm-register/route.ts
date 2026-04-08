// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendMlmWelcomeEmail } from "@/lib/mailer";

/** GET: 紹介コードから紹介者情報を取得（MLM会員のreferralCode） */
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

/** POST: MLM会員新規登録 */
export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    nameKana,
    nickname,
    birthDate,
    email,
    password,
    phone,
    postalCode,
    address,
    disclosureDocNumber,
    bankName,
    bankBranch,
    bankAccountType,
    bankAccountNumber,
    bankAccountHolder,
    deliveryPostalCode,
    deliveryAddress,
    deliveryName,
    referralCode,
  } = body;

  // 必須項目チェック
  if (!name || !nameKana || !email || !password || !phone || !postalCode || !address) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  if (!disclosureDocNumber) {
    return NextResponse.json({ error: "概要書面番号は必須です" }, { status: 400 });
  }
  if (!bankName || !bankBranch || !bankAccountNumber || !bankAccountHolder) {
    return NextResponse.json({ error: "報酬受取口座情報は必須です" }, { status: 400 });
  }

  // メール重複チェック
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  // 6桁ランダム + "-01" 形式のメンバーコード
  const baseCode = String(Math.floor(100000 + Math.random() * 900000));
  const memberCode = `${baseCode}-01`;
  const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // 紹介者を検索（通常の referralCode で検索）
  let referrerId: bigint | null = null;
  let mlmReferrerId: bigint | null = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, mlmMember: { select: { id: true } } },
    });
    if (referrer) {
      referrerId = referrer.id;
      mlmReferrerId = referrer.mlmMember?.id ?? null;
    }
  }

  try {
    // トランザクション: User + UserReferral + MlmRegistration + MlmMember を一括作成
    const user = await prisma.$transaction(async (tx) => {
      // 1. Userを作成
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

      // 2. 紹介者がいればUserReferralを作成
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

      // 3. MLM登録情報を作成
      await tx.mlmRegistration.create({
        data: {
          userId: newUser.id,
          nickname: nickname || null,
          birthDate: birthDate || null,
          disclosureDocNumber,
          bankName,
          bankBranch,
          bankAccountType: bankAccountType || "普通",
          bankAccountNumber,
          bankAccountHolder,
          deliveryPostalCode: deliveryPostalCode || null,
          deliveryAddress: deliveryAddress || null,
          deliveryName: deliveryName || null,
          agreedToTerms: true,
          agreedAt: new Date(),
          registeredViaMLM: !!referralCode,
          mlmReferrerId,
        },
      });

      // 4. MlmMemberを作成（ビジネス会員として）
      await tx.mlmMember.create({
        data: {
          userId: newUser.id,
          memberCode,
          memberType: "business",
          status: "active",
          contractDate: new Date(),
          // 紹介者のMlmMemberが存在すれば referrerId と uplineId を設定
          referrerId: mlmReferrerId ?? null,
          uplineId: mlmReferrerId ?? null,
        },
      });

      return newUser;
    });

    // 5. 登録完了メールを送信（SiteSettingからテンプレート取得、失敗してもエラーにしない）
    try {
      const [subjectSetting, htmlSetting, textSetting] = await Promise.all([
        prisma.siteSetting.findUnique({ where: { settingKey: "mlmMailSubject" } }),
        prisma.siteSetting.findUnique({ where: { settingKey: "mlmMailHtml" } }),
        prisma.siteSetting.findUnique({ where: { settingKey: "mlmMailText" } }),
      ]);
      await sendMlmWelcomeEmail({
        to: email,
        name,
        memberCode,
        subject: subjectSetting?.settingValue ?? undefined,
        htmlBody: htmlSetting?.settingValue ?? undefined,
        textBody: textSetting?.settingValue ?? undefined,
      });
    } catch (err) {
      console.error("[mlm-register] メール送信エラー:", err);
    }

    return NextResponse.json(
      { id: user.id.toString(), memberCode: user.memberCode },
      { status: 201 }
    );
  } catch (err) {
    console.error("[mlm-register] 登録エラー:", err);
    return NextResponse.json({ error: "登録処理中にエラーが発生しました" }, { status: 500 });
  }
}
