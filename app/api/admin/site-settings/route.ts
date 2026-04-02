import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

const schema = z.object({
  faviconUrl: z.string().url().max(1000).nullable().optional().or(z.literal("")),
  siteTitle: z.string().max(255).nullable().optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const rows = await prisma.siteSetting.findMany({ where: { settingKey: { in: ["faviconUrl", "siteTitle"] } } });
  const settings = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));

  return NextResponse.json({ faviconUrl: settings.faviconUrl ?? null, siteTitle: settings.siteTitle ?? null });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { settingKey: "faviconUrl" },
      update: { settingValue: parsed.data.faviconUrl || null },
      create: { settingKey: "faviconUrl", settingValue: parsed.data.faviconUrl || null },
    }),
    prisma.siteSetting.upsert({
      where: { settingKey: "siteTitle" },
      update: { settingValue: parsed.data.siteTitle ?? null },
      create: { settingKey: "siteTitle", settingValue: parsed.data.siteTitle ?? null },
    }),
  ]);

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "site_settings_update",
      targetTable: "site_settings",
      targetId: "favicon_and_title",
      afterJson: { faviconUrl: parsed.data.faviconUrl, siteTitle: parsed.data.siteTitle },
    },
  });

  return NextResponse.json({ message: "updated" });
}
