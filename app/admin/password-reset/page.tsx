"use client";

import { useState, useEffect } from "react";

export default function PasswordResetPage() {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [singleCode, setSingleCode] = useState("");

  useEffect(() => {
    fetch("/api/admin/reset-passwords")
      .then(r => r.json())
      .then(d => setMemberCount(d.count ?? null))
      .catch(() => {});
  }, []);

  async function handleResetAll() {
    if (!confirmed) { setError("チェックボックスにチェックを入れてください"); return; }
    const ok = window.confirm(`MLM会員 ${memberCount} 名全員のパスワードを「0000」にリセットします。\n本当によろしいですか？`);
    if (!ok) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/admin/reset-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.error ?? "エラーが発生しました");
    } catch { setError("通信エラーが発生しました"); }
    setLoading(false);
  }

  async function handleResetSingle() {
    if (!singleCode.trim()) { setError("会員コードを入力してください"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/admin/reset-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single", memberCode: singleCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.error ?? "エラーが発生しました");
    } catch { setError("通信エラーが発生しました"); }
    setLoading(false);
  }

  return (
    <main className="space-y-6 pb-12">
      {/* ヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          System Settings
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">マイページパスワード初期化</h1>
        <p className="text-sm text-stone-400 mt-1">
          会員のマイページログインパスワードを初期値「<strong>0000</strong>」にリセットします。
        </p>
      </div>

      {/* 説明カード */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-amber-500 text-lg mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-bold">初期ログイン情報について</p>
            <p>・ ログインURL：<span className="font-mono font-bold">https://viola-pure.xyz/</span></p>
            <p>・ ログインID：<span className="font-bold">会員コード（例: 123456-01）</span></p>
            <p>・ 初期パスワード：<span className="font-bold text-red-700">0000</span></p>
            <p>・ ログイン後、会員様ご自身でパスワードを変更していただく必要があります。</p>
          </div>
        </div>
      </div>

      {/* 結果表示 */}
      {result && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <i className="fas fa-check-circle text-emerald-500 text-xl" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">{result.message}</p>
            <p className="text-xs text-emerald-600">{result.count} 名のパスワードを「0000」にリセットしました。</p>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <i className="fas fa-exclamation-circle text-red-500 text-xl" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 全会員リセット */}
      <section className="rounded-2xl bg-white border border-stone-100 p-6 space-y-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}>
        <div>
          <h2 className="text-base font-bold text-stone-800 mb-1">
            <i className="fas fa-users mr-2 text-violet-500" />
            全MLM会員のパスワードを一括リセット
          </h2>
          <p className="text-xs text-stone-400">
            現在登録中のMLM会員：
            <span className="font-bold text-stone-700 ml-1">
              {memberCount !== null ? `${memberCount} 名` : "読み込み中..."}
            </span>
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-violet-600"
          />
          <span className="text-sm text-stone-700">
            全会員のパスワードを「<span className="font-bold text-red-600">0000</span>」にリセットすることを確認しました。
            この操作は元に戻せません。
          </span>
        </label>

        <button
          onClick={handleResetAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
          }}
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> 処理中...</>
          ) : (
            <><i className="fas fa-key" /> 全会員のパスワードを「0000」にリセット</>
          )}
        </button>
      </section>

      {/* 個別リセット */}
      <section className="rounded-2xl bg-white border border-stone-100 p-6 space-y-4"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}>
        <h2 className="text-base font-bold text-stone-800">
          <i className="fas fa-user mr-2 text-blue-500" />
          特定会員のパスワードをリセット
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={singleCode}
            onChange={e => setSingleCode(e.target.value)}
            placeholder="会員コード（例: 123456-01）"
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleResetSingle}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <i className="fas fa-redo-alt" /> リセット
          </button>
        </div>
        <p className="text-xs text-stone-400">会員コードを入力して個別にリセットします。</p>
      </section>
    </main>
  );
}
