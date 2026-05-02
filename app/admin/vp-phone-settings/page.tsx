"use client";

import { FormEvent, useEffect, useState } from "react";

// ── デフォルト値（管理側で設定がない場合のフォールバック）
const DEFAULT_VOICE_DATA_PLANS = [
  { id: "rakuraku", label: "★定額・らくらくプラン", price: 5500, note: "25GB＋無制限かけ放題", popular: true },
  { id: "no_data",  label: "データ通信なし",         price: 825,  note: "", popular: false },
  { id: "1gb",      label: "1GB",                     price: 1155, note: "", popular: false },
  { id: "5gb",      label: "5GB",                     price: 1782, note: "", popular: false },
  { id: "10gb",     label: "10GB",                    price: 2695, note: "", popular: false },
  { id: "25gb",     label: "25GB",                    price: 3806, note: "", popular: false },
];
const DEFAULT_KAKEHOUDAI_PLANS = [
  { id: "none",      label: "かけ放題なし",   price: 0,    isFree: true },
  { id: "5min",      label: "5分かけ放題",    price: 1100, isFree: false },
  { id: "10min",     label: "10分かけ放題",   price: 1430, isFree: false },
  { id: "unlimited", label: "無制限かけ放題", price: 2860, isFree: false },
];
const DEFAULT_VOICE_OPTIONS = [
  { id: "rusuban",  label: "留守番電話",   price: 495 },
  { id: "catchhon", label: "キャッチホン", price: 385 },
];
const DEFAULT_DATA_CAPACITY_PLANS = [
  { id: "50gb",      label: "50GB",  price: 2860 },
  { id: "unlimited", label: "無制限", price: 3278 },
];
const DEFAULT_DATA_TYPE_PLANS = [
  { id: "esim",        label: "eSIM（本体一体型）",        price: 0,     priceType: "none" },
  { id: "sim",         label: "SIMカード",                  price: 0,     priceType: "none" },
  { id: "pocket_rent", label: "ポケットWi-Fi（レンタル）", price: 330,   priceType: "monthly" },
  { id: "home_rent",   label: "置き型Wi-Fi（レンタル）",   price: 550,   priceType: "monthly" },
  { id: "pocket_buy",  label: "ポケットWi-Fi（買取）",     price: 6600,  priceType: "onetime" },
  { id: "home_buy",    label: "置き型Wi-Fi（買取）",       price: 11000, priceType: "onetime" },
];

type VoiceDataPlan   = { id: string; label: string; price: number; note: string; popular: boolean };
type KakehoudaiPlan  = { id: string; label: string; price: number; isFree: boolean };
type VoiceOption     = { id: string; label: string; price: number };
type DataCapacityPlan = { id: string; label: string; price: number };
type DataTypePlan    = { id: string; label: string; price: number; priceType: "none" | "monthly" | "onetime" };

