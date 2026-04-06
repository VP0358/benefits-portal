"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ email: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const csrfRes   = await fetch("/api/auth/csrf");
      const csrfData  = await csrfRes.json();
      const csrfToken = csrfData.csrfToken ?? "";

      await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email:       form.email,
          password:    form.password,
          csrfToken,
          callbackUrl: "/",
          json:        "true",
        }).toString(),
        redirect: "manual",
      });

      await new Promise((r) => setTimeout(r, 500));
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session    = await sessionRes.json();

      if (!session?.user) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      if (session.user.role !== "admin") {
        setError("管理者アカウントではありません。");
        setLoading(false);
        return;
      }

      window.location.replace("/admin/dashboard");
    } catch (err) {
      console.error("Admin login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)" }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}
          >
            🛡️
          </div>
          <h1 className="text-xl font-bold" style={{ color: "#312e81" }}>
            管理者ログイン
          </h1>
          <p className="mt-1 text-slate-700 text-sm">福利厚生ポータル 管理画面</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              メールアドレス
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                         placeholder:text-slate-400 transition"
              style={{ outline: "none" }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #6366f1")}
              onBlur={(e)  => (e.target.style.boxShadow = "none")}
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              パスワード
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                         placeholder:text-slate-400 transition"
              style={{ outline: "none" }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #6366f1")}
              onBlur={(e)  => (e.target.style.boxShadow = "none")}
              placeholder="パスワードを入力"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 font-semibold text-white
                       transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}
          >
            {loading ? "ログイン中..." : "管理者としてログイン"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-xs text-slate-600 hover:text-slate-700 transition">
            ← 会員ログインページへ戻る
          </a>
        </div>
      </div>
    </main>
  );
}
