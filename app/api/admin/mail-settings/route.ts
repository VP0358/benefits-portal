import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * メール種別ごとの設定キー定義
 */
export const MAIL_SETTING_KEYS = [
  // 会員登録完了メール
  "memberMailSubject",
  "memberMailText",
  "memberMailHtml",
  // MLM会員登録完了メール
  "mlmMailSubject",
  "mlmMailText",
  "mlmMailHtml",
  // 携帯契約完了メール
  "mobileContractMailSubject",
  "mobileContractMailText",
  "mobileContractMailHtml",
  // 旅行サブスク契約完了メール
  "travelMailSubject",
  "travelMailText",
  "travelMailHtml",
  // VP未来phone申し込み完了メール（既存）
  "vpPhoneMailSubject",
  "vpPhoneMailText",
  "vpPhoneMailHtml",
] as const;

const schema = z.object({
  memberMailSubject: z.string().max(255).nullable().optional(),
  memberMailText: z.string().max(10000).nullable().optional(),
  memberMailHtml: z.string().max(50000).nullable().optional(),
  mlmMailSubject: z.string().max(255).nullable().optional(),
  mlmMailText: z.string().max(10000).nullable().optional(),
  mlmMailHtml: z.string().max(50000).nullable().optional(),
  mobileContractMailSubject: z.string().max(255).nullable().optional(),
  mobileContractMailText: z.string().max(10000).nullable().optional(),
  mobileContractMailHtml: z.string().max(50000).nullable().optional(),
  travelMailSubject: z.string().max(255).nullable().optional(),
  travelMailText: z.string().max(10000).nullable().optional(),
  travelMailHtml: z.string().max(50000).nullable().optional(),
  vpPhoneMailSubject: z.string().max(255).nullable().optional(),
  vpPhoneMailText: z.string().max(10000).nullable().optional(),
  vpPhoneMailHtml: z.string().max(50000).nullable().optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const rows = await prisma.siteSetting.findMany({
    where: { settingKey: { in: [...MAIL_SETTING_KEYS] } },
  });
  const settings = Object.fromEntries(rows.map(r => [r.settingKey, r.settingValue]));

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const upserts = MAIL_SETTING_KEYS.map(key => {
    const val = (data as Record<string, string | null | undefined>)[key];
    return prisma.siteSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: val || null },
      create: { settingKey: key, settingValue: val || null },
    });
  });

  await prisma.$transaction(upserts);

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "mail_settings_update",
      targetTable: "site_settings",
      targetId: "mail",
      afterJson: data as object,
    },
  }).catch(() => {});

  return NextResponse.json({ message: "updated" });
}