const lbl = "block text-xs font-semibold text-slate-700 mb-1";
const inp = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none";
const numInp = "w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm text-right text-slate-800 focus:border-slate-500 focus:outline-none";

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {badge && <span className="rounded-full bg-blue-100 text-blue-700 text-xs px-2 py-0.5">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function PlanRow<T extends { id: string; label: string; price: number }>({
  plan, onChange, onRemove, extra,
}: {
  plan: T;
  onChange: (field: string, value: string | number | boolean) => void;
  onRemove?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex-1 min-w-[140px]">
        <label className={lbl}>ラベル</label>
        <input className={inp} value={plan.label} onChange={e => onChange("label", e.target.value)} />
      </div>
      <div>
        <label className={lbl}>金額（円・税込）</label>
        <input type="number" min={0} className={numInp} value={plan.price}
          onChange={e => onChange("price", Number(e.target.value))} />
      </div>
      {extra}
      {onRemove && (
        <button type="button" onClick={onRemove}
          className="mt-4 rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
          削除
        </button>
      )}
    </div>
  );
}

export default function VpPhoneSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [isError, setIsError] = useState(false);

  const [voicePlans,    setVoicePlans]    = useState<VoiceDataPlan[]>(DEFAULT_VOICE_DATA_PLANS);
  const [kakePlans,     setKakePlans]     = useState<KakehoudaiPlan[]>(DEFAULT_KAKEHOUDAI_PLANS);
  const [voiceOptions,  setVoiceOptions]  = useState<VoiceOption[]>(DEFAULT_VOICE_OPTIONS);
  const [dataCapacity,  setDataCapacity]  = useState<DataCapacityPlan[]>(DEFAULT_DATA_CAPACITY_PLANS);
  const [dataTypePlans, setDataTypePlans] = useState<DataTypePlan[]>(DEFAULT_DATA_TYPE_PLANS);

  useEffect(() => {
    fetch("/api/admin/welfare-plans")
      .then(r => r.json())
      .then(d => {
        const vp = d.vpPhonePlans;
        if (vp) {
          if (Array.isArray(vp.voiceDataPlans))   setVoicePlans(vp.voiceDataPlans);
          if (Array.isArray(vp.kakehoudaiPlans))  setKakePlans(vp.kakehoudaiPlans);
          if (Array.isArray(vp.voiceOptions))     setVoiceOptions(vp.voiceOptions);
          if (Array.isArray(vp.dataCapacityPlans)) setDataCapacity(vp.dataCapacityPlans);
          if (Array.isArray(vp.dataTypePlans))    setDataTypePlans(vp.dataTypePlans);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── 汎用更新ヘルパー
  function updateArr<T>(arr: T[], setArr: (a: T[]) => void, idx: number, field: string, value: unknown) {
    setArr(arr.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }
  function removeItem<T>(arr: T[], setArr: (a: T[]) => void, idx: number) {
    setArr(arr.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(""); setIsError(false);
    const res = await fetch("/api/admin/welfare-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vpPhonePlans: {
          voiceDataPlans:   voicePlans,
          kakehoudaiPlans:  kakePlans,
          voiceOptions:     voiceOptions,
          dataCapacityPlans: dataCapacity,
          dataTypePlans:    dataTypePlans,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) { setIsError(true); setMsg("保存に失敗しました。"); return; }
    setMsg("✅ 保存しました！会員画面に反映されます。");
  }

  if (loading) return (
    <div className="rounded-3xl bg-white p-10 shadow-sm text-center text-slate-600">読み込み中...</div>
  );

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-800">📱 VPphone プラン・金額設定</h1>
        <p className="text-sm text-slate-600 mt-1">
          会員が申込フォームで見るプラン・料金をここから変更できます。変更後は「保存する」を押してください。
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* ━━━ 音声回線プラン ━━━ */}
        <SectionCard title="📱 音声回線プラン（データ容量）" badge={`${voicePlans.length}件`}>
          <p className="text-xs text-slate-500">ラベル・金額を変更できます。行の追加・削除も可能です。</p>
          <div className="space-y-3">
            {voicePlans.map((plan, idx) => (
              <PlanRow
                key={plan.id}
                plan={plan}
                onChange={(field, val) => updateArr(voicePlans, setVoicePlans, idx, field, val)}
                onRemove={voicePlans.length > 1 ? () => removeItem(voicePlans, setVoicePlans, idx) : undefined}
                extra={
                  <div className="flex flex-col gap-1">
                    <label className={lbl}>備考テキスト</label>
                    <input className={inp} style={{ width: 160 }} placeholder="例: 25GB＋無制限"
                      value={plan.note}
                      onChange={e => updateArr(voicePlans, setVoicePlans, idx, "note", e.target.value)} />
                    <label className="flex items-center gap-1.5 text-xs mt-1 cursor-pointer">
                      <input type="checkbox" checked={plan.popular}
                        onChange={e => updateArr(voicePlans, setVoicePlans, idx, "popular", e.target.checked)} />
                      人気バッジを表示
                    </label>
                  </div>
                }
              />
            ))}
          </div>
          <button type="button"
            onClick={() => setVoicePlans(prev => [...prev, { id: `plan_${Date.now()}`, label: "新プラン", price: 0, note: "", popular: false }])}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ プランを追加
          </button>
        </SectionCard>

        {/* ━━━ かけ放題プラン ━━━ */}
        <SectionCard title="📞 かけ放題プラン" badge={`${kakePlans.length}件`}>
          <p className="text-xs text-slate-500">「かけ放題なし」は金額0・無料フラグをONにしてください。</p>
          <div className="space-y-3">
            {kakePlans.map((plan, idx) => (
              <div key={plan.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex-1 min-w-[140px]">
                  <label className={lbl}>ラベル</label>
                  <input className={inp} value={plan.label}
                    onChange={e => updateArr(kakePlans, setKakePlans, idx, "label", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>追加料金（円）</label>
                  <input type="number" min={0} className={numInp} value={plan.price}
                    onChange={e => updateArr(kakePlans, setKakePlans, idx, "price", Number(e.target.value))} />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={plan.isFree}
                      onChange={e => updateArr(kakePlans, setKakePlans, idx, "isFree", e.target.checked)} />
                    無料（かけ放題なし）
                  </label>
                </div>
                {kakePlans.length > 1 && (
                  <button type="button" onClick={() => removeItem(kakePlans, setKakePlans, idx)}
                    className="mt-4 rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50">削除</button>
                )}
              </div>
            ))}
          </div>
          <button type="button"
            onClick={() => setKakePlans(prev => [...prev, { id: `kake_${Date.now()}`, label: "新プラン", price: 0, isFree: false }])}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ プランを追加
          </button>
        </SectionCard>

        {/* ━━━ 音声オプション ━━━ */}
        <SectionCard title="⚙️ 音声オプション（複数選択可）" badge={`${voiceOptions.length}件`}>
          <div className="space-y-3">
            {voiceOptions.map((opt, idx) => (
              <PlanRow
                key={opt.id}
                plan={opt}
                onChange={(field, val) => updateArr(voiceOptions, setVoiceOptions, idx, field, val)}
                onRemove={voiceOptions.length > 1 ? () => removeItem(voiceOptions, setVoiceOptions, idx) : undefined}
              />
            ))}
          </div>
          <button type="button"
            onClick={() => setVoiceOptions(prev => [...prev, { id: `opt_${Date.now()}`, label: "新オプション", price: 0 }])}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ オプションを追加
          </button>
        </SectionCard>

        {/* ━━━ 大容量データ容量プラン ━━━ */}
        <SectionCard title="📶 大容量データ容量プラン（VP未来Wi-Fi）" badge={`${dataCapacity.length}件`}>
          <div className="space-y-3">
            {dataCapacity.map((plan, idx) => (
              <PlanRow
                key={plan.id}
                plan={plan}
                onChange={(field, val) => updateArr(dataCapacity, setDataCapacity, idx, field, val)}
                onRemove={dataCapacity.length > 1 ? () => removeItem(dataCapacity, setDataCapacity, idx) : undefined}
              />
            ))}
          </div>
          <button type="button"
            onClick={() => setDataCapacity(prev => [...prev, { id: `data_${Date.now()}`, label: "新プラン", price: 0 }])}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ プランを追加
          </button>
        </SectionCard>

        {/* ━━━ データ通信タイプ ━━━ */}
        <SectionCard title="📡 データ通信タイプ（SIM・Wi-Fi等）" badge={`${dataTypePlans.length}件`}>
          <p className="text-xs text-slate-500">料金タイプ：none=追加料金なし / monthly=月額加算 / onetime=買取一括</p>
          <div className="space-y-3">
            {dataTypePlans.map((plan, idx) => (
              <div key={plan.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex-1 min-w-[160px]">
                  <label className={lbl}>ラベル</label>
                  <input className={inp} value={plan.label}
                    onChange={e => updateArr(dataTypePlans, setDataTypePlans, idx, "label", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>金額（円）</label>
                  <input type="number" min={0} className={numInp} value={plan.price}
                    onChange={e => updateArr(dataTypePlans, setDataTypePlans, idx, "price", Number(e.target.value))} />
                </div>
                <div>
                  <label className={lbl}>料金タイプ</label>
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none"
                    value={plan.priceType}
                    onChange={e => updateArr(dataTypePlans, setDataTypePlans, idx, "priceType", e.target.value)}>
                    <option value="none">none（追加料金なし）</option>
                    <option value="monthly">monthly（月額加算）</option>
                    <option value="onetime">onetime（買取一括）</option>
                  </select>
                </div>
                {dataTypePlans.length > 1 && (
                  <button type="button" onClick={() => removeItem(dataTypePlans, setDataTypePlans, idx)}
                    className="mt-4 rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50">削除</button>
                )}
              </div>
            ))}
          </div>
          <button type="button"
            onClick={() => setDataTypePlans(prev => [...prev, { id: `dtype_${Date.now()}`, label: "新タイプ", price: 0, priceType: "none" }])}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ タイプを追加
          </button>
        </SectionCard>

        {/* メッセージ・保存ボタン */}
        {msg && (
          <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${isError ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
            {msg}
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? "保存中..." : "✓ 保存する"}
          </button>
        </div>

      </form>
    </div>
  );
}
