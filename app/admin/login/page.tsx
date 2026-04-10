"use client";

import { FormEvent, useState } from "react";
import { adminLoginAction } from "./actions";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ email: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await adminLoginAction(form.email, form.password);

      if (!result.success) {
        setError(result.error ?? "ログインに失敗しました。");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      console.error("Admin login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #07111f 0%, #0a1628 50%, #0d1e38 100%)",
        fontFamily: "var(--font-noto), 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', sans-serif",
      }}
    >
      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.4) 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(139,124,248,0.4) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }}
        />
        {/* グリッドパターン */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="w-full max-w-md relative">
        {/* メインカード */}
        <div
          style={{
            background: "linear-gradient(145deg, rgba(13,30,56,0.95), rgba(18,36,68,0.95))",
            borderRadius: "24px",
            border: "1px solid rgba(201,168,76,0.22)",
            boxShadow: "0 24px 80px rgba(10,22,40,0.6), 0 0 0 1px rgba(201,168,76,0.08) inset",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* ゴールドラインアクセント（上部） */}
          <div
            style={{
              height: "2px",
              borderRadius: "24px 24px 0 0",
              background: "linear-gradient(90deg, transparent, #c9a84c 30%, #e8c96a 50%, #c9a84c 70%, transparent)",
              boxShadow: "0 0 12px rgba(201,168,76,0.4)",
            }}
          />

          <div className="p-8">
            {/* ロゴ・タイトル */}
            <div className="mb-8 text-center">
              {/* シールドアイコン */}
              <div className="flex justify-center mb-5">
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
                    border: "1px solid rgba(201,168,76,0.3)",
                    boxShadow: "0 8px 24px rgba(10,22,40,0.3), 0 0 0 1px rgba(201,168,76,0.1) inset",
                  }}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>🛡️</span>
                  <span
                    className="text-[9px] font-bold mt-1 tracking-widest"
                    style={{ color: "#c9a84c", fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif" }}
                  >
                    ADMIN
                  </span>
                </div>
              </div>

              <h1
                className="text-xl font-bold tracking-wider"
                style={{ color: "#e8c96a", fontFamily: "var(--font-cormorant), 'Georgia', serif" }}
              >
                VIOLA Pure
              </h1>
              <p
                className="text-sm font-semibold mt-0.5 tracking-widest uppercase"
                style={{ color: "rgba(201,168,76,0.6)", fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif", fontSize: "11px" }}
              >
                Admin Portal
              </p>
              <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                管理者専用ログイン
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-sm transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    color: "#fff",
                    outline: "none",
                  }}
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#c9a84c";
                    e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
                    e.target.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(201,168,76,0.2)";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                  }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                  パスワード
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-sm transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    color: "#fff",
                    outline: "none",
                  }}
                  placeholder="パスワードを入力"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#c9a84c";
                    e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
                    e.target.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(201,168,76,0.2)";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                  }}
                />
              </div>

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#fca5a5",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #c9a84c, #a88830)",
                  color: "#0a1628",
                  boxShadow: "0 4px 16px rgba(201,168,76,0.4), 0 0 0 1px rgba(201,168,76,0.3) inset",
                  letterSpacing: "0.02em",
                  fontWeight: 700,
                }}
              >
                {loading ? "ログイン中..." : "管理者としてログイン"}
              </button>
            </form>

            <div
              className="mt-6 pt-4 text-center"
              style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}
            >
              <a
                href="/login"
                className="text-xs transition"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                ← 会員ログインページへ戻る
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
