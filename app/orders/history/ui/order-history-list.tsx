"use client";

import { useEffect, useState, useCallback } from "react";

type OrderRow = {
  id: string; orderNumber: string; status: string; subtotalAmount: number;
  usedPoints: number; totalAmount: number; orderedAt: string;
  items: Array<{ id: string; productName: string; unitPrice: number; quantity: number; lineAmount: number }>;
};

export default function OrderHistoryList() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/member/orders");
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  async function cancelOrder(orderId: string) {
    if (!confirm("この注文をキャンセルしますか？ポイント利用分は返却されます。")) return;
    const res = await fetch(`/api/member/orders/${orderId}/cancel`, { method: "POST" });
    if (!res.ok) { alert("キャンセルに失敗しました。"); return; }
    alert("キャンセルしました。");
    await fetchOrders();
  }

  if (loading) return <div className="text-slate-500">読み込み中...</div>;
  if (rows.length === 0) return <div className="text-sm text-slate-500">注文履歴はありません。</div>;

  return (
    <div className="space-y-4">
      {rows.map(row => (
        <div key={row.id} className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-slate-800">{row.orderNumber}</div>
              <div className="text-sm text-slate-500">{new Date(row.orderedAt).toLocaleString("ja-JP")}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs ${row.status === "canceled" ? "bg-red-50 text-red-700" : row.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                {row.status}
              </span>
              {row.status !== "canceled" && (
                <button type="button" onClick={() => cancelOrder(row.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600">キャンセル</button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            {row.items.map(item => (
              <div key={item.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span>{item.productName} × {item.quantity}</span>
                <span>{item.lineAmount.toLocaleString()}円</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
            <div>小計: {row.subtotalAmount.toLocaleString()}円</div>
            <div>利用PT: {row.usedPoints.toLocaleString()}pt</div>
            <div className="font-semibold text-slate-800">支払: {row.totalAmount.toLocaleString()}円</div>
          </div>
        </div>
      ))}
    </div>
  );
}
