import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WelfareUsageClient from "./ui/welfare-usage-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WelfareUsagePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  // メニュー一覧（有効なものだけ）
  const menus = await prisma.menu.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, menuType: true, iconType: true },
  });

  const menusSer = menus.map((m) => ({
    id:       m.id.toString(),
    title:    m.title,
    menuType: m.menuType,
    iconType: m.iconType ?? "",
  }));

  // 利用履歴サマリー（メニュー別利用件数）
  const summaryRaw = await prisma.welfareUsage.groupBy({
    by: ["menuId"],
    _count: { id: true },
  });
  const summaryMap = Object.fromEntries(
    summaryRaw.map((s) => [s.menuId.toString(), s._count.id])
  );

  return (
    <WelfareUsageClient
      initialMenus={menusSer}
      summaryMap={summaryMap}
    />
  );
}
