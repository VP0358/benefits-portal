"use client";

import { useEffect, useState } from "react";

type PointUsageRow = {
  id: string; totalUsedPoints: number; usedAutoPoints: number; usedManualPoints: number; usedExternalPoints: number; usedAt: string;
  order: { id: string; orderNumber: string; status: string; totalAmount: number; orderedAt: string } | null;
};

export default function PointUsageHistory() {
  const [rows, setRows] = useState<PointUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member/point-usages").then(r => r.json()).then(d => { setRows(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-slate-500">読み込み中...</div>;
  if (rows.length === 0) return <div className="text-sm text-slate-500">利用履歴はありません。</div>;

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="rounded-2xl border p-4 space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-slate-800">{row.totalUsedPoints.toLocaleString()}pt 利用</div>
            <div className="text-sm text-slate-500">{new Date(row.usedAt).toLocaleString("ja-JP")}</div>
          </div>
          <div className="text-xs text-slate-500">自動 {row.usedAutoPoints.toLocaleString()} / 手動 {row.usedManualPoints.toLocaleString()} / 外部 {row.usedExternalPoints.toLocaleString()}</div>
          {row.order ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <div>注文: {row.order.orderNumber}</div>
              <div>金額: {row.order.totalAmount.toLocaleString()}円</div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
