import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminMenusList from "./ui/admin-menus-list";

export default async function AdminMenusPage() {
  const menus = await prisma.menu.findMany({ orderBy: { sortOrder: "asc" } });
  const serializableMenus = menus.map(menu => ({
    id: menu.id.toString(),
    title: menu.title,
    subtitle: menu.subtitle,
    linkUrl: menu.linkUrl,
    imageUrl: menu.imageUrl,
    iconType: menu.iconType,
    menuType: menu.menuType ?? "url",
    isActive: menu.isActive,
    sortOrder: menu.sortOrder,
  }));

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">メニュー管理</h1>
          <p className="mt-2 text-slate-800">ドラッグで並び順を変更できます。</p>
        </div>
        <Link href="/admin/menus/new" className="rounded-xl bg-slate-900 px-4 py-2 text-white text-sm">新規追加</Link>
      </div>
      <AdminMenusList initialMenus={serializableMenus} />
    </main>
  );
}
