"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ViolaLogo from "@/app/components/viola-logo";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // CSRFトークンを取得
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      // ログインリクエスト
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: form.email,
          password: form.password,
          csrfToken,
          callbackUrl: "/",
          json: "true",
        }),
        redirect: "follow",
      });

      // セッション確認
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (!session?.user) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      // ロールに応じてリダイレクト
      if (session.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#e6f2dc] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          {/* ロゴ */}
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-600 focus:outline-none"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-900">
              パスワード
            </label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-600 focus:outline-none"
              placeholder="パスワードを入力"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </main>
  );
}
