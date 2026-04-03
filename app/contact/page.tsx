"use client";

import { FormEvent, useState } from "react";
import ViolaLogo from "@/app/components/viola-logo";

const CATEGORIES = [
  "VPphone（携帯契約）",
  "旅行",
  "肌診断",
  "ショッピング",
  "細胞浴予約",
  "ポイントについて",
  "その他",
];

export default function ContactPage() {
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");
  const [form, setForm] = useState({
    name:     "",
    phone:    "",
    email:    "",
    category: "",
    content:  "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 入力バリデーション
    if (!form.name.trim()) {
      setError("お名前を入力してください。");
      setLoading(false);
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("正しいメールアドレスを入力してください。");
      setLoading(false);
      return;
    }
    if (!form.content.trim()) {
      setError("相談内容を入力してください。");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      form.name,
          phone:     form.phone,
          email:     form.email,
          menuTitle: form.category,
          content:   form.content,
        }),
      });

      if (!res.ok) throw new Error("送信失敗");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("送信に失敗しました。しばらく経ってからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  // 送信完了画面
  if (submitted) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
      >
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">送信完了しました</h2>
          <p className="text-slate-500 text-sm mb-6">
            お問い合わせありがとうございます。
            <br />
            担当者より折り返しご連絡いたします。
          </p>
          <a
            href="/dashboard"
            className="block w-full rounded-xl px-4 py-3 font-semibold text-white text-center"
            style={{ background: "linear-gradient(135deg, #16a34a, #0d9488)" }}
          >
            マイページに戻る
          </a>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-4"
      style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
    >
      <div className="w-full max-w-lg mx-auto pt-6 pb-12">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/dashboard" className="text-green-700 hover:text-green-900 transition">
            ←
          </a>
          <ViolaLogo size="sm" />
          <h1 className="text-lg font-bold text-green-800">相談窓口</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <p className="text-sm text-slate-500 mb-6">
            各種サービスに関するご相談・お問い合わせをお受けしています。
            <br />
            必要事項をご入力のうえ送信してください。
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* お名前 */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                           placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition"
                placeholder="山田 太郎"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                電話番号
              </label>
              <input
                type="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                           placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition"
                placeholder="090-1234-5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                メールアドレス <span className="text-red-500">*</span>
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

            {/* カテゴリ */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                相談カテゴリ
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition bg-white"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">選択してください（任意）</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 相談内容 */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                相談内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={6}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                           placeholder:text-slate-400 resize-none
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition"
                placeholder="ご相談内容を詳しくご記入ください"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <p className="text-right text-xs text-slate-400 mt-1">
                {form.content.length} 文字
              </p>
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
              {loading ? "送信中..." : "送信する"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
