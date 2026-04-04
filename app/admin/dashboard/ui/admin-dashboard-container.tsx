"use client";

import { useState } from "react";

function today() { return new Date().toISOString().slice(0, 10); }
function firstDayOfMonth() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10); }

export default function AdminDashboardContainer() {
  const [draftFrom, setDraftFrom] = useState(firstDayOfMonth());
  const [draftTo, setDraftTo] = useState(today());
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());

  function apply() { setFrom(draftFrom); setTo(draftTo); }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">開始日</label>
            <input type="date" className="w-full rounded-xl border-2 border-slate-400 px-4 py-3 text-slate-900 font-medium focus:border-slate-600 focus:outline-none" value={draftFrom} onChange={e => setDraftFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">終了日</label>
            <input type="date" className="w-full rounded-xl border-2 border-slate-400 px-4 py-3 text-slate-900 font-medium focus:border-slate-600 focus:outline-none" value={draftTo} onChange={e => setDraftTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={apply} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">反映</button>
          </div>
        </div>
      </div>
      <AdminDashboardPanel from={from} to={to} />
      <MonthlyCharts from={from} to={to} />
      <ProductRanking from={from} to={to} />
      <div className="flex gap-3">
        <a href={`/api/admin/export/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`} className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-800">注文CSV出力</a>
        <a href="/api/admin/export/audit" className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-800">監査ログCSV出力</a>
      </div>
    </div>
  );
}

function AdminDashboardPanel({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<{ summary: { totalSales: number; orderCount: number; totalUsedPoints: number; totalAvailablePoints: number; totalGrantedAutoPoints: number; userCount: number; menuCount: number }; orderStatusBreakdown: { status: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useState(() => {
    setLoading(true);
    fetch(`/api/admin/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [, update] = useState(0);
  if (!data || loading) {
    if (!loading) {
      setLoading(true);
      fetch(`/api/admin/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then(r => r.json()).then(d => { setData(d); setLoading(false); update(n => n+1); });
    }
    return <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-700">読み込み中...</div>;
  }

  const items = [
    { label: "総売上", value: `${Number(data.summary.totalSales).toLocaleString()}円` },
    { label: "注文数", value: data.summary.orderCount },
    { label: "利用ポイント計", value: `${Number(data.summary.totalUsedPoints).toLocaleString()}pt` },
    { label: "会員保有ポイント", value: `${Number(data.summary.totalAvailablePoints).toLocaleString()}pt` },
    { label: "自動付与ポイント計", value: `${Number(data.summary.totalGrantedAutoPoints).toLocaleString()}pt` },
    { label: "会員数", value: data.summary.userCount },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(item => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-700">{item.label}</div>
            <div className="mt-2 text-xl font-bold text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
      {data.orderStatusBreakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">注文状態内訳</h3>
          <div className="flex flex-wrap gap-3">
            {data.orderStatusBreakdown.map(item => (
              <div key={item.status} className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
                <span className="text-slate-700">{item.status}: </span><span className="font-bold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyCharts({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<{ monthly: { month: string; sales: number; usedPoints: number; grantedPoints: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [, update] = useState(0);
  if (!data || loading) {
    if (!loading) {
      setLoading(true);
      fetch(`/api/admin/dashboard/monthly?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then(r => r.json()).then(d => { setData(d); setLoading(false); update(n => n+1); });
    }
    return <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-700">グラフ読み込み中...</div>;
  }
  const salesMax = Math.max(...data.monthly.map(r => r.sales), 1);
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-lg font-bold text-slate-800">月別売上</h2>
      <div className="flex items-end gap-2 h-32">
        {data.monthly.map(row => (
          <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-slate-800 rounded-t" style={{ height: `${Math.max((row.sales / salesMax) * 100, row.sales > 0 ? 5 : 0)}%` }} />
            <div className="text-xs text-slate-700 truncate w-full text-center">{row.month.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductRanking({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<{ ranking: { rank: number; productName: string; totalSales: number; totalQuantity: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [, update] = useState(0);
  if (!data || loading) {
    if (!loading) {
      setLoading(true);
      fetch(`/api/admin/dashboard/ranking?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then(r => r.json()).then(d => { setData(d); setLoading(false); update(n => n+1); });
    }
    return <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-700">ランキング読み込み中...</div>;
  }
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4">商品別売上ランキング</h2>
      {data.ranking.length === 0 ? <div className="text-sm text-slate-700">データなし</div> : (
        <div className="space-y-2">
          {data.ranking.map(row => (
            <div key={row.rank} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <div className="text-xl font-bold text-slate-700 w-8">#{row.rank}</div>
              <div className="flex-1 font-semibold text-slate-800">{row.productName}</div>
              <div className="text-slate-800">{row.totalQuantity}個</div>
              <div className="font-bold text-slate-800">{Number(row.totalSales).toLocaleString()}円</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
