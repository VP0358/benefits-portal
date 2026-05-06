export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/welfare-plans
 * VPphone・中古車のプラン設定を取得（会員向け）
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await prisma.siteSetting.findMany({
    where: { settingKey: { in: ["vpPhonePlans", "usedCarSettings", "lifeInsuranceSettings", "nonLifeInsuranceSettings"] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.settingKey, r.settingValue]));

  let vpPhonePlans = null;
  let usedCarSettings = null;
  let lifeInsuranceSettings = null;
  let nonLifeInsuranceSettings = null;

  if (map.vpPhonePlans)             { try { vpPhonePlans             = JSON.parse(map.vpPhonePlans);             } catch { /* ignore */ } }
  if (map.usedCarSettings)          { try { usedCarSettings          = JSON.parse(map.usedCarSettings);          } catch { /* ignore */ } }
  if (map.lifeInsuranceSettings)    { try { lifeInsuranceSettings    = JSON.parse(map.lifeInsuranceSettings);    } catch { /* ignore */ } }
  if (map.nonLifeInsuranceSettings) { try { nonLifeInsuranceSettings = JSON.parse(map.nonLifeInsuranceSettings); } catch { /* ignore */ } }

  return NextResponse.json({ vpPhonePlans, usedCarSettings, lifeInsuranceSettings, nonLifeInsuranceSettings });
}
