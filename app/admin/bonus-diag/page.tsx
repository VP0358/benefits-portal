"use client";
import { useState } from "react";

export default function BonusDiagPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const test = async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const text = await res.text();
      setResult(`[${res.status}] ${url}\n\n${text}`);
    } catch (e) {
      setResult(`ERROR: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🔍 ボーナス診断ページ</h1>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => test("/api/admin/bonus-run?bonusMonth=2026-03")}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
          bonus-run API
        </button>
        <button onClick={() => test("/api/admin/bonus-results/detail?bonusMonth=2026-03")}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm">
          detail API
        </button>
        <button onClick={() => test("/api/admin/bonus-results/publish-all?bonusMonth=2026-03")}
          className="px-4 py-2 bg-purple-600 text-white rounded text-sm">
          publish-all API
        </button>
        <button onClick={() => test("/api/admin/migrate")}
          className="px-4 py-2 bg-gray-600 text-white rounded text-sm">
          DBカラム確認
        </button>
      </div>
      {loading && <p className="text-gray-500">読み込み中...</p>}
      {result && (
        <pre className="bg-gray-900 text-green-300 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </main>
  );
}
