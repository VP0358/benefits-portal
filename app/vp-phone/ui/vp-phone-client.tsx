"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";

// ── デザイントークン（ダッシュボードと統一）
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";

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

const STATUS_INFO: Record<string, {
  label: string; icon: string;
  bg: string; border: string; badgeBg: string; badgeText: string; pulse?: boolean;
}> = {
  pending:    { label: "審査待ち",       icon: "⏳", bg: `${GOLD}12`,            border: `${GOLD}35`,            badgeBg: `${GOLD}35`,            badgeText: GOLD_LIGHT,    pulse: true },
  reviewing:  { label: "審査中",         icon: "🔍", bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.30)", badgeBg: "rgba(56,189,248,0.25)", badgeText: "#7dd3fc",    pulse: true },
  contracted: { label: "契約済み",       icon: "✅", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.30)", badgeBg: "rgba(52,211,153,0.25)", badgeText: "#6ee7b7" },
  rejected:   { label: "審査不可",       icon: "❌", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.28)",  badgeBg: "rgba(239,68,68,0.22)",  badgeText: "#fca5a5" },
  canceled:   { label: "キャンセル済み", icon: "🚫", bg: "rgba(107,114,128,0.08)",border: "rgba(107,114,128,0.25)",badgeBg: "rgba(107,114,128,0.20)",badgeText: "#9ca3af" },
};

// ── 音声回線プラン
type VoicePlan = { id: string; label: string; price: number; note?: string; popular?: boolean };
const VOICE_DATA_PLANS: VoicePlan[] = [
  { id: "rakuraku", label: "★定額・らくらくプラン", price: 5500, note: "25GB＋無制限かけ放題", popular: true },
  { id: "no_data",  label: "データ通信なし",         price: 825 },
  { id: "1gb",      label: "1GB",                     price: 1155 },
  { id: "5gb",      label: "5GB",                     price: 1782 },
  { id: "10gb",     label: "10GB",                    price: 2695 },
  { id: "25gb",     label: "25GB",                    price: 3806 },
];
type KakehoudaiPlan = { id: string; label: string; price: number | null };
const KAKEHOUDAI_PLANS: KakehoudaiPlan[] = [
  { id: "none",      label: "かけ放題なし",   price: null },
  { id: "5min",      label: "5分かけ放題",    price: 1100 },
  { id: "10min",     label: "10分かけ放題",   price: 1430 },
  { id: "unlimited", label: "無制限かけ放題", price: 2860 },
];
type VoiceOption = { id: string; label: string; price: number };
const VOICE_OPTIONS: VoiceOption[] = [
  { id: "rusuban",   label: "留守番電話",   price: 495 },
  { id: "catchhon",  label: "キャッチホン", price: 385 },
];

// ── 大容量データ回線プラン
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
  const typeMonthly = (tp?.priceType === "monthly"  ? tp.price : 0) ?? 0;
  const typeOnetime = (tp?.priceType === "onetime"  ? tp.price : 0) ?? 0;
  return { base, type: typeMonthly, total: base + typeMonthly, typeOnetime };
}

