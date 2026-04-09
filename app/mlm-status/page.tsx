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
  active: "アクティブ",
  inactive: "非アクティブ",
  suspended: "停止中",
  canceled: "解約済",
  pending: "審査中",
};
const STATUS_BG: Record<string, string> = {
  active: "from-emerald-500 to-teal-500",
  inactive: "from-slate-400 to-slate-500",
  suspended: "from-orange-400 to-orange-500",
  canceled: "from-red-400 to-red-500",
  pending: "from-blue-400 to-blue-500",
};

function StatBlock({ label, value, sub, color = "bg-white border-slate-200" }: {
  label: string; value: React.ReactNode; sub?: string; color?: string;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 text-center ${color}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-black text-slate-800">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
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

  return (
    <div className="min-h-screen bg-[#e6f2dc]">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-green-600 text-sm font-medium hover:text-green-700">← 戻る</Link>
          <h1 className="text-lg font-bold text-slate-800">📊 状況</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm shadow-sm">{error}</div>}

        {data && (
          <>
            {/* ヒーローカード */}
            <div className={`bg-gradient-to-br ${STATUS_BG[data.status] ?? "from-slate-400 to-slate-500"} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs opacity-80 mb-0.5">会員ID</div>
                  <div className="font-mono font-bold text-lg">{data.memberCode}</div>
                  <div className="text-xl font-black mt-1">{data.name} さん</div>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold">
                    {STATUS_LABELS[data.status] ?? data.status}
                  </div>
                  <div className="mt-2 text-xs opacity-80">
                    {data.memberType === "business" ? "ビジネス会員" : "愛用会員"}
                  </div>
                </div>
              </div>

              {/* レベル表示 */}
              <div className="mt-4 flex gap-3">
                <div className="flex-1 bg-white/20 rounded-xl p-2.5 text-center">
                  <div className="text-xs opacity-80">当月レベル</div>
                  <div className="font-black text-xl">
                    {data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—"}
                  </div>
                  <div className="text-xs opacity-70">{data.currentLevelLabel}</div>
                </div>
                <div className="flex-1 bg-white/20 rounded-xl p-2.5 text-center">
                  <div className="text-xs opacity-80">👑 称号</div>
                  <div className="font-black text-xl">
                    {data.titleLevel > 0 ? `LV.${data.titleLevel}` : "—"}
                  </div>
                  <div className="text-xs opacity-70">{data.titleLevelLabel}</div>
                </div>
                <div className="flex-1 bg-white/20 rounded-xl p-2.5 text-center">
                  <div className="text-xs opacity-80">条件達成</div>
                  <div className="font-black text-2xl">{data.conditionAchieved ? "✅" : "❌"}</div>
                  <div className="text-xs opacity-70">{data.conditionAchieved ? "達成" : "未達成"}</div>
                </div>
              </div>
            </div>

            {/* 当月・先月 購入状況 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span>📦</span>
                <h2 className="text-sm font-bold text-slate-700">購入状況</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* 今月 */}
                  <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3">
                    <div className="text-xs text-violet-500 font-semibold mb-2">今月（{data.currentMonth}）</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">購入回数</span>
                        <span className="font-bold text-slate-800">{data.currentMonthCount}件</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">購入pt</span>
                        <span className="font-bold text-violet-700">{data.currentMonthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>
                  </div>
                  {/* 先月 */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs text-slate-500 font-semibold mb-2">先月（{data.lastMonth}）</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">購入回数</span>
                        <span className="font-bold text-slate-800">{data.lastMonthCount}件</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">購入pt</span>
                        <span className="font-bold text-slate-600">{data.lastMonthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 組織状況 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span>🌳</span>
                <h2 className="text-sm font-bold text-slate-700">組織状況</h2>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <div className="text-xs text-emerald-500 mb-1">直紹介数</div>
                  <div className="text-2xl font-black text-emerald-700">{data.directCount}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">人</div>
                </div>
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3 text-center">
                  <div className="text-xs text-teal-500 mb-1">直紹介ACT</div>
                  <div className="text-2xl font-black text-teal-700">{data.directActiveCount}</div>
                  <div className="text-[10px] text-teal-400 mt-0.5">人</div>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-center">
                  <div className="text-xs text-blue-500 mb-1">直下人数</div>
                  <div className="text-2xl font-black text-blue-700">{data.downlineCount}</div>
                  <div className="text-[10px] text-blue-400 mt-0.5">人</div>
                </div>
              </div>
            </div>

            {/* ポイントウォレット */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span>💎</span>
                <h2 className="text-sm font-bold text-slate-700">ポイント残高</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { label: "自動ポイント", value: data.autoPoints, color: "text-violet-700" },
                  { label: "手動ポイント", value: data.manualPoints, color: "text-blue-700" },
                  { label: "外部ポイント", value: data.externalPoints, color: "text-teal-700" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className={`font-bold text-sm ${item.color}`}>{item.value.toLocaleString()} pt</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-4 bg-violet-50">
                  <span className="text-sm font-bold text-violet-700">利用可能ポイント</span>
                  <span className="font-black text-xl text-violet-700">{data.availablePoints.toLocaleString()} pt</span>
                </div>
              </div>
            </div>

            {/* 貯金ポイント */}
            <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">🐖 貯金ポイント（SAV）</div>
                <div className="text-2xl font-black text-slate-800 mt-0.5">
                  {data.savingsPoints.toLocaleString()}<span className="text-sm font-normal ml-1">pt</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  ※ {Math.floor(data.savingsPoints / 10000)}万pt = 換金可能目安
                </div>
              </div>
              <div className="text-3xl">🐖</div>
            </div>

            {/* 最新ボーナス */}
            {data.latestBonus ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <span>💰</span>
                  <h2 className="text-sm font-bold text-slate-700">最新ボーナス確定（{data.latestBonus.bonusMonth}）</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500">アクティブ</span>
                    <span className={data.latestBonus.isActive ? "text-emerald-600 font-bold" : "text-slate-400"}>
                      {data.latestBonus.isActive ? "✅ アクティブ" : "❌ 非アクティブ"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500">グループACT</span>
                    <span className="font-bold text-slate-800">{data.latestBonus.groupActiveCount}人</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500">グループpt</span>
                    <span className="font-bold text-slate-800">{data.latestBonus.groupPoints.toLocaleString()}pt</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500">総支払報酬</span>
                    <span className="font-bold text-slate-800">¥{data.latestBonus.totalBonus.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-4 bg-violet-50 text-sm">
                    <span className="font-bold text-violet-700">支払額</span>
                    <span className="font-black text-xl text-violet-700">¥{data.latestBonus.paymentAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <Link href="/mlm-bonus-history" className="block text-center text-xs text-violet-600 font-semibold py-2 hover:underline">
                    → ボーナス履歴をすべて見る
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-slate-400 text-sm">
                確定済みボーナスはありません
              </div>
            )}

            {/* 関連ページへのリンク */}
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-50">
              {[
                { href: "/mlm-bonus-history", icon: "💰", label: "ボーナス履歴" },
                { href: "/mlm-purchase-history", icon: "📦", label: "購入履歴" },
                { href: "/mlm-org-chart", icon: "🌲", label: "MLM組織図" },
                { href: "/org-chart", icon: "🌳", label: "組織図（直紹介）" },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{link.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{link.label}</span>
                  </div>
                  <span className="text-slate-400 text-xs">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
