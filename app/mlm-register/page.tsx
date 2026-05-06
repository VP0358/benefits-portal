"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import ViolaLogo from "@/app/components/viola-logo";

type Referrer = { id: string; name: string; memberCode: string } | null;

// ── 料金定数
const REG_FEE        = 3_000;
const PRODUCT_FEE    = 15_000;
const SHIPPING_FEE   = 800;
const SUBTOTAL       = REG_FEE + PRODUCT_FEE + SHIPPING_FEE;   // 18,800
const TAX            = Math.floor(SUBTOTAL * 0.1);              // 1,880
const TOTAL          = SUBTOTAL + TAX;                          // 20,680
const AUTO_SUB       = PRODUCT_FEE + SHIPPING_FEE;             // 15,800
const AUTO_TAX       = Math.floor(AUTO_SUB * 0.1);             // 1,580
const AUTO_TOTAL     = AUTO_SUB + AUTO_TAX;                     // 17,380

const TRANSFER_BANK    = "GMOあおぞらネット銀行";
const TRANSFER_BRANCH  = "法人第二営業部";
const TRANSFER_TYPE    = "普通";
const TRANSFER_NUMBER  = "1953440";
const TRANSFER_HOLDER  = "CLAIRホールディングス株式会社";

// 共通inputクラス
const INPUT = "w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300";
const LABEL = "mb-1 block text-sm font-medium text-slate-700";
const REQ   = <span className="text-red-500"> *</span>;

function MlmRegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refCode      = searchParams.get("ref") ?? "";

  const [referrer,    setReferrer]    = useState<Referrer>(null);
  const [refLoading,  setRefLoading]  = useState(false);
  const [diffDelivery, setDiffDelivery] = useState(false);   // 配送先チェック
  const [payMethod,   setPayMethod]   = useState<"transfer" | "card">("transfer");

  const [form, setForm] = useState({
    // 基本情報
    name:            "",
    nameKana:        "",
    corporateName:   "",      // 法人名（任意）
    corporateKana:   "",      // 法人名カナ（任意）
    nickname:        "",
    birthDate:       "",
    gender:          "",
    phone:           "",
    email:           "",
    postalCode:      "",
    address:         "",
    // アカウント
    password:        "",
    passwordConfirm: "",
    // 概要書面
    disclosureDocNumber: "",
    // 配送先
    deliveryName:        "",
    deliveryPostalCode:  "",
    deliveryAddress:     "",
    // 銀行
    bankCode:            "",
    bankName:            "",
    bankBranchCode:      "",
    bankBranch:          "",
    bankAccountType:     "普通",
    bankAccountNumber:   "",
    bankAccountHolder:   "",
    // オートシップ
    autoship:            false,
    // カード
    cardNumber:          "",
    cardExpiry:          "",
    cardCvc:             "",
    cardHolder:          "",
    // 同意
    agreedToTerms:       false,
  });

  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);
  const [issuedId, setIssuedId] = useState("");
  const [countdown, setCountdown] = useState(5);

  // ── 紹介者取得
  useEffect(() => {
    if (!refCode) return;
    setRefLoading(true);
    fetch(`/api/mlm-register?ref=${encodeURIComponent(refCode)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setReferrer(d?.id ? d : null); setRefLoading(false); })
      .catch(() => setRefLoading(false));
  }, [refCode]);

  // ── 郵便番号補完（登録住所）
  async function handlePostalCode(code: string) {
    setForm(f => ({ ...f, postalCode: code }));
    if (code.replace(/-/g, "").length === 7) {
      try {
        const res  = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code.replace(/-/g, "")}`);
        const data = await res.json();
        if (data.results?.[0]) {
          const r = data.results[0];
          setForm(f => ({ ...f, address: r.address1 + r.address2 + r.address3 }));
        }
      } catch { /* ignore */ }
    }
  }

  // ── 郵便番号補完（配送先）
  async function handleDeliveryPostalCode(code: string) {
    setForm(f => ({ ...f, deliveryPostalCode: code }));
    if (code.replace(/-/g, "").length === 7) {
      try {
        const res  = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code.replace(/-/g, "")}`);
        const data = await res.json();
        if (data.results?.[0]) {
          const r = data.results[0];
          setForm(f => ({ ...f, deliveryAddress: r.address1 + r.address2 + r.address3 }));
        }
      } catch { /* ignore */ }
    }
  }

  // ── 送信
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.passwordConfirm) { setError("パスワードが一致しません。"); return; }
    if (form.password.length < 8)               { setError("パスワードは8文字以上で入力してください。"); return; }
    if (!form.agreedToTerms)                    { setError("特定商取引法に基づく表記および規約への同意が必要です。"); return; }

    setSaving(true);
    const body: Record<string, unknown> = {
      name:               form.name,
      nameKana:           form.nameKana,
      corporateName:      form.corporateName  || undefined,
      corporateKana:      form.corporateKana  || undefined,
      nickname:           form.nickname       || undefined,
      birthDate:          form.birthDate,
      gender:             form.gender,
      email:              form.email,
      password:           form.password,
      phone:              form.phone,
      postalCode:         form.postalCode,
      address:            form.address,
      disclosureDocNumber: form.disclosureDocNumber,
      bankCode:           form.bankCode        || undefined,
      bankName:           form.bankName,
      bankBranchCode:     form.bankBranchCode  || undefined,
      bankBranch:         form.bankBranch,
      bankAccountType:    form.bankAccountType,
      bankAccountNumber:  form.bankAccountNumber,
      bankAccountHolder:  form.bankAccountHolder,
      autoshipEnabled:    form.autoship,
      paymentMethod:      payMethod === "card" ? "CREDIT_CARD" : "BANK_TRANSFER",
      referralCode:       refCode || undefined,
      ...(diffDelivery && {
        deliveryName:        form.deliveryName,
        deliveryPostalCode:  form.deliveryPostalCode,
        deliveryAddress:     form.deliveryAddress,
      }),
    };

    const res = await fetch("/api/mlm-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "登録に失敗しました。もう一度お試しください。");
      return;
    }
    const data = await res.json().catch(() => null);
    setIssuedId(data?.memberCode ?? "");
    setDone(true);
  }

  // ── 完了後カウントダウン
  useEffect(() => {
    if (!done) return;
    const tick = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { clearInterval(tick); router.push("/login"); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [done, router]);

  // ── 登録完了画面
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm text-center space-y-5">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-800">MLMビジネス会員登録完了！</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            ご登録ありがとうございます。<br />
            以下の情報でログインしてください。
          </p>
          {issuedId && (
            <div className="rounded-2xl bg-slate-900 p-5 text-left space-y-2">
              <p className="text-xs text-slate-400">発行された会員ID</p>
              <p className="text-2xl font-bold tracking-widest" style={{ color: "#c9a84c" }}>{issuedId}</p>
              <p className="text-xs text-slate-400 mt-1">※ このIDとパスワードでログインできます。必ずメモしてください。</p>
            </div>
          )}
          {referrer && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
              <span className="font-semibold">{referrer.name}</span> さんの紹介で登録されました。
            </div>
          )}
          <p className="text-sm text-slate-400">{countdown} 秒後に自動でログインページへ移動します...</p>
          <button onClick={() => router.push("/login")}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
            今すぐログインする →
          </button>
        </div>
      </div>
    );
  }

  // ── メインフォーム
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="mx-auto max-w-xl space-y-5">

        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex justify-center mb-3"><ViolaLogo size="lg" /></div>
          <div className="text-xl font-bold text-slate-800">MLMビジネス会員 新規登録</div>
          <div className="mt-1 text-sm text-slate-500">CLAIRホールディングス株式会社</div>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed px-2">
            ※ 法人名・法人名（カナ）以外はすべて必須項目です
          </p>
        </div>

        {/* MLM注意書き */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">⚠️ MLM（連鎖販売取引）に関するご案内</p>
          本登録はMLM（連鎖販売取引）のビジネス会員登録です。特定商取引法第33条以降の規制が適用されます。
          紹介者から概要書面を受け取り、内容を十分にご確認の上でご登録ください。
          クーリング・オフ（20日間）が適用されます。
        </div>

        <form onSubmit={onSubmit} className="space-y-5">

          {/* ━━━ 基本情報 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">📋 基本情報</h2>

            {/* 氏名・フリガナ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>氏名{REQ}</label>
                <input required placeholder="例: 山田 太郎" className={INPUT}
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>フリガナ{REQ}</label>
                <input required placeholder="例: ヤマダ タロウ" className={INPUT}
                  value={form.nameKana} onChange={e => setForm({ ...form, nameKana: e.target.value })} />
              </div>
            </div>

            {/* 法人名・法人名カナ（任意） */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>法人名 <span className="text-xs text-slate-400">（任意）</span></label>
                <input placeholder="例: 株式会社〇〇" className={INPUT}
                  value={form.corporateName} onChange={e => setForm({ ...form, corporateName: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>法人名（カナ） <span className="text-xs text-slate-400">（任意）</span></label>
                <input placeholder="例: カブシキガイシャ〇〇" className={INPUT}
                  value={form.corporateKana} onChange={e => setForm({ ...form, corporateKana: e.target.value })} />
              </div>
            </div>

            {/* ニックネーム・生年月日 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>ニックネーム{REQ}</label>
                <input required placeholder="例: タロウ" className={INPUT}
                  value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>生年月日{REQ}</label>
                <input required type="date" className={INPUT}
                  value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
              </div>
            </div>

            {/* 性別 */}
            <div>
              <label className={LABEL}>性別{REQ}</label>
              <div className="flex gap-4 mt-1">
                {(["男性", "女性", "その他"] as const).map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input type="radio" name="gender" required value={g}
                      checked={form.gender === g}
                      onChange={() => setForm({ ...form, gender: g })}
                      className="h-4 w-4 accent-emerald-600" />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* 電話番号 */}
            <div>
              <label className={LABEL}>電話番号{REQ}</label>
              <input required type="tel" placeholder="例: 090-1234-5678" className={INPUT}
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>

            {/* メールアドレス */}
            <div>
              <label className={LABEL}>メールアドレス{REQ}</label>
              <input required type="email" placeholder="例: yamada@example.com" className={INPUT}
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            {/* 郵便番号・住所 */}
            <div>
              <label className={LABEL}>郵便番号{REQ}</label>
              <input required placeholder="例: 123-4567" maxLength={8} className={INPUT}
                value={form.postalCode} onChange={e => handlePostalCode(e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">7桁入力で住所を自動入力します</p>
            </div>
            <div>
              <label className={LABEL}>住所{REQ}</label>
              <input required placeholder="例: 岩手県盛岡市〇〇町1-2-3" className={INPUT}
                value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>

          {/* ━━━ アカウント情報 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">🔐 アカウント情報</h2>
            <div>
              <label className={LABEL}>パスワード{REQ} <span className="text-xs text-slate-400">（8文字以上）</span></label>
              <input required type="password" minLength={8} placeholder="8文字以上" className={INPUT}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>パスワード（確認）{REQ}</label>
              <input required type="password" minLength={8} placeholder="もう一度入力" className={INPUT}
                value={form.passwordConfirm} onChange={e => setForm({ ...form, passwordConfirm: e.target.value })} />
            </div>
          </div>

          {/* ━━━ 紹介者情報 ━━━ */}
          {refCode && (
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b pb-2">🤝 紹介者情報</h2>
              {refLoading ? (
                <p className="text-sm text-slate-500">紹介者情報を確認中...</p>
              ) : referrer ? (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-green-800">✅ 紹介者が確認されました</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">紹介者名</label>
                      <div className="rounded-xl border border-green-200 bg-green-100 px-4 py-3 text-sm font-semibold text-green-900">
                        {referrer.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">会員番号</label>
                      <div className="rounded-xl border border-green-200 bg-green-100 px-4 py-3 text-sm font-semibold text-green-900">
                        {referrer.memberCode}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-green-700">
                    登録後、上記の方があなたの直紹介者として紐づけられます。
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 space-y-1">
                  <p className="text-sm font-semibold text-green-800">🤝 紹介URLから登録します</p>
                  <p className="text-xs text-green-700">登録後、紹介者として自動で紐づけられます。</p>
                </div>
              )}
            </div>
          )}

          {/* ━━━ 概要書面番号 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">📄 概要書面</h2>
            <div>
              <label className={LABEL}>概要書面番号{REQ}</label>
              <input required placeholder="例: CLAIR-2025-001234" className={INPUT}
                value={form.disclosureDocNumber}
                onChange={e => setForm({ ...form, disclosureDocNumber: e.target.value })} />
              <p className="mt-1 text-xs text-slate-400">受け取った概要書面に記載されている番号を入力してください。</p>
            </div>
          </div>

          {/* ━━━ 配送先住所 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">📦 配送先住所</h2>
            <p className="text-xs text-slate-500">基本情報に記載した住所へ配送します。</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                checked={diffDelivery} onChange={e => setDiffDelivery(e.target.checked)} />
              <span className="text-sm text-slate-700">基本情報の住所と異なる配送先を指定する</span>
            </label>

            {diffDelivery && (
              <div className="space-y-4 pt-2 border-t">
                <div>
                  <label className={LABEL}>宛名{REQ}</label>
                  <input required={diffDelivery} placeholder="例: 山田 太郎 または 山田商店" className={INPUT}
                    value={form.deliveryName} onChange={e => setForm({ ...form, deliveryName: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>郵便番号{REQ}</label>
                  <input required={diffDelivery} placeholder="例: 123-4567" maxLength={8} className={INPUT}
                    value={form.deliveryPostalCode} onChange={e => handleDeliveryPostalCode(e.target.value)} />
                  <p className="mt-1 text-xs text-slate-400">7桁入力で住所を自動入力します</p>
                </div>
                <div>
                  <label className={LABEL}>住所{REQ}</label>
                  <input required={diffDelivery} placeholder="例: 岩手県盛岡市〇〇町1-2-3" className={INPUT}
                    value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          {/* ━━━ 銀行口座情報 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">🏦 銀行口座情報（報酬振込先）</h2>
            <p className="text-xs text-slate-500">MLMボーナス・報酬の振込先口座を登録してください。</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>銀行コード{REQ}</label>
                <input required placeholder="例: 0005" maxLength={4} className={INPUT}
                  value={form.bankCode} onChange={e => setForm({ ...form, bankCode: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>銀行名{REQ}</label>
                <input required placeholder="例: 三菱UFJ銀行" className={INPUT}
                  value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>支店コード{REQ}</label>
                <input required placeholder="例: 123" maxLength={3} className={INPUT}
                  value={form.bankBranchCode} onChange={e => setForm({ ...form, bankBranchCode: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>支店名{REQ}</label>
                <input required placeholder="例: 盛岡支店" className={INPUT}
                  value={form.bankBranch} onChange={e => setForm({ ...form, bankBranch: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL}>口座種別{REQ}</label>
                <select required className={INPUT}
                  value={form.bankAccountType} onChange={e => setForm({ ...form, bankAccountType: e.target.value })}>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>口座番号{REQ}</label>
                <input required placeholder="例: 1234567" className={INPUT}
                  value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={LABEL}>口座名義（カナ）{REQ}</label>
              <input required placeholder="例: ヤマダ タロウ" className={INPUT}
                value={form.bankAccountHolder} onChange={e => setForm({ ...form, bankAccountHolder: e.target.value })} />
            </div>
          </div>

          {/* ━━━ オートシップ情報 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">🔄 オートシップ情報</h2>

            {/* 新規登録金額 */}
            <div className="rounded-2xl bg-slate-50 border p-4 space-y-2 text-sm">
              <p className="font-semibold text-slate-700">新規登録費用</p>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between"><span>登録費</span><span>¥{REG_FEE.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>商品代金</span><span>¥{PRODUCT_FEE.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>送料</span><span>¥{SHIPPING_FEE.toLocaleString()}</span></div>
                <div className="flex justify-between text-slate-400 text-xs"><span>小計</span><span>¥{SUBTOTAL.toLocaleString()}</span></div>
                <div className="flex justify-between text-slate-400 text-xs"><span>消費税（10%）</span><span>¥{TAX.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-slate-800 border-t pt-1"><span>合計</span><span>¥{TOTAL.toLocaleString()}</span></div>
              </div>
            </div>

            {/* オートシップ申込 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                checked={form.autoship} onChange={e => setForm({ ...form, autoship: e.target.checked })} />
              <span className="text-sm text-slate-700">
                オートシップを申し込む<br />
                <span className="text-xs text-slate-400">毎月自動で商品が届きます</span>
              </span>
            </label>

            {form.autoship && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2 text-sm">
                <p className="font-semibold text-emerald-800">オートシップ月額費用</p>
                <div className="space-y-1 text-emerald-700">
                  <div className="flex justify-between"><span>商品代金</span><span>¥{PRODUCT_FEE.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>送料</span><span>¥{SHIPPING_FEE.toLocaleString()}</span></div>
                  <div className="flex justify-between text-emerald-500 text-xs"><span>小計</span><span>¥{AUTO_SUB.toLocaleString()}</span></div>
                  <div className="flex justify-between text-emerald-500 text-xs"><span>消費税（10%）</span><span>¥{AUTO_TAX.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-emerald-900 border-t border-emerald-200 pt-1"><span>月額合計</span><span>¥{AUTO_TOTAL.toLocaleString()}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ━━━ 支払方法 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">💳 支払方法</h2>

            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                onClick={() => setPayMethod("transfer")}
                className={`rounded-2xl border-2 p-4 text-sm font-semibold text-center transition ${payMethod === "transfer" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>
                🏦 銀行振込
              </button>
              <button type="button"
                onClick={() => setPayMethod("card")}
                className={`rounded-2xl border-2 p-4 text-sm font-semibold text-center transition ${payMethod === "card" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>
                💳 カード決済
              </button>
            </div>

            {payMethod === "transfer" && (
              <div className="rounded-2xl bg-slate-50 border p-4 space-y-3 text-sm">
                <p className="font-semibold text-slate-700">振込先情報</p>
                <div className="space-y-2">
                  {[
                    { label: "銀行名",   value: TRANSFER_BANK   },
                    { label: "支店名",   value: TRANSFER_BRANCH },
                    { label: "口座種別", value: TRANSFER_TYPE   },
                    { label: "口座番号", value: TRANSFER_NUMBER },
                    { label: "口座名義", value: TRANSFER_HOLDER },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-20 flex-shrink-0 text-xs text-slate-400">{label}</span>
                      <span className="font-medium text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 border-t pt-2">※ 登録後7営業日以内にお振込みください。</p>
              </div>
            )}

            {payMethod === "card" && (
              <div className="space-y-4">
                <div>
                  <label className={LABEL}>カード番号{REQ}</label>
                  <input required={payMethod === "card"} type="text" inputMode="numeric"
                    placeholder="例: 1234 5678 9012 3456" maxLength={19} className={INPUT}
                    value={form.cardNumber}
                    onChange={e => setForm({ ...form, cardNumber: e.target.value.replace(/[^\d\s]/g, "") })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>有効期限{REQ}</label>
                    <input required={payMethod === "card"} placeholder="MM/YY" maxLength={5} className={INPUT}
                      value={form.cardExpiry}
                      onChange={e => setForm({ ...form, cardExpiry: e.target.value })} />
                  </div>
                  <div>
                    <label className={LABEL}>セキュリティコード{REQ}</label>
                    <input required={payMethod === "card"} type="password" placeholder="CVC" maxLength={4} className={INPUT}
                      value={form.cardCvc}
                      onChange={e => setForm({ ...form, cardCvc: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>カード名義（ローマ字）{REQ}</label>
                  <input required={payMethod === "card"} placeholder="例: TARO YAMADA" className={INPUT}
                    value={form.cardHolder}
                    onChange={e => setForm({ ...form, cardHolder: e.target.value.toUpperCase() })} />
                </div>
              </div>
            )}
          </div>

          {/* ━━━ 特商法・規約同意 ━━━ */}
          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2">✅ 概要書面の確認と同意</h2>
            <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed space-y-2 max-h-44 overflow-y-auto">
              <p className="font-semibold">【特定商取引法に基づく概要書面】</p>
              <p>事業者: CLAIRホールディングス株式会社</p>
              <p>所在地: 〒020-0026 岩手県盛岡市開運橋通5-6 第五菱和ビル5F</p>
              <p>電話番号: 019-681-3667 ／ 営業時間: 10:00〜18:00</p>
              <p>本MLMシステムへの参加にあたり、連鎖販売取引（特定商取引法第33条以降）の規制が適用されます。
              登録後20日以内はクーリング・オフが可能です。概要書面の内容を十分にご理解いただいた上でご登録ください。</p>
              <p>商品: VIOLA-Pure シリーズ ／ 月額費用: ¥{AUTO_TOTAL.toLocaleString()}（税込）</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                checked={form.agreedToTerms}
                onChange={e => setForm({ ...form, agreedToTerms: e.target.checked })} />
              <span className="text-sm text-slate-700">
                特定商取引法に基づく概要書面の内容を確認し、<br />
                <span className="font-semibold text-slate-900">MLMビジネス会員規約に同意して会員登録します</span>
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
            className="w-full rounded-2xl bg-emerald-700 py-4 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50">
            {saving ? "登録中..." : "会員登録する →"}
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
