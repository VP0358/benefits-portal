"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

type StatusData = {
  memberCode: string;
  name: string;
  status: string;
  memberType: string;
  currentLevel: number;
  currentLevelLabel: string;
  titleLevel: number;
  titleLevelLabel: string;
  conditionAchieved: boolean;
  forceActive: boolean;
  savingsPoints: number;
  currentMonth: string;
  lastMonth: string;
  currentMonthPoints: number;
  currentMonthAmount: number;
  currentMonthCount: number;
  lastMonthPoints: number;
  lastMonthAmount: number;
  lastMonthCount: number;
  directCount: number;
  directActiveCount: number;
  downlineCount: number;
  autoPoints: number;
  manualPoints: number;
  externalPoints: number;
  availablePoints: number;
  latestBonus: {
    bonusMonth: string;
    confirmedAt: string | null;
    isActive: boolean;
    paymentAmount: number;
    totalBonus: number;
    groupPoints: number;
    groupActiveCount: number;
  } | null;
};

// ── カラー定数 ──
const GOLD      = "#d4a853";
const GOLD_LIGHT= "#f0c060";
const ORANGE    = "#e8893a";
const PAGE_BG   = "#071228";
const CARD_BG   = "#0f2347";
const CARD_BG2  = "#132a54";

const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ", inactive: "非アクティブ", suspended: "停止中",
  canceled: "解約済", pending: "審査中",
};
type StatusTheme = { dotColor: string; textColor: string; bgColor: string; borderColor: string };
const STATUS_THEME: Record<string, StatusTheme> = {
  active:   { dotColor: "#34d399", textColor: "#34d399",  bgColor: "rgba(16,185,129,0.08)",  borderColor: "rgba(52,211,153,0.25)" },
  inactive: { dotColor: "#9ca3af", textColor: "#d1d5db",  bgColor: "rgba(75,85,99,0.1)",     borderColor: "rgba(156,163,175,0.2)" },
  suspended:{ dotColor: "#f97316", textColor: "#f97316",  bgColor: "rgba(249,115,22,0.08)",  borderColor: "rgba(249,115,22,0.25)" },
  canceled: { dotColor: "#f87171", textColor: "#f87171",  bgColor: "rgba(239,68,68,0.08)",   borderColor: "rgba(248,113,113,0.25)" },
  pending:  { dotColor: ORANGE,    textColor: ORANGE,     bgColor: `${ORANGE}12`,            borderColor: `${ORANGE}40` },
};

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4"
      style={{ borderBottom: `1px solid rgba(212,168,83,0.1)` }}>
      <span className="text-lg">{icon}</span>
      <h2 className="text-sm font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>{title}</h2>
    </div>
  );
}

function DataRow({ label, value, gold, svgD }: { label: string; value: React.ReactNode; gold?: boolean; svgD?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5"
      style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
      <div className="flex items-center gap-2">
        {svgD && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: gold ? GOLD : "rgba(255,255,255,0.3)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svgD} />
          </svg>
        )}
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
      </div>
      <span className={`font-bold text-sm ${gold ? "" : "text-white/80"}`}
        style={gold ? { color: GOLD_LIGHT } : {}}>
        {value}
      </span>
    </div>
  );
}

