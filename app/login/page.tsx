"use client";

import { FormEvent, useState } from "react";
import ViolaLogo from "@/app/components/viola-logo";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginAction(form.email, form.password);

      if (!result.success) {
        setError(result.error ?? "ログインに失敗しました。");
        setLoading(false);
        return;
      }

      // ログイン成功 → ページ全体リロードでセッションCookieを反映させてからリダイレクト
      window.location.href = "/";
    } catch (err) {
      console.error("Login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #eee8e0 0%, #f5f0e8 50%, #e8e0d4 100%)",
        fontFamily: "var(--font-noto), 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', sans-serif",
      }}
    >
      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.25) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(10,22,40,0.15) 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
        />
      </div>

      <div
        className="w-full max-w-md relative"
        style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: "24px",
          border: "1px solid rgba(201,168,76,0.2)",
          boxShadow: "0 20px 60px rgba(10,22,40,0.12), 0 4px 16px rgba(10,22,40,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* ゴールドラインアクセント（上部） */}
        <div
          style={{
            height: "3px",
            borderRadius: "24px 24px 0 0",
            background: "linear-gradient(90deg, transparent, #c9a84c 30%, #e8c96a 50%, #c9a84c 70%, transparent)",
          }}
        />

        <div className="p-8">
          {/* ロゴ・タイトル */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-5">
              <ViolaLogo size="lg" />
            </div>
            <h1
              className="text-lg font-bold"
              style={{ color: "#0a1628", fontFamily: "var(--font-cormorant), 'Georgia', serif", letterSpacing: "0.05em" }}
            >
              会員ログイン
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#78716c" }}>
              福利厚生ポータルへようこそ
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#44403c" }}>
                メールアドレス
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm transition"
                style={{
                  border: "1px solid rgba(201,168,76,0.25)",
                  color: "#1a1410",
                  background: "rgba(255,255,255,0.9)",
                  outline: "none",
                }}
                placeholder="example@mail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={(e) => {
                  e.target.style.borderColor = "#c9a84c";
                  e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(201,168,76,0.25)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#44403c" }}>
                パスワード
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3 text-sm transition"
                style={{
                  border: "1px solid rgba(201,168,76,0.25)",
                  color: "#1a1410",
                  background: "rgba(255,255,255,0.9)",
                  outline: "none",
                }}
                placeholder="パスワードを入力"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={(e) => {
                  e.target.style.borderColor = "#c9a84c";
                  e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(201,168,76,0.25)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #0a1628, #162c50)",
                color: "#e8c96a",
                border: "1px solid rgba(201,168,76,0.3)",
                boxShadow: "0 4px 14px rgba(10,22,40,0.25)",
                letterSpacing: "0.02em",
              }}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <div
            className="mt-6 pt-5"
            style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
          >
            <p className="text-xs text-center mb-3" style={{ color: "#78716c" }}>アカウントをお持ちでない方は</p>
            <a
              href="/register"
              className="block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition"
              style={{
                border: "1px solid rgba(201,168,76,0.35)",
                color: "#c9a84c",
                background: "rgba(201,168,76,0.04)",
              }}
            >
              新規会員登録
            </a>
          </div>

          <div className="mt-4 text-center">
            <a
              href="/admin/login"
              className="text-xs transition"
              style={{ color: "rgba(120,113,108,0.5)" }}
            >
              管理者の方はこちら →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
