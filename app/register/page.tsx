"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import ViolaLogo from "@/app/components/viola-logo";

type Referrer = { id: string; name: string; memberCode: string } | null;

/* ────────────────────────────────────────────────
   共通UIパーツ
──────────────────────────────────────────────── */
function SectionTitle({ title, required }: { title: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {required && (
        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">必須</span>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs font-normal text-slate-400">（任意）</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300";

const selectCls =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300";

/* ────────────────────────────────────────────────
   メインフォーム
──────────────────────────────────────────────── */
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const [referrer, setReferrer] = useState<Referrer>(null);
  const [refLoading, setRefLoading] = useState(false);

  /* ── フォーム状態 ── */
  const [form, setForm] = useState({
    // 基本情報（必須）
    name: "",
    nameKana: "",
    birthDate: "",
    gender: "",
    email: "",
    mobile: "",
    postalCode: "",
    address: "",
    referrerId: "",
    referrerName: "",
    disclosureDocNumber: "",
    // 基本情報（任意）
    companyName: "",
    companyNameKana: "",
    phone: "",
    // 概要書面（必須）
    sameAddress: true,
    deliveryPostalCode: "",
    deliveryAddress: "",
    deliveryName: "",
    // 銀行口座情報
    bankCode: "",
    bankName: "",
    branchCode: "",
    branchName: "",
    accountType: "普通",
    accountNumber: "",
    accountHolder: "",
    // オートシップ情報（表示のみ）
    autoshipEnabled: false,
    // 支払方法
    paymentMethod: "bank_transfer",
    // カード情報
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    cardName: "",
    // パスワード
    password: "",
    passwordConfirm: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [issuedMemberCode, setIssuedMemberCode] = useState("");
  const [countdown, setCountdown] = useState(5);

  // ─── 新規登録金額（固定表示）───
  const REG_FEE        = 3000;   // 登録料
  const REG_PRODUCT    = 15000;  // 翠彩
  const REG_SHIPPING   = 800;    // 送料
  const regSubtotal    = REG_FEE + REG_PRODUCT + REG_SHIPPING; // 18800
  const regTax         = Math.floor(regSubtotal * 0.1);        // 1880
  const regTotal       = regSubtotal + regTax;                 // 20680

  // ─── オートシップ月額金額（固定表示）───
  const AS_PRODUCT     = 15000;  // 翠彩
  const AS_SHIPPING    = 800;    // 送料
  const asSubtotal     = AS_PRODUCT + AS_SHIPPING;             // 15800
  const asTax          = Math.floor(asSubtotal * 0.1);         // 1580
  const asTotal        = asSubtotal + asTax;                   // 17380

  /* ── 紹介コードから紹介者情報を取得 ── */
  useEffect(() => {
    if (!refCode) return;
    setRefLoading(true);
    fetch(`/api/register?ref=${encodeURIComponent(refCode)}`)
      .then(r => r.json())
      .then(d => {
        const ref = d?.id ? d : (d.referrer ?? null);
        setReferrer(ref);
        if (ref) {
          setForm(f => ({
            ...f,
            referrerId: ref.memberCode ?? "",
            referrerName: ref.name ?? "",
          }));
        }
        setRefLoading(false);
      })
      .catch(() => setRefLoading(false));
  }, [refCode]);

  /* ── 郵便番号から住所自動補完（登録住所） ── */
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

  /* ── 郵便番号から住所自動補完（配送先） ── */
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

  /* ── 送信処理 ── */
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
        birthDate: form.birthDate,
        gender: form.gender,
        email: form.email,
        mobile: form.mobile,
        postalCode: form.postalCode,
        address: form.address,
        referralCode: refCode || undefined,
        referrerId: form.referrerId || undefined,
        disclosureDocNumber: form.disclosureDocNumber || undefined,
        // 任意
        companyName: form.companyName || undefined,
        companyNameKana: form.companyNameKana || undefined,
        phone: form.phone || undefined,
        // 配送先
        deliveryPostalCode: form.sameAddress ? undefined : (form.deliveryPostalCode || undefined),
        deliveryAddress: form.sameAddress ? undefined : (form.deliveryAddress || undefined),
        deliveryName: form.sameAddress ? undefined : (form.deliveryName || undefined),
        // 銀行口座
        bankCode: form.bankCode || undefined,
        bankName: form.bankName || undefined,
        branchCode: form.branchCode || undefined,
        branchName: form.branchName || undefined,
        accountType: form.accountType || undefined,
        accountNumber: form.accountNumber || undefined,
        accountHolder: form.accountHolder || undefined,
        // オートシップ
        autoshipEnabled: form.autoshipEnabled,
        // 支払方法
        paymentMethod: form.paymentMethod,
        password: form.password,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "登録に失敗しました。もう一度お試しください。");
      return;
    }

    const resData = await res.json().catch(() => null);
    setIssuedMemberCode(resData?.memberCode ?? "");
    setDone(true);
  }

  /* ── 登録完了後の自動リダイレクト ── */
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

  /* ── 登録完了画面 ── */
  if (done) {
    return (
      <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm text-center space-y-5">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-800">登録完了！</h1>
          <p className="text-slate-600 text-sm">
            ご登録ありがとうございます。<br />
            以下の <span className="font-semibold text-slate-800">会員ID</span> とパスワードでログインしてください。
          </p>

          {/* 発行された会員ID */}
          {issuedMemberCode && (
            <div className="rounded-2xl bg-slate-900 px-6 py-4 text-center">
              <p className="text-xs text-slate-400 mb-1 tracking-widest">あなたの会員ID</p>
              <p className="text-2xl font-bold text-yellow-400 tracking-widest font-mono">
                {issuedMemberCode}
              </p>
              <p className="text-xs text-slate-400 mt-2">※ログイン時に使用します。メモしておいてください。</p>
            </div>
          )}

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

  /* ── フォーム本体 ── */
  return (
    <div className="min-h-screen bg-[#e6f2dc] py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <ViolaLogo size="lg" />
          </div>
          <div className="text-xl font-bold text-slate-800">新規会員登録</div>
          <div className="mt-1 text-sm text-slate-500">VIOLA-Pure 会員ポータル</div>
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
            </div>
          </div>
        )}
        {!refLoading && refCode && !referrer && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            ⚠️ 紹介コードが無効です。一般登録として進みます。
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">

          {/* ═══════════════════════════════════
              ① 基本情報
          ═══════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <SectionTitle title="基本情報" required />

            {/* 氏名・フリガナ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="氏名" required>
                <input
                  required
                  placeholder="例: 山田 太郎"
                  className={inputCls}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </Field>

              <Field label="フリガナ" required>
                <input
                  required
                  placeholder="例: ヤマダ タロウ"
                  className={inputCls}
                  value={form.nameKana}
                  onChange={e => setForm({ ...form, nameKana: e.target.value })}
                />
              </Field>
            </div>

            {/* 法人名（任意） */}
            <Field label="法人名" optional>
              <input
                placeholder="例: 株式会社〇〇"
                className={inputCls}
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
              />
            </Field>

            <Field label="法人名（カナ）" optional>
              <input
                placeholder="例: カブシキガイシャ〇〇"
                className={inputCls}
                value={form.companyNameKana}
                onChange={e => setForm({ ...form, companyNameKana: e.target.value })}
              />
            </Field>

            {/* 生年月日・性別 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="生年月日" required>
                <input
                  required
                  type="date"
                  className={inputCls}
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                />
              </Field>

              <Field label="性別" required>
                <select
                  required
                  className={selectCls}
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">選択してください</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </Field>
            </div>

            {/* メールアドレス */}
            <Field label="メールアドレス" required>
              <input
                required
                type="email"
                placeholder="例: yamada@example.com"
                className={inputCls}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Field>

            {/* 電話番号（任意） */}
            <Field label="電話番号" optional>
              <input
                type="tel"
                placeholder="例: 03-1234-5678"
                className={inputCls}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </Field>

            {/* 携帯電話 */}
            <Field label="携帯電話" required>
              <input
                required
                type="tel"
                placeholder="例: 090-1234-5678"
                className={inputCls}
                value={form.mobile}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
              />
            </Field>

            {/* 郵便番号・住所 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="郵便番号" required hint="7桁入力で住所を自動入力します">
                <input
                  required
                  placeholder="例: 123-4567"
                  maxLength={8}
                  className={inputCls}
                  value={form.postalCode}
                  onChange={e => handlePostalCode(e.target.value)}
                />
              </Field>
              <div />
            </div>

            <Field label="住所" required>
              <input
                required
                placeholder="例: 東京都渋谷区〇〇町1-2-3"
                className={inputCls}
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </Field>

            {/* 紹介者ID・紹介者名 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="紹介者ID"
                required={!refCode}
                hint={refCode ? undefined : "紹介者の会員IDを入力"}
              >
                {refCode && referrer ? (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      className={`${inputCls} bg-emerald-50 text-emerald-700 cursor-default`}
                      value={form.referrerId}
                    />
                    <span className="text-emerald-500 flex-shrink-0" title="紹介URLから自動設定済み">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                ) : (
                  <input
                    required={!refCode}
                    placeholder="例: A00001"
                    className={inputCls}
                    value={form.referrerId}
                    onChange={e => setForm({ ...form, referrerId: e.target.value })}
                  />
                )}
              </Field>

              <Field label="紹介者名" required={!refCode}>
                {refCode && referrer ? (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      className={`${inputCls} bg-emerald-50 text-emerald-700 cursor-default`}
                      value={form.referrerName}
                    />
                    <span className="text-emerald-500 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                ) : (
                  <input
                    required={!refCode}
                    placeholder="例: 田中 花子"
                    className={inputCls}
                    value={form.referrerName}
                    onChange={e => setForm({ ...form, referrerName: e.target.value })}
                  />
                )}
              </Field>
            </div>

            {/* 紹介URLから来た場合の説明 */}
            {refCode && referrer && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                紹介URLから開いたため、<strong>{referrer.name}</strong> さんが紹介者として自動設定されています。登録後に直紹介者として紐づけられます。
              </div>
            )}

            {/* 概要書面番号 */}
            <Field
              label="概要書面番号"
              required
              hint="9桁の番号を入力してください。他の会員が使用済みの番号は登録できません"
            >
              <input
                required
                placeholder="例: 123456789"
                maxLength={20}
                className={inputCls}
                value={form.disclosureDocNumber}
                onChange={e => setForm({ ...form, disclosureDocNumber: e.target.value })}
              />
            </Field>
          </div>

          {/* ═══════════════════════════════════
              ② 配送先住所（必須）
          ═══════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <SectionTitle title="配送先住所" required />

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              登録住所と配送先住所が同じ場合は、以下のチェックをONにしてください。
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-slate-700 focus:ring-slate-300"
                checked={form.sameAddress}
                onChange={e => setForm({ ...form, sameAddress: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">
                配送先住所は上記の登録住所と同じ
              </span>
            </label>

            {!form.sameAddress && (
              <div className="space-y-4 border-t border-dashed border-slate-200 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="配送先 郵便番号" required hint="7桁入力で住所を自動入力します">
                    <input
                      required={!form.sameAddress}
                      placeholder="例: 123-4567"
                      maxLength={8}
                      className={inputCls}
                      value={form.deliveryPostalCode}
                      onChange={e => handleDeliveryPostalCode(e.target.value)}
                    />
                  </Field>
                  <div />
                </div>

                <Field label="配送先 住所" required>
                  <input
                    required={!form.sameAddress}
                    placeholder="例: 大阪府大阪市〇〇区〇〇町2-3-4"
                    className={inputCls}
                    value={form.deliveryAddress}
                    onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                  />
                </Field>

                <Field label="配送先 宛名" optional hint="法人名など">
                  <input
                    placeholder="例: 株式会社〇〇 担当: 山田"
                    className={inputCls}
                    value={form.deliveryName}
                    onChange={e => setForm({ ...form, deliveryName: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════
              ③ 銀行口座情報
          ═══════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <SectionTitle title="銀行口座情報（報酬振込先）" />
            <p className="text-xs text-slate-500 -mt-2">ボーナス・報酬の振込先口座をご登録ください。</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="銀行コード" optional hint="例: 0310">
                <input
                  placeholder="例: 0310"
                  className={inputCls}
                  value={form.bankCode}
                  onChange={e => setForm({ ...form, bankCode: e.target.value })}
                />
              </Field>

              <Field label="銀行名" optional>
                <input
                  placeholder="例: GMOあおぞらネット銀行"
                  className={inputCls}
                  value={form.bankName}
                  onChange={e => setForm({ ...form, bankName: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="支店コード" optional hint="例: 001">
                <input
                  placeholder="例: 001"
                  className={inputCls}
                  value={form.branchCode}
                  onChange={e => setForm({ ...form, branchCode: e.target.value })}
                />
              </Field>

              <Field label="支店名" optional>
                <input
                  placeholder="例: 法人第二営業部"
                  className={inputCls}
                  value={form.branchName}
                  onChange={e => setForm({ ...form, branchName: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="口座種別" optional>
                <select
                  className={selectCls}
                  value={form.accountType}
                  onChange={e => setForm({ ...form, accountType: e.target.value })}
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </Field>

              <Field label="口座番号" optional>
                <input
                  placeholder="例: 1234567"
                  className={inputCls}
                  value={form.accountNumber}
                  onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                />
              </Field>
            </div>

            <Field label="口座名義（カナ）" optional hint="カタカナでご入力ください">
              <input
                placeholder="例: ヤマダ タロウ"
                className={inputCls}
                value={form.accountHolder}
                onChange={e => setForm({ ...form, accountHolder: e.target.value })}
              />
            </Field>
          </div>

          {/* ═══════════════════════════════════
              ④ オートシップ情報
          ═══════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
            <SectionTitle title="オートシップ情報" />
            <p className="text-xs text-slate-500 -mt-2">毎月自動で商品が届く定期購入サービスです。</p>

            {/* ── 新規登録金額 ── */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                新規登録金額
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 text-slate-600 bg-slate-50 font-medium w-1/2">登録料</td>
                      <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                        {REG_FEE.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 text-slate-600 bg-slate-50 font-medium">翠彩</td>
                      <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                        {REG_PRODUCT.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 text-slate-600 bg-slate-50 font-medium">送料</td>
                      <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                        {REG_SHIPPING.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 text-slate-600 bg-slate-50 font-medium">合計</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 font-semibold">
                        {regSubtotal.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 text-slate-600 bg-slate-50 font-medium">税10%</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 font-semibold">
                        {regTax.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="bg-slate-900">
                      <td className="px-4 py-3 text-white font-bold">合計</td>
                      <td className="px-4 py-3 text-right text-white font-bold text-base">
                        {regTotal.toLocaleString()}円
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── オートシップ申し込みチェックボックス ── */}
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                checked={form.autoshipEnabled}
                onChange={e => setForm({ ...form, autoshipEnabled: e.target.checked })}
              />
              <div>
                <span className="text-sm font-bold text-slate-800">オートシップを申し込む</span>
                <p className="text-xs text-slate-500 mt-0.5">毎月翠彩が自動で届く定期購入プランです。</p>
              </div>
            </label>

            {/* ── オートシップ月額金額（チェック時のみ表示） ── */}
            {form.autoshipEnabled && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5">
                  <span>📦</span> オートシップ月額金額
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-emerald-100">
                      <td className="px-4 py-2.5 text-emerald-800 bg-emerald-50 font-medium w-1/2">翠彩</td>
                      <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                        {AS_PRODUCT.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="border-b border-emerald-100">
                      <td className="px-4 py-2.5 text-emerald-800 bg-emerald-50 font-medium">送料</td>
                      <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">
                        {AS_SHIPPING.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="border-b border-emerald-100">
                      <td className="px-4 py-2.5 text-emerald-800 bg-emerald-50 font-medium">税10%</td>
                      <td className="px-4 py-2.5 text-right text-slate-700 font-semibold">
                        {asTax.toLocaleString()}円
                      </td>
                    </tr>
                    <tr className="bg-emerald-600">
                      <td className="px-4 py-3 text-white font-bold">合計</td>
                      <td className="px-4 py-3 text-right text-white font-bold text-base">
                        {asTotal.toLocaleString()}円
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════
              ⑤ 支払方法
          ═══════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <SectionTitle title="支払方法" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                  form.paymentMethod === "bank_transfer"
                    ? "border-slate-700 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  className="h-4 w-4"
                  checked={form.paymentMethod === "bank_transfer"}
                  onChange={() => setForm({ ...form, paymentMethod: "bank_transfer" })}
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">🏦 銀行振込</div>
                  <div className="text-xs text-slate-500 mt-0.5">振込先口座へお振込みください</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                  form.paymentMethod === "credit_card"
                    ? "border-slate-700 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit_card"
                  className="h-4 w-4"
                  checked={form.paymentMethod === "credit_card"}
                  onChange={() => setForm({ ...form, paymentMethod: "credit_card" })}
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">💳 カード決済</div>
                  <div className="text-xs text-slate-500 mt-0.5">クレジットカードでお支払い</div>
                </div>
              </label>
            </div>

            {/* 銀行振込の場合: 振込先情報 */}
            {form.paymentMethod === "bank_transfer" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm">
                <div className="font-bold text-emerald-800 mb-3">📋 振込先口座情報</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-emerald-700 font-medium">銀行名</span>
                  <span className="text-slate-800">GMOあおぞらネット銀行</span>
                  <span className="text-emerald-700 font-medium">支店名</span>
                  <span className="text-slate-800">法人第二営業部</span>
                  <span className="text-emerald-700 font-medium">口座種別</span>
                  <span className="text-slate-800">普通</span>
                  <span className="text-emerald-700 font-medium">口座番号</span>
                  <span className="text-slate-800 font-bold">1953440</span>
                  <span className="text-emerald-700 font-medium">口座名義</span>
                  <span className="text-slate-800">CLAIRホールディングス株式会社</span>
                </div>
                <div className="mt-3 border-t border-emerald-200 pt-3 space-y-1">
                  <p className="text-xs text-emerald-700">
                    ※ 振込手数料はご負担ください。振込確認後、会員登録が有効になります。
                  </p>
                  <p className="text-xs font-semibold text-emerald-800">
                    ※ 振込後、振込明細書を下記FAX番号へ必ずお送りください。
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 mt-1">
                    <span className="text-emerald-700 font-medium text-sm">📠 FAX番号：</span>
                    <span className="text-emerald-900 font-bold text-sm tracking-widest">050-3385-7788</span>
                  </div>
                </div>
              </div>
            )}

            {/* カード決済の場合: カード情報入力欄 */}
            {form.paymentMethod === "credit_card" && (
              <div className="space-y-4 border-t border-dashed border-slate-200 pt-4">
                <div className="text-sm font-semibold text-slate-700">クレジットカード情報</div>
                <p className="text-xs text-slate-500">
                  ※ カード情報はSSL/TLSにより暗号化されて送信されます。
                </p>

                <Field label="カード番号" required={form.paymentMethod === "credit_card"}>
                  <input
                    required={form.paymentMethod === "credit_card"}
                    type="text"
                    inputMode="numeric"
                    placeholder="例: 1234 5678 9012 3456"
                    maxLength={19}
                    className={inputCls}
                    value={form.cardNumber}
                    onChange={e => {
                      // スペース区切り入力補助
                      const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = v.replace(/(.{4})/g, "$1 ").trim();
                      setForm({ ...form, cardNumber: formatted });
                    }}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="有効期限" required={form.paymentMethod === "credit_card"} hint="MM/YY形式">
                    <input
                      required={form.paymentMethod === "credit_card"}
                      type="text"
                      placeholder="例: 12/28"
                      maxLength={5}
                      className={inputCls}
                      value={form.cardExpiry}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                        setForm({ ...form, cardExpiry: v });
                      }}
                    />
                  </Field>

                  <Field label="セキュリティコード（CVV）" required={form.paymentMethod === "credit_card"}>
                    <input
                      required={form.paymentMethod === "credit_card"}
                      type="text"
                      inputMode="numeric"
                      placeholder="例: 123"
                      maxLength={4}
                      className={inputCls}
                      value={form.cardCvv}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setForm({ ...form, cardCvv: v });
                      }}
                    />
                  </Field>
                </div>

                <Field label="カード名義（ローマ字）" required={form.paymentMethod === "credit_card"} hint="カードに記載の通りにローマ字で入力">
                  <input
                    required={form.paymentMethod === "credit_card"}
                    type="text"
                    placeholder="例: TARO YAMADA"
                    className={inputCls}
                    value={form.cardName}
                    onChange={e => setForm({ ...form, cardName: e.target.value.toUpperCase() })}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════
              ⑥ パスワード設定
          ═══════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <SectionTitle title="パスワード設定" required />

            <Field label="パスワード" required hint="8文字以上で入力してください">
              <input
                required
                type="password"
                minLength={8}
                placeholder="8文字以上"
                className={inputCls}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </Field>

            <Field label="パスワード（確認）" required>
              <input
                required
                type="password"
                minLength={8}
                placeholder="もう一度入力"
                className={inputCls}
                value={form.passwordConfirm}
                onChange={e => setForm({ ...form, passwordConfirm: e.target.value })}
              />
            </Field>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? "登録中..." : "会員登録する →"}
          </button>

          <p className="text-center text-xs text-slate-400 pb-4">
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
