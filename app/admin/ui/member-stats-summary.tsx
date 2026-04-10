"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StatsData = {
  mlm: {
    total: number;
    active: number;
    inactive: number;
    breakdown: { active: number; autoship: number; withdrawn: number; lapsed: number; suspended: number; midCancel: number };
  };
  mobile: {
    total: number;
    active: number;
    inactive: number;
    breakdown: { active: number; pending: number; canceled: number; suspended: number };
  };
  travel: {
    total: number;
    active: number;
    inactive: number;
    breakdown: { active: number; pending: number; canceled: number; suspended: number };
  };
};

type Props = {
  /** 表示するカテゴリ。省略時は全て表示 */
  show?: ("mlm" | "mobile" | "travel")[];
  /** コンパクト表示（ページ内埋め込み用）*/
  compact?: boolean;
};

export default function MemberStatsSummary({ show, compact = false }: Props) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`rounded-3xl bg-white shadow-sm p-5 ${compact ? "p-4" : "p-5"}`}>
        <div className="text-sm text-slate-400 animate-pulse">統計情報を読み込み中...</div>
      </div>
    );
  }
  if (!data) return null;

  const targets = show ?? ["mlm", "mobile", "travel"];

  const sections = [
    {
      key: "mlm" as const,
      label: "👥 MLM会員",
      href: "/admin/mlm-members",
      color: "violet",
      total: data.mlm.total,
      active: data.mlm.active,
      inactive: data.mlm.inactive,
      activeDetail: `活動中 ${data.mlm.breakdown.active}件・オートシップ ${data.mlm.breakdown.autoship}件`,
      inactiveDetail: `退会 ${data.mlm.breakdown.withdrawn}件・失効 ${data.mlm.breakdown.lapsed}件・停止 ${data.mlm.breakdown.suspended}件・中途解約 ${data.mlm.breakdown.midCancel}件`,
    },
    {
      key: "mobile" as const,
      label: "📱 携帯契約",
      href: "/admin/contracts",
      color: "sky",
      total: data.mobile.total,
      active: data.mobile.active,
      inactive: data.mobile.inactive,
      activeDetail: `契約中 ${data.mobile.breakdown.active}件・申込中 ${data.mobile.breakdown.pending}件`,
      inactiveDetail: `解約済 ${data.mobile.breakdown.canceled}件・停止 ${data.mobile.breakdown.suspended}件`,
    },
    {
      key: "travel" as const,
      label: "✈️ 格安旅行契約",
      href: "/admin/travel-subscriptions",
      color: "emerald",
      total: data.travel.total,
      active: data.travel.active,
      inactive: data.travel.inactive,
      activeDetail: `契約中 ${data.travel.breakdown.active}件・申込中 ${data.travel.breakdown.pending}件`,
      inactiveDetail: `解約済 ${data.travel.breakdown.canceled}件・停止 ${data.travel.breakdown.suspended}件`,
    },
  ].filter(s => targets.includes(s.key));

  const colorMap: Record<string, { bg: string; text: string; badge: string; activeBadge: string; inactiveBadge: string }> = {
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      badge: "bg-violet-100 text-violet-800",
      activeBadge: "bg-emerald-100 text-emerald-700",
      inactiveBadge: "bg-slate-100 text-slate-500",
    },
    sky: {
      bg: "bg-sky-50",
      text: "text-sky-700",
      badge: "bg-sky-100 text-sky-800",
      activeBadge: "bg-emerald-100 text-emerald-700",
      inactiveBadge: "bg-slate-100 text-slate-500",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800",
      activeBadge: "bg-emerald-100 text-emerald-700",
      inactiveBadge: "bg-slate-100 text-slate-500",
    },
  };

  if (compact) {
    // コンパクト版：横並びの数字カード
    return (
      <div className={`rounded-3xl bg-white shadow-sm p-4 space-y-3`}>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">会員・契約 サマリー</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {sections.map(s => {
            const c = colorMap[s.color];
            return (
              <Link key={s.key} href={s.href} className={`rounded-2xl ${c.bg} p-3 hover:opacity-80 transition`}>
                <div className={`text-xs font-semibold ${c.text} mb-2`}>{s.label}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-slate-800">{s.total.toLocaleString()}</span>
                  <span className="text-xs text-slate-500">件（総数）</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">アクティブ</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.activeBadge}`}>{s.active.toLocaleString()}件</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">非アクティブ</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.inactiveBadge}`}>{s.inactive.toLocaleString()}件</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-400 leading-relaxed hidden sm:block">
                  <div>{s.activeDetail}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // フル版：ダッシュボード用
  return (
    <div className="rounded-3xl bg-white shadow-sm p-5 space-y-4">
      <h2 className="text-base font-bold text-slate-800">📊 会員・契約 サマリー</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map(s => {
          const c = colorMap[s.color];
          return (
            <Link key={s.key} href={s.href} className={`rounded-2xl ${c.bg} p-4 hover:opacity-80 transition block`}>
              <div className={`text-sm font-bold ${c.text} mb-3`}>{s.label}</div>

              {/* 総数 */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold text-slate-800">{s.total.toLocaleString()}</span>
                <span className="text-sm text-slate-500">件（総数）</span>
              </div>

              {/* アクティブ */}
              <div className={`rounded-xl px-3 py-2 mb-2 ${c.activeBadge}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">✅ アクティブ</span>
                  <span className="text-lg font-bold">{s.active.toLocaleString()}件</span>
                </div>
                <div className="text-xs mt-0.5 opacity-80">{s.activeDetail}</div>
              </div>

              {/* 非アクティブ */}
              <div className={`rounded-xl px-3 py-2 ${c.inactiveBadge}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">❌ 非アクティブ</span>
                  <span className="text-lg font-bold">{s.inactive.toLocaleString()}件</span>
                </div>
                <div className="text-xs mt-0.5 opacity-80">{s.inactiveDetail}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
