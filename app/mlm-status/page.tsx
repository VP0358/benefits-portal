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

const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ", inactive: "非アクティブ", suspended: "停止中",
  canceled: "解約済", pending: "審査中",
};
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400", inactive: "bg-slate-400", suspended: "bg-orange-400",
  canceled: "bg-red-400", pending: "bg-blue-400 animate-pulse",
};
const STATUS_TEXT: Record<string, string> = {
  active: "text-emerald-300", inactive: "text-slate-300", suspended: "text-orange-300",
  canceled: "text-red-300", pending: "text-blue-300",
};
const STATUS_GRADIENT: Record<string, string> = {
  active:   "linear-gradient(135deg, #0d2b1f, #064e3b)",
  inactive: "linear-gradient(135deg, #1a1a2e, #2a2a3e)",
  suspended:"linear-gradient(135deg, #2b1500, #4a2500)",
  canceled: "linear-gradient(135deg, #2b0000, #4a0000)",
  pending:  "linear-gradient(135deg, #0d1f2b, #0d3464)",
};
const STATUS_BORDER: Record<string, string> = {
  active:   "rgba(16,185,129,0.25)",
  inactive: "rgba(255,255,255,0.08)",
  suspended:"rgba(249,115,22,0.25)",
  canceled: "rgba(239,68,68,0.25)",
  pending:  "rgba(59,130,246,0.25)",
};

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

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0a0f1e" }}>
      <header className="sticky top-0 z-20 border-b border-white/5"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/50 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <h1 className="text-base font-bold text-white ml-1">状況</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {data && (
          <>
            {/* ヒーローカード */}
            <div className="rounded-3xl p-5"
              style={{
                background: STATUS_GRADIENT[data.status] ?? STATUS_GRADIENT.inactive,
                border: `1px solid ${STATUS_BORDER[data.status] ?? "rgba(255,255,255,0.08)"}`
              }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-white/40 mb-0.5">会員ID</p>
                  <p className="font-mono font-bold text-white/80 text-base">{data.memberCode}</p>
                  <p className="text-2xl font-black text-white mt-0.5">{data.name} さん</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[data.status] ?? "bg-slate-400"}`}></span>
                    <span className={`text-sm font-bold ${STATUS_TEXT[data.status] ?? "text-white/50"}`}>
                      {STATUS_LABELS[data.status] ?? data.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mt-1">
                    {data.memberType === "business" ? "ビジネス会員" : "愛用会員"}
                  </p>
                  {data.forceActive && (
                    <span className="inline-block mt-1 text-xs text-cyan-300 bg-cyan-500/20 border border-cyan-400/20 rounded-full px-2 py-0.5">
                      強制アクティブ
                    </span>
                  )}
                </div>
              </div>

              {/* レベル表示 */}
              <div className="flex gap-2">
                {[
                  { label: "当月レベル", value: data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—", sub: data.currentLevelLabel },
                  { label: "👑 称号",   value: data.titleLevel > 0  ? `LV.${data.titleLevel}` : "—",  sub: data.titleLevelLabel },
                  { label: "条件達成",  value: data.conditionAchieved ? "✅" : "—", sub: data.conditionAchieved ? "達成" : "未達成" },
                ].map((item) => (
                  <div key={item.label} className="flex-1 rounded-2xl p-2.5 text-center"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="text-[10px] text-white/50 mb-0.5">{item.label}</div>
                    <div className="font-black text-lg text-white">{item.value}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 leading-tight">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 購入状況 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <span>📦</span>
                <h2 className="text-sm font-bold text-white/80">購入状況</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-3 border border-violet-400/20" style={{ background: "rgba(139,92,246,0.08)" }}>
                    <div className="text-xs text-violet-400/70 font-semibold mb-2">今月（{data.currentMonth}）</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">購入回数</span>
                        <span className="font-bold text-white/80">{data.currentMonthCount}件</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">購入pt</span>
                        <span className="font-bold text-violet-300">{data.currentMonthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl p-3 border border-white/8" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="text-xs text-white/40 font-semibold mb-2">先月（{data.lastMonth}）</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">購入回数</span>
                        <span className="font-bold text-white/60">{data.lastMonthCount}件</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">購入pt</span>
                        <span className="font-bold text-white/60">{data.lastMonthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 組織状況 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <span>🌳</span>
                <h2 className="text-sm font-bold text-white/80">組織状況</h2>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {[
                  { label: "直紹介数",   value: data.directCount,       unit: "人", color: "text-emerald-300", accent: "border-emerald-400/20 bg-emerald-500/08" },
                  { label: "直紹介ACT", value: data.directActiveCount, unit: "人", color: "text-teal-300",    accent: "border-teal-400/20 bg-teal-500/08" },
                  { label: "直下人数",   value: data.downlineCount,     unit: "人", color: "text-blue-300",   accent: "border-blue-400/20 bg-blue-500/08" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl p-3 text-center border ${item.accent}`}>
                    <div className="text-[10px] text-white/40 mb-1">{item.label}</div>
                    <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{item.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ポイントウォレット */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <span>💎</span>
                <h2 className="text-sm font-bold text-white/80">ポイント残高</h2>
              </div>
              <div>
                {[
                  { label: "自動ポイント", value: data.autoPoints,     color: "text-violet-300" },
                  { label: "手動ポイント", value: data.manualPoints,   color: "text-blue-300" },
                  { label: "外部ポイント", value: data.externalPoints, color: "text-teal-300" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-sm text-white/50">{item.label}</span>
                    <span className={`font-bold text-sm ${item.color}`}>{item.value.toLocaleString()} pt</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-4"
                  style={{ background: "rgba(139,92,246,0.1)" }}>
                  <span className="text-sm font-bold text-violet-300">利用可能ポイント</span>
                  <span className="font-black text-2xl text-violet-300">{data.availablePoints.toLocaleString()} <span className="text-sm font-normal">pt</span></span>
                </div>
              </div>
            </div>

            {/* 貯金ポイント */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <div className="text-xs text-white/40 mb-1">🐖 貯金ポイント（SAV）</div>
                <div className="text-2xl font-black text-amber-300">
                  {data.savingsPoints.toLocaleString()}<span className="text-sm font-normal text-white/30 ml-1">pt</span>
                </div>
                <div className="text-xs text-white/30 mt-1">
                  ※ {Math.floor(data.savingsPoints / 10000)}万pt = 換金可能目安
                </div>
              </div>
              <div className="text-3xl opacity-60">🐖</div>
            </div>

            {/* 最新ボーナス */}
            {data.latestBonus ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span>💰</span>
                  <h2 className="text-sm font-bold text-white/80">最新ボーナス確定（{data.latestBonus.bonusMonth}）</h2>
                </div>
                <div>
                  {[
                    { label: "アクティブ",  value: data.latestBonus.isActive ? <span className="text-emerald-400">● アクティブ</span> : <span className="text-white/30">非アクティブ</span> },
                    { label: "グループACT", value: `${data.latestBonus.groupActiveCount}人` },
                    { label: "グループpt",  value: `${data.latestBonus.groupPoints.toLocaleString()}pt` },
                    { label: "総支払報酬",  value: `¥${data.latestBonus.totalBonus.toLocaleString()}` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <span className="text-sm text-white/50">{item.label}</span>
                      <span className="font-bold text-sm text-white/80">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-4"
                    style={{ background: "rgba(245,158,11,0.08)" }}>
                    <span className="text-sm font-bold text-amber-300">支払額</span>
                    <span className="font-black text-2xl text-amber-300">¥{data.latestBonus.paymentAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <Link href="/mlm-bonus-history"
                    className="block text-center text-xs text-violet-400 font-semibold py-2 hover:text-violet-300 transition">
                    → ボーナス履歴をすべて見る
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
                確定済みボーナスはありません
              </div>
            )}

            {/* 関連ページへのリンク */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                { href: "/mlm-bonus-history",    icon: "💰", label: "ボーナス履歴" },
                { href: "/mlm-purchase-history", icon: "📦", label: "購入履歴" },
                { href: "/mlm-org-chart",        icon: "🌲", label: "MLM組織図" },
                { href: "/org-chart",            icon: "🌳", label: "組織図（直紹介）" },
              ].map((link, i) => (
                <Link key={link.href} href={link.href}
                  className={`flex items-center justify-between px-4 py-4 hover:bg-white/3 transition ${i < 3 ? "border-b border-white/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{link.icon}</span>
                    <span className="text-sm font-medium text-white/70">{link.label}</span>
                  </div>
                  <span className="text-white/30 text-xl">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
