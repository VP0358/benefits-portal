"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

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

const STATUS_INFO: Record<string, { label: string; icon: string; cardBg: string; cardBorder: string; badgeBg: string; badgeText: string; pulse?: boolean }> = {
  pending:    { label: "審査待ち",       icon: "⏳", cardBg: "bg-yellow-50",  cardBorder: "border-yellow-300", badgeBg: "bg-yellow-400",  badgeText: "text-white", pulse: true },
  reviewing:  { label: "審査中",         icon: "🔍", cardBg: "bg-blue-50",    cardBorder: "border-blue-300",   badgeBg: "bg-blue-500",    badgeText: "text-white", pulse: true },
  contracted: { label: "契約済み",       icon: "✅", cardBg: "bg-emerald-50", cardBorder: "border-emerald-300",badgeBg: "bg-emerald-500", badgeText: "text-white" },
  rejected:   { label: "審査不可",       icon: "❌", cardBg: "bg-red-50",    cardBorder: "border-red-300",    badgeBg: "bg-red-500",     badgeText: "text-white" },
  canceled:   { label: "キャンセル済み", icon: "🚫", cardBg: "bg-gray-50",   cardBorder: "border-gray-300",   badgeBg: "bg-gray-400",    badgeText: "text-white" },
};

// ── 音声回線プラン ────────────────────────────────────────────
type VoicePlan = { id: string; label: string; price: number; note?: string; popular?: boolean };
const VOICE_DATA_PLANS: VoicePlan[] = [
  { id: "rakuraku", label: "★定額・らくらくプラン",  price: 5500, note: "25GB＋無制限かけ放題", popular: true },
  { id: "no_data",  label: "データ通信なし",          price: 825 },
  { id: "1gb",      label: "1GB",                      price: 1155 },
  { id: "5gb",      label: "5GB",                      price: 1782 },
  { id: "10gb",     label: "10GB",                     price: 2695 },
  { id: "25gb",     label: "25GB",                     price: 3806 },
];
type KakehoudaiPlan = { id: string; label: string; price: number | null };
const KAKEHOUDAI_PLANS: KakehoudaiPlan[] = [
  { id: "none",      label: "かけ放題なし",  price: null },
  { id: "5min",      label: "5分かけ放題",   price: 1100 },
  { id: "10min",     label: "10分かけ放題",  price: 1430 },
  { id: "unlimited", label: "無制限かけ放題", price: 2860 },
];
type VoiceOption = { id: string; label: string; price: number };
const VOICE_OPTIONS: VoiceOption[] = [
  { id: "rusuban",  label: "留守番電話",   price: 495 },
  { id: "catchhon", label: "キャッチホン", price: 385 },
];

// ── 大容量データ回線プラン ────────────────────────────────────
type DataCapacityPlan = { id: string; label: string; price: number };
const DATA_CAPACITY_PLANS: DataCapacityPlan[] = [
  { id: "50gb",      label: "50GB",  price: 2860 },
  { id: "unlimited", label: "無制限", price: 3278 },
];
type DataTypePlan = { id: string; label: string; price: number | null; priceType: "monthly" | "onetime" | "none"; note?: string };
const DATA_TYPE_PLANS: DataTypePlan[] = [
  { id: "esim",        label: "eSIM（本体一体型）",        price: null,  priceType: "none" },
  { id: "sim",         label: "SIMカード",                  price: null,  priceType: "none" },
  { id: "pocket_rent", label: "ポケットWi-Fi（レンタル）", price: 330,   priceType: "monthly" },
  { id: "home_rent",   label: "置き型Wi-Fi（レンタル）",   price: 550,   priceType: "monthly" },
  { id: "pocket_buy",  label: "ポケットWi-Fi（買取）",     price: 6600,  priceType: "onetime" },
  { id: "home_buy",    label: "置き型Wi-Fi（買取）",       price: 11000, priceType: "onetime" },
];

function fmt(n: number) { return n.toLocaleString(); }
function calcVoiceTotal(dataId: string, kakehoudaiId: string, opts: string[]) {
  const base = VOICE_DATA_PLANS.find(p => p.id === dataId)?.price ?? 0;
  const kake = KAKEHOUDAI_PLANS.find(p => p.id === kakehoudaiId)?.price ?? 0;
  const optTotal = opts.reduce((s, id) => s + (VOICE_OPTIONS.find(o => o.id === id)?.price ?? 0), 0);
  return base + kake + optTotal;
}
function calcDataMonthly(capacityId: string, typeId: string) {
  const base = DATA_CAPACITY_PLANS.find(p => p.id === capacityId)?.price ?? 0;
  const tp = DATA_TYPE_PLANS.find(p => p.id === typeId);
  const typeMonthly  = (tp?.priceType === "monthly"  ? tp.price : 0) ?? 0;
  const typeOnetime  = (tp?.priceType === "onetime"  ? tp.price : 0) ?? 0;
  return { base, type: typeMonthly, total: base + typeMonthly, typeOnetime };
}

