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
  menuType: string;
  isActive: boolean;
  sortOrder: number;
};

const menuTypeLabel: Record<string, string> = {
  url:     "🔗 URLリンク",
  skin:    "💆 肌診断",
  contact: "📞 相談窓口",
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
        {/* テーブルヘッダー */}
        <div className="hidden md:grid md:grid-cols-[50px_1fr_120px_180px_90px_70px] gap-3 border-b px-6 py-3 font-semibold text-slate-600 text-xs bg-slate-50">
          <div>順番</div>
          <div>メニュー</div>
          <div>種別</div>
          <div>リンク/設定</div>
          <div>状態</div>
          <div>操作</div>
        </div>

        {menus.length === 0 && (
          <div className="px-6 py-10 text-center text-slate-600 text-sm">
            メニューがありません。「新規追加」から作成してください。
          </div>
        )}

        {menus.map((menu, index) => (
          <div
            key={menu.id}
            draggable
            onDragStart={() => setDraggingId(menu.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (draggingId) moveItem(draggingId, menu.id); setDraggingId(null); }}
            className={`border-b last:border-b-0 px-6 py-4 text-sm hover:bg-slate-50 transition-colors cursor-move
              md:grid md:grid-cols-[50px_1fr_120px_180px_90px_70px] md:gap-3 md:items-center
              ${draggingId === menu.id ? "opacity-50 bg-slate-50" : ""}`}
          >
            {/* 順番 */}
            <div className="text-slate-600 text-xs font-mono hidden md:block">{index + 1}</div>

            {/* タイトル */}
            <div className="mb-2 md:mb-0">
              <div className="flex items-center gap-2">
                {menu.imageUrl ? (
                  <img src={menu.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                    {menu.iconType === "smartphone" ? "📱"
                     : menu.iconType === "plane"   ? "✈️"
                     : menu.iconType === "smile"   ? "😊"
                     : menu.iconType === "cart"    ? "🛒"
                     : menu.iconType === "message" ? "💬"
                     : menu.iconType === "jar"     ? "🫙"
                     : menu.iconType === "star"    ? "⭐"
                     : menu.iconType === "heart"   ? "❤️"
                     : "🔗"}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-800">{menu.title}</div>
                  {menu.subtitle && <div className="text-xs text-slate-600">{menu.subtitle}</div>}
                </div>
              </div>
            </div>

            {/* 種別 */}
            <div className="hidden md:block">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {menuTypeLabel[menu.menuType] ?? menu.menuType}
              </span>
            </div>

            {/* リンク/設定 */}
            <div className="hidden md:block truncate text-slate-700 text-xs">
              {menu.menuType === "url" && menu.linkUrl
                ? <a href={menu.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate block">{menu.linkUrl}</a>
                : <span className="text-slate-600">{menuTypeLabel[menu.menuType] ?? "―"}</span>
              }
            </div>

            {/* 状態 */}
            <div className="hidden md:block">
              <span className={`rounded-full px-2 py-1 text-xs ${menu.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                {menu.isActive ? "公開" : "非公開"}
              </span>
            </div>

            {/* 操作 */}
            <div className="flex items-center gap-2">
              {/* モバイル用: 状態バッジ */}
              <span className={`md:hidden rounded-full px-2 py-1 text-xs ${menu.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                {menu.isActive ? "公開" : "非公開"}
              </span>
              <Link href={`/admin/menus/${menu.id}/edit`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap">
                編集
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
