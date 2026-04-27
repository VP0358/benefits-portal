"use client";

import { useCallback, useEffect, useState } from "react";

type Inquiry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  content: string;
  menuTitle: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  user: { memberCode: string; name: string } | null;
};

type Filter = "all" | "unread" | "read";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", 
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ContactsPanel() {
  const [filter, setFilter]     = useState<Filter>("all");
  const [page, setPage]         = useState(1);
  const [items, setItems]       = useState<Inquiry[]>([]);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [unread, setUnread]     = useState(0);

  const load = useCallback(async (f: Filter, p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/contacts?filter=${f}&page=${p}`);
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, []);

  const loadUnread = useCallback(async () => {
    const res = await fetch("/api/admin/contacts/unread-count");
    const data = await res.json();
    setUnread(data.count);
  }, []);

  useEffect(() => {
    load(filter, page);
    loadUnread();
  }, [filter, page, load, loadUnread]);

  async function toggleRead(item: Inquiry) {
    const newRead = !item.isRead;
    await fetch(`/api/admin/contacts/${item.id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: newRead }),
    });
    // 一覧更新
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, isRead: newRead, readAt: newRead ? new Date().toISOString() : null }
      : i
    ));
    if (selected?.id === item.id) {
      setSelected(prev => prev ? { ...prev, isRead: newRead } : null);
    }
    loadUnread();
  }

  async function openDetail(item: Inquiry) {
    setSelected(item);
    // 未読なら既読にする
    if (!item.isRead) {
      await fetch(`/api/admin/contacts/${item.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, isRead: true, readAt: new Date().toISOString() } : i
      ));
      setSelected({ ...item, isRead: true, readAt: new Date().toISOString() });
      loadUnread();
    }
  }

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "all",    label: "すべて" },
    { key: "unread", label: "未読" },
    { key: "read",   label: "既読" },
  ];

  return (
    <div className="flex gap-5 h-full">
      {/* ──── 左：一覧 ──────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* フィルタータブ */}
        <div className="flex gap-2 mb-4">
          {filterTabs.map(t => (
            <button key={t.key}
              onClick={() => { setFilter(t.key); setPage(1); setSelected(null); }}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                filter === t.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-800 border hover:bg-slate-50"
              }`}>
              {t.label}
              {t.key === "unread" && unread > 0 && (
                <span className="rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto text-sm text-slate-700 flex items-center">
            全 {total} 件
          </div>
        </div>

        {/* 一覧テーブル */}
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-700 shadow-sm">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-700 shadow-sm">
            {filter === "unread" ? "未読の相談はありません ✅" : "相談はありません"}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <button key={item.id} onClick={() => openDetail(item)}
                className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all border-2 ${
                  selected?.id === item.id
                    ? "border-slate-900 bg-slate-50"
                    : item.isRead
                    ? "border-transparent bg-white hover:border-slate-200"
                    : "border-red-200 bg-red-50 hover:border-red-300"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* 未読バッジ */}
                    {!item.isRead && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-red-500 mt-1.5" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${item.isRead ? "text-slate-700" : "text-red-700"}`}>
                          {item.name}
                        </span>
                        {item.menuTitle && (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5">
                            {item.menuTitle}
                          </span>
                        )}
                        {!item.isRead && (
                          <span className="rounded-full bg-red-100 text-red-600 text-xs px-2 py-0.5 font-bold">
                            未読
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-700 truncate">{item.content}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-700 whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium text-slate-800 disabled:opacity-40 hover:bg-slate-50">
              ← 前へ
            </button>
            <span className="rounded-xl border px-3 py-1.5 text-sm font-medium text-slate-800 bg-white">
              {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium text-slate-800 disabled:opacity-40 hover:bg-slate-50">
              次へ →
            </button>
          </div>
        )}
      </div>

      {/* ──── 右：詳細パネル ─────────────────────────── */}
      {selected ? (
        <div className="w-96 shrink-0 rounded-3xl bg-white p-6 shadow-sm sticky top-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">相談詳細</h2>
            <button onClick={() => setSelected(null)}
              className="text-slate-700 hover:text-slate-600 text-lg">✕</button>
          </div>

          {/* ステータスバッジ */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              selected.isRead
                ? "bg-slate-100 text-slate-700"
                : "bg-red-100 text-red-600"
            }`}>
              {selected.isRead ? "✅ 既読" : "🔴 未読"}
            </span>
            <button onClick={() => toggleRead(selected)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selected.isRead
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              }`}>
              {selected.isRead ? "未読に戻す" : "既読にする"}
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <Row label="受信日時" value={formatDate(selected.createdAt)} />
            {selected.menuTitle && <Row label="窓口" value={selected.menuTitle} />}
            <Row label="お名前"   value={selected.name} />
            <Row label="電話番号" value={selected.phone} href={`tel:${selected.phone}`} />
            <Row label="メール"   value={selected.email} href={`mailto:${selected.email}`} />
            {selected.user && (
              <Row label="会員番号" value={`${selected.user.memberCode}（${selected.user.name}）`} />
            )}
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-semibold text-slate-700 uppercase tracking-wide">相談内容</div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {selected.content}
            </div>
          </div>

          {selected.readAt && (
            <p className="mt-3 text-xs text-slate-700">
              既読日時: {formatDate(selected.readAt)}
            </p>
          )}
        </div>
      ) : (
        <div className="w-96 shrink-0 rounded-3xl bg-white p-6 shadow-sm flex items-center justify-center text-slate-300">
          <div className="text-center">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-sm">相談を選択してください</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-slate-700 pt-0.5">{label}</span>
      {href ? (
        <a href={href} className="text-blue-600 underline break-all">{value}</a>
      ) : (
        <span className="text-slate-700 break-all">{value}</span>
      )}
    </div>
  );
}
