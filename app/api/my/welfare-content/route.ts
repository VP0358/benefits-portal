export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/welfare-content?type=vp_phone|used_car|life_insurance|non_life_insurance
 * menuTypeに対応するメニューのcontentDataを返す（会員向け）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const menuType = req.nextUrl.searchParams.get("type");
  if (!menuType || !["vp_phone", "used_car", "life_insurance", "non_life_insurance"].includes(menuType)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const menu = await prisma.menu.findFirst({
    where: { menuType, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { contentData: true, title: true },
  });

  if (!menu || !menu.contentData) {
    return NextResponse.json({ content: null });
  }

  try {
    const content = JSON.parse(menu.contentData);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: null });
  }
}
