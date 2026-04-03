"use client";

import { useState } from "react";
import Link from "next/link";

export default function UsePointsPage() {
  const [points, setPoints] = useState(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (points <= 0) { setMessage("利用ポイントを入力してください"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/points/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ ポイントを利用しました");
        setPoints(0);
        setDescription("");
      } else {
        setMessage(data.error ?? "エラーが発生しました");
      }
    } catch {
      setMessage("通信エラーが発生しました");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-black text-gray-900 mb-6">💎 ポイント利用</h1>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${
            message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">利用ポイント</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={e => setPoints(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">利用内容</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="福利厚生サービス決済"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-base disabled:opacity-50 shadow"
            style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
          >
            {loading ? "処理中..." : "ポイントを利用する"}
          </button>
        </form>

        <Link href="/dashboard" className="block text-center text-sm font-semibold text-gray-600 mt-4 hover:underline">
          ← ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}