// ── ナビーカード共通スタイル
function NavyCard({ children, className = "", accent = GOLD }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: `linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`, border: `1px solid ${accent}28`, boxShadow: "0 4px 20px rgba(10,22,40,0.22)" }}>
      <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${accent}70,${accent}90,${accent}70,transparent)` }}/>
      {children}
    </div>
  );
}

// ── セクションヘッダー
function SectionLabel({ en, ja }: { en: string; ja: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg,${GOLD}50,transparent)` }}/>
      <div className="text-center">
        <p className="font-label text-[8px] tracking-[0.22em] font-bold" style={{ color: `${GOLD}70` }}>{en}</p>
        <p className="font-jp text-xs font-semibold" style={{ color: GOLD_LIGHT }}>{ja}</p>
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg,transparent,${GOLD}50)` }}/>
    </div>
  );
}

// ── ラジオカード（新デザイン）
function RadioCard<T extends { id: string; label: string; price: number | null; note?: string; popular?: boolean; priceType?: string }>({
  item, selected, onSelect, color = "green", priceLabel,
}: { item: T; selected: boolean; onSelect: () => void; color?: "green" | "purple"; priceLabel?: string }) {
  const accent = color === "green" ? "#6ee7b7" : "#c4b5fd";
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
    <label className="flex items-center gap-3 rounded-xl border cursor-pointer transition-all p-3"
      style={selected
        ? { background: `${accent}12`, border: `1.5px solid ${accent}60` }
        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <input type="radio" className="sr-only" checked={selected} onChange={onSelect} />
      <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
        style={{ borderColor: selected ? accent : "rgba(255,255,255,0.25)" }}>
        {selected && <div className="w-2 h-2 rounded-full" style={{ background: accent }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: selected ? accent : "rgba(255,255,255,0.85)" }}>{item.label}</span>
          {item.popular && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: accent }}>{" "}人気</span>}
          {item.note && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.50)" }}>{item.note}</span>}
        </div>
        {priceStr && <span className="text-xs font-bold mt-0.5 block" style={{ color: selected ? accent : `${GOLD}80` }}>{priceStr}</span>}
      </div>
    </label>
  );
}

function CheckCard({ item, checked, onChange }: { item: VoiceOption; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border cursor-pointer transition-all p-3"
      style={checked
        ? { background: "rgba(110,231,183,0.10)", border: "1.5px solid rgba(110,231,183,0.50)" }
        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
        style={{ borderColor: checked ? "#6ee7b7" : "rgba(255,255,255,0.25)", background: checked ? "#6ee7b7" : "transparent" }}>
        {checked && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      <div className="flex-1">
        <span className="text-sm font-semibold" style={{ color: checked ? "#6ee7b7" : "rgba(255,255,255,0.85)" }}>{item.label}</span>
        <span className="text-xs font-bold ml-2" style={{ color: checked ? "#6ee7b7" : `${GOLD}80` }}>¥{fmt(item.price)}/月</span>
      </div>
    </label>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 申込済み画面（申し込み内容確認・変更・解約）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ApplicationStatusView({ app }: { app: ApplicationData }) {
  const info = STATUS_INFO[app.status] ?? STATUS_INFO.pending;
  const [actionType, setActionType] = useState<"" | "plan_change" | "contract_cancel" | "cancel_apply">("");
  const [confirm, setConfirm] = useState(false);
  const [doing, setDoing]     = useState(false);
  const [msg, setMsg]         = useState("");
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

      {/* ステータスカード */}
      <NavyCard accent={info.border}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{info.icon}</span>
            <div className="flex-1">
              <p className="text-[10px] font-label tracking-widest mb-0.5" style={{ color: `${GOLD}70` }}>APPLICATION STATUS</p>
              <p className="font-jp font-bold text-lg text-white">{info.label}</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: info.badgeBg, color: info.badgeText }}>
              {info.label}
            </span>
          </div>

          {/* 進捗バー（審査中のみ） */}
          {isPending && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] mb-1.5" style={{ color: `${GOLD}50` }}>
                <span>申込完了</span><span>審査中</span><span>契約完了</span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: app.status === "reviewing" ? "66%" : "33%", background: `linear-gradient(90deg,${GOLD},${GOLD_LIGHT})` }}/>
              </div>
            </div>
          )}

          {/* 申込内容 */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-label tracking-widest mb-2" style={{ color: `${GOLD}65` }}>📋 申込内容</p>
            {[
              { label: "申込日",   value: new Date(app.createdAt).toLocaleDateString("ja-JP") },
              { label: "お名前",   value: app.nameKanji },
              { label: "メール",   value: app.email },
              { label: "電話番号", value: app.phone },
              { label: "契約種別", value: contractTypeLabel || "—" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-start gap-2">
                <span className="text-xs whitespace-nowrap" style={{ color: "rgba(255,255,255,0.45)" }}>{row.label}</span>
                <span className="text-xs font-semibold text-right break-all text-white">{row.value}</span>
              </div>
            ))}
            {app.desiredPlan && (
              <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>希望プラン</p>
                <p className="text-xs font-semibold text-white break-all">{app.desiredPlan}</p>
              </div>
            )}
            {app.contractedAt && (
              <div className="flex justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>契約完了日</span>
                <span className="text-xs font-bold" style={{ color: "#6ee7b7" }}>{new Date(app.contractedAt).toLocaleDateString("ja-JP")}</span>
              </div>
            )}
          </div>

          {/* 担当者メモ */}
          {app.adminNote && (
            <div className="mt-3 rounded-xl p-3" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
              <p className="text-xs font-bold mb-1" style={{ color: GOLD_LIGHT }}>📝 担当者からのメモ</p>
              <p className="text-xs text-white/70">{app.adminNote}</p>
            </div>
          )}

          {/* 契約完了メッセージ */}
          {isActive && (
            <div className="mt-3 rounded-xl p-3 text-center" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
              <p className="text-xs font-bold" style={{ color: "#6ee7b7" }}>🎉 VP未来phone の契約が完了しています！</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(52,211,153,0.65)" }}>ご契約ありがとうございます。</p>
            </div>
          )}
        </div>
      </NavyCard>

      {/* 申請済みサンクス */}
      {isSuccess && msg && (
        <NavyCard accent="rgba(52,211,153,0.5)">
          <div className="p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-bold text-sm font-jp mb-1" style={{ color: "#6ee7b7" }}>{msg}</p>
            <p className="text-xs mb-4" style={{ color: "rgba(52,211,153,0.65)" }}>担当者よりご連絡いたします。</p>
            <Link href="/dashboard"
              className="inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}>
              ホームに戻る
            </Link>
          </div>
        </NavyCard>
      )}

      {/* アクションボタン */}
      {!isSuccess && (
        <div className="space-y-3">
          {isActive && !confirm && (
            <button type="button"
              onClick={() => { setActionType("plan_change"); setConfirm(true); setMsg(""); }}
              className="w-full rounded-2xl py-4 text-sm font-bold transition-all hover:scale-[1.01] active:scale-95"
              style={{ background: "rgba(56,189,248,0.12)", border: "1.5px solid rgba(56,189,248,0.35)", color: "#7dd3fc" }}>
              🔄 プラン変更を申請する
            </button>
          )}
          {isPending && !confirm && (
            <button type="button"
              onClick={() => { setActionType("cancel_apply"); setConfirm(true); setMsg(""); }}
              className="w-full rounded-2xl py-4 text-sm font-bold transition-all hover:scale-[1.01] active:scale-95"
              style={{ background: "rgba(239,68,68,0.10)", border: "1.5px solid rgba(239,68,68,0.28)", color: "#fca5a5" }}>
              ✋ 申し込みをキャンセルする
            </button>
          )}
          {isActive && !confirm && (
            <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] text-center mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>解約をご希望の場合</p>
              <button type="button"
                onClick={() => { setActionType("contract_cancel"); setConfirm(true); setMsg(""); }}
                className="w-full rounded-2xl py-3 text-sm font-bold transition-all hover:scale-[1.01] active:scale-95"
                style={{ background: "rgba(239,68,68,0.10)", border: "1.5px solid rgba(239,68,68,0.28)", color: "#fca5a5" }}>
                🚫 解約を申請する
              </button>
            </div>
          )}

          {/* 確認モーダル */}
          {confirm && (
            <NavyCard accent={actionType === "plan_change" ? "rgba(56,189,248,0.5)" : "rgba(239,68,68,0.4)"}>
              <div className="p-5 space-y-3">
                <p className="font-bold text-sm font-jp" style={{ color: actionType === "plan_change" ? "#7dd3fc" : "#fca5a5" }}>
                  {actionType === "plan_change" ? "🔄 プラン変更を申請しますか？" : actionType === "contract_cancel" ? "🚫 本当に解約を申請しますか？" : "✋ 申し込みをキャンセルしますか？"}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>申請後、担当者よりご連絡いたします。</p>
                {msg && !isSuccess && (
                  <p className="text-xs font-semibold rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>{msg}</p>
                )}
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => { setConfirm(false); setMsg(""); setActionType(""); }}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold transition"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.65)" }}>
                    やめる
                  </button>
                  <button type="button" onClick={handleAction} disabled={doing}
                    className="flex-1 rounded-xl py-3 text-sm font-bold transition disabled:opacity-50 text-white"
                    style={{ background: actionType === "plan_change" ? "linear-gradient(135deg,#0369a1,#38bdf8)" : "linear-gradient(135deg,#dc2626,#f87171)" }}>
                    {doing ? "申請中..." : "はい、申請する"}
                  </button>
                </div>
              </div>
            </NavyCard>
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
  const hasActiveApp = app && !["rejected", "canceled"].includes(app.status);

  const [voiceSelected, setVoiceSelected] = useState(false);
  const [dataSelected,  setDataSelected]  = useState(false);
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

  // 紹介者の自動取得
  useEffect(() => {
    if (app) return;
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
  const grandMonthly = (voiceSelected ? voiceTotal : 0) + (dataSelected ? dataTotals.total : 0);
  const grandOnetime = dataSelected ? dataTotals.typeOnetime : 0;

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
    if (parts.length > 1) parts.push(`月額総合計 ¥${fmt(grandMonthly)}`);
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

  // 入力フィールド共通スタイル
  const inp = "w-full rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-white/25 focus:outline-none focus:ring-1 transition"
    + ` border`;
  const inpStyle = { background: "rgba(255,255,255,0.05)", borderColor: `${GOLD}22` };
  const focusRingStyle = { "--tw-ring-color": `${GOLD}55` } as React.CSSProperties;
  const lbl = "block text-xs font-bold mb-1.5";
  const lblStyle = { color: `${GOLD}80` };

  const headerTitle = hasActiveApp ? "申し込み内容変更" : "VP未来phone 申し込み";
  const headerSub   = hasActiveApp ? "ご契約内容の確認・変更・解約" : "VP未来phone申し込みフォーム";

  return (
    <div className="min-h-screen pb-16" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.13]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle,#6ee7b7,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-30"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08)" }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#6ee7b7" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-semibold font-jp text-sm leading-none" style={{ color: NAVY }}>{headerTitle}</h1>
              <p className="text-[10px] font-jp mt-0.5" style={{ color: `${NAVY}55` }}>{headerSub}</p>
            </div>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,rgba(110,231,183,0.35),transparent)` }}/>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4 relative">

        {/* ━━━ ① 申込済みの場合 → 内容確認・変更・解約 ━━━ */}
        {hasActiveApp && !submitted && (
          <ApplicationStatusView app={app} />
        )}

        {/* ━━━ ② 申込完了後のサンクス画面 ━━━ */}
        {submitted && (
          <NavyCard accent="rgba(52,211,153,0.6)">
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
          </NavyCard>
        )}

        {/* ━━━ ③ 未申込 / 再申込 → 申込フォーム ━━━ */}
        {!hasActiveApp && !submitted && (
          <>
            {/* 前回の申し込みステータス */}
            {app && (
              <NavyCard accent={STATUS_INFO[app.status]?.border ?? GOLD}>
                <div className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{STATUS_INFO[app.status]?.icon}</span>
                  <div>
                    <p className="text-[10px] font-label tracking-widest" style={{ color: `${GOLD}60` }}>PREVIOUS APPLICATION</p>
                    <p className="text-sm font-bold text-white">{STATUS_INFO[app.status]?.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>再度お申し込みいただけます。</p>
                  </div>
                </div>
              </NavyCard>
            )}

            {/* 未申込の説明カード */}
            {!app && (
              <NavyCard>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ background: "rgba(110,231,183,0.10)", border: "1px solid rgba(110,231,183,0.20)" }}>📱</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-white text-sm font-jp">VP未来phone 申し込み</h2>
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(107,114,128,0.25)", color: "#9ca3af" }}>未申込</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>お得なスマートフォン回線サービス</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs mb-4" style={{ color: "rgba(255,255,255,0.60)" }}>
                    <div className="flex items-start gap-2"><span style={{ color: "#6ee7b7" }}>✓</span><span>申し込み後、担当者より順次ご連絡いたします</span></div>
                    <div className="flex items-start gap-2"><span style={{ color: "#6ee7b7" }}>✓</span><span>ご紹介いただいた方に紹介ポイントが付与されます</span></div>
                  </div>
                  <div className="flex flex-col gap-2 pt-3" style={{ borderTop: `1px solid ${GOLD}18` }}>
                    <Link href="/vp-phone/terms"
                      className="flex items-center justify-between rounded-xl px-4 py-2.5 transition"
                      style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.20)" }}>
                      <div className="flex items-center gap-2"><span>📄</span><span className="text-xs font-semibold" style={{ color: "#7dd3fc" }}>利用規約・重要事項説明</span></div>
                      <span style={{ color: "#7dd3fc" }}>›</span>
                    </Link>
                    <Link href="/vp-phone/privacy"
                      className="flex items-center justify-between rounded-xl px-4 py-2.5 transition"
                      style={{ background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.18)" }}>
                      <div className="flex items-center gap-2"><span>🔒</span><span className="text-xs font-semibold" style={{ color: "#6ee7b7" }}>個人情報の取扱いについて</span></div>
                      <span style={{ color: "#6ee7b7" }}>›</span>
                    </Link>
                  </div>
                </div>
              </NavyCard>
            )}

            {/* 申込フォーム */}
            <form onSubmit={onSubmit} className="space-y-4">

              {/* 申込者情報 */}
              <NavyCard>
                <div className="p-5">
                  <SectionLabel en="APPLICANT INFO" ja="申込者情報"/>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl} style={lblStyle}>お名前（漢字）<span className="text-red-400 ml-1">*</span></label>
                        <input required className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="山田 太郎" value={form.nameKanji} onChange={e => setForm({ ...form, nameKanji: e.target.value })} />
                      </div>
                      <div>
                        <label className={lbl} style={lblStyle}>お名前（かな）<span className="text-red-400 ml-1">*</span></label>
                        <input required className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="やまだ たろう" value={form.nameKana} onChange={e => setForm({ ...form, nameKana: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl} style={lblStyle}>メールアドレス<span className="text-red-400 ml-1">*</span></label>
                      <input required type="email" className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="example@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl} style={lblStyle}>パスワード（任意）</label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="VP未来phone申し込み用パスワード（任意）" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: `${GOLD}80` }}>{showPassword ? "隠す" : "表示"}</button>
                      </div>
                    </div>
                    {form.password && (
                      <div>
                        <label className={lbl} style={lblStyle}>パスワード（確認）</label>
                        <input type={showPassword ? "text" : "password"} className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="パスワードをもう一度入力" value={form.passwordConfirm} onChange={e => setForm({ ...form, passwordConfirm: e.target.value })} autoComplete="new-password" />
                        {form.passwordConfirm && form.password !== form.passwordConfirm && <p className="text-xs text-red-400 mt-1">パスワードが一致しません</p>}
                      </div>
                    )}
                    <div>
                      <label className={lbl} style={lblStyle}>電話番号<span className="text-red-400 ml-1">*</span></label>
                      <input required type="tel" className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="090-1234-5678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl} style={lblStyle}>生年月日<span className="text-red-400 ml-1">*</span></label>
                      <input required type="date" className={inp} style={{ ...inpStyle, ...focusRingStyle }} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl} style={lblStyle}>性別<span className="text-red-400 ml-1">*</span></label>
                      <div className="flex gap-3">
                        {[{ value: "male", label: "男性" }, { value: "female", label: "女性" }, { value: "other", label: "その他" }].map(opt => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                              style={{ borderColor: form.gender === opt.value ? "#6ee7b7" : "rgba(255,255,255,0.25)" }}>
                              {form.gender === opt.value && <div className="w-2 h-2 rounded-full" style={{ background: "#6ee7b7" }}/>}
                            </div>
                            <input type="radio" name="gender" value={opt.value} checked={form.gender === opt.value} onChange={() => setForm({ ...form, gender: opt.value })} className="sr-only" />
                            <span className="font-medium" style={{ color: form.gender === opt.value ? "#6ee7b7" : "rgba(255,255,255,0.70)" }}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </NavyCard>

              {/* 紹介者情報 */}
              <NavyCard accent={referrerAutoFilled ? "rgba(52,211,153,0.5)" : GOLD}>
                <div className="p-5">
                  <SectionLabel en="REFERRER INFO" ja="紹介者情報"/>
                  <div className="space-y-4">
                    {referrerAutoFilled && (
                      <div className="rounded-xl px-4 py-2.5" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
                        <p className="text-xs font-semibold" style={{ color: "#34d399" }}>✓ 紹介者が自動設定されました</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(52,211,153,0.65)" }}>ご紹介いただいた方が自動的に紹介者として設定されています。</p>
                      </div>
                    )}
                    <div>
                      <label className={lbl} style={lblStyle}>紹介者コード（会員コード）<span className="text-red-400 ml-1">*</span></label>
                      <input required className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="例: M0001" value={form.referrerCode}
                        onChange={e => { setForm({ ...form, referrerCode: e.target.value }); setReferrerAutoFilled(false); }} />
                    </div>
                    <div>
                      <label className={lbl} style={lblStyle}>紹介者名<span className="text-red-400 ml-1">*</span></label>
                      <input required className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="例: 山田 花子" value={form.referrerName} onChange={e => setForm({ ...form, referrerName: e.target.value })} />
                    </div>
                    <div className="rounded-xl px-4 py-2.5" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
                      <p className="text-xs font-semibold" style={{ color: GOLD_LIGHT }}>⚠️ 紹介者情報は必須項目です</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${GOLD}65` }}>紹介者の会員コードとお名前を必ずご入力ください。紹介者に紹介ポイントが付与されます。</p>
                    </div>
                  </div>
                </div>
              </NavyCard>

              {/* LINE情報 */}
              <NavyCard>
                <div className="p-5">
                  <SectionLabel en="LINE INFO" ja="LINE情報（任意）"/>
                  <div className="space-y-4">
                    <div>
                      <label className={lbl} style={lblStyle}>LINE ID</label>
                      <input className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="例: yamada_taro" value={form.lineId} onChange={e => setForm({ ...form, lineId: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl} style={lblStyle}>LINE表示名</label>
                      <input className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="例: 山田太郎" value={form.lineDisplayName} onChange={e => setForm({ ...form, lineDisplayName: e.target.value })} />
                    </div>
                  </div>
                </div>
              </NavyCard>

              {/* 契約種別選択 */}
              <NavyCard>
                <div className="p-5">
                  <SectionLabel en="CONTRACT TYPE" ja="契約種別の選択"/>
                  <p className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.40)" }}>※複数同時申込可能です</p>
                  <div className="grid grid-cols-1 gap-3">
                    {/* 音声回線 */}
                    <button type="button" onClick={() => setVoiceSelected(v => !v)}
                      className="rounded-2xl border p-4 text-left transition-all hover:scale-[1.01] active:scale-95"
                      style={voiceSelected
                        ? { background: "rgba(110,231,183,0.10)", border: "1.5px solid rgba(110,231,183,0.45)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
                          style={{ borderColor: voiceSelected ? "#6ee7b7" : "rgba(255,255,255,0.25)", background: voiceSelected ? "#6ee7b7" : "transparent" }}>
                          {voiceSelected && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: voiceSelected ? "rgba(110,231,183,0.15)" : "rgba(255,255,255,0.06)" }}>📱</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">音声回線契約</p>
                            {voiceSelected && <span className="text-xs rounded-full px-2 py-0.5 font-bold text-white" style={{ background: "rgba(110,231,183,0.3)", color: "#6ee7b7" }}>選択中</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>通話・SMS・データ通信（docomo回線）</p>
                          {voiceSelected && <p className="text-xs font-bold mt-1" style={{ color: "#6ee7b7" }}>月額小計: ¥{fmt(voiceTotal)}</p>}
                        </div>
                      </div>
                    </button>
                    {/* 大容量データ回線 */}
                    <button type="button" onClick={() => setDataSelected(v => !v)}
                      className="rounded-2xl border p-4 text-left transition-all hover:scale-[1.01] active:scale-95"
                      style={dataSelected
                        ? { background: "rgba(196,181,253,0.10)", border: "1.5px solid rgba(196,181,253,0.40)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
                          style={{ borderColor: dataSelected ? "#c4b5fd" : "rgba(255,255,255,0.25)", background: dataSelected ? "#c4b5fd" : "transparent" }}>
                          {dataSelected && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: dataSelected ? "rgba(196,181,253,0.15)" : "rgba(255,255,255,0.06)" }}>📶</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">大容量データ回線契約</p>
                            {dataSelected && <span className="text-xs rounded-full px-2 py-0.5 font-bold" style={{ background: "rgba(196,181,253,0.25)", color: "#c4b5fd" }}>選択中</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>VP未来Wi-Fi（楽天回線）</p>
                          {dataSelected && <p className="text-xs font-bold mt-1" style={{ color: "#c4b5fd" }}>月額小計: ¥{fmt(dataTotals.total)}{dataTotals.typeOnetime > 0 ? ` ＋端末 ¥${fmt(dataTotals.typeOnetime)}` : ""}</p>}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </NavyCard>

              {/* 音声回線プラン */}
              {voiceSelected && (
                <>
                  <div className="rounded-2xl p-4 flex items-center justify-between text-white"
                    style={{ background: `linear-gradient(135deg,${NAVY_CARD},rgba(16,120,80,0.60))`, border: "1px solid rgba(110,231,183,0.30)" }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "rgba(110,231,183,0.80)" }}>📱 音声回線 月額小計（税込）</p>
                      <p className="text-2xl font-black mt-0.5 text-white">¥{fmt(voiceTotal)}<span className="text-sm font-semibold">/月</span></p>
                    </div>
                    <span className="text-3xl opacity-70">📱</span>
                  </div>
                  <NavyCard accent="rgba(110,231,183,0.35)">
                    <div className="p-5">
                      <SectionLabel en="DATA PLAN" ja="データプラン（docomo回線）"/>
                      <p className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>※料金は税込月額料金</p>
                      <div className="space-y-2">{VOICE_DATA_PLANS.map(p => <RadioCard key={p.id} item={p} selected={voiceDataPlan === p.id} onSelect={() => setVoiceDataPlan(p.id)} color="green" />)}</div>
                    </div>
                  </NavyCard>
                  <NavyCard accent="rgba(110,231,183,0.25)">
                    <div className="p-5">
                      <SectionLabel en="CALL PLAN" ja="かけ放題"/>
                      <div className="space-y-2">{KAKEHOUDAI_PLANS.map(p => <RadioCard key={p.id} item={{ ...p, price: p.price }} selected={kakehoudai === p.id} onSelect={() => setKakehoudai(p.id)} color="green" priceLabel={p.price == null ? "無料" : `¥${fmt(p.price)}/月`} />)}</div>
                    </div>
                  </NavyCard>
                  <NavyCard accent="rgba(110,231,183,0.20)">
                    <div className="p-5">
                      <SectionLabel en="OPTIONS" ja="オプション（複数選択可）"/>
                      <div className="space-y-2">{VOICE_OPTIONS.map(o => <CheckCard key={o.id} item={o} checked={voiceOpts.includes(o.id)} onChange={checked => setVoiceOpts(prev => checked ? [...prev, o.id] : prev.filter(id => id !== o.id))} />)}</div>
                    </div>
                  </NavyCard>
                </>
              )}

              {/* 大容量データ回線プラン */}
              {dataSelected && (
                <>
                  <div className="rounded-2xl p-4 flex items-center justify-between text-white"
                    style={{ background: `linear-gradient(135deg,${NAVY_CARD},rgba(88,28,135,0.60))`, border: "1px solid rgba(196,181,253,0.30)" }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "rgba(196,181,253,0.80)" }}>📶 データ回線 月額小計（税込）</p>
                      <p className="text-2xl font-black mt-0.5 text-white">¥{fmt(dataTotals.total)}<span className="text-sm font-semibold">/月</span></p>
                      {dataTotals.typeOnetime > 0 && <p className="text-xs mt-0.5" style={{ color: "rgba(196,181,253,0.65)" }}>+ 端末代 ¥{fmt(dataTotals.typeOnetime)}（一括）</p>}
                    </div>
                    <span className="text-3xl opacity-70">📶</span>
                  </div>
                  <NavyCard accent="rgba(196,181,253,0.35)">
                    <div className="p-5">
                      <SectionLabel en="DATA CAPACITY" ja="データ容量（VP未来Wi-Fi）"/>
                      <p className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>※料金は税込月額料金</p>
                      <div className="space-y-2">{DATA_CAPACITY_PLANS.map(p => <RadioCard key={p.id} item={{ ...p, note: undefined, popular: undefined }} selected={dataCapacity === p.id} onSelect={() => setDataCapacity(p.id)} color="purple" />)}</div>
                    </div>
                  </NavyCard>
                  <NavyCard accent="rgba(196,181,253,0.25)">
                    <div className="p-5">
                      <SectionLabel en="DATA TYPE" ja="データ通信のタイプ"/>
                      <p className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>※SIM・レンタル機器の破損時は¥10,780（税込）を申し受けます</p>
                      <div className="space-y-2">{DATA_TYPE_PLANS.map(p => <RadioCard key={p.id} item={p} selected={dataType === p.id} onSelect={() => setDataType(p.id)} color="purple" priceLabel={p.priceType === "monthly" ? `+¥${fmt(p.price ?? 0)}/月` : p.priceType === "onetime" ? `買取 ¥${fmt(p.price ?? 0)}` : "追加料金なし"} />)}</div>
                    </div>
                  </NavyCard>
                </>
              )}

              {/* 合計・カード・同意 */}
              {(voiceSelected || dataSelected) && (
                <>
                  {/* 各プラン内訳 */}
                  {voiceSelected && (
                    <NavyCard accent="rgba(110,231,183,0.30)">
                      <div className="p-4">
                        <p className="text-[10px] font-label tracking-widest mb-3" style={{ color: "#6ee7b7" }}>📱 音声回線 内訳</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>データプラン</span><span className="font-semibold text-white">¥{fmt(VOICE_DATA_PLANS.find(p => p.id === voiceDataPlan)?.price ?? 0)}/月</span></div>
                          {kakehoudai !== "none" && <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>かけ放題</span><span className="font-semibold text-white">¥{fmt(KAKEHOUDAI_PLANS.find(p => p.id === kakehoudai)?.price ?? 0)}/月</span></div>}
                          {voiceOpts.map(id => { const opt = VOICE_OPTIONS.find(o => o.id === id); return opt ? <div key={id} className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>{opt.label}</span><span className="font-semibold text-white">¥{fmt(opt.price)}/月</span></div> : null; })}
                          <div className="flex justify-between pt-2" style={{ borderTop: "1px solid rgba(110,231,183,0.20)" }}>
                            <span className="font-bold" style={{ color: "#6ee7b7" }}>音声回線 小計</span>
                            <span className="font-black" style={{ color: "#6ee7b7" }}>¥{fmt(voiceTotal)}<span className="text-xs">/月</span></span>
                          </div>
                        </div>
                      </div>
                    </NavyCard>
                  )}
                  {dataSelected && (
                    <NavyCard accent="rgba(196,181,253,0.30)">
                      <div className="p-4">
                        <p className="text-[10px] font-label tracking-widest mb-3" style={{ color: "#c4b5fd" }}>📶 データ回線 内訳</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>データ容量</span><span className="font-semibold text-white">¥{fmt(DATA_CAPACITY_PLANS.find(p => p.id === dataCapacity)?.price ?? 0)}/月</span></div>
                          {(() => { const tp = DATA_TYPE_PLANS.find(p => p.id === dataType); if (!tp) return null; if (tp.priceType === "monthly") return <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>{tp.label}</span><span className="font-semibold text-white">+¥{fmt(tp.price ?? 0)}/月</span></div>; if (tp.priceType === "onetime") return <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>{tp.label}</span><span className="font-semibold" style={{ color: ORANGE }}>¥{fmt(tp.price ?? 0)}（一括）</span></div>; return <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.55)" }}>{tp.label}</span><span style={{ color: "rgba(255,255,255,0.40)" }}>追加料金なし</span></div>; })()}
                          <div className="flex justify-between pt-2" style={{ borderTop: "1px solid rgba(196,181,253,0.20)" }}>
                            <span className="font-bold" style={{ color: "#c4b5fd" }}>データ回線 小計</span>
                            <span className="font-black" style={{ color: "#c4b5fd" }}>¥{fmt(dataTotals.total)}<span className="text-xs">/月</span></span>
                          </div>
                          {dataTotals.typeOnetime > 0 && <div className="flex justify-between text-xs" style={{ color: ORANGE }}><span>端末代（別途一括）</span><span className="font-bold">¥{fmt(dataTotals.typeOnetime)}</span></div>}
                        </div>
                      </div>
                    </NavyCard>
                  )}

                  {/* 総合計カード */}
                  <div className="rounded-3xl overflow-hidden"
                    style={{ background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}35`, boxShadow: `0 12px 40px rgba(10,22,40,0.25),0 0 0 1px ${GOLD}10` }}>
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90,${GOLD_LIGHT},${GOLD}90,transparent)` }}/>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">💴</span>
                        <p className="text-xs font-label tracking-widest font-bold" style={{ color: `${GOLD}80` }}>TOTAL PAYMENT</p>
                      </div>
                      {voiceSelected && dataSelected && (
                        <div className="rounded-xl px-4 py-3 mb-4 space-y-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: "rgba(255,255,255,0.55)" }}>📱 音声回線</span>
                            <span className="font-semibold text-white">¥{fmt(voiceTotal)}/月</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: "rgba(255,255,255,0.55)" }}>📶 データ回線</span>
                            <span className="font-semibold text-white">¥{fmt(dataTotals.total)}/月{dataTotals.typeOnetime > 0 ? ` ＋端末¥${fmt(dataTotals.typeOnetime)}` : ""}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-black leading-none text-white">¥{fmt(grandMonthly)}<span className="text-base font-semibold">/月</span></p>
                          {grandOnetime > 0 && <p className="text-xs mt-1" style={{ color: `${ORANGE}` }}>＋端末代 ¥{fmt(grandOnetime)}（別途一括）</p>}
                        </div>
                        <span className="text-4xl opacity-60">{voiceSelected && dataSelected ? "📱📶" : voiceSelected ? "📱" : "📶"}</span>
                      </div>
                      <p className="text-[10px] mt-3 pt-2" style={{ borderTop: `1px solid ${GOLD}18`, color: `${GOLD}50` }}>※ 表示金額はすべて税込です。申し込み後、担当者よりご確認のご連絡をいたします。</p>
                    </div>
                  </div>

                  {/* カード情報 */}
                  <NavyCard>
                    <div className="p-5">
                      <SectionLabel en="PAYMENT INFO" ja="お支払い情報"/>
                      <div className="mb-4 rounded-xl px-4 py-3" style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.20)" }}>
                        <p className="text-xs font-bold" style={{ color: "#7dd3fc" }}>💳 お支払い方法：クレジットカード・デビットカードのみ</p>
                        <p className="text-[10px] mt-1" style={{ color: "rgba(125,211,252,0.65)" }}>VISA / Mastercard / JCB / American Express 対応</p>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className={lbl} style={lblStyle}>カード番号<span className="text-red-400 ml-1">*</span></label>
                          <input type="text" inputMode="numeric" className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="1234 5678 9012 3456" value={form.cardNumber} onChange={e => setForm({ ...form, cardNumber: formatCardNumber(e.target.value) })} maxLength={19} autoComplete="cc-number" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lbl} style={lblStyle}>有効期限<span className="text-red-400 ml-1">*</span></label>
                            <input type="text" inputMode="numeric" className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="MM/YY" value={form.cardExpiry} onChange={e => setForm({ ...form, cardExpiry: formatExpiry(e.target.value) })} maxLength={5} autoComplete="cc-exp" />
                          </div>
                          <div>
                            <label className={lbl} style={lblStyle}>セキュリティコード<span className="text-red-400 ml-1">*</span></label>
                            <div className="relative">
                              <input type={showCardCvc ? "text" : "password"} inputMode="numeric" className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="CVC" value={form.cardCvc} onChange={e => setForm({ ...form, cardCvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} autoComplete="cc-csc" />
                              <button type="button" onClick={() => setShowCardCvc(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: `${GOLD}70` }}>{showCardCvc ? "隠す" : "表示"}</button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className={lbl} style={lblStyle}>カード名義（ローマ字）<span className="text-red-400 ml-1">*</span></label>
                          <input type="text" className={inp} style={{ ...inpStyle, ...focusRingStyle }} placeholder="TARO YAMADA" value={form.cardName} onChange={e => setForm({ ...form, cardName: e.target.value.toUpperCase() })} autoComplete="cc-name" />
                        </div>
                      </div>
                      <p className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>※ カード情報は安全に処理されます。担当者がご確認後、正式な決済手続きをご案内いたします。</p>
                    </div>
                  </NavyCard>

                  {/* 同意 */}
                  <NavyCard>
                    <div className="p-5 space-y-3">
                      <SectionLabel en="AGREEMENT" ja="規約への同意"/>
                      <Link href="/vp-phone/terms"
                        className="flex items-center justify-between rounded-xl px-4 py-3 transition"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <div className="flex items-center gap-2"><span>📄</span>
                          <div><p className="text-xs font-semibold text-white">利用規約・重要事項説明</p><p className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>VP未来phone / VP未来Wi-Fi</p></div>
                        </div>
                        <span style={{ color: `${GOLD}80` }}>›</span>
                      </Link>
                      <Link href="/vp-phone/privacy"
                        className="flex items-center justify-between rounded-xl px-4 py-3 transition"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <div className="flex items-center gap-2"><span>🔒</span>
                          <div><p className="text-xs font-semibold text-white">個人情報の取扱いについて</p><p className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>プライバシーポリシー</p></div>
                        </div>
                        <span style={{ color: `${GOLD}80` }}>›</span>
                      </Link>
                      <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 p-3 transition"
                        style={agreed
                          ? { background: "rgba(110,231,183,0.07)", border: "1.5px solid rgba(110,231,183,0.35)" }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        <div className="mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
                          style={{ borderColor: agreed ? "#6ee7b7" : "rgba(255,255,255,0.25)", background: agreed ? "#6ee7b7" : "transparent" }}>
                          {agreed && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
                        <span className="text-xs font-medium leading-relaxed" style={{ color: agreed ? "rgba(110,231,183,0.85)" : "rgba(255,255,255,0.60)" }}>
                          上記の利用規約・重要事項説明および個人情報の取扱いについて確認し、同意します。
                        </span>
                      </label>
                    </div>
                  </NavyCard>

                  {error && (
                    <div className="rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)", color: "#fca5a5" }}>{error}</div>
                  )}

                  <button type="submit" disabled={saving || !agreed}
                    className="w-full rounded-2xl py-4 text-base font-bold text-white transition-all hover:scale-[1.01] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: voiceSelected && dataSelected ? `linear-gradient(135deg,${NAVY_CARD2},rgba(16,120,80,0.80) 50%,rgba(88,28,135,0.70))` : voiceSelected ? `linear-gradient(135deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT})` : `linear-gradient(135deg,${NAVY_CARD3},rgba(88,28,135,0.80))` }}>
                    {saving ? "送信中..." : "📱 VP未来phone を申し込む"}
                  </button>
                  <p className="text-center text-xs pb-4" style={{ color: "rgba(255,255,255,0.35)" }}>申し込み後、担当者より順次ご連絡いたします</p>
                </>
              )}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
