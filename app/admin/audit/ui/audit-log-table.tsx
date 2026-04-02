"use client";

import { useEffect, useMemo, useState } from "react";

type AuditRow = { id: string; adminId: string | null; actionType: string; targetTable: string; targetId: string | null; createdAt: string };
type Res = { rows: AuditRow[]; pagination: { page: number; total: number; totalPages: number } };

export default function AuditLogTable() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedQ, setAppliedQ] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    if (appliedQ) p.set("q", appliedQ);
    return p.toString();
  }, [page, appliedQ]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit?${qs}`)
      .then(r => r.json())
      .then((d: Res) => { setRows(d.rows); setTotalPages(d.pagination.totalPages); setTotal(d.pagination.total); setLoading(false); });
  }, [qs]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input className="flex-1 rounded-xl border px-4 py-3 text-sm" placeholder="検索（action / table / id）" value={q} onChange={e => setQ(e.target.value)} />
        <button type="button" onClick={() => { setPage(1); setAppliedQ(q); }} className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">検索</button>
      </div>
      <div className="text-sm text-slate-500">総件数: {total}</div>
      {loading && <div className="text-slate-500">読み込み中...</div>}
      {!loading && rows.length === 0 && <div className="text-sm text-slate-500">監査ログはありません。</div>}
      {!loading && rows.map(row => (
        <div key={row.id} className="rounded-2xl border p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_80px]">
            <div className="text-sm text-slate-800 font-medium">{row.actionType}</div>
            <div className="text-sm text-slate-600">{row.targetTable}{row.targetId ? ` / ${row.targetId}` : ""}</div>
            <div className="text-sm text-slate-500">{new Date(row.createdAt).toLocaleString("ja-JP")}</div>
            <button type="button" onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className="rounded-xl border px-3 py-2 text-xs text-right">
              {expandedId === row.id ? "閉じる" : "詳細"}
            </button>
          </div>
          {expandedId === row.id && <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">管理者ID: {row.adminId || "-"}</div>}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">前へ</button>
        <div className="text-sm text-slate-500">{page} / {totalPages}</div>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">次へ</button>
      </div>
    </div>
  );
}
