"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrderRow = {
  id: string; orderNumber: string; status: string; subtotalAmount: number;
  usedPoints: number; totalAmount: number; orderedAt: string;
  user: { id: string; memberCode: string; name: string; email: string };
  items: Array<{ id: string; productName: string; quantity: number; lineAmount: number }>;
};

export default function AdminOrderList() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/admin/orders")
      .then(r => r.json())
      .then(d => { setRows(d); setLoading(false); })
      .catch(() => { setError("取得に失敗しました"); setLoading(false); });
  };

  useEffect(() => { fetchOrders(); }, []);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () =>
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));

  // 伝票削除
  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`注文「${orderNumber}」を削除しますか？\nこの操作は取り消せません。`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/orders?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "削除に失敗しました"); return; }
      setRows(prev => prev.filter(r => r.id !== id));
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    } finally {
      setDeleting(null);
    }
  };

  // 選択した伝票の納品書を一括PDF出力（新ウィンドウ）
  const handleBulkDeliveryNote = () => {
    if (selected.size === 0) { alert("伝票を選択してください"); return; }
    const ids = Array.from(selected).join(",");
    window.open(`/admin/orders-shipping/delivery-note?ids=${ids}&type=delivery`, "_blank");
  };

  // 1件の納品書PDF
  const handleSingleDeliveryNote = (id: string) => {
    window.open(`/admin/orders-shipping/delivery-note?ids=${id}&type=delivery`, "_blank");
  };

  if (loading) return <div className="text-slate-700">読み込み中...</div>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows.length === 0) return <div className="text-sm text-slate-700">注文はありません。</div>;

  return (
    <div className="space-y-4">
      {/* 一括操作バー */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.size === rows.length && rows.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded"
            />
            全選択
          </label>
          {selected.size > 0 && (
            <span className="text-xs text-blue-600 font-medium">{selected.size}件選択中</span>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDeliveryNote}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <i className="fas fa-file-pdf text-xs" />
            選択した伝票の納品書を一括出力
          </button>
        )}
      </div>

      {/* 注文一覧 */}
      {rows.map(row => (
        <div key={row.id} className={`rounded-2xl border p-4 transition ${selected.has(row.id) ? "border-blue-300 bg-blue-50/30" : ""}`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            {/* チェックボックス + 注文情報 */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggleSelect(row.id)}
                className="w-4 h-4 rounded mt-0.5 cursor-pointer"
              />
              <div>
                <div className="font-semibold text-slate-800">{row.orderNumber}</div>
                <div className="text-sm text-slate-700">{new Date(row.orderedAt).toLocaleString("ja-JP")}</div>
              </div>
            </div>
            <span className={`self-start rounded-full px-3 py-1 text-xs ${row.status === "canceled" ? "bg-red-50 text-red-700" : row.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
              {row.status}
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {row.user.memberCode} / {row.user.name}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
            <div>小計: {row.subtotalAmount.toLocaleString()}円</div>
            <div>利用PT: {row.usedPoints.toLocaleString()}pt</div>
            <div className="font-semibold">支払: {row.totalAmount.toLocaleString()}円</div>
          </div>
          <div className="mt-4 flex justify-end gap-2 flex-wrap">
            <Link href={`/admin/orders/${row.id}`}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition">
              詳細 / 状態変更
            </Link>
            {/* 納品書PDFダウンロード */}
            <button
              onClick={() => handleSingleDeliveryNote(row.id)}
              className="rounded-xl border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition flex items-center gap-1"
            >
              <i className="fas fa-file-pdf"></i>
              納品書PDF
            </button>
            {/* 削除 */}
            <button
              onClick={() => handleDelete(row.id, row.orderNumber)}
              disabled={deleting === row.id}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1"
            >
              <i className="fas fa-trash text-xs"></i>
              {deleting === row.id ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
