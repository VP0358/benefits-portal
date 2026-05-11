"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

// ── ステータス設定（4種類）
const STATUS_CONFIG: Record<string, {
  label: string; desc: string;
  bg: string; text: string; border: string; dot: string;
  icon: string;
}> = {
  active: {
    label: "有効",
    desc: "期限内に入金が確認されました。サービスをご利用いただけます。",
    bg: "rgba(52,211,153,0.12)", text: "#34d399", border: "rgba(52,211,153,0.30)", dot: "#34d399",
    icon: "✅",
  },
  pending: {
    label: "審査待ち",
    desc: "入金確認後、管理側で審査を行い「有効」に変更されます。しばらくお待ちください。",
    bg: `${GOLD}14`, text: GOLD_LIGHT, border: `${GOLD}30`, dot: GOLD,
    icon: "⏳",
  },
  canceled: {
    label: "解約済み",
    desc: "解約申請が受理されました。サービスのご利用はできません。",
    bg: "rgba(107,114,128,0.10)", text: "#9ca3af", border: "rgba(107,114,128,0.25)", dot: "#9ca3af",
    icon: "🚫",
  },
  suspended: {
    label: "停止中",
    desc: "期限内に入金が確認できなかったため、一時停止中です。ご入金後に担当者へご連絡ください。",
    bg: "rgba(248,113,113,0.10)", text: "#f87171", border: "rgba(248,113,113,0.28)", dot: "#f87171",
    icon: "⏸",
  },
};

type TravelSub = {
  id: string;
  planName: string;
  level: number;
  pricingTier: string;
  monthlyFee: number;
  status: string;
  forceStatus: string;
  startedAt: string | null;
  confirmedAt: string | null;
};

