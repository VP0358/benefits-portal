"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";

const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

interface UserInfo {
  name: string;
  memberCode: string;
  email: string;
  phone: string;
}

const PAYMENT_OPTIONS = ["現金", "ローン", "どちらでも"];
const DRIVE_OPTIONS   = ["二駆", "四駆", "どちらでも"];
const STUDLESS_OPTIONS = ["あり（希望）", "なし（不要）", "在庫があれば欲しい"];

interface FormState {
  memberId:     string;
  name:         string;
  phone:        string;
  email:        string;
  carType:      string;   // 希望車種
  grade:        string;   // 希望グレード
  year:         string;   // 希望年式
  mileage:      string;   // 希望距離数
  colors:       string;   // 希望色（3色程）
  budget:       string;   // 予算
  payment:      string;   // 現金orローン
  drive:        string;   // 駆動式
  studless:     string;   // スタッドレス
  note:         string;   // その他ご要望
}

export default function UsedCarsPage() {
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");
  const [userInfo,  setUserInfo]  = useState<UserInfo | null>(null);

  const [form, setForm] = useState<FormState>({
    memberId: "",
    name:     "",
    phone:    "",
    email:    "",
    carType:  "",
    grade:    "",
    year:     "",
    mileage:  "",
    colors:   "",
    budget:   "",
    payment:  "",
    drive:    "",
    studless: "",
    note:     "",
  });

  // ログインユーザー情報を自動入力
  useEffect(() => {
    fetch("/api/my/profile")
      .then(r => r.json())
      .then((d) => {
        if (d && d.name) {
          setUserInfo(d);
          setForm(prev => ({
            ...prev,
            memberId: d.memberCode ?? "",
            name:     d.name      ?? "",
            phone:    d.phone     ?? "",
            email:    d.email     ?? "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  const set = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // 必須チェック
  const REQUIRED: (keyof FormState)[] = [
    "name", "phone", "email",
    "carType", "grade", "year", "mileage", "colors", "budget", "payment",
  ];
  const isValid = REQUIRED.every(k => form[k].trim() !== "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError("");

    // メールアドレス形式チェック
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("正しいメールアドレスを入力してください。");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/used-cars", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信失敗");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "送信に失敗しました。しばらく経ってからもう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }

  // ── 送信完了画面 ──────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: PAGE_BG }}>
        <div className="w-full max-w-md">
          <div className="rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
              border: `1px solid rgba(52,211,153,0.35)`,
              boxShadow: "0 20px 60px rgba(10,22,40,0.30)"
            }}>
            <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,0.9) 50%,transparent)" }}/>
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl"
                style={{ background: "linear-gradient(135deg,rgba(52,211,153,0.20),rgba(16,185,129,0.15))", border: "2px solid rgba(52,211,153,0.35)" }}>
                🚗
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#34d399" }}>
                お申し込みを受け付けました
              </h2>
              <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8 }}>
                中古車購入のお申し込みありがとうございます。<br />
                担当者より <strong style={{ color: "#34d399" }}>{form.email}</strong> 宛に<br />
                ご連絡いたします。
              </p>
              <p className="text-xs mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                確認メールを送信しました。届かない場合は<br />
                迷惑メールフォルダをご確認ください。
              </p>
              <Link href="/dashboard"
                className="inline-block rounded-2xl px-8 py-3 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
                マイページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── スタイル定数 ──────────────────────────────────
  const inputClass =
    "w-full px-4 py-3 text-sm font-medium focus:outline-none transition placeholder-gray-400 " +
    "bg-white rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
  const labelClass = "block text-xs font-bold mb-1.5";
  const requiredBadge = <span className="text-red-500 ml-0.5">*</span>;

  const RadioGroup = ({
    label, name, options, value, onChange, required = false,
  }: {
    label: string; name: string; options: string[];
    value: string; onChange: (v: string) => void; required?: boolean;
  }) => (
    <div>
      <label className={labelClass} style={{ color: `${NAVY}80` }}>
        {label}{required && requiredBadge}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition border"
            style={
              value === opt
                ? { background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "white", border: "transparent" }
                : { background: "white", color: `${NAVY}90`, borderColor: "#e5e7eb" }
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20" style={{ background: PAGE_BG }}>
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-[0.10]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle,${NAVY}33,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-30"
        style={{
          background: "rgba(245,240,232,0.96)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`,
          boxShadow: "0 2px 16px rgba(10,22,40,0.08)",
        }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xl">🚗</span>
            <div>
              <h1 className="font-semibold text-sm leading-none" style={{ color: NAVY }}>中古車購入申込</h1>
              <p className="text-[10px] mt-0.5" style={{ color: `${NAVY}55` }}>Used Car Application</p>
            </div>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,rgba(201,168,76,0.35),transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4 relative">

        {/* ヒーローカード */}
        <div className="rounded-3xl overflow-hidden relative"
          style={{
            background: `linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`,
            border: `1px solid ${GOLD}35`,
            boxShadow: `0 16px 48px rgba(10,22,40,0.30)`,
          }}>
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
          <div className="px-5 pt-5 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,rgba(253,186,116,0.20),rgba(212,112,58,0.15))",
                  border: `2px solid rgba(253,186,116,0.30)`,
                }}>
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] tracking-[0.20em] mb-0.5 uppercase" style={{ color: `${GOLD}80` }}>USED CAR SALES</p>
                <h2 className="text-white text-lg font-semibold leading-tight">中古車購入申込フォーム</h2>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
                  下記内容をご記入の上、送信してください。<br />
                  確認後、担当より記載メールアドレスへご連絡いたします。
                </p>
              </div>
            </div>
            {/* 特徴バッジ */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["💰 お得な価格", "🔍 豊富な在庫", "🛡️ 安心サポート", "🚚 全国対応"].map(item => (
                <span key={item} className="text-[10px] px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}30,transparent)` }}/>
        </div>

        {/* フォームカード */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: LINEN,
            border: `1px solid rgba(201,168,76,0.22)`,
            boxShadow: "0 4px 20px rgba(10,22,40,0.08)",
          }}>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}50,${GOLD}70,${GOLD}50,transparent)` }}/>

          {/* カードヘッダー */}
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${GOLD}18` }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
              📋
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: NAVY }}>お申し込みフォーム</p>
              <p className="text-[10px]" style={{ color: `${NAVY}55` }}>
                <span className="text-red-500">*</span> は必須項目です
              </p>
            </div>
          </div>

          {/* ログイン自動入力バナー */}
          {userInfo && (
            <div className="mx-4 mt-3 rounded-xl px-3 py-2 text-xs flex items-center gap-1.5"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD_DARK }}>
              ✓ ログイン情報から一部自動入力されました
            </div>
          )}

          <form onSubmit={onSubmit} className="px-4 pt-4 pb-5 space-y-5">

            {/* ══ セクション①：お客様情報 ══ */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
              <div className="px-3 py-2 text-xs font-bold" style={{ background: `${GOLD}15`, color: GOLD_DARK }}>
                👤 お客様情報
              </div>
              <div className="p-3 space-y-3 bg-white/60">

                {/* お名前 */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    お名前{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="山田 太郎"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                  />
                </div>

                {/* 電話番号 */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    電話番号{requiredBadge}
                  </label>
                  <input
                    type="tel" required autoComplete="tel"
                    className={inputClass}
                    placeholder="090-1234-5678"
                    value={form.phone}
                    onChange={e => set("phone", e.target.value)}
                  />
                </div>

                {/* メールアドレス */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    メールアドレス{requiredBadge}
                  </label>
                  <input
                    type="email" required autoComplete="email"
                    className={inputClass}
                    placeholder="example@mail.com"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                  />
                  <p className="text-[10px] mt-1" style={{ color: `${NAVY}45` }}>
                    ※ ご入力のアドレスへ確認メールをお送りします
                  </p>
                </div>

              </div>
            </div>

            {/* ══ セクション②：ご希望条件 ══ */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
              <div className="px-3 py-2 text-xs font-bold" style={{ background: `${GOLD}15`, color: GOLD_DARK }}>
                🚘 ご希望条件
              </div>
              <div className="p-3 space-y-3 bg-white/60">

                {/* 希望車種 */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    希望車種{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="例: トヨタ プリウス"
                    value={form.carType}
                    onChange={e => set("carType", e.target.value)}
                  />
                </div>

                {/* 希望グレード */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    希望グレード{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="例: S・G・Z など（不問の場合は「不問」と入力）"
                    value={form.grade}
                    onChange={e => set("grade", e.target.value)}
                  />
                </div>

                {/* 希望年式 */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    希望年式{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="例: 2020年以降 / 2018〜2022年"
                    value={form.year}
                    onChange={e => set("year", e.target.value)}
                  />
                </div>

                {/* 希望距離数 */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    希望距離数{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="例: 3万km以下 / 5万km以内"
                    value={form.mileage}
                    onChange={e => set("mileage", e.target.value)}
                  />
                </div>

                {/* 希望色（3色程） */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    希望色（3色程）{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="例: ホワイト・シルバー・ブラック"
                    value={form.colors}
                    onChange={e => set("colors", e.target.value)}
                  />
                  <p className="text-[10px] mt-1" style={{ color: `${NAVY}45` }}>
                    ※ 優先順に3色程ご記入ください
                  </p>
                </div>

              </div>
            </div>

            {/* ══ セクション③：ご予算・支払い ══ */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
              <div className="px-3 py-2 text-xs font-bold" style={{ background: `${GOLD}15`, color: GOLD_DARK }}>
                💴 ご予算・お支払い
              </div>
              <div className="p-3 space-y-3 bg-white/60">

                {/* 予算 */}
                <div>
                  <label className={labelClass} style={{ color: `${NAVY}80` }}>
                    予算{requiredBadge}
                  </label>
                  <input
                    type="text" required
                    className={inputClass}
                    placeholder="例: 150万円以内 / 200〜250万円"
                    value={form.budget}
                    onChange={e => set("budget", e.target.value)}
                  />
                </div>

                {/* 現金orローン */}
                <RadioGroup
                  label="現金 or ローン"
                  name="payment"
                  options={PAYMENT_OPTIONS}
                  value={form.payment}
                  onChange={v => set("payment", v)}
                  required
                />
                {form.payment === "" && (
                  <p className="text-[10px]" style={{ color: "rgba(239,68,68,0.8)" }}>※ いずれかを選択してください</p>
                )}

              </div>
            </div>

            {/* ══ セクション④：オプション条件 ══ */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid rgba(148,163,184,0.25)` }}>
              <div className="px-3 py-2 text-xs font-bold" style={{ background: "rgba(148,163,184,0.08)", color: `${NAVY}70` }}>
                ⚙️ オプション条件（任意）
              </div>
              <div className="p-3 space-y-3 bg-white/40">

                {/* 駆動式 */}
                <RadioGroup
                  label="駆動式"
                  name="drive"
                  options={DRIVE_OPTIONS}
                  value={form.drive}
                  onChange={v => set("drive", v)}
                />

                {/* スタッドレス */}
                <div>
                  <RadioGroup
                    label="スタッドレスタイヤ"
                    name="studless"
                    options={STUDLESS_OPTIONS}
                    value={form.studless}
                    onChange={v => set("studless", v)}
                  />
                  <p className="text-[10px] mt-1.5" style={{ color: `${NAVY}45` }}>
                    ※ 在庫があればお付けします
                  </p>
                </div>

              </div>
            </div>

            {/* ══ セクション⑤：その他ご要望 ══ */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                その他ご要望・ご質問（任意）
              </label>
              <textarea
                rows={4}
                className={inputClass + " resize-none"}
                placeholder="その他ご要望・ご質問がありましたら自由にご記入ください"
                value={form.note}
                onChange={e => set("note", e.target.value)}
              />
            </div>

            {/* 注意書き */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
              <p className="text-xs leading-relaxed" style={{ color: GOLD_DARK }}>
                ⚠️ ご記入いただいた情報は中古車販売のご相談にのみ使用いたします。<br />
                担当者より確認後、記載のメールアドレスへご連絡いたします。
              </p>
            </div>

            {/* エラー */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#ef4444" }}>
                {error}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full rounded-2xl py-4 text-base font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isValid
                  ? `linear-gradient(135deg,${GOLD},${ORANGE})`
                  : "linear-gradient(135deg,#ccc,#aaa)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  送信中...
                </span>
              ) : "🚗 申し込む"}
            </button>

            {!isValid && (
              <p className="text-center text-xs" style={{ color: `${NAVY}50` }}>
                ※ 必須項目（<span className="text-red-400">*</span>）をすべてご入力ください
              </p>
            )}

          </form>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: `${NAVY}45` }}>
          通常2〜3営業日以内にご連絡いたします
        </p>
      </main>
    </div>
  );
}
