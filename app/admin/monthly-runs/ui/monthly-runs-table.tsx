"use client";

import { useEffect, useState } from "react";

type RunRow = { id: string; rewardMonth: string; closingDate: string; mode: string; totalContracts: number; totalReferrers: number; totalRewardPoints: number; createdAt: string };

export default function MonthlyRunsTable() {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/monthly-runs?page=${page}`)
      .then(r => r.json())
      .then(d => { setRows(d.rows); setTotalPages(d.pagination.totalPages); setLoading(false); });
  }, [page]);

  if (loading) return <div className="text-slate-700">読み込み中...</div>;
  if (rows.length === 0) return <div className="text-sm text-slate-700">履歴はありません。</div>;

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold text-slate-800">{row.rewardMonth}</div>
              <div className="text-sm text-slate-700">{new Date(row.createdAt).toLocaleString("ja-JP")}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${row.mode === "execute" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{row.mode}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2">契約数: <span className="font-bold">{row.totalContracts}</span></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">紹介者: <span className="font-bold">{row.totalReferrers}</span></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">付与PT: <span className="font-bold">{Number(row.totalRewardPoints).toLocaleString()}</span></div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50">前へ</button>
        <div className="text-sm text-slate-700">{page} / {totalPages}</div>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50">次へ</button>
      </div>
    </div>
  );
}
