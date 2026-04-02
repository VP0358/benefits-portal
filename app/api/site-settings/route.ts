import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const keys = ["faviconUrl", "siteTitle", "btnBuyImageUrl", "btnPointsImageUrl", "btnReferralImageUrl"];
  const rows = await prisma.siteSetting.findMany({ where: { settingKey: { in: keys } } });
  const settings = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue]));
  return NextResponse.json({
    faviconUrl: settings.faviconUrl ?? null,
    siteTitle: settings.siteTitle ?? "福利厚生ポータル",
    btnBuyImageUrl: settings.btnBuyImageUrl ?? null,
    btnPointsImageUrl: settings.btnPointsImageUrl ?? null,
    btnReferralImageUrl: settings.btnReferralImageUrl ?? null,
  });
}