// ── ラジオカード ──────────────────────────────────────────────
function RadioCard<T extends { id: string; label: string; price: number | null; note?: string; popular?: boolean; priceType?: string }>({
  item, selected, onSelect, color = "green", priceLabel,
}: { item: T; selected: boolean; onSelect: () => void; color?: "green" | "purple"; priceLabel?: string }) {
  const ring = color === "green" ? "border-green-500 bg-green-50" : "border-purple-500 bg-purple-50";
  const dot  = color === "green" ? "bg-green-500" : "bg-purple-500";
  const badge = color === "green" ? "bg-green-500 text-white" : "bg-purple-500 text-white";
  let priceStr = "";
  if (priceLabel) { priceStr = priceLabel; }
  else if (item.price != null) {
    if ("priceType" in item) {
      if (item.priceType === "monthly")  priceStr = `+¥${fmt(item.price)}/月`;
      else if (item.priceType === "onetime") priceStr = `買取 ¥${fmt(item.price)}`;
      else priceStr = "";
    } else { priceStr = `¥${fmt(item.price)}/月`; }
  }
  return (
    <label className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${selected ? ring : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <input type="radio" className="sr-only" checked={selected} onChange={onSelect} />
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? `border-${color === "green" ? "green" : "purple"}-500` : "border-gray-300"}`}>
        {selected && <div className={`w-2 h-2 rounded-full ${dot}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${selected ? (color === "green" ? "text-green-800" : "text-purple-800") : "text-gray-800"}`}>{item.label}</span>
          {item.popular && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge}`}>人気</span>}
          {item.note && <span className="text-[10px] text-gray-700">{item.note}</span>}
        </div>
        {priceStr && <span className={`text-xs font-bold mt-0.5 block ${selected ? (color === "green" ? "text-green-700" : "text-purple-700") : "text-gray-600"}`}>{priceStr}</span>}
      </div>
    </label>
  );
}
function CheckCard({ item, checked, onChange }: { item: VoiceOption; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${checked ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${checked ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
        {checked && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      <div className="flex-1">
        <span className={`text-sm font-semibold ${checked ? "text-green-800" : "text-gray-800"}`}>{item.label}</span>
        <span className={`text-xs font-bold ml-2 ${checked ? "text-green-700" : "text-gray-600"}`}>¥{fmt(item.price)}/月</span>
      </div>
    </label>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 申込済み画面（申し込み内容変更・解約）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ApplicationStatusView({ app }: { app: ApplicationData }) {
  const info = STATUS_INFO[app.status] ?? STATUS_INFO.pending;
  const [actionType, setActionType] = useState<"" | "plan_change" | "contract_cancel" | "cancel_apply">("");
  const [confirm, setConfirm]     = useState(false);
  const [doing, setDoing]         = useState(false);
  const [msg, setMsg]             = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleAction() {
    setDoing(true); setMsg("");
    try {
      const res = await fetch(`/api/my/vp-phone/${app.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelType: actionType }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        setIsSuccess(true);
        setMsg(d?.message ?? "申請を受け付けました。担当者よりご連絡いたします。");
        setConfirm(false);
      } else {
        setMsg(d?.error ?? "申請に失敗しました。");
      }
    } catch { setMsg("通信エラーが発生しました。"); }
    setDoing(false);
  }

  const contractTypeLabel = app.contractType === "voice" ? "音声回線契約" : app.contractType === "data" ? "大容量データ回線契約" : "";
  const isActive  = app.status === "contracted";
  const isPending = app.status === "pending" || app.status === "reviewing";

  return (
    <div className="space-y-4">

      {/* ── ステータスカード ── */}
      <div className={`rounded-2xl border-2 p-5 shadow-sm ${info.cardBg} ${info.cardBorder}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{info.icon}</span>
          <div className="flex-1">
            <p className="text-xs text-gray-700">現在のステータス</p>
            <p className="font-bold text-lg text-gray-800">{info.label}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${info.badgeBg} ${info.badgeText} ${info.pulse ? "animate-pulse" : ""}`}>
            {info.label}
          </span>
        </div>

        {/* 進捗バー（審査中のみ） */}
        {isPending && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-gray-700 mb-1">
              <span>申込完了</span><span>審査中</span><span>契約完了</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2">
              <div className={`h-2 rounded-full ${app.status === "reviewing" ? "bg-blue-500 w-2/3" : "bg-yellow-400 w-1/3"}`} />
            </div>
          </div>
        )}

        {/* 申込内容 */}
        <div className="bg-white/70 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-gray-600 mb-2">📋 申込内容</p>
          {[
            { label: "申込日",    value: new Date(app.createdAt).toLocaleDateString("ja-JP") },
            { label: "お名前",    value: app.nameKanji },
            { label: "メール",    value: app.email },
            { label: "電話番号",  value: app.phone },
            { label: "契約種別",  value: contractTypeLabel || "—" },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-start gap-2">
              <span className="text-xs text-gray-700 whitespace-nowrap">{row.label}</span>
              <span className="text-xs font-semibold text-gray-800 text-right break-all">{row.value}</span>
            </div>
          ))}
          {app.desiredPlan && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-700 mb-1">希望プラン</p>
              <p className="text-xs font-semibold text-gray-800 break-all">{app.desiredPlan}</p>
            </div>
          )}
          {app.contractedAt && (
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-700">契約完了日</span>
              <span className="text-xs font-bold text-emerald-700">{new Date(app.contractedAt).toLocaleDateString("ja-JP")}</span>
            </div>
          )}
        </div>

        {/* 担当者メモ */}
        {app.adminNote && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700 mb-1">📝 担当者からのメモ</p>
            <p className="text-xs text-gray-800">{app.adminNote}</p>
          </div>
        )}

        {/* 契約完了メッセージ */}
        {isActive && (
          <div className="mt-3 bg-emerald-100 rounded-xl p-3 text-center">
            <p className="text-xs font-bold text-emerald-800">🎉 VP未来phone の契約が完了しています！</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">ご契約ありがとうございます。</p>
          </div>
        )}
      </div>

      {/* ── 申請済みメッセージ ── */}
      {isSuccess && msg && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-5 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="font-bold text-emerald-800 text-sm">{msg}</p>
          <p className="text-xs text-emerald-600 mt-1">担当者よりご連絡いたします。</p>
          <Link href="/dashboard"
            className="mt-4 inline-block rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-700 transition">
            ホームに戻る
          </Link>
        </div>
      )}

      {/* ── アクションボタン（申請前） ── */}
      {!isSuccess && (
        <div className="space-y-3">

          {/* 契約済み：プラン変更（上部）*/}
          {isActive && !confirm && (
            <>
              <button type="button"
                onClick={() => { setActionType("plan_change"); setConfirm(true); setMsg(""); }}
                className="w-full rounded-2xl border-2 border-blue-200 bg-white text-blue-700 py-4 text-sm font-bold hover:bg-blue-50 transition flex items-center justify-center gap-2 shadow-sm">
                🔄 プラン変更を申請する
              </button>
            </>
          )}

          {/* 審査中：申込キャンセル */}
          {isPending && !confirm && (
            <button type="button"
              onClick={() => { setActionType("cancel_apply"); setConfirm(true); setMsg(""); }}
              className="w-full rounded-2xl border-2 border-red-200 bg-white text-red-600 py-4 text-sm font-bold hover:bg-red-50 transition flex items-center justify-center gap-2 shadow-sm">
              ✋ 申し込みをキャンセルする
            </button>
          )}

          {/* 契約済み：解約ボタン（下部に配置） */}
          {isActive && !confirm && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-600 text-center mb-2">解約をご希望の場合</p>
              <button type="button"
                onClick={() => { setActionType("contract_cancel"); setConfirm(true); setMsg(""); }}
                className="w-full rounded-2xl border-2 border-red-200 bg-white text-red-600 py-3 text-sm font-bold hover:bg-red-50 transition flex items-center justify-center gap-2 shadow-sm">
                🚫 解約を申請する
              </button>
            </div>
          )}

          {/* 確認モーダル */}
          {confirm && (
            <div className={`rounded-2xl border-2 p-5 space-y-3 ${actionType === "plan_change" ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
              <p className={`font-bold text-sm ${actionType === "plan_change" ? "text-blue-700" : "text-red-700"}`}>
                {actionType === "plan_change" ? "🔄 プラン変更を申請しますか？" : actionType === "contract_cancel" ? "🚫 本当に解約を申請しますか？" : "✋ 申し込みをキャンセルしますか？"}
              </p>
              <p className={`text-xs ${actionType === "plan_change" ? "text-blue-600" : "text-red-600"}`}>
                申請後、担当者よりご連絡いたします。
              </p>
              {msg && !isSuccess && <p className="text-xs text-red-700 font-semibold bg-red-100 rounded-xl px-3 py-2">{msg}</p>}
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { setConfirm(false); setMsg(""); setActionType(""); }}
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                  やめる
                </button>
                <button type="button"
                  onClick={handleAction}
                  disabled={doing}
                  className={`flex-1 rounded-xl text-white py-3 text-sm font-bold transition disabled:opacity-50 ${actionType === "plan_change" ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"}`}>
                  {doing ? "申請中..." : "はい、申請する"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メインコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function VpPhoneClient({
  defaultName, defaultNameKana, defaultEmail, defaultPhone, existingApplication,
}: {
  defaultName: string;
  defaultNameKana: string;
  defaultEmail: string;
  defaultPhone: string;
  existingApplication: ApplicationData | null;
}) {
  const app = existingApplication;

  // 申込済みで有効なステータス（再申込不要）
  const hasActiveApp = app && !["rejected", "canceled"].includes(app.status);

  // ── 申込フォーム用 state ──
  // 音声・データは複数選択可（両方同時申込も可）
  const [voiceSelected, setVoiceSelected] = useState(false);
  const [dataSelected,  setDataSelected]  = useState(false);
  // 後方互換：contractTypeはAPI送信用（両方選択時は"both"）
  const contractType = voiceSelected && dataSelected ? "both" : voiceSelected ? "voice" : dataSelected ? "data" : "";
  const [voiceDataPlan, setVoiceDataPlan] = useState("1gb");
  const [kakehoudai,    setKakehoudai]    = useState("none");
  const [voiceOpts,     setVoiceOpts]     = useState<string[]>([]);
  const [dataCapacity,  setDataCapacity]  = useState("50gb");
  const [dataType,      setDataType]      = useState("sim");
  const [form, setForm] = useState({
    nameKanji: defaultName, nameKana: defaultNameKana,
    email: defaultEmail, password: "", passwordConfirm: "",
    phone: defaultPhone, birthDate: "", gender: "male",
    lineId: "", lineDisplayName: "",
    referrerCode: "", referrerName: "",
    cardNumber: "", cardExpiry: "", cardCvc: "", cardName: "",
  });
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [submitted,    setSubmitted]    = useState(false);
  const [agreed,       setAgreed]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCardCvc,  setShowCardCvc]  = useState(false);
  const [referrerAutoFilled, setReferrerAutoFilled] = useState(false);

  // ── 紹介者の自動取得（ログインユーザーの紹介者コードを自動設定） ──
  useEffect(() => {
    if (app) return; // 申込済みの場合はスキップ
    fetch("/api/my/referrer-info")
      .then(r => r.json())
      .then((d: { referrerCode?: string; referrerName?: string }) => {
        if (d.referrerCode && d.referrerName) {
          setForm(prev => ({ ...prev, referrerCode: d.referrerCode!, referrerName: d.referrerName! }));
          setReferrerAutoFilled(true);
        }
      })
      .catch(() => {});
  }, []);

  const voiceTotal = calcVoiceTotal(voiceDataPlan, kakehoudai, voiceOpts);
  const dataTotals = calcDataMonthly(dataCapacity, dataType);

  // 総合計（月額）と一括費用
  const grandMonthly  = (voiceSelected ? voiceTotal : 0) + (dataSelected ? dataTotals.total : 0);
  const grandOnetime  = dataSelected ? dataTotals.typeOnetime : 0;

  function buildDesiredPlan(): string {
    const parts: string[] = [];
    if (voiceSelected) {
      const data = VOICE_DATA_PLANS.find(p => p.id === voiceDataPlan);
      const kake = KAKEHOUDAI_PLANS.find(p => p.id === kakehoudai);
      const opts = voiceOpts.map(id => VOICE_OPTIONS.find(o => o.id === id)?.label).filter(Boolean).join("・");
      let s = `[音声回線] ${data?.label}（¥${fmt(data?.price ?? 0)}）`;
      if (kake && kake.id !== "none") s += ` ／ ${kake.label}（¥${fmt(kake.price ?? 0)}）`;
      if (opts) s += ` ／ オプション:${opts}`;
      s += ` ／ 月額小計 ¥${fmt(voiceTotal)}`;
      parts.push(s);
    }
    if (dataSelected) {
      const cap = DATA_CAPACITY_PLANS.find(p => p.id === dataCapacity);
      const tp  = DATA_TYPE_PLANS.find(p => p.id === dataType);
      let s = `[大容量データ回線] ${cap?.label}（¥${fmt(cap?.price ?? 0)}/月）`;
      if (tp) {
        if (tp.priceType === "monthly")  s += ` ／ ${tp.label}（＋¥${fmt(tp.price ?? 0)}/月）`;
        else if (tp.priceType === "onetime") s += ` ／ ${tp.label}（買取¥${fmt(tp.price ?? 0)}）`;
        else s += ` ／ ${tp.label}`;
      }
      s += ` ／ 月額小計 ¥${fmt(dataTotals.total)}`;
      if (dataTotals.typeOnetime > 0) s += `（端末¥${fmt(dataTotals.typeOnetime)} 別途）`;
      parts.push(s);
    }
    if (parts.length > 1) {
      parts.push(`月額総合計 ¥${fmt(grandMonthly)}`);
    }
    return parts.join(" ／ ");
  }
  function formatCardNumber(v: string) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
  function formatExpiry(v: string) { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d; }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!voiceSelected && !dataSelected) { setError("契約種別を1つ以上選択してください"); return; }
    if (!agreed) { setError("個人情報の取扱いへの同意が必要です"); return; }
    if (form.password && form.password !== form.passwordConfirm) { setError("パスワードが一致しません"); return; }
    if (!form.referrerCode || !form.referrerName) { setError("紹介者コードと紹介者名は必須項目です"); return; }
    if (!form.cardNumber || !form.cardExpiry || !form.cardCvc || !form.cardName) { setError("お支払いカード情報をすべてご入力ください"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/my/vp-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameKanji: form.nameKanji, nameKana: form.nameKana,
        email: form.email, password: form.password || undefined,
        phone: form.phone, birthDate: form.birthDate, gender: form.gender,
        lineId: form.lineId || undefined, lineDisplayName: form.lineDisplayName || undefined,
        referrerCode: form.referrerCode || undefined, referrerName: form.referrerName || undefined,
        contractType, desiredPlan: buildDesiredPlan(),
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error || "申し込みに失敗しました。"); return; }
    setSubmitted(true);
  }

  const inp = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";
  const lbl = "block text-xs font-bold text-gray-600 mb-1.5";

  // ヘッダータイトルを状態によって変える
  const headerTitle = hasActiveApp ? "申し込み内容変更" : "VP未来phone 申し込み";
  const headerSub   = hasActiveApp ? "ご契約内容の確認・変更・解約" : "VP未来phone申し込みフォーム";

  return (
    <div className="min-h-screen pb-16" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.13]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-30"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#6ee7b7" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <div>
              <h1 className="font-semibold font-jp text-sm leading-none" style={{ color: NAVY }}>{headerTitle}</h1>
              <p className="text-[10px] font-jp mt-0.5" style={{ color: `${NAVY}55` }}>{headerSub}</p>
            </div>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(90deg,rgba(110,231,183,0.35),transparent)" }}/>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4 relative">

        {/* ━━━ ① 申込済みの場合 → 内容確認・変更・解約 ━━━ */}
        {hasActiveApp && !submitted && (
          <ApplicationStatusView app={app} />
        )}

        {/* ━━━ ② 申込完了後のサンクス画面 ━━━ */}
        {submitted && (
          <div className="rounded-3xl overflow-hidden"
            style={{ background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: "1px solid rgba(52,211,153,0.35)", boxShadow: "0 12px 40px rgba(10,22,40,0.22)" }}>
            <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,0.9) 50%,transparent)" }}/>
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-lg font-bold font-jp mb-2" style={{ color: "#34d399" }}>申し込みが完了しました！</h2>
              <p className="text-sm font-jp mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
                VP未来phone 申し込みを受け付けました。<br />
                担当者より順次ご連絡いたします。
              </p>
              <Link href="/dashboard"
                className="inline-block rounded-xl px-6 py-2.5 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}>
                ホームに戻る
              </Link>
            </div>
          </div>
        )}

        {/* ━━━ ③ 未申込 / 審査不可・キャンセル後の再申込 → 申込フォーム ━━━ */}
        {!hasActiveApp && !submitted && (
          <>
            {/* 再申込の場合は旧ステータスを表示 */}
            {app && (
              <div className={`rounded-2xl border-2 p-4 ${STATUS_INFO[app.status]?.cardBg} ${STATUS_INFO[app.status]?.cardBorder}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{STATUS_INFO[app.status]?.icon}</span>
                  <div>
                    <p className="text-xs text-gray-700">前回の申し込み</p>
                    <p className="text-sm font-bold text-gray-700">{STATUS_INFO[app.status]?.label}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mt-2">再度お申し込みいただけます。</p>
              </div>
            )}

            {/* 未申込の説明カード */}
            {!app && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">📱</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-800">VP未来phone 申し込み</h2>
                      <span className="rounded-full bg-gray-400 text-white px-2.5 py-0.5 text-[10px] font-bold">未申込</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5">お得なスマートフォン回線サービス</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-700 mb-4">
                  <div className="flex items-start gap-2"><span className="text-green-600">✓</span><span>申し込み後、担当者より順次ご連絡いたします</span></div>
                  <div className="flex items-start gap-2"><span className="text-green-600">✓</span><span>ご紹介いただいた方に紹介ポイントが付与されます</span></div>
                </div>
                <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                  <Link href="/vp-phone/terms"
                    className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 hover:bg-blue-100 transition">
                    <div className="flex items-center gap-2"><span>📄</span><span className="text-xs font-semibold text-blue-800">利用規約・重要事項説明を確認する</span></div>
                    <span className="text-blue-500">›</span>
                  </Link>
                  <Link href="/vp-phone/privacy"
                    className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-2.5 hover:bg-green-100 transition">
                    <div className="flex items-center gap-2"><span>🔒</span><span className="text-xs font-semibold text-green-800">個人情報の取扱いについて</span></div>
                    <span className="text-green-500">›</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 申込フォーム */}
            <form onSubmit={onSubmit} className="space-y-4">

              {/* 申込者情報 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">👤 申込者情報</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>お名前（漢字）<span className="text-red-500 ml-1">*</span></label>
                      <input required className={inp} placeholder="山田 太郎" value={form.nameKanji} onChange={e => setForm({ ...form, nameKanji: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl}>お名前（かな）<span className="text-red-500 ml-1">*</span></label>
                      <input required className={inp} placeholder="やまだ たろう" value={form.nameKana} onChange={e => setForm({ ...form, nameKana: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>メールアドレス<span className="text-red-500 ml-1">*</span></label>
                    <input required type="email" className={inp} placeholder="example@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>パスワード（任意）</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} className={inp} placeholder="VP未来phone申し込み用パスワード（任意）" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600 text-xs">{showPassword ? "隠す" : "表示"}</button>
                    </div>
                    {form.password && (
                      <div className="mt-2">
                        <label className={lbl}>パスワード（確認）</label>
                        <input type={showPassword ? "text" : "password"} className={inp} placeholder="パスワードをもう一度入力" value={form.passwordConfirm} onChange={e => setForm({ ...form, passwordConfirm: e.target.value })} autoComplete="new-password" />
                        {form.passwordConfirm && form.password !== form.passwordConfirm && <p className="text-xs text-red-600 mt-1">パスワードが一致しません</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>電話番号<span className="text-red-500 ml-1">*</span></label>
                    <input required type="tel" className={inp} placeholder="090-1234-5678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>生年月日<span className="text-red-500 ml-1">*</span></label>
                    <input required type="date" className={inp} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>性別<span className="text-red-500 ml-1">*</span></label>
                    <div className="flex gap-4">
                      {[{ value:"male",label:"男性"},{value:"female",label:"女性"},{value:"other",label:"その他"}].map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input type="radio" name="gender" value={opt.value} checked={form.gender === opt.value} onChange={() => setForm({ ...form, gender: opt.value })} className="w-4 h-4 text-green-600" />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 紹介者情報 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">👥 紹介者情報<span className="text-red-500 ml-1">*</span></h3>
                <div className="space-y-4">
                  {referrerAutoFilled && (
                    <div className="rounded-xl px-4 py-2.5" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
                      <p className="text-xs font-semibold" style={{ color: "#34d399" }}>✓ 紹介者が自動設定されました</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(52,211,153,0.70)" }}>ご紹介いただいた方が自動的に紹介者として設定されています。</p>
                    </div>
                  )}
                  <div>
                    <label className={lbl}>紹介者コード（会員コード）<span className="text-red-500 ml-1">*</span></label>
                    <input required className={inp} placeholder="例: M0001" value={form.referrerCode} onChange={e => { setForm({ ...form, referrerCode: e.target.value }); setReferrerAutoFilled(false); }} />
                  </div>
                  <div>
                    <label className={lbl}>紹介者名<span className="text-red-500 ml-1">*</span></label>
                    <input required className={inp} placeholder="例: 山田 花子" value={form.referrerName} onChange={e => setForm({ ...form, referrerName: e.target.value })} />
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
                    <input className={inp} placeholder="例: yamada_taro" value={form.lineId} onChange={e => setForm({ ...form, lineId: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>LINE表示名</label>
                    <input className={inp} placeholder="例: 山田太郎" value={form.lineDisplayName} onChange={e => setForm({ ...form, lineDisplayName: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* 契約種別選択（複数選択可） */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">📋 契約種別の選択<span className="text-red-500 ml-1">*</span></h3>
                <p className="text-[10px] text-gray-700 mb-3">※複数同時申込可能です</p>
                <div className="grid grid-cols-1 gap-3">
                  {/* 音声回線 */}
                  <button type="button" onClick={() => setVoiceSelected(v => !v)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${voiceSelected ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${voiceSelected ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"}`}>
                        {voiceSelected && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${voiceSelected ? "bg-green-200" : "bg-gray-100"}`}>📱</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">音声回線契約</p>
                          {voiceSelected && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">選択中</span>}
                        </div>
                        <p className="text-xs text-gray-700 mt-0.5">通話・SMS・データ通信（docomo回線）</p>
                        {voiceSelected && <p className="text-xs font-bold text-green-700 mt-1">月額小計: ¥{fmt(voiceTotal)}</p>}
                      </div>
                    </div>
                  </button>
                  {/* 大容量データ回線 */}
                  <button type="button" onClick={() => setDataSelected(v => !v)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${dataSelected ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${dataSelected ? "border-purple-500 bg-purple-500" : "border-gray-300 bg-white"}`}>
                        {dataSelected && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${dataSelected ? "bg-purple-200" : "bg-gray-100"}`}>📶</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">大容量データ回線契約</p>
                          {dataSelected && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">選択中</span>}
                        </div>
                        <p className="text-xs text-gray-700 mt-0.5">VP未来Wi-Fi（楽天回線）</p>
                        {dataSelected && <p className="text-xs font-bold text-purple-700 mt-1">月額小計: ¥{fmt(dataTotals.total)}{dataTotals.typeOnetime > 0 ? ` ＋端末 ¥${fmt(dataTotals.typeOnetime)}` : ""}</p>}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 音声回線プラン */}
              {voiceSelected && (
                <>
                  <div className="rounded-2xl bg-green-600 text-white p-4 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs font-semibold opacity-90">📱 音声回線 月額小計（税込）</p><p className="text-2xl font-black mt-0.5">¥{fmt(voiceTotal)}<span className="text-sm font-semibold">/月</span></p></div>
                    <span className="text-3xl">📱</span>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">📡 データプラン（docomo回線）</h3>
                    <p className="text-[10px] text-gray-700 mb-3">※料金は税込月額料金</p>
                    <div className="space-y-2">{VOICE_DATA_PLANS.map(p => <RadioCard key={p.id} item={p} selected={voiceDataPlan === p.id} onSelect={() => setVoiceDataPlan(p.id)} color="green" />)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-100">📞 かけ放題</h3>
                    <div className="space-y-2">{KAKEHOUDAI_PLANS.map(p => <RadioCard key={p.id} item={{ ...p, price: p.price }} selected={kakehoudai === p.id} onSelect={() => setKakehoudai(p.id)} color="green" priceLabel={p.price == null ? "無料" : `¥${fmt(p.price)}/月`} />)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-100">⚙️ オプション（複数選択可）</h3>
                    <div className="space-y-2">{VOICE_OPTIONS.map(o => <CheckCard key={o.id} item={o} checked={voiceOpts.includes(o.id)} onChange={checked => setVoiceOpts(prev => checked ? [...prev, o.id] : prev.filter(id => id !== o.id))} />)}</div>
                  </div>
                </>
              )}

              {/* 大容量データ回線プラン */}
              {dataSelected && (
                <>
                  <div className="rounded-2xl p-4 shadow-sm flex items-center justify-between text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>
                    <div><p className="text-xs font-semibold opacity-90">📶 データ回線 月額小計（税込）</p><p className="text-2xl font-black mt-0.5">¥{fmt(dataTotals.total)}<span className="text-sm font-semibold">/月</span></p>{dataTotals.typeOnetime > 0 && <p className="text-xs opacity-80 mt-0.5">+ 端末代 ¥{fmt(dataTotals.typeOnetime)}（一括）</p>}</div>
                    <span className="text-3xl">📶</span>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">🗂️ データ容量（VP未来Wi-Fi）</h3>
                    <p className="text-[10px] text-gray-700 mb-3">※料金は税込月額料金</p>
                    <div className="space-y-2">{DATA_CAPACITY_PLANS.map(p => <RadioCard key={p.id} item={{ ...p, note: undefined, popular: undefined }} selected={dataCapacity === p.id} onSelect={() => setDataCapacity(p.id)} color="purple" />)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 pb-2 border-b border-gray-100">📡 データ通信のタイプ</h3>
                    <p className="text-[10px] text-gray-700 mb-3">※SIM・レンタル機器の破損時は¥10,780（税込）を申し受けます</p>
                    <div className="space-y-2">{DATA_TYPE_PLANS.map(p => <RadioCard key={p.id} item={p} selected={dataType === p.id} onSelect={() => setDataType(p.id)} color="purple" priceLabel={p.priceType === "monthly" ? `+¥${fmt(p.price ?? 0)}/月` : p.priceType === "onetime" ? `買取 ¥${fmt(p.price ?? 0)}` : "追加料金なし"} />)}</div>
                  </div>
                </>
              )}

              {/* 合計・カード・同意 */}
              {(voiceSelected || dataSelected) && (
                <>
                  {/* ── 各プラン明細 ── */}
                  {voiceSelected && (
                    <div className="rounded-2xl border-2 bg-green-50 border-green-200 p-4 shadow-sm">
                      <h3 className="font-bold text-xs text-green-800 mb-3 pb-2 border-b border-green-200">📱 音声回線 内訳</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-700">データプラン</span><span className="font-semibold">¥{fmt(VOICE_DATA_PLANS.find(p => p.id === voiceDataPlan)?.price ?? 0)}/月</span></div>
                        {kakehoudai !== "none" && <div className="flex justify-between"><span className="text-gray-700">かけ放題</span><span className="font-semibold">¥{fmt(KAKEHOUDAI_PLANS.find(p => p.id === kakehoudai)?.price ?? 0)}/月</span></div>}
                        {voiceOpts.map(id => { const opt = VOICE_OPTIONS.find(o => o.id === id); return opt ? <div key={id} className="flex justify-between"><span className="text-gray-700">{opt.label}</span><span className="font-semibold">¥{fmt(opt.price)}/月</span></div> : null; })}
                        <div className="flex justify-between pt-2 border-t border-green-300"><span className="font-bold text-green-800">音声回線 小計</span><span className="font-black text-green-700">¥{fmt(voiceTotal)}<span className="text-xs">/月</span></span></div>
                      </div>
                    </div>
                  )}
                  {dataSelected && (
                    <div className="rounded-2xl border-2 bg-purple-50 border-purple-200 p-4 shadow-sm">
                      <h3 className="font-bold text-xs text-purple-800 mb-3 pb-2 border-b border-purple-200">📶 データ回線 内訳</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-700">データ容量</span><span className="font-semibold">¥{fmt(DATA_CAPACITY_PLANS.find(p => p.id === dataCapacity)?.price ?? 0)}/月</span></div>
                        {(() => { const tp = DATA_TYPE_PLANS.find(p => p.id === dataType); if (!tp) return null; if (tp.priceType === "monthly") return <div className="flex justify-between"><span className="text-gray-700">{tp.label}</span><span className="font-semibold">+¥{fmt(tp.price ?? 0)}/月</span></div>; if (tp.priceType === "onetime") return <div className="flex justify-between"><span className="text-gray-700">{tp.label}</span><span className="font-semibold text-orange-600">¥{fmt(tp.price ?? 0)}（一括）</span></div>; return <div className="flex justify-between"><span className="text-gray-700">{tp.label}</span><span className="text-gray-700">追加料金なし</span></div>; })()}
                        <div className="flex justify-between pt-2 border-t border-purple-300"><span className="font-bold text-purple-800">データ回線 小計</span><span className="font-black text-purple-700">¥{fmt(dataTotals.total)}<span className="text-xs">/月</span></span></div>
                        {dataTotals.typeOnetime > 0 && <div className="flex justify-between text-xs text-orange-600"><span>端末代（別途一括）</span><span className="font-bold">¥{fmt(dataTotals.typeOnetime)}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* ━━━ 総合計カード（お支払い情報の直上）━━━ */}
                  <div className="rounded-2xl p-5 shadow-lg text-white" style={{ background: "linear-gradient(135deg, #0f4c81, #1e88e5, #43a047)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">💴</span>
                      <p className="text-sm font-bold opacity-90">お支払い総合計（税込）</p>
                    </div>
                    {/* 内訳行 */}
                    {voiceSelected && dataSelected && (
                      <div className="bg-white/15 rounded-xl px-4 py-3 mb-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="opacity-80">📱 音声回線</span>
                          <span className="font-semibold">¥{fmt(voiceTotal)}/月</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="opacity-80">📶 データ回線</span>
                          <span className="font-semibold">¥{fmt(dataTotals.total)}/月{dataTotals.typeOnetime > 0 ? ` ＋端末¥${fmt(dataTotals.typeOnetime)}` : ""}</span>
                        </div>
                      </div>
                    )}
                    {/* 総合計メイン表示 */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-black leading-none">¥{fmt(grandMonthly)}<span className="text-base font-semibold">/月</span></p>
                        {grandOnetime > 0 && <p className="text-xs opacity-80 mt-1">＋端末代 ¥{fmt(grandOnetime)}（別途一括）</p>}
                      </div>
                      <span className="text-4xl opacity-70">{voiceSelected && dataSelected ? "📱📶" : voiceSelected ? "📱" : "📶"}</span>
                    </div>
                    <p className="text-[10px] opacity-70 mt-3 border-t border-white/20 pt-2">※ 表示金額はすべて税込です。申し込み後、担当者よりご確認の連絡をいたします。</p>
                  </div>

                  {/* カード情報 */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 pb-2 border-b border-gray-100">💳 お支払い情報</h3>
                    <div className="mb-4 mt-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><span>💳</span> お支払い方法：クレジットカード・デビットカードのみ</p>
                      <p className="text-[10px] text-blue-600 mt-1">VISA / Mastercard / JCB / American Express 対応</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={lbl}>カード番号<span className="text-red-500 ml-1">*</span></label>
                        <input type="text" inputMode="numeric" className={inp} placeholder="1234 5678 9012 3456" value={form.cardNumber} onChange={e => setForm({ ...form, cardNumber: formatCardNumber(e.target.value) })} maxLength={19} autoComplete="cc-number" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>有効期限<span className="text-red-500 ml-1">*</span></label>
                          <input type="text" inputMode="numeric" className={inp} placeholder="MM/YY" value={form.cardExpiry} onChange={e => setForm({ ...form, cardExpiry: formatExpiry(e.target.value) })} maxLength={5} autoComplete="cc-exp" />
                        </div>
                        <div>
                          <label className={lbl}>セキュリティコード<span className="text-red-500 ml-1">*</span></label>
                          <div className="relative">
                            <input type={showCardCvc ? "text" : "password"} inputMode="numeric" className={inp} placeholder="CVC" value={form.cardCvc} onChange={e => setForm({ ...form, cardCvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} autoComplete="cc-csc" />
                            <button type="button" onClick={() => setShowCardCvc(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600 text-[10px]">{showCardCvc ? "隠す" : "表示"}</button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>カード名義（ローマ字）<span className="text-red-500 ml-1">*</span></label>
                        <input type="text" className={inp} placeholder="TARO YAMADA" value={form.cardName} onChange={e => setForm({ ...form, cardName: e.target.value.toUpperCase() })} autoComplete="cc-name" />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-3">※ カード情報は安全に処理されます。担当者がご確認後、正式な決済手続きをご案内いたします。</p>
                  </div>

                  {/* 同意 */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800 text-sm mb-2 pb-2 border-b border-gray-100">✅ 規約への同意</h3>
                    <Link href="/vp-phone/terms" className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
                      <div className="flex items-center gap-2"><span>📄</span><div><p className="text-xs font-semibold text-gray-800">利用規約・重要事項説明</p><p className="text-[10px] text-gray-700">VP未来phone / VP未来Wi-Fi</p></div></div>
                      <span className="text-gray-600">›</span>
                    </Link>
                    <Link href="/vp-phone/privacy" className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
                      <div className="flex items-center gap-2"><span>🔒</span><div><p className="text-xs font-semibold text-gray-800">個人情報の取扱いについて</p><p className="text-[10px] text-gray-700">プライバシーポリシー</p></div></div>
                      <span className="text-gray-600">›</span>
                    </Link>
                    <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-green-200 bg-green-50 p-3">
                      <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-5 h-5 rounded text-green-600" />
                      <span className="text-xs text-gray-700 font-medium leading-relaxed">上記の利用規約・重要事項説明および個人情報の取扱いについて確認し、同意します。</span>
                    </label>
                  </div>

                  {error && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                  <button type="submit" disabled={saving || !agreed}
                    className="w-full rounded-2xl py-4 text-base font-bold text-white transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: voiceSelected && dataSelected ? "linear-gradient(135deg,#0f4c81,#43a047)" : voiceSelected ? "linear-gradient(135deg,#16a34a,#4ade80)" : "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>
                    {saving ? "送信中..." : "📱 VP未来phone を申し込む"}
                  </button>
                  <p className="text-center text-xs text-gray-700 pb-4">申し込み後、担当者より順次ご連絡いたします</p>
                </>
              )}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
