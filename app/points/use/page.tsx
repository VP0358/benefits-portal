"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function UsePointsPage() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // 現在のポイント残高
  const [wallet, setWallet] = useState<{
    availablePointsBalance: number;
    autoPointsBalance: number;
    manualPointsBalance: number;
    externalPointsBalance: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/member/wallet")
      .then(r => r.json())
      .then(d => setWallet(d))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pts = parseInt(amount);
    if (!pts || pts <= 0) { setMessage("利用ポイントを入力してください"); return; }
    if (wallet && pts > wallet.availablePointsBalance) {
      setMessage("利用可能ポイントを超えています");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/member/points/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pts, description: description || "ポイント利用" }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setMessage(`${pts.toLocaleString()}pt を利用しました`);
        setAmount("");
        setDescription("");
        // 残高更新
        if (wallet) {
          setWallet({ ...wallet, availablePointsBalance: wallet.availablePointsBalance - pts });
        }
      } else {
        setIsSuccess(false);
        setMessage(data.error ?? "エラーが発生しました");
      }
    } catch {
      setIsSuccess(false);
      setMessage("通信エラーが発生しました");
    }
    setLoading(false);
  }

  const availablePts = wallet?.availablePointsBalance ?? 0;
  const inputAmt = parseInt(amount) || 0;

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-20">
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-green-700 text-xl font-bold">‹</Link>
        <span className="font-bold text-green-900 text-base">💎 ポイントを使う</span>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* 現在のポイント */}
        <div className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>
          <p className="text-sm font-medium opacity-90 mb-1">利用可能ポイント</p>
          <p className="text-4xl font-black">
            {wallet === null ? "..." : availablePts.toLocaleString()}
            <span className="text-lg ml-1">pt</span>
          </p>
          {wallet && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs opacity-80">
              <div className="text-center">
                <p>自動</p>
                <p className="font-bold">{wallet.autoPointsBalance.toLocaleString()}pt</p>
              </div>
              <div className="text-center">
                <p>手動</p>
                <p className="font-bold">{wallet.manualPointsBalance.toLocaleString()}pt</p>
              </div>
              <div className="text-center">
                <p>外部</p>
                <p className="font-bold">{wallet.externalPointsBalance.toLocaleString()}pt</p>
              </div>
            </div>
          )}
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-bold text-gray-800 text-base">ポイントを利用する</h2>

          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold ${
              isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            }`}>
              {isSuccess ? "✅ " : "⚠️ "}{message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                利用ポイント数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={availablePts}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="0"
              />
              {inputAmt > 0 && wallet && inputAmt <= availablePts && (
                <p className="text-xs text-gray-700 mt-1">
                  利用後残高: <span className="font-bold text-gray-700">{(availablePts - inputAmt).toLocaleString()}pt</span>
                </p>
              )}
              {inputAmt > availablePts && availablePts > 0 && (
                <p className="text-xs text-red-500 mt-1">利用可能ポイントを超えています</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                利用内容 <span className="text-gray-600 text-xs">（任意）</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={255}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="例: 福利厚生サービス決済"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !amount || inputAmt <= 0}
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 shadow-sm transition"
              style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
            >
              {loading ? "処理中..." : `${inputAmt > 0 ? inputAmt.toLocaleString() + "pt を" : ""}利用する`}
            </button>
          </form>
        </div>

        <Link href="/points/history"
          className="block bg-white rounded-2xl shadow p-4 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          📊 ポイント履歴を見る →
        </Link>

      </main>
    </div>
  );
}
