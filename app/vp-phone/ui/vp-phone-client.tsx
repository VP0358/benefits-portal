"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

type ApplicationData = {
  id: string;
  nameKanji: string;
  nameKana: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  lineId: string;
  lineDisplayName: string;
  contractType: string;
  desiredPlan: string;
  referrerCode: string;
  referrerName: string;
  status: string;
  adminNote: string;
  contractedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  pending:    { label: "審査待ち",       cls: "bg-yellow-50 text-yellow-800 border-yellow-300", icon: "⏳" },
  reviewing:  { label: "審査中",         cls: "bg-blue-50 text-blue-800 border-blue-300",       icon: "🔍" },
  contracted: { label: "契約済み",       cls: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "✅" },
  rejected:   { label: "審査不可",       cls: "bg-red-50 text-red-800 border-red-300",          icon: "❌" },
  canceled:   { label: "キャンセル済み", cls: "bg-gray-50 text-gray-700 border-gray-300",        icon: "🚫" },
};

// ── 音声回線プラン（docomo回線） ──────────────────
type VoicePlan = {
  id: string;
  label: string;
  price: number;
  note?: string;
  popular?: boolean;
};
const VOICE_DATA_PLANS: VoicePlan[] = [
  { id: "rakuraku", label: "★定額・らくらくプラン",  price: 5500, note: "25GB＋無制限かけ放題", popular: true },
  { id: "no_data",  label: "データ通信なし",          price: 825 },
  { id: "1gb",      label: "1GB",                      price: 1155 },
  { id: "5gb",      label: "5GB",                      price: 1782 },
  { id: "10gb",     label: "10GB",                     price: 2695 },
  { id: "25gb",     label: "25GB",                     price: 3806 },
];

type KakehoudaiPlan = {
  id: string;
  label: string;
  price: number | null;
};
const KAKEHOUDAI_PLANS: KakehoudaiPlan[] = [
  { id: "none",       label: "かけ放題なし",     price: null },
  { id: "5min",       label: "5分かけ放題",       price: 1100 },
  { id: "10min",      label: "10分かけ放題",      price: 1430 },
  { id: "unlimited",  label: "無制限かけ放題",    price: 2860 },
];

type VoiceOption = {
  id: string;
  label: string;
  price: number;
};
const VOICE_OPTIONS: VoiceOption[] = [
  { id: "rusuban",   label: "留守番電話",  price: 495 },
  { id: "catchhon",  label: "キャッチホン", price: 385 },
];

// ── 大容量データ回線プラン（未来Wi-Fi） ──────────
type DataCapacityPlan = {
  id: string;
  label: string;
  price: number;
};
const DATA_CAPACITY_PLANS: DataCapacityPlan[] = [
  { id: "50gb",      label: "50GB",  price: 2860 },
  { id: "unlimited", label: "無制限", price: 3278 },
];

type DataTypePlan = {
  id: string;
  label: string;
  price: number | null;
  priceType: "monthly" | "onetime" | "none";
  note?: string;
};
const DATA_TYPE_PLANS: DataTypePlan[] = [
  { id: "esim",         label: "eSIM（本体一体型）",         price: null,   priceType: "none" },
  { id: "sim",          label: "SIMカード",                   price: null,   priceType: "none" },
  { id: "pocket_rent",  label: "ポケットWi-Fi（レンタル）",  price: 330,    priceType: "monthly" },
  { id: "home_rent",    label: "置き型Wi-Fi（レンタル）",    price: 550,    priceType: "monthly" },
  { id: "pocket_buy",   label: "ポケットWi-Fi（買取）",      price: 6600,   priceType: "onetime" },
  { id: "home_buy",     label: "置き型Wi-Fi（買取）",        price: 11000,  priceType: "onetime" },
];

function fmt(n: number) { return n.toLocaleString(); }

// ── 月額合計計算 ──────────────────────────────────────────
function calcVoiceTotal(
  dataId: string,
  kakehoudaiId: string,
  opts: string[]
): number {
  const base = VOICE_DATA_PLANS.find(p => p.id === dataId)?.price ?? 0;
  const kake = KAKEHOUDAI_PLANS.find(p => p.id === kakehoudaiId)?.price ?? 0;
  const optTotal = opts.reduce((sum, id) => {
    return sum + (VOICE_OPTIONS.find(o => o.id === id)?.price ?? 0);
  }, 0);
  return base + kake + optTotal;
}