type ApiData = {
  displayStatus: "active" | "inactive" | "none";
  sub: TravelSub | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

// 実効ステータスを計算（forceStatus優先）
function getEffectiveStatus(sub: TravelSub): string {
  if (sub.forceStatus === "forced_active")   return "active";
  if (sub.forceStatus === "forced_inactive") return "suspended";
  return sub.status;
}

export default function TravelStatusPage() {
  const [data, setData]     = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/my/travel-subscription")
      .then(r => r.json())
      .then((d: ApiData) => { setData(d); setLoading(false); })
      .catch(() => { setError("データの取得に失敗しました"); setLoading(false); });
  }, []);

  const sub = data?.sub ?? null;
  const effectiveStatus = sub ? getEffectiveStatus(sub) : null;
  const statusCfg = effectiveStatus ? (STATUS_CONFIG[effectiveStatus] ?? null) : null;

  return (
    <div className="min-h-screen pb-20" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.14]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-10 -left-10 w-64 h-64 rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle,${NAVY}44,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{
          background: "rgba(245,240,232,0.96)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`,
          boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset",
        }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard"
            className="flex items-center gap-1.5 transition"
            style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "#93c5fd" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>格安旅行 登録状況確認</h1>
          </div>
          <div className="flex-1 h-px ml-2"
            style={{ background: "linear-gradient(90deg,rgba(147,197,253,0.35),transparent)" }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5 relative">

        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: `${GOLD}25`, borderTopColor: GOLD }}/>
            <p className="text-sm font-jp" style={{ color: `${GOLD}60` }}>読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {!loading && error && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-medium font-jp text-sm" style={{ color: "#f87171" }}>{error}</p>
            <button onClick={() => { setLoading(true); fetch("/api/my/travel-subscription").then(r=>r.json()).then(d=>{setData(d);setLoading(false);}).catch(()=>{setError("データの取得に失敗しました");setLoading(false);}); }}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg,${GOLD_DARK},${GOLD})` }}>
              再読み込み
            </button>
          </div>
        )}

        {/* 未登録 */}
        {!loading && !error && data?.displayStatus === "none" && (
          <div className="rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`,
              border: `1px solid ${GOLD}28`,
              boxShadow: "0 12px 40px rgba(10,22,40,0.22)",
            }}>
            <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}80,transparent)` }}/>
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">✈️</div>
              <p className="text-lg font-bold font-jp text-white mb-2">未登録</p>
              <p className="text-sm font-jp mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
                格安旅行サービスへのご登録がまだです。<br/>
                ダッシュボードから申し込みができます。
              </p>
              <Link href="/dashboard"
                className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT})` }}>
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        )}

        {/* 登録済み：ステータス表示 */}
        {!loading && !error && sub && statusCfg && (
          <>
            {/* メインステータスカード */}
            <div className="rounded-3xl overflow-hidden"
              style={{
                background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 55%,${NAVY_CARD3} 100%)`,
                border: `1px solid ${statusCfg.border}`,
                boxShadow: `0 12px 40px rgba(10,22,40,0.22),0 0 0 1px ${statusCfg.text}10 inset`,
              }}>
              {/* 上部カラーライン */}
              <div className="h-1" style={{ background: `linear-gradient(90deg,transparent,${statusCfg.dot}90,${statusCfg.dot},${statusCfg.dot}90,transparent)` }}/>

              <div className="p-6">
                {/* ステータス大バッジ */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p style={{ fontSize: "11px", letterSpacing: "0.18em", fontWeight: 800, color: GOLD_LIGHT }}>TRAVEL SERVICE STATUS</p>
                    <h2 className="font-black text-white mt-1" style={{ fontSize: "17px" }}>{sub.planName}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-3xl">{statusCfg.icon}</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold font-jp"
                      style={{ background: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}` }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusCfg.dot }}/>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* ステータス説明 */}
                <div className="rounded-2xl p-4 mb-5"
                  style={{ background: `${statusCfg.text}08`, border: `1px solid ${statusCfg.border}` }}>
                  <p className="text-sm font-jp leading-relaxed" style={{ color: `${statusCfg.text}CC` }}>
                    {statusCfg.desc}
                  </p>
                </div>

                {/* プラン詳細 */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "レベル", value: `Lv.${sub.level}` },
                    { label: "月額料金", value: `¥${sub.monthlyFee.toLocaleString()}` },
                    { label: "プランタイプ", value: sub.pricingTier === "early" ? "早期特別料金" : "標準料金" },
                    { label: "確認日", value: fmtDate(sub.confirmedAt) },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[10px] font-label tracking-wider mb-1" style={{ color: `${GOLD}55` }}>
                        {item.label}
                      </p>
                      <p className="text-sm font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* 開始日 */}
                {sub.startedAt && (
                  <div className="mt-3 rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: `${GOLD}60` }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <div>
                      <p className="text-[10px] font-label" style={{ color: `${GOLD}55` }}>サービス開始日</p>
                      <p className="text-sm font-bold text-white">{fmtDate(sub.startedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ステータス一覧カード（説明） */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.20)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.14)" }}>
                <p className="text-[9px] font-label tracking-[0.26em] mb-0.5" style={{ color: `${GOLD_DARK}80` }}>STATUS GUIDE</p>
                <p className="text-sm font-semibold font-jp" style={{ color: NAVY }}>ステータスについて</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(201,168,76,0.10)" }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key}
                    className="px-5 py-4 flex items-start gap-3"
                    style={{
                      background: key === effectiveStatus ? `${cfg.text}06` : "transparent",
                    }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.dot }}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold font-jp" style={{ color: cfg.text }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {key === effectiveStatus && (
                          <span className="text-[9px] font-label px-2 py-0.5 rounded-full"
                            style={{ background: `${cfg.text}18`, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                            現在のステータス
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-jp leading-relaxed" style={{ color: "rgba(10,22,40,0.55)" }}>
                        {cfg.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* お問い合わせ案内 */}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: `linear-gradient(145deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}20`,
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold font-jp text-white mb-1">お問い合わせ</p>
                <p className="text-xs font-jp leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                  ステータス変更や解約のご希望は担当者にお問い合わせください。<br/>
                  入金確認後のステータス変更は管理側で手動対応いたします。
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
