"use client";

import { useState } from "react";

type PreviewResponse = {
  rewardMonth: string;
  closingDate: string;
  totalContracts: number;
  totalReferrers: number;
  totalRewardPoints: number;
  targets: Array<{
    contractId: string;
    contractedUserName: string;
    baseMonthlyFee: number;
    referrers: Array<{
      referrerUserId: string;
      referrerUserName: string;
      rewardPoints: number;
    }>;
  }>;
};

export default function MonthlyGrantManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [rewardMonth, setRewardMonth] = useState(today.slice(0, 7));
  const [closingDate, setClosingDate] = useState(today);
  const [loading, setLoading]     = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError]         = useState("");
  const [message, setMessage]     = useState("");
  const [preview, setPreview]     = useState<PreviewResponse | null>(null);

  async function runPreview() {
    setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/points/monthly-grant/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardMonth, closingDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "プレビュー取得に失敗しました。");
      return;
    }
    setPreview(await res.json());
  }

  async function runExecute() {
    if (!confirm("月次ポイントを本実行しますか？重複実行はできません。")) return;
    setExecuting(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/points/monthly-grant/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardMonth, closingDate, execute: true }),
    });
    setExecuting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "本実行に失敗しました。");
      return;
    }
    const data = await res.json();
    setMessage(`実行完了: ${data.grantedCount}件 / ${Number(data.totalRewardPoints).toLocaleString()}pt`);
  }

  return (
    <div className="space-y-5">

      {/* 入力欄 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">対象月</label>
          <input
            type="month"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={rewardMonth}
            onChange={e => setRewardMonth(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">締め日</label>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={closingDate}
            onChange={e => setClosingDate(e.target.value)}
          />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={runPreview}
          disabled={loading}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          {loading ? "確認中..." : "プレビュー確認"}
        </button>
        <button
          onClick={runExecute}
          disabled={executing}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {executing ? "実行中..." : "本実行"}
        </button>
      </div>

      {/* エラー・成功 */}
      {error   && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">✅ {message}</p>}

      {/* プレビュー結果 */}
      {preview && (
        <div className="space-y-4 rounded-2xl border border-slate-200 p-5">

          {/* サマリー */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "対象契約数",    value: `${preview.totalContracts}件`,                        color: "text-slate-900" },
              { label: "紹介者件数",    value: `${preview.totalReferrers}件`,                        color: "text-slate-900" },
              { label: "総付与ポイント", value: `${preview.totalRewardPoints.toLocaleString()}pt`,   color: "text-emerald-600" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4 text-center">
                <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                <div className={`mt-1.5 text-xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* 明細 */}
          <div className="space-y-3">
            {preview.targets.length === 0 ? (
              <div className="text-sm font-medium text-slate-600">対象データはありません。</div>
            ) : (
              preview.targets.map(target => (
                <div key={target.contractId} className="rounded-2xl border border-slate-100 p-4">
                  <div className="font-bold text-slate-900">{target.contractedUserName}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">
                    月額: {target.baseMonthlyFee.toLocaleString()}円
                  </div>
                  <div className="mt-2 space-y-1">
                    {target.referrers.map((ref, i) => (
                      <div key={i}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm">
                        <span className="font-medium text-slate-800">{ref.referrerUserName}</span>
                        <span className="font-bold text-emerald-600">{ref.rewardPoints.toLocaleString()}pt</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
