// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/menus  – アクティブな福利厚生メニューの一覧を取得
 * 相談窓口のカテゴリ動的反映などに使用
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const menus = await prisma.menu.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      subtitle: true,
      menuType: true,
      iconType: true,
      linkUrl: true,
      contentData: true,
    },
  });

  return NextResponse.json(
    menus.map((m) => ({
      id: m.id.toString(),
      title: m.title,
      subtitle: m.subtitle ?? null,
      menuType: m.menuType ?? "url",
      iconType: m.iconType ?? null,
      linkUrl: m.linkUrl ?? "",
      contentData: m.contentData ?? null,
    }))
  );
}
