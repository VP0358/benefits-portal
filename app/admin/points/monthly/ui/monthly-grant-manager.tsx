"use client";

import { useState } from "react";

type PreviewResponse = {
  rewardMonth: string; closingDate: string; totalContracts: number; totalReferrers: number; totalRewardPoints: number;
  targets: Array<{
    contractId: string; contractedUserName: string; baseMonthlyFee: number;
    referrers: Array<{ referrerUserId: string; referrerUserName: string; rewardPoints: number }>;
  }>;
};

export default function MonthlyGrantManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [rewardMonth, setRewardMonth] = useState(today.slice(0, 7));
  const [closingDate, setClosingDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  async function runPreview() {
    setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/points/monthly-grant/preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardMonth, closingDate }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(()=>null); setError(d?.error || "プレビュー取得に失敗しました。"); return; }
    setPreview(await res.json());
  }

  async function runExecute() {
    if (!confirm("月次ポイントを本実行しますか？重複実行はできません。")) return;
    setExecuting(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/points/monthly-grant/execute", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardMonth, closingDate, execute: true }),
    });
    setExecuting(false);
    if (!res.ok) { const d = await res.json().catch(()=>null); setError(d?.error || "本実行に失敗しました。"); return; }
    const data = await res.json();
    setMessage(`実行完了: ${data.grantedCount}件 / ${Number(data.totalRewardPoints).toLocaleString()}pt`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">対象月</label>
          <input type="month" className="w-full rounded-xl border px-4 py-3" value={rewardMonth} onChange={e => setRewardMonth(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">締め日</label>
          <input type="date" className="w-full rounded-xl border px-4 py-3" value={closingDate} onChange={e => setClosingDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={runPreview} disabled={loading} className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-800 disabled:opacity-50">{loading ? "確認中..." : "プレビュー確認"}</button>
        <button onClick={runExecute} disabled={executing} className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white disabled:opacity-50">{executing ? "実行中..." : "本実行"}</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {preview && (
        <div className="space-y-4 rounded-2xl border p-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[{ label: "対象契約数", value: preview.totalContracts }, { label: "紹介者件数", value: preview.totalReferrers }, { label: "総付与ポイント", value: `${preview.totalRewardPoints.toLocaleString()}pt` }].map(item => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-700">{item.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {preview.targets.length === 0 ? <div className="text-sm text-slate-700">対象データはありません。</div> : preview.targets.map(target => (
              <div key={target.contractId} className="rounded-2xl border p-4">
                <div className="font-semibold text-slate-800">{target.contractedUserName}</div>
                <div className="text-sm text-slate-700">月額: {target.baseMonthlyFee.toLocaleString()}円</div>
                <div className="mt-2 space-y-1">
                  {target.referrers.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span>{ref.referrerUserName}</span><span className="font-medium">{ref.rewardPoints.toLocaleString()}pt</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
