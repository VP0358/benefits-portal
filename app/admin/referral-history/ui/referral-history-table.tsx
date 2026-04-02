"use client";

import { useEffect, useState, useCallback } from "react";

type HistoryRow = {
  id: string;
  userId: string;
  userName: string;
  userMemberCode: string;
  referrerId: string | null;
  referrerName: string | null;
  referrerMemberCode: string | null;
  actionType: string;
  adminName: string | null;
  note: string | null;
  createdAt: string;
};

const actionLabels: Record<string, { label: string; cls: string }> = {
  add: { label: "追加", cls: "bg-emerald-50 text-emerald-700" },
  remove: { label: "解除", cls: "bg-red-50 text-red-700" },
  change: { label: "変更", cls: "bg-blue-50 text-blue-700" },
  system: { label: "システム", cls: "bg-slate-100 text-slate-800" },
};

export default function ReferralHistoryTable() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    const res = await fetch(`/api/admin/referral-history?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, query]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="flex-1 rounded-xl border px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400"
          placeholder="会員番号・氏名で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">検索</button>
      </form>

      <div className="text-sm text-slate-700">全 {total} 件</div>

      {loading ? (
        <div className="py-8 text-center text-slate-700">読み込み中...</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-slate-700">履歴はありません。</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800">日時</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800">会員</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800">操作</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800">紹介者</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800">管理者</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-800">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => {
                const action = actionLabels[row.actionType] ?? { label: row.actionType, cls: "bg-slate-100 text-slate-800" };
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{row.userName}</div>
                      <div className="text-xs text-slate-700">{row.userMemberCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${action.cls}`}>
                        {action.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.referrerName ? (
                        <>
                          <div className="text-slate-800">{row.referrerName}</div>
                          <div className="text-xs text-slate-700">{row.referrerMemberCode}</div>
                        </>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{row.adminName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{row.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-sm text-slate-800">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
