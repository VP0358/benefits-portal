import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const SETTING_KEYS = [
  "faviconUrl",
  "siteTitle",
  "btnBuyImageUrl",       // 商品購入ボタン画像
  "btnPointsImageUrl",    // ポイントを使うボタン画像
  "btnReferralImageUrl",  // 紹介ボタン画像
] as const;

const schema = z.object({
  faviconUrl: z.string().max(1000).nullable().optional().or(z.literal("")),
  siteTitle: z.string().max(255).nullable().optional(),
  btnBuyImageUrl: z.string().max(1000).nullable().optional().or(z.literal("")),
  btnPointsImageUrl: z.string().max(1000).nullable().optional().or(z.literal("")),
  btnReferralImageUrl: z.string().max(1000).nullable().optional().or(z.literal("")),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const rows = await prisma.siteSetting.findMany({
    where: { settingKey: { in: [...SETTING_KEYS] } },
  });
  const settings = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));

  return NextResponse.json({
    faviconUrl: settings.faviconUrl ?? null,
    siteTitle: settings.siteTitle ?? null,
    btnBuyImageUrl: settings.btnBuyImageUrl ?? null,
    btnPointsImageUrl: settings.btnPointsImageUrl ?? null,
    btnReferralImageUrl: settings.btnReferralImageUrl ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const upserts = SETTING_KEYS.map(key => {
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
      actionType: "site_settings_update",
      targetTable: "site_settings",
      targetId: "all",
      afterJson: data as object,
    },
  });

  return NextResponse.json({ message: "updated" });
}
