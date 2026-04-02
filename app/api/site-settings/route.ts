import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.siteSetting.findMany({ where: { settingKey: { in: ["faviconUrl", "siteTitle"] } } });
  const settings = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));
  return NextResponse.json({ faviconUrl: settings.faviconUrl ?? null, siteTitle: settings.siteTitle ?? "福利厚生ポータル" });
}
