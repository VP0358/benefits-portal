// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendVpPhoneApplicationEmail } from "@/lib/mailer";

const schema = z.object({
  nameKanji:       z.string().min(1).max(100),
  nameKana:        z.string().min(1).max(100),
  email:           z.string().email().max(255),
  password:        z.string().max(255).optional(),
  phone:           z.string().min(1).max(30),
  birthDate:       z.string().min(1).max(20),
  gender:          z.enum(["male", "female", "other"]),
  lineId:          z.string().max(100).optional(),
  lineDisplayName: z.string().max(100).optional(),
  referrerCode:    z.string().min(1, "紹介者コードは必須です").max(100),
  referrerName:    z.string().min(1, "紹介者名は必須です").max(100),
  contractType:    z.enum(["voice", "data"]).optional(),
  desiredPlan:     z.string().max(255).optional(),
});

/**
 * GET /api/my/vp-phone  – 自分の申し込み状況を取得
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id);
  const application = await prisma.vpPhoneApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!application) {
    return NextResponse.json({ application: null });
  }

  return NextResponse.json({
    application: {
      id:              application.id.toString(),
      nameKanji:       application.nameKanji,
      nameKana:        application.nameKana,
      email:           application.email,
      phone:           application.phone,
      birthDate:       application.birthDate,
      gender:          application.gender,
      lineId:          application.lineId,
      lineDisplayName: application.lineDisplayName,
      referrerCode:    application.referrerCode,
      referrerName:    application.referrerName,
      contractType:    application.contractType,
      desiredPlan:     application.desiredPlan,
      status:          application.status,
      adminNote:       application.adminNote,
      contractedAt:    application.contractedAt?.toISOString() ?? null,
      createdAt:       application.createdAt.toISOString(),
      updatedAt:       application.updatedAt.toISOString(),
    },
  });
}

/**
 * POST /api/my/vp-phone  – 申し込みを送信
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id);

  // 既存申し込みチェック（pending/reviewing/contracted のいずれかがあれば拒否）
  const existing = await prisma.vpPhoneApplication.findFirst({
    where: {
      userId,
      status: { in: ["pending", "reviewing", "contracted"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "既に申し込みが存在します。審査完了後にご連絡します。" },
      { status: 409 }
    );
  }

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const application = await prisma.vpPhoneApplication.create({
    data: {
      userId,
      nameKanji:       d.nameKanji,
      nameKana:        d.nameKana,
      email:           d.email,
      password:        d.password ?? null,
      phone:           d.phone,
      birthDate:       d.birthDate,
      gender:          d.gender,
      lineId:          d.lineId ?? null,
      lineDisplayName: d.lineDisplayName ?? null,
      referrerCode:    d.referrerCode,
      referrerName:    d.referrerName,
      contractType:    d.contractType ?? null,
      desiredPlan:     d.desiredPlan ?? null,
    },
  });

  // 申し込み完了メール送信（SiteSettingからテンプレートを取得）
  try {
    const [subjectSetting, htmlSetting, textSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { settingKey: "vpPhoneMailSubject" } }),
      prisma.siteSetting.findUnique({ where: { settingKey: "vpPhoneMailHtml" } }),
      prisma.siteSetting.findUnique({ where: { settingKey: "vpPhoneMailText" } }),
    ]);

    await sendVpPhoneApplicationEmail({
      to: d.email,
      name: d.nameKanji,
      subject: subjectSetting?.settingValue ?? undefined,
      htmlBody: htmlSetting?.settingValue ?? undefined,
      textBody: textSetting?.settingValue ?? undefined,
    });
  } catch (mailErr) {
    console.error("[vp-phone POST] メール送信エラー:", mailErr);
    // メール送信失敗でも申し込みは成功扱い
  }

  return NextResponse.json({
    id: application.id.toString(),
    status: application.status,
    createdAt: application.createdAt.toISOString(),
  }, { status: 201 });
}
