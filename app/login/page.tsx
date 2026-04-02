"use client";

import { FormEvent, useState } from "react";
import ViolaLogo from "@/app/components/viola-logo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ email: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ① CSRFトークン取得
      const csrfRes  = await fetch("/api/auth/csrf");
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken ?? "";

      // ② credentials でログイン
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

      // ③ セッション確認（少し待ってからCookieが反映される）
      await new Promise(r => setTimeout(r, 500));
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session    = await sessionRes.json();

      if (!session?.user) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      // ④ ロールに応じてページ遷移（window.location で確実にCookieを送る）
      if (session.user.role === "admin") {
        window.location.replace("/admin");
      } else {
        window.location.replace("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#e6f2dc] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <ViolaLogo size="lg" />
          </div>
          <p className="mt-2 text-slate-500 text-sm">ログインしてください</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-900">
              メールアドレス
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-600 focus:outline-none"
              placeholder="example@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-900">
              パスワード
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-600 focus:outline-none"
              placeholder="パスワードを入力"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
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
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* 新規登録リンク */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            アカウントをお持ちでない方は
          </p>
          <a
            href="/register"
            className="mt-2 block w-full rounded-xl border-2 border-slate-900 px-4 py-3 text-center font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
          >
            新規会員登録
          </a>
        </div>
      </div>
    </main>
  );
}
