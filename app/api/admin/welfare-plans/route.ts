export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * GET /api/admin/welfare-plans
 * VPphone・中古車のプラン設定を取得（管理者向け）
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const rows = await prisma.siteSetting.findMany({
    where: { settingKey: { in: ["vpPhonePlans", "usedCarSettings", "lifeInsuranceSettings", "nonLifeInsuranceSettings"] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.settingKey, r.settingValue]));

  let vpPhonePlans = null;
  let usedCarSettings = null;
  let lifeInsuranceSettings = null;
  let nonLifeInsuranceSettings = null;

  if (map.vpPhonePlans)              { try { vpPhonePlans              = JSON.parse(map.vpPhonePlans);              } catch { /* ignore */ } }
  if (map.usedCarSettings)           { try { usedCarSettings           = JSON.parse(map.usedCarSettings);           } catch { /* ignore */ } }
  if (map.lifeInsuranceSettings)     { try { lifeInsuranceSettings     = JSON.parse(map.lifeInsuranceSettings);     } catch { /* ignore */ } }
  if (map.nonLifeInsuranceSettings)  { try { nonLifeInsuranceSettings  = JSON.parse(map.nonLifeInsuranceSettings);  } catch { /* ignore */ } }

  return NextResponse.json({ vpPhonePlans, usedCarSettings, lifeInsuranceSettings, nonLifeInsuranceSettings });
}

/**
 * PUT /api/admin/welfare-plans
 * VPphone・中古車のプラン設定を保存（管理者向け）
 */
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  const updates: { key: string; value: string }[] = [];

  if (body.vpPhonePlans !== undefined) {
    updates.push({ key: "vpPhonePlans", value: JSON.stringify(body.vpPhonePlans) });
  }
  if (body.usedCarSettings !== undefined) {
    updates.push({ key: "usedCarSettings", value: JSON.stringify(body.usedCarSettings) });
  }
  if (body.lifeInsuranceSettings !== undefined) {
    updates.push({ key: "lifeInsuranceSettings", value: JSON.stringify(body.lifeInsuranceSettings) });
  }
  if (body.nonLifeInsuranceSettings !== undefined) {
    updates.push({ key: "nonLifeInsuranceSettings", value: JSON.stringify(body.nonLifeInsuranceSettings) });
  }

  for (const { key, value } of updates) {
    await prisma.siteSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: value },
      create: { settingKey: key, settingValue: value },
    });
  }

  return NextResponse.json({ ok: true });
}