function calcDataMonthly(
  capacityId: string,
  typeId: string
): { base: number; type: number; total: number; typeOnetime: number } {
  const base = DATA_CAPACITY_PLANS.find(p => p.id === capacityId)?.price ?? 0;
  const tp = DATA_TYPE_PLANS.find(p => p.id === typeId);
  const typeMonthly = (tp?.priceType === "monthly" ? tp.price : 0) ?? 0;
  const typeOnetime = (tp?.priceType === "onetime" ? tp.price : 0) ?? 0;
  return { base, type: typeMonthly, total: base + typeMonthly, typeOnetime };
}

export default function VpPhoneClient({
  defaultName,
  defaultNameKana,
  defaultEmail,
  defaultPhone,
  existingApplication,
}: {
  defaultName: string;
  defaultNameKana: string;
  defaultEmail: string;
  defaultPhone: string;
  existingApplication: ApplicationData | null;
}) {
  const [contractType, setContractType] = useState<"voice" | "data" | "">("");

  // 音声回線の選択状態
  const [voiceDataPlan,  setVoiceDataPlan]  = useState("1gb");
  const [kakehoudai,     setKakehoudai]     = useState("none");
  const [voiceOpts,      setVoiceOpts]      = useState<string[]>([]);

  // 大容量データ回線の選択状態
  const [dataCapacity,   setDataCapacity]   = useState("50gb");
  const [dataType,       setDataType]       = useState("sim");

  const [form, setForm] = useState({
    nameKanji:       defaultName,
    nameKana:        defaultNameKana,
    email:           defaultEmail,
    password:        "",
    passwordConfirm: "",
    phone:           defaultPhone,
    birthDate:       "",
    gender:          "male",
    lineId:          "",
    lineDisplayName: "",
    referrerCode:    "",
    referrerName:    "",
    // カード情報
    cardNumber:      "",
    cardExpiry:      "",
    cardCvc:         "",
    cardName:        "",
  });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [submitted, setSubmitted]   = useState(false);
  const [agreed, setAgreed]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCardCvc, setShowCardCvc]   = useState(false);

  const app        = existingApplication;
  const statusInfo = app ? (STATUS_LABEL[app.status] ?? STATUS_LABEL.pending) : null;

  // 月額表示用
  const voiceTotal = calcVoiceTotal(voiceDataPlan, kakehoudai, voiceOpts);
  const dataTotals = calcDataMonthly(dataCapacity, dataType);

  // 送信時のdesiredPlan文字列を組み立て
  function buildDesiredPlan(): string {
    if (contractType === "voice") {
      const data  = VOICE_DATA_PLANS.find(p => p.id === voiceDataPlan);
      const kake  = KAKEHOUDAI_PLANS.find(p => p.id === kakehoudai);
      const opts  = voiceOpts.map(id => VOICE_OPTIONS.find(o => o.id === id)?.label).filter(Boolean).join("・");
      let s = `[音声回線] ${data?.label}（¥${fmt(data?.price ?? 0)}）`;
      if (kake && kake.id !== "none") s += ` ／ ${kake.label}（¥${fmt(kake.price ?? 0)}）`;
      if (opts) s += ` ／ オプション:${opts}`;
      s += ` ／ 月額合計 ¥${fmt(voiceTotal)}`;
      return s;
    }
    if (contractType === "data") {
      const cap  = DATA_CAPACITY_PLANS.find(p => p.id === dataCapacity);
      const tp   = DATA_TYPE_PLANS.find(p => p.id === dataType);
      let s = `[大容量データ回線] ${cap?.label}（¥${fmt(cap?.price ?? 0)}/月）`;
      if (tp) {
        if (tp.priceType === "monthly")  s += ` ／ ${tp.label}（＋¥${fmt(tp.price ?? 0)}/月）`;
        else if (tp.priceType === "onetime") s += ` ／ ${tp.label}（買取¥${fmt(tp.price ?? 0)}）`;
        else s += ` ／ ${tp.label}`;
      }
      s += ` ／ 月額合計 ¥${fmt(dataTotals.total)}`;
      if (dataTotals.typeOnetime > 0) s += `（端末¥${fmt(dataTotals.typeOnetime)} 別途）`;
      return s;
    }
    return "";
  }

  // カード番号フォーマット（4桁ごとにスペース）
  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  // 有効期限フォーマット（MM/YY）
  function formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!contractType) { setError("契約種別を選択してください"); return; }
    if (!agreed) { setError("個人情報の取扱いへの同意が必要です"); return; }
    if (form.password && form.password !== form.passwordConfirm) {
      setError("パスワードが一致しません"); return;
    }
    if (!form.referrerCode || !form.referrerName) {
      setError("紹介者コードと紹介者名は必須項目です"); return;
    }
    if (!form.cardNumber || !form.cardExpiry || !form.cardCvc || !form.cardName) {
      setError("お支払いカード情報をすべてご入力ください"); return;
    }
    setSaving(true); setError("");

    const payload = {
      nameKanji:       form.nameKanji,
      nameKana:        form.nameKana,
      email:           form.email,
      password:        form.password || undefined,
      phone:           form.phone,
      birthDate:       form.birthDate,
      gender:          form.gender,
      lineId:          form.lineId || undefined,
      lineDisplayName: form.lineDisplayName || undefined,
      referrerCode:    form.referrerCode || undefined,
      referrerName:    form.referrerName || undefined,
      contractType,
      desiredPlan:     buildDesiredPlan(),
    };

    const res = await fetch("/api/my/vp-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "申し込みに失敗しました。"); return;
    }
    setSubmitted(true);
  }

  const inp = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";
  const lbl = "block text-xs font-bold text-gray-600 mb-1.5";

  // ── ラジオ選択カード共通 ──────────────────────────────────
  function RadioCard<T extends { id: string; label: string; price: number | null; note?: string; popular?: boolean; priceType?: string }>({
    item, selected, onSelect, color = "green", priceLabel,
  }: {
    item: T;
    selected: boolean;
    onSelect: () => void;
    color?: "green" | "purple";
    priceLabel?: string;
  }) {
    const ring  = color === "green" ? "border-green-500 bg-green-50"  : "border-purple-500 bg-purple-50";
    const dot   = color === "green" ? "bg-green-500"                  : "bg-purple-500";
    const badge = color === "green" ? "bg-green-500 text-white"       : "bg-purple-500 text-white";

    let priceStr = "";
    if (priceLabel) {
      priceStr = priceLabel;
    } else if (item.price != null) {
      if ("priceType" in item) {
        if (item.priceType === "monthly")  priceStr = `+¥${fmt(item.price)}/月`;
        else if (item.priceType === "onetime") priceStr = `買取 ¥${fmt(item.price)}`;
        else priceStr = "";
      } else {
        priceStr = `¥${fmt(item.price)}/月`;
      }
    }

    return (
      <label className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${selected ? ring : "border-gray-200 bg-white hover:border-gray-300"}`}>
        <input type="radio" className="sr-only" checked={selected} onChange={onSelect} />
        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected ? `border-${color === "green" ? "green" : "purple"}-500` : "border-gray-300"}`}>
          {selected && <div className={`w-2 h-2 rounded-full ${dot}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${selected ? (color === "green" ? "text-green-800" : "text-purple-800") : "text-gray-800"}`}>
              {item.label}
            </span>
            {item.popular && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge}`}>人気</span>}
            {item.note && <span className="text-[10px] text-gray-500">{item.note}</span>}
          </div>
          {priceStr && (
            <span className={`text-xs font-bold mt-0.5 block ${selected ? (color === "green" ? "text-green-700" : "text-purple-700") : "text-gray-600"}`}>
              {priceStr}
            </span>
          )}
        </div>
      </label>
    );
  }

  // ── チェックオプション共通 ─────────────────────────────────
  function CheckCard({ item, checked, onChange }: {
    item: VoiceOption; checked: boolean; onChange: (v: boolean) => void;
  }) {
    return (
      <label className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${checked ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
          {checked && <span className="text-white text-[10px] font-bold">✓</span>}
        </div>
        <div className="flex-1">
          <span className={`text-sm font-semibold ${checked ? "text-green-800" : "text-gray-800"}`}>{item.label}</span>
          <span className={`text-xs font-bold ml-2 ${checked ? "text-green-700" : "text-gray-600"}`}>¥{fmt(item.price)}/月</span>
        </div>
      </label>
    );
  }

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-16">

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-gray-500 text-lg hover:text-gray-700">←</Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">📱</span>
          <div>
            <h1 className="font-bold text-green-800 text-sm leading-none">VP未来phone 申し込み</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">VP未来phone申し込みフォーム</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* ── 既存申し込みステータスカード ── */}
        {app && !submitted && (
          <div className={`rounded-2xl border-2 p-5 shadow-sm ${statusInfo?.cls ?? ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{statusInfo?.icon}</span>
              <div>
                <p className="font-bold text-sm">申し込み状況</p>
                <p className="text-xs mt-0.5 font-semibold">{statusInfo?.label}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">申し込み日</span>
                <span className="font-semibold">{new Date(app.createdAt).toLocaleDateString("ja-JP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">お名前</span>
                <span className="font-semibold">{app.nameKanji}</span>
              </div>
              {app.contractType && (
                <div className="flex justify-between">
                  <span className="text-gray-600">契約種別</span>
                  <span className="font-semibold">{app.contractType === "voice" ? "音声回線契約" : "大容量データ回線契約"}</span>
                </div>
              )}
              {app.desiredPlan && (
                <div className="flex flex-col gap-1 pt-1 border-t border-current/20">
                  <span className="text-gray-600">ご希望プラン</span>
                  <span className="font-semibold break-all">{app.desiredPlan}</span>
                </div>
              )}
              {app.contractedAt && (
                <div className="flex justify-between pt-1 border-t border-current/20">
                  <span className="text-gray-600">契約完了日</span>
                  <span className="font-bold text-emerald-700">{new Date(app.contractedAt).toLocaleDateString("ja-JP")}</span>
                </div>
              )}
            </div>
            {app.adminNote && (
              <div className="mt-3 bg-white/60 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-700 mb-1">📝 担当者からのメモ</p>
                <p className="text-xs text-gray-800">{app.adminNote}</p>
              </div>
            )}
            {app.status === "contracted" && (
              <div className="mt-3 bg-emerald-100 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-emerald-800">🎉 VP未来phone の契約が完了しました！</p>
                <p className="text-[10px] text-emerald-700 mt-1">ご契約ありがとうございます。</p>
              </div>
            )}
            {(app.status === "rejected" || app.status === "canceled") && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">再度お申し込みいただけます。</p>
                <button onClick={() => window.location.reload()}
                  className="w-full rounded-xl bg-green-600 text-white py-2.5 text-sm font-bold hover:bg-green-700 transition">
                  再申し込みする
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 申し込み完了 ── */}
        {submitted && (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-6 text-center shadow">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold text-emerald-800 mb-2">申し込みが完了しました！</h2>
            <p className="text-sm text-emerald-700 mb-4">
              VP未来phone 申し込みを受け付けました。<br />
              担当者より順次ご連絡いたします。
            </p>
            <Link href="/dashboard"
              className="inline-block rounded-xl bg-green-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-green-700 transition">
              ホームに戻る
            </Link>
          </div>
        )}

        {/* ── フォーム本体 ── */}
        {(!app || app.status === "rejected" || app.status === "canceled") && !submitted && (
          <>
            {/* 説明カード + リンク */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">📱</div>
                <div>
                  <h2 className="font-bold text-gray-800">VP未来phone 申し込み</h2>
                  <p className="text-xs text-gray-500 mt-0.5">お得なスマートフォン回線サービス</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-700 mb-4">
                <div className="flex items-start gap-2"><span className="text-green-600">✓</span><span>申し込み後、担当者より順次ご連絡いたします</span></div>
                <div className="flex items-start gap-2"><span className="text-green-600">✓</span><span>ご紹介いただいた方に紹介ポイントが付与されます</span></div>
              </div>
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                <Link href="/vp-phone/terms"
                  className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 hover:bg-blue-100 transition">
                  <div className="flex items-center gap-2">
                    <span>📄</span><span className="text-xs font-semibold text-blue-800">利用規約・重要事項説明を確認する</span>
                  </div>
                  <span className="text-blue-500">›</span>
                </Link>
                <Link href="/vp-phone/privacy"
                  className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 hover:bg-green-100 transition">
                  <div className="flex items-center gap-2">
                    <span>🔒</span><span className="text-xs font-semibold text-green-800">個人情報の取扱いについて</span>
                  </div>
                  <span className="text-green-500">›</span>
                </Link>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">

              {/* ────────── ① 申込者情報（最初に表示） ────────── */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">👤 申込者情報</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>お名前（漢字）<span className="text-red-500 ml-1">*</span></label>
                      <input required className={inp} placeholder="山田 太郎"
                        value={form.nameKanji} onChange={e => setForm({ ...form, nameKanji: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl}>お名前（かな）<span className="text-red-500 ml-1">*</span></label>
                      <input required className={inp} placeholder="やまだ たろう"
                        value={form.nameKana} onChange={e => setForm({ ...form, nameKana: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>メールアドレス<span className="text-red-500 ml-1">*</span></label>
                    <input required type="email" className={inp} placeholder="example@email.com"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>パスワード（任意）</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} className={inp}
                        placeholder="VP未来phone申し込み用パスワード（任意）"
                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                        autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                        {showPassword ? "隠す" : "表示"}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2">
                        <label className={lbl}>パスワード（確認）</label>
                        <input type={showPassword ? "text" : "password"} className={inp}
                          placeholder="パスワードをもう一度入力"
                          value={form.passwordConfirm} onChange={e => setForm({ ...form, passwordConfirm: e.target.value })}
                          autoComplete="new-password" />
                        {form.passwordConfirm && form.password !== form.passwordConfirm && (
                          <p className="text-xs text-red-600 mt-1">パスワードが一致しません</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>電話番号<span className="text-red-500 ml-1">*</span></label>
                    <input required type="tel" className={inp} placeholder="090-1234-5678"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>生年月日<span className="text-red-500 ml-1">*</span></label>
                    <input required type="date" className={inp}
                      value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>性別<span className="text-red-500 ml-1">*</span></label>
                    <div className="flex gap-4">
                      {[{ value:"male",label:"男性"},{value:"female",label:"女性"},{value:"other",label:"その他"}].map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input type="radio" name="gender" value={opt.value}
                            checked={form.gender === opt.value}
                            onChange={() => setForm({ ...form, gender: opt.value })}
                            className="w-4 h-4 text-green-600" />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 紹介者情報（必須） */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">👥 紹介者情報<span className="text-red-500 ml-1">*</span></h3>
                <div className="space-y-4">
                  <div>
                    <label className={lbl}>紹介者コード（会員コード）<span className="text-red-500 ml-1">*</span></label>
                    <input required className={inp} placeholder="例: M0001"
                      value={form.referrerCode} onChange={e => setForm({ ...form, referrerCode: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>紹介者名<span className="text-red-500 ml-1">*</span></label>
                    <input required className={inp} placeholder="例: 山田 花子"
                      value={form.referrerName} onChange={e => setForm({ ...form, referrerName: e.target.value })} />
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                    <p className="text-xs font-semibold text-amber-800">⚠️ 紹介者情報は必須項目です</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">紹介者の会員コードとお名前を必ずご入力ください。紹介者に紹介ポイントが付与されます。</p>
                  </div>
                </div>
              </div>

              {/* LINE情報 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">💬 LINE情報（任意）</h3>
                <div className="space-y-4">
                  <div>
                    <label className={lbl}>LINE ID</label>
                    <input className={inp} placeholder="例: yamada_taro"
                      value={form.lineId} onChange={e => setForm({ ...form, lineId: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>LINE表示名</label>
                    <input className={inp} placeholder="例: 山田太郎"
                      value={form.lineDisplayName} onChange={e => setForm({ ...form, lineDisplayName: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ────────── ② 契約種別選択 ────────── */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">📋 契約種別の選択<span className="text-red-500 ml-1">*</span></h3>
                <div className="grid grid-cols-1 gap-3">

                  {/* 音声回線ボタン */}
                  <button type="button"
                    onClick={() => { setContractType("voice"); }}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${contractType === "voice" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${contractType === "voice" ? "bg-green-200" : "bg-gray-100"}`}>📱</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">音声回線契約</p>
                          {contractType === "voice" && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">選択中</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">通話・SMS・データ通信（docomo回線）</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><span className="text-green-600">✓</span> 音声通話・SMS対応</span>
                      <span className="flex items-center gap-1"><span className="text-green-600">✓</span> かけ放題オプション</span>
                      <span className="flex items-center gap-1"><span className="text-green-600">✓</span> 1GB〜25GB選択可</span>
                    </div>
                  </button>

                  {/* 大容量データ回線ボタン */}
                  <button type="button"
                    onClick={() => { setContractType("data"); }}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${contractType === "data" ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${contractType === "data" ? "bg-purple-200" : "bg-gray-100"}`}>📶</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">大容量データ回線契約</p>
                          {contractType === "data" && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">選択中</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">VP未来Wi-Fi（楽天回線）</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><span className="text-purple-600">✓</span> 50GB / 無制限</span>
                      <span className="flex items-center gap-1"><span className="text-purple-600">✓</span> SIM・Wi-Fi選択可</span>
                      <span className="flex items-center gap-1"><span className="text-purple-600">✓</span> eSIM対応</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ────────── ③ 音声回線プラン選択 ────────── */}
              {contractType === "voice" && (
                <>
                  {/* 月額合計バー */}
                  <div className="rounded-2xl bg-green-600 text-white p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold opacity-90">現在の月額合計（税込）</p>
                      <p className="text-2xl font-black mt-0.5">¥{fmt(voiceTotal)}<span className="text-sm font-semibold">/月</span></p>
                    </div>
                    <span className="text-3xl">📱</span>
                  </div>

                  {/* データプラン */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">
                      📡 データプラン（docomo回線）
                    </h3>
                    <p className="text-[10px] text-gray-500 mb-3">※料金は税込月額料金</p>
                    <div className="space-y-2">
                      {VOICE_DATA_PLANS.map(p => (
                        <RadioCard key={p.id} item={p} selected={voiceDataPlan === p.id}
                          onSelect={() => setVoiceDataPlan(p.id)} color="green" />
                      ))}
                    </div>
                  </div>

                  {/* かけ放題 */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-100">📞 かけ放題</h3>
                    <div className="space-y-2">
                      {KAKEHOUDAI_PLANS.map(p => (
                        <RadioCard key={p.id}
                          item={{ ...p, price: p.price }}
                          selected={kakehoudai === p.id}
                          onSelect={() => setKakehoudai(p.id)}
                          color="green"
                          priceLabel={p.price == null ? "無料" : `¥${fmt(p.price)}/月`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* オプション */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-100">⚙️ オプション（複数選択可）</h3>
                    <div className="space-y-2">
                      {VOICE_OPTIONS.map(o => (
                        <CheckCard key={o.id} item={o}
                          checked={voiceOpts.includes(o.id)}
                          onChange={checked => {
                            setVoiceOpts(prev => checked ? [...prev, o.id] : prev.filter(id => id !== o.id));
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 利用規約リンク（音声回線） */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
                    <p className="text-xs font-bold text-gray-600 mb-2">📎 関連規約</p>
                    <Link href="/vp-phone/terms" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline">
                      <span>📄</span> VP未来phone 利用規約
                    </Link>
                    <Link href="/vp-phone/terms" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline">
                      <span>📄</span> 音声通話かけ放題オプション利用規約
                    </Link>
                    <Link href="/vp-phone/terms" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline">
                      <span>📄</span> VP未来phone 重要事項説明書
                    </Link>
                  </div>
                </>
              )}

              {/* ────────── ④ 大容量データ回線プラン選択 ────────── */}
              {contractType === "data" && (
                <>
                  {/* 月額合計バー */}
                  <div className="rounded-2xl p-4 shadow-sm flex items-center justify-between text-white"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                    <div>
                      <p className="text-xs font-semibold opacity-90">現在の月額合計（税込）</p>
                      <p className="text-2xl font-black mt-0.5">¥{fmt(dataTotals.total)}<span className="text-sm font-semibold">/月</span></p>
                      {dataTotals.typeOnetime > 0 && (
                        <p className="text-xs opacity-80 mt-0.5">+ 端末代 ¥{fmt(dataTotals.typeOnetime)}（一括）</p>
                      )}
                    </div>
                    <span className="text-3xl">📶</span>
                  </div>

                  {/* データ容量 */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">
                      🗂️ データ容量（VP未来Wi-Fi）
                    </h3>
                    <p className="text-[10px] text-gray-500 mb-3">※料金は税込月額料金</p>
                    <div className="space-y-2">
                      {DATA_CAPACITY_PLANS.map(p => (
                        <RadioCard key={p.id} item={{ ...p, note: undefined, popular: undefined }}
                          selected={dataCapacity === p.id}
                          onSelect={() => setDataCapacity(p.id)}
                          color="purple" />
                      ))}
                    </div>
                  </div>

                  {/* データ通信タイプ */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-100">📡 データ通信のタイプ</h3>
                    <p className="text-[10px] text-gray-500 mb-3">※SIM・レンタル機器の破損時は¥10,780（税込）を申し受けます</p>
                    <div className="space-y-2">
                      {DATA_TYPE_PLANS.map(p => (
                        <RadioCard key={p.id}
                          item={p}
                          selected={dataType === p.id}
                          onSelect={() => setDataType(p.id)}
                          color="purple"
                          priceLabel={
                            p.priceType === "monthly"  ? `+¥${fmt(p.price ?? 0)}/月` :
                            p.priceType === "onetime"  ? `買取 ¥${fmt(p.price ?? 0)}` :
                            "追加料金なし"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* 利用規約リンク（データ回線） */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
                    <p className="text-xs font-bold text-gray-600 mb-2">📎 関連規約</p>
                    <Link href="/vp-phone/terms" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline">
                      <span>📄</span> VP未来Wi-Fi サービス契約約款
                    </Link>
                    <Link href="/vp-phone/terms" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 underline">
                      <span>📄</span> VP未来Wi-Fi 重要事項説明書
                    </Link>
                  </div>
                </>
              )}

              {/* ────────── ⑤ 合計金額サマリー（同意前） ────────── */}
              {contractType && (
                <>
                  {/* 合計金額まとめカード */}
                  <div className={`rounded-2xl border-2 p-5 shadow-sm ${contractType === "voice" ? "bg-green-50 border-green-300" : "bg-purple-50 border-purple-300"}`}>
                    <h3 className={`font-bold text-sm mb-4 pb-2 border-b ${contractType === "voice" ? "text-green-800 border-green-200" : "text-purple-800 border-purple-200"}`}>
                      💴 お支払い金額のまとめ
                    </h3>
                    {contractType === "voice" ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">データプラン</span>
                          <span className="font-semibold">¥{fmt(VOICE_DATA_PLANS.find(p => p.id === voiceDataPlan)?.price ?? 0)}/月</span>
                        </div>
                        {kakehoudai !== "none" && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">かけ放題</span>
                            <span className="font-semibold">¥{fmt(KAKEHOUDAI_PLANS.find(p => p.id === kakehoudai)?.price ?? 0)}/月</span>
                          </div>
                        )}
                        {voiceOpts.map(id => {
                          const opt = VOICE_OPTIONS.find(o => o.id === id);
                          return opt ? (
                            <div key={id} className="flex justify-between items-center">
                              <span className="text-gray-700">{opt.label}</span>
                              <span className="font-semibold">¥{fmt(opt.price)}/月</span>
                            </div>
                          ) : null;
                        })}
                        <div className={`flex justify-between items-center pt-2 mt-2 border-t border-green-300`}>
                          <span className="font-bold text-green-800">月額合計（税込）</span>
                          <span className="text-xl font-black text-green-700">¥{fmt(voiceTotal)}<span className="text-sm">/月</span></span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">データ容量</span>
                          <span className="font-semibold">¥{fmt(DATA_CAPACITY_PLANS.find(p => p.id === dataCapacity)?.price ?? 0)}/月</span>
                        </div>
                        {(() => {
                          const tp = DATA_TYPE_PLANS.find(p => p.id === dataType);
                          if (!tp) return null;
                          if (tp.priceType === "monthly") return (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">{tp.label}</span>
                              <span className="font-semibold">+¥{fmt(tp.price ?? 0)}/月</span>
                            </div>
                          );
                          if (tp.priceType === "onetime") return (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">{tp.label}</span>
                              <span className="font-semibold text-orange-600">¥{fmt(tp.price ?? 0)}（一括）</span>
                            </div>
                          );
                          return (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">{tp.label}</span>
                              <span className="text-gray-500">追加料金なし</span>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-purple-300">
                          <span className="font-bold text-purple-800">月額合計（税込）</span>
                          <span className="text-xl font-black text-purple-700">¥{fmt(dataTotals.total)}<span className="text-sm">/月</span></span>
                        </div>
                        {dataTotals.typeOnetime > 0 && (
                          <div className="flex justify-between items-center text-xs text-orange-600">
                            <span>端末代（別途一括）</span>
                            <span className="font-bold">¥{fmt(dataTotals.typeOnetime)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`mt-3 pt-2 border-t text-[10px] ${contractType === "voice" ? "border-green-200 text-green-700" : "border-purple-200 text-purple-700"}`}>
                      ※ 表示金額はすべて税込です。申し込み後、担当者よりご確認の連絡をいたします。
                    </div>
                  </div>

                  {/* ────────── ⑥ お支払い情報（カード/デビットのみ） ────────── */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">💳 お支払い情報</h3>
                    <div className="mb-4 mt-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <span>💳</span> お支払い方法：クレジットカード・デビットカードのみ
                      </p>
                      <p className="text-[10px] text-blue-600 mt-1">
                        VISA / Mastercard / JCB / American Express 対応
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={lbl}>カード番号<span className="text-red-500 ml-1">*</span></label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inp}
                          placeholder="1234 5678 9012 3456"
                          value={form.cardNumber}
                          onChange={e => setForm({ ...form, cardNumber: formatCardNumber(e.target.value) })}
                          maxLength={19}
                          autoComplete="cc-number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>有効期限<span className="text-red-500 ml-1">*</span></label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={inp}
                            placeholder="MM/YY"
                            value={form.cardExpiry}
                            onChange={e => setForm({ ...form, cardExpiry: formatExpiry(e.target.value) })}
                            maxLength={5}
                            autoComplete="cc-exp"
                          />
                        </div>
                        <div>
                          <label className={lbl}>セキュリティコード<span className="text-red-500 ml-1">*</span></label>
                          <div className="relative">
                            <input
                              type={showCardCvc ? "text" : "password"}
                              inputMode="numeric"
                              className={inp}
                              placeholder="CVC"
                              value={form.cardCvc}
                              onChange={e => setForm({ ...form, cardCvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                              maxLength={4}
                              autoComplete="cc-csc"
                            />
                            <button type="button" onClick={() => setShowCardCvc(s => !s)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]">
                              {showCardCvc ? "隠す" : "表示"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>カード名義（ローマ字）<span className="text-red-500 ml-1">*</span></label>
                        <input
                          type="text"
                          className={inp}
                          placeholder="TARO YAMADA"
                          value={form.cardName}
                          onChange={e => setForm({ ...form, cardName: e.target.value.toUpperCase() })}
                          autoComplete="cc-name"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3">
                      ※ カード情報は安全に処理されます。担当者がご確認後、正式な決済手続きをご案内いたします。
                    </p>
                  </div>

                  {/* 同意 */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800 text-sm mb-2 pb-2 border-b border-gray-100">✅ 規約への同意</h3>
                    <Link href="/vp-phone/terms"
                      className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">利用規約・重要事項説明</p>
                          <p className="text-[10px] text-gray-500">VP未来phone / VP未来Wi-Fi</p>
                        </div>
                      </div>
                      <span className="text-gray-400">›</span>
                    </Link>
                    <Link href="/vp-phone/privacy"
                      className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
                      <div className="flex items-center gap-2">
                        <span>🔒</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">個人情報の取扱いについて</p>
                          <p className="text-[10px] text-gray-500">プライバシーポリシー</p>
                        </div>
                      </div>
                      <span className="text-gray-400">›</span>
                    </Link>
                    <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-green-200 bg-green-50 p-3">
                      <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded text-green-600" />
                      <span className="text-xs text-gray-700 font-medium leading-relaxed">
                        上記の利用規約・重要事項説明および個人情報の取扱いについて確認し、同意します。
                      </span>
                    </label>
                  </div>

                  {error && (
                    <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
                  )}

                  <button type="submit" disabled={saving || !agreed}
                    className="w-full rounded-2xl py-4 text-base font-bold text-white transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: contractType === "voice" ? "linear-gradient(135deg,#16a34a,#4ade80)" : "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>
                    {saving ? "送信中..." : `📱 VP未来phone を申し込む`}
                  </button>

                  <p className="text-center text-xs text-gray-500 pb-4">申し込み後、担当者より順次ご連絡いたします</p>
                </>
              )}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
