"use client";

import { FormEvent, useState } from "react";

export default function PointUsePage() {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("福利厚生サービス決済");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/member/points/use", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), description }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(()=>null); setError(d?.error || "ポイント利用に失敗しました。"); return; }
    const data = await res.json();
    setMessage(`${data.usedPoints.toLocaleString()}pt を利用しました。残高: ${data.availablePointsBalance.toLocaleString()}pt`);
    setAmount(0);
  }

  return (
    <main className="min-h-screen bg-[#e6f2dc] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm space-y-5">
        <h1 className="text-2xl font-bold text-slate-800">ポイント利用</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">利用ポイント</label>
            <input type="number" min="1" required className="w-full rounded-xl border px-4 py-3" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">利用内容</label>
            <input className="w-full rounded-xl border px-4 py-3" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-900 py-3 text-white disabled:opacity-50">{loading ? "処理中..." : "ポイントを利用する"}</button>
        </form>
        <a href="/dashboard" className="block text-center text-sm text-slate-500">← ダッシュボードに戻る</a>
      </div>
    </main>
  );
}
