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

  useEffect(() => {
    fetch("/api/admin/orders").then(r => r.json()).then(d => { setRows(d); setLoading(false); }).catch(() => { setError("取得に失敗しました"); setLoading(false); });
  }, []);

  if (loading) return <div className="text-slate-700">読み込み中...</div>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows.length === 0) return <div className="text-sm text-slate-700">注文はありません。</div>;

  return (
    <div className="space-y-4">
      {rows.map(row => (
        <div key={row.id} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-slate-800">{row.orderNumber}</div>
              <div className="text-sm text-slate-700">{new Date(row.orderedAt).toLocaleString("ja-JP")}</div>
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
          <div className="mt-4 flex justify-end">
            <Link href={`/admin/orders/${row.id}`} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800">詳細 / 状態変更</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
