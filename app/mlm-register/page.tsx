"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import ViolaLogo from "@/app/components/viola-logo";

type Referrer = { id: string; name: string; memberCode: string } | null;

function MlmRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [referrer, setReferrer] = useState<Referrer>(null);
  const [refLoading, setRefLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nameKana: "",
    nickname: "",
    birthDate: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    postalCode: "",
    address: "",
    disclosureDocNumber: "",
    bankName: "",
    bankBranch: "",
    bankAccountType: "普通",
    bankAccountNumber: "",
    bankAccountHolder: "",
    deliveryPostalCode: "",
    deliveryAddress: "",
    deliveryName: "",
    agreedToTerms: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // 紹介コードから紹介者情報を取得
  useEffect(() => {
    if (!refCode) return;
    setRefLoading(true);
    fetch(`/api/mlm-register?ref=${encodeURIComponent(refCode)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        // APIが見つけられた場合は表示用にセット
        // 見つからなくても refCode があれば POST 時に紐づけを試みるため null のまま続行
        setReferrer(d?.id ? d : null);
        setRefLoading(false);
      })
      .catch(() => setRefLoading(false));
  }, [refCode]);

  // 郵便番号から住所自動補完（登録住所）
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

  // 郵便番号から住所自動補完（配送先）
  async function handleDeliveryPostalCode(code: string) {
    setForm(f => ({ ...f, deliveryPostalCode: code }));
    if (code.replace(/-/g, "").length === 7) {
      try {
        const clean = code.replace(/-/g, "");
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${clean}`);
        const data = await res.json();
        if (data.results?.[0]) {
          const r = data.results[0];
          setForm(f => ({ ...f, deliveryAddress: r.address1 + r.address2 + r.address3 }));
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
    if (!form.agreedToTerms) {
      setError("特定商取引法に基づく表記および規約への同意が必要です。");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/mlm-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        nameKana: form.nameKana,
        nickname: form.nickname,
        birthDate: form.birthDate,
        email: form.email,
        password: form.password,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address,
        disclosureDocNumber: form.disclosureDocNumber,
        bankName: form.bankName,
        bankBranch: form.bankBranch,
        bankAccountType: form.bankAccountType,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountHolder: form.bankAccountHolder,
        deliveryPostalCode: form.deliveryPostalCode || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        deliveryName: form.deliveryName || undefined,
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

  // 登録完了後の自動リダイレクト
  useEffect(() => {
    if (!done) return;
    setCountdown(5);
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm text-center space-y-5">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-800">MLM会員登録完了！</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            ご登録ありがとうございます。<br />
            登録完了メールをお送りしました。<br />
            発行された <span className="font-semibold text-slate-800">会員ID</span> とパスワードでログインできます。
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="mx-auto max-w-xl space-y-5">

        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <ViolaLogo size="lg" />
          </div>
          <div className="text-xl font-bold text-slate-800">MLMビジネス会員 新規登録</div>
          <div className="mt-1 text-sm text-slate-500">CLAIRホールディングス株式会社</div>
        </div>

        {/* 紹介者バナー */}
        {refLoading && (
          <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400">
            紹介者情報を確認中...
          </div>
        )}
        {!refLoading && referrer && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
            <div className="font-semibold text-emerald-800">🤝 MLM会員からの紹介登録</div>
            <div className="mt-1 text-emerald-700">
              <span className="font-bold">{referrer.name}</span>（会員番号: {referrer.memberCode}）さんに紹介されました。<br />
              登録後、直紹介者として自動で紐づけされます。
            </div>
          </div>
        )}
        {!refLoading && refCode && !referrer && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
            🤝 紹介URLから登録します。登録後に紹介者として自動で紐づけされます。
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">

          {/* ━━━ 基本情報 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">📋 基本情報</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  ニックネーム
                </label>
                <input
                  placeholder="例: タロウ"
                  className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  生年月日 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
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
          </div>

          {/* ━━━ アカウント情報 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">🔐 アカウント情報</h2>

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
          </div>

          {/* ━━━ 概要書面番号 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">📄 概要書面</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                概要書面番号 <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="例: CLAIR-2025-001234"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={form.disclosureDocNumber}
                onChange={e => setForm({ ...form, disclosureDocNumber: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-400">
                受け取った概要書面に記載されている番号を入力してください。
              </p>
            </div>
          </div>

          {/* ━━━ 報酬受取口座 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">🏦 報酬受取り口座情報</h2>
            <p className="text-xs text-slate-500">MLMボーナス・報酬の振込先口座を登録してください。</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  銀行名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="例: ゆうちょ銀行"
                  className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={form.bankName}
                  onChange={e => setForm({ ...form, bankName: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  支店名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="例: 盛岡支店"
                  className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={form.bankBranch}
                  onChange={e => setForm({ ...form, bankBranch: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  口座種別 <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={form.bankAccountType}
                  onChange={e => setForm({ ...form, bankAccountType: e.target.value })}
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  口座番号 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="例: 1234567"
                  className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={form.bankAccountNumber}
                  onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                口座名義（カナ） <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="例: ヤマダ タロウ"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={form.bankAccountHolder}
                onChange={e => setForm({ ...form, bankAccountHolder: e.target.value })}
              />
            </div>
          </div>

          {/* ━━━ 配送先住所（任意） ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">📦 配送先住所（登録住所と異なる場合）</h2>
            <p className="text-xs text-slate-500">商品の配送先が登録住所と異なる場合のみ入力してください。</p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">宛名（法人名など）</label>
              <input
                placeholder="例: 山田商店"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={form.deliveryName}
                onChange={e => setForm({ ...form, deliveryName: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">配送先郵便番号</label>
              <input
                placeholder="例: 123-4567"
                maxLength={8}
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={form.deliveryPostalCode}
                onChange={e => handleDeliveryPostalCode(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">7桁入力で住所を自動入力します</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">配送先住所</label>
              <input
                placeholder="例: 東京都渋谷区〇〇町1-2-3"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={form.deliveryAddress}
                onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              />
            </div>
          </div>

          {/* ━━━ 規約同意 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">✅ 規約・同意</h2>
            <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed space-y-2 max-h-40 overflow-y-auto">
              <p className="font-semibold">【特定商取引法に基づく表記】</p>
              <p>事業者: CLAIRホールディングス株式会社</p>
              <p>所在地: 〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F</p>
              <p>電話番号: 019-681-3667</p>
              <p>営業時間: 10:00〜18:00</p>
              <p>本MLMシステムへの参加にあたり、概要書面の内容を十分にご理解いただき、
              ビジネス会員として活動していただくことになります。
              販売活動は連鎖販売取引に該当します。特定商取引法第33条以降の規定が適用されます。</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={form.agreedToTerms}
                onChange={e => setForm({ ...form, agreedToTerms: e.target.checked })}
              />
              <span className="text-sm text-slate-700">
                特定商取引法に基づく表記および概要書面の内容を確認し、
                <span className="font-semibold text-slate-900">MLMビジネス会員規約に同意します</span>。
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.agreedToTerms}
            className="w-full rounded-2xl bg-emerald-700 py-4 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {saving ? "登録中..." : "MLMビジネス会員として登録する"}
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

export default function MlmRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    }>
      <MlmRegisterForm />
    </Suspense>
  );
}
