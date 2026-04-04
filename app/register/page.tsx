"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import ViolaLogo from "@/app/components/viola-logo";

type Referrer = { id: string; name: string; memberCode: string } | null;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [referrer, setReferrer] = useState<Referrer>(null);
  const [refLoading, setRefLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nameKana: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    postalCode: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // 紹介コードから紹介者情報を取得
  useEffect(() => {
    if (!refCode) return;
    setRefLoading(true);
    fetch(`/api/register?ref=${encodeURIComponent(refCode)}`)
      .then(r => r.json())
      .then(d => {
        // APIは { id, name, memberCode } を直接返す
        setReferrer(d?.id ? d : (d.referrer ?? null));
        setRefLoading(false);
      })
      .catch(() => setRefLoading(false));
  }, [refCode]);

  // 郵便番号から住所自動補完
  async function handlePostalCode(code: string) {
    setForm(f => ({ ...f, postalCode: code }));
    if (code.replace(/-/g, "").length === 7) {
      try {
        const clean = code.replace(/-/g, "");
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${clean}`);
        const data = await res.json();
        if (data.results?.[0]) {
          const r = data.results[0];
          setForm(f => ({ ...f, address: r.address1 + r.address2 + r.address3 }));
        }
      } catch { /* 無視 */ }
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }
    if (form.password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        nameKana: form.nameKana,
        email: form.email,
        password: form.password,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address,
        referralCode: refCode || undefined,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "登録に失敗しました。もう一度お試しください。");
      return;
    }

    setDone(true);
  }

  // 登録完了後の自動リダイレクト（3秒カウントダウン）
  useEffect(() => {
    if (!done) return;
    setCountdown(3);
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [done, router]);

  // 登録完了画面
  if (done) {
    return (
      <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm text-center space-y-5">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-800">登録完了！</h1>
          <p className="text-slate-600 text-sm">
            ご登録ありがとうございます。<br />
            登録いただいたメールアドレスとパスワードでログインできます。
          </p>
          {referrer && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
              <span className="font-semibold">{referrer.name}</span> さんの紹介で登録されました。
            </div>
          )}
          <p className="text-sm text-slate-400">
            {countdown} 秒後に自動でログインページへ移動します...
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            今すぐログインする →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-8 px-4">
      <div className="mx-auto max-w-md space-y-5">

        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <ViolaLogo size="lg" />
          </div>
          <div className="text-xl font-bold text-slate-800">会員登録</div>
          <div className="mt-1 text-sm text-slate-500">福利厚生ポータル</div>
        </div>

        {/* 紹介者バナー */}
        {refLoading && (
          <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400">
            紹介者情報を確認中...
          </div>
        )}
        {!refLoading && referrer && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
            <div className="font-semibold text-emerald-800">🎁 紹介からの登録</div>
            <div className="mt-1 text-emerald-700">
              <span className="font-bold">{referrer.name}</span> さんに紹介されました。
              登録後、紹介者として自動で紐づけされます。
            </div>
          </div>
        )}
        {!refLoading && refCode && !referrer && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            ⚠️ 紹介コードが無効です。一般登録として進みます。
          </div>
        )}

        {/* 登録フォーム */}
        <form onSubmit={onSubmit} className="rounded-3xl bg-white p-6 shadow-sm space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="例: 山田 太郎"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              フリガナ <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="例: ヤマダ タロウ"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.nameKana}
              onChange={e => setForm({ ...form, nameKana: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="tel"
              placeholder="例: 090-1234-5678"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              郵便番号 <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="例: 123-4567"
              maxLength={8}
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.postalCode}
              onChange={e => handlePostalCode(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">7桁入力で住所を自動入力します</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              住所 <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="例: 東京都渋谷区〇〇町1-2-3"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              placeholder="例: yamada@example.com"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              パスワード <span className="text-red-500">*</span>
              <span className="ml-1 text-xs text-slate-400">（8文字以上）</span>
            </label>
            <input
              required
              type="password"
              minLength={8}
              placeholder="8文字以上"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              パスワード（確認） <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              minLength={8}
              placeholder="もう一度入力"
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.passwordConfirm}
              onChange={e => setForm({ ...form, passwordConfirm: e.target.value })}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? "登録中..." : "会員登録する"}
          </button>

          <p className="text-center text-xs text-slate-400">
            すでにアカウントをお持ちの方は{" "}
            <a href="/login" className="text-slate-600 underline">ログイン</a>
          </p>
        </form>

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
