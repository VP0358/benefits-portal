"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
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
      // next-auth/react の signIn を使用（CSRFトークンを自動処理）
      const result = await signIn("credentials", {
        email:       form.email,
        password:    form.password,
        redirect:    false,
      });

      if (result?.error) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      if (!result?.ok) {
        setError("ログインに失敗しました。もう一度お試しください。");
        setLoading(false);
        return;
      }

      // セッション確認してロール判定
      await new Promise((r) => setTimeout(r, 300));
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session    = await sessionRes.json();

      if (!session?.user) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      // ロールで振り分け（管理者は管理者ログインページへ誘導）
      if (session.user.role === "admin") {
        setError("管理者アカウントです。管理者ログインページをご利用ください。");
        setLoading(false);
        return;
      }

      window.location.replace("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
          style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)" }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        {/* ロゴ */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <ViolaLogo size="lg" />
          </div>
          <h1 className="text-xl font-bold text-green-700">会員ログイン</h1>
          <p className="mt-1 text-slate-600 text-sm">福利厚生ポータルへようこそ</p>
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
                         placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         transition"
              placeholder="example@mail.com"
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
                         placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         transition"
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
            style={{ background: "linear-gradient(135deg, #16a34a, #0d9488)" }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* 新規登録 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">アカウントをお持ちでない方は</p>
          <a
            href="/register"
            className="mt-2 block w-full rounded-xl border-2 border-green-600 px-4 py-3
                       text-center font-semibold text-green-700 hover:bg-green-50 transition"
          >
            新規会員登録
          </a>
        </div>

        {/* 管理者リンク */}
        <div className="mt-4 text-center">
          <a href="/admin/login" className="text-xs text-slate-600 hover:text-slate-700 transition">
            管理者の方はこちら →
          </a>
        </div>
      </div>
    </main>
  );
}