export default function MlmStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-status")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const theme = data ? (STATUS_THEME[data.status] ?? STATUS_THEME.inactive) : STATUS_THEME.inactive;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: `rgba(7,18,40,0.97)`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD}20` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(255,255,255,0.5)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h1 className="text-base font-bold text-white">MLM 状況</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}></div>
            <p className="text-sm" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-sm border border-red-500/20 bg-red-500/10 text-red-400">{error}</div>
        )}

        {data && (
          <>
            {/* ── ヒーローカード ── */}
            <div className="rounded-3xl overflow-hidden"
              style={{ background: `linear-gradient(150deg, #0d1e45, #162a56)`, border: `1px solid ${GOLD}30` }}>
              {/* ゴールドライン */}
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, ${ORANGE}, transparent)` }}></div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>会員ID</p>
                    <p className="font-mono font-bold text-base" style={{ color: "rgba(255,255,255,0.7)" }}>{data.memberCode}</p>
                    <p className="text-2xl font-black text-white mt-0.5">{data.name} <span style={{ color: GOLD }}>さん</span></p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.dotColor }}></span>
                      <span className="text-sm font-bold" style={{ color: theme.textColor }}>
                        {STATUS_LABELS[data.status] ?? data.status}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {data.memberType === "business" ? "ビジネス会員" : "愛用会員"}
                    </p>
                    {data.forceActive && (
                      <span className="inline-block mt-1.5 text-xs rounded-full px-2 py-0.5"
                        style={{ color: "#67e8f9", background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
                        強制アクティブ
                      </span>
                    )}
                  </div>
                </div>

                {/* レベル表示 */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "当月レベル", value: data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—", sub: data.currentLevelLabel, color: GOLD },
                    { label: "称号レベル", value: data.titleLevel > 0  ? `LV.${data.titleLevel}` : "—",  sub: data.titleLevelLabel,  color: ORANGE },
                    { label: "条件達成",   value: data.conditionAchieved ? "✅" : "—", sub: data.conditionAchieved ? "達成" : "未達成", color: data.conditionAchieved ? "#34d399" : "rgba(255,255,255,0.3)" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${item.color}20` }}>
                      <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</div>
                      <div className="font-black text-xl" style={{ color: item.color }}>{item.value}</div>
                      <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }}></div>
            </div>

            {/* ── 購入状況 ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
              <SectionTitle icon="📦" title="購入状況" />
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4" style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}25` }}>
                    <div className="text-xs font-semibold mb-3" style={{ color: ORANGE }}>今月（{data.currentMonth}）</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>購入回数</span>
                        <span className="font-bold text-white">{data.currentMonthCount}<span className="text-xs text-white/40 ml-0.5">件</span></span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>購入pt</span>
                        <span className="font-bold" style={{ color: ORANGE }}>{data.currentMonthPoints.toLocaleString()}<span className="text-xs ml-0.5" style={{ color: `${ORANGE}70` }}>pt</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>先月（{data.lastMonth}）</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>購入回数</span>
                        <span className="font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{data.lastMonthCount}<span className="text-xs ml-0.5 opacity-60">件</span></span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>購入pt</span>
                        <span className="font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{data.lastMonthPoints.toLocaleString()}<span className="text-xs ml-0.5 opacity-60">pt</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 組織状況 ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
              <SectionTitle icon="🌳" title="組織状況" />
              <div className="p-4 grid grid-cols-3 gap-3">
                {[
                  { label: "直紹介数",   value: data.directCount,       unit: "人", color: "#34d399" },
                  { label: "直紹介ACT", value: data.directActiveCount, unit: "人", color: ORANGE },
                  { label: "直下人数",   value: data.downlineCount,     unit: "人", color: GOLD },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl p-3 text-center"
                    style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
                    <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</div>
                    <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{item.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ポイント残高 ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
              <SectionTitle icon="💎" title="ポイント残高" />
              <div>
                {[
                  { label: "自動ポイント", value: data.autoPoints,     svgD: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",   color: "#818cf8" },
                  { label: "手動ポイント", value: data.manualPoints,   svgD: "M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11", color: "#60a5fa" },
                  { label: "外部ポイント", value: data.externalPoints, svgD: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",    color: "#34d399" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        style={{ color: item.color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.svgD} />
                      </svg>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: item.color }}>{item.value.toLocaleString()} <span className="text-xs opacity-60">pt</span></span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ background: `${GOLD}10` }}>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: GOLD }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold" style={{ color: GOLD }}>利用可能ポイント</span>
                  </div>
                  <span className="font-black text-2xl" style={{ color: GOLD_LIGHT }}>
                    {data.availablePoints.toLocaleString()} <span className="text-sm font-normal" style={{ color: `${GOLD}70` }}>pt</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ── 貯金ポイント ── */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{ background: CARD_BG, border: `1px solid ${ORANGE}25` }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: ORANGE }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-xs" style={{ color: ORANGE }}>貯金ポイント（SAV）</p>
                </div>
                <div className="text-2xl font-black" style={{ color: GOLD_LIGHT }}>
                  {data.savingsPoints.toLocaleString()}<span className="text-sm font-normal ml-1" style={{ color: `${GOLD}50` }}>pt</span>
                </div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {Math.floor(data.savingsPoints / 10000)}万pt = 換金可能目安
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}25` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: ORANGE }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* ── 最新ボーナス ── */}
            {data.latestBonus ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}20` }}>
                <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}12` }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: GOLD }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                    最新ボーナス確定
                    <span className="ml-1.5 text-xs" style={{ color: GOLD }}>（{data.latestBonus.bonusMonth}）</span>
                  </h2>
                </div>
                <div>
                  {[
                    { label: "アクティブ",  value: data.latestBonus.isActive ? <span style={{ color: "#34d399" }}>● アクティブ</span> : <span style={{ color: "rgba(255,255,255,0.3)" }}>非アクティブ</span> },
                    { label: "グループACT", value: `${data.latestBonus.groupActiveCount}人` },
                    { label: "グループpt",  value: `${data.latestBonus.groupPoints.toLocaleString()}pt` },
                    { label: "総支払報酬",  value: `¥${data.latestBonus.totalBonus.toLocaleString()}` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-5 py-3.5"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
                      <span className="font-bold text-sm text-white/80">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4"
                    style={{ background: `${GOLD}10` }}>
                    <span className="text-sm font-bold" style={{ color: GOLD }}>支払額</span>
                    <span className="font-black text-2xl" style={{ color: GOLD_LIGHT }}>¥{data.latestBonus.paymentAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="px-5 pb-4 pt-3">
                  <Link href="/mlm-bonus-history"
                    className="flex items-center justify-center gap-2 text-xs font-semibold py-2 transition rounded-xl"
                    style={{ color: GOLD }}>
                    <span>ボーナス履歴をすべて見る</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6 text-center text-sm" style={{ background: CARD_BG, color: "rgba(255,255,255,0.25)" }}>
                確定済みボーナスはありません
              </div>
            )}

            {/* ── 関連ページへのリンク ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
              {[
                { href: "/mlm-bonus-history",    svgD: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "ボーナス履歴",     color: GOLD },
                { href: "/mlm-purchase-history", svgD: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", label: "購入履歴",         color: ORANGE },
                { href: "/mlm-org-chart",        svgD: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z", label: "MLM組織図",       color: "#34d399" },
                { href: "/org-chart",            svgD: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "組織図（直紹介）", color: "#818cf8" },
              ].map((link, i) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center justify-between px-5 py-4 transition"
                  style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${link.color}12` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        style={{ color: link.color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={link.svgD} />
                      </svg>
                    </div>
                    <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{link.label}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: `${GOLD}50` }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
