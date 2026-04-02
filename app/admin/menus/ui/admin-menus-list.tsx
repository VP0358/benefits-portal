"use client";

import Link from "next/link";
import { useState } from "react";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string | null;
  linkUrl: string;
  imageUrl: string | null;
  iconType: string | null;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminMenusList({ initialMenus }: { initialMenus: MenuItem[] }) {
  const [menus, setMenus] = useState(initialMenus);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function moveItem(fromId: string, toId: string) {
    const fromIndex = menus.findIndex(m => m.id === fromId);
    const toIndex = menus.findIndex(m => m.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...menus];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setMenus(next.map((item, index) => ({ ...item, sortOrder: index + 1 })));
  }

  async function saveSort() {
    setSaving(true);
    const res = await fetch("/api/admin/menus/sort", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: menus.map((menu, index) => ({ id: menu.id, sortOrder: index + 1 })) }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    else alert("並び順の保存に失敗しました。");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3">
        {saved && <span className="text-sm text-emerald-600 self-center">保存しました ✓</span>}
        <button onClick={saveSort} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          {saving ? "保存中..." : "並び順を保存"}
        </button>
      </div>
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_1fr_100px_80px] gap-4 border-b px-6 py-4 font-semibold text-slate-700 text-sm">
          <div>順番</div><div>タイトル</div><div>リンク</div><div>状態</div><div>操作</div>
        </div>
        {menus.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-500 text-sm">メニューがありません</div>
        )}
        {menus.map((menu, index) => (
          <div
            key={menu.id}
            draggable
            onDragStart={() => setDraggingId(menu.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (draggingId) moveItem(draggingId, menu.id); setDraggingId(null); }}
            className={`grid cursor-move grid-cols-[60px_1fr_1fr_100px_80px] gap-4 border-b px-6 py-4 text-sm hover:bg-slate-50 transition-colors ${draggingId === menu.id ? "opacity-50 bg-slate-50" : ""}`}
          >
            <div className="text-slate-500">{index + 1}</div>
            <div>
              <div className="font-semibold text-slate-800">{menu.title}</div>
              <div className="text-xs text-slate-500">{menu.subtitle}</div>
            </div>
            <div className="truncate text-slate-600">{menu.linkUrl}</div>
            <div>
              <span className={`rounded-full px-2 py-1 text-xs ${menu.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {menu.isActive ? "公開" : "非公開"}
              </span>
            </div>
            <div>
              <Link href={`/admin/menus/${menu.id}/edit`} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50">
                編集
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
