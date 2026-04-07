"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVEL_LABELS, UNILEVEL_RATES } from "@/lib/mlm-bonus";

/* ─── 型定義 ─── */
type UnilevelDepth = { depth: number; amount: number; rate: number };

type BonusHistory = {
  bonusMonth: string;
  confirmedAt: string | null;
  isActive: boolean;
  selfPurchasePoints: number;
  groupPoints: number;
  directActiveCount: number;
  achievedLevel: number;
  achievedLevelLabel: string;
  previousTitleLevel: number;
  previousTitleLevelLabel: string;
  newTitleLevel: number;
  newTitleLevelLabel: string;
  directBonus: number;
  unilevelBonus: number;
  structureBonus: number;
  savingsBonus: number;
  totalBonus: number;
  unilevelDetail: UnilevelDepth[];
  savingsPointsAdded: number;
};

type BonusData = {
  memberType: string;
  currentLevel: number;
  titleLevel: number;
  currentLevelLabel: string;
  titleLevelLabel: string;
  savingsPoints: number;
  history: BonusHistory[];
};

/* ─── ボーナス金額フォーマット ─── */
function yen(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

/* ─── レベルバッジ ─── */
function LevelBadge({ level, label, type = "current" }: {
  level: number; label: string; type?: "current" | "title";
}) {
  if (level === 0) return <span className="text-slate-400 text-xs">—</span>;
  const color =
    type === "title"
      ? "bg-amber-100 text-amber-700 border-amber-300"
      : "bg-violet-100 text-violet-700 border-violet-300";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      {type === "title" ? "👑 " : "⭐ "}{label}
    </span>
  );
}

/* ─── 月次ボーナスカード ─── */
function BonusCard({ h }: { h: BonusHistory }) {
  const [expanded, setExpanded] = useState(false);

  const levelChanged = h.previousTitleLevel !== h.newTitleLevel;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* ヘッダー */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 月 */}
        <div className="flex-shrink-0 text-center w-16">
          <div className="text-lg font-bold text-slate-800">{h.bonusMonth.slice(0, 7)}</div>
          <div className={`text-xs font-semibold mt-0.5 ${h.isActive ? "text-emerald-600" : "text-slate-400"}`}>
            {h.isActive ? "✅ アクティブ" : "❌ 非アクティブ"}
          </div>
        </div>

        {/* レベル */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-slate-500">当月実績:</span>
            <LevelBadge level={h.achievedLevel} label={h.achievedLevelLabel} />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-slate-500">称号:</span>
            <LevelBadge level={h.newTitleLevel} label={h.newTitleLevelLabel} type="title" />
            {levelChanged && (
              <span className="text-xs text-emerald-600 font-semibold">
                ↑ {h.previousTitleLevelLabel} → {h.newTitleLevelLabel}
              </span>
            )}
          </div>
        </div>

        {/* 合計ボーナス */}
        <div className="flex-shrink-0 text-right">
          <div className="text-lg font-bold text-slate-800">{yen(h.totalBonus)}</div>
          <div className="text-xs text-slate-400">{expanded ? "▲" : "▼ 詳細"}</div>
        </div>
      </button>

      {/* 詳細 */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-4">

          {/* ポイント情報 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">📊 ポイント情報</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "自己購入", value: `${h.selfPurchasePoints}pt` },
                { label: "グループ計", value: `${h.groupPoints.toLocaleString()}pt` },
                { label: "直紹介アクティブ", value: `${h.directActiveCount}名` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white border border-slate-200 p-2 text-center">
                  <div className="text-xs text-slate-500">{item.label}</div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ボーナス内訳 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">💰 ボーナス内訳</div>
            <div className="space-y-1.5">
              {[
                { label: "ダイレクトボーナス", icon: "🎯", amount: h.directBonus, desc: "直接紹介者のs1000購入" },
                { label: "ユニレベルボーナス", icon: "🌊", amount: h.unilevelBonus, desc: "傘下7段のポイント×算出率" },
                { label: "組織構築ボーナス", icon: "🏗️", amount: h.structureBonus, desc: "最小系列pt×3〜4%（LV.3以上）" },
                { label: "貯金ボーナス", icon: "🐖", amount: h.savingsBonus, desc: "累積貯金ptの換金" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                    item.amount > 0 ? "bg-white border border-slate-200" : "bg-white/50 border border-slate-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${item.amount > 0 ? "text-slate-800" : "text-slate-400"}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                  <div className={`text-sm font-bold ${item.amount > 0 ? "text-slate-800" : "text-slate-400"}`}>
                    {yen(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ユニレベル段数別内訳 */}
          {h.unilevelDetail.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">🌊 ユニレベル段数別</div>
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-1.5 px-3 text-left text-slate-500 font-semibold">段</th>
                      <th className="py-1.5 px-3 text-right text-slate-500 font-semibold">算出率</th>
                      <th className="py-1.5 px-3 text-right text-slate-500 font-semibold">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.unilevelDetail.map((d) => (
                      <tr key={d.depth} className="border-b border-slate-50">
                        <td className="py-1.5 px-3 text-slate-700 font-semibold">{d.depth}段目</td>
                        <td className="py-1.5 px-3 text-right text-slate-600">{d.rate}%</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-800">{yen(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 貯金pt */}
          {h.savingsPointsAdded > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
              <span>🐖</span>
              <div className="text-xs text-amber-700">
                今月の貯金pt追加: <span className="font-bold">+{h.savingsPointsAdded}pt</span>
              </div>
            </div>
          )}

          {/* 合計 */}
          <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-violet-700">合計ボーナス</span>
            <span className="text-xl font-black text-violet-800">{yen(h.totalBonus)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ユニレベル算出率テーブル ─── */
function UnilevelRateTable() {
  const levels = [0, 1, 2, 3, 4, 5];
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm overflow-x-auto">
      <h2 className="text-sm font-bold text-slate-700 mb-3">📋 ユニレベルボーナス算出率表</h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-200 px-2 py-1.5 text-left text-slate-600">実績レベル</th>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <th key={d} className="border border-slate-200 px-2 py-1.5 text-center text-slate-600">
                {d}段
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {levels.map((lv) => {
            const rates = UNILEVEL_RATES[lv];
            const label = lv === 0 ? "未達成 / なし / LV.1" : `LV.${lv}`;
            return (
              <tr key={lv} className="hover:bg-slate-50">
                <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap">
                  {label}
                </td>
                {rates.map((r, i) => (
                  <td
                    key={i}
                    className={`border border-slate-200 px-2 py-1.5 text-center font-bold ${
                      r > 0 ? "text-violet-700" : "text-slate-300"
                    }`}
                  >
                    {r > 0 ? `${r}%` : "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">
        ※ 条件未達成の場合は実績レベルに関わらず LV.0 と同じ算出率が適用されます
      </p>
    </div>
  );
}

/* ─── メインページ ─── */
export default function MlmBonusPage() {
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRateTable, setShowRateTable] = useState(false);

  useEffect(() => {
    fetch("/api/my/mlm-bonus-history")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = data?.history.reduce((s, h) => s + h.totalBonus, 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-6 px-4">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
            ← ダッシュボード
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">💎 MLMボーナス履歴</h1>
          <p className="text-xs text-slate-500 mt-1">
            月次のボーナス計算結果・レベル・段数別内訳を確認できます。
          </p>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>
        )}
        {error && (
          <div className="rounded-3xl bg-red-50 border border-red-200 p-6 text-center shadow-sm">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* 現在の称号・レベル */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-3">現在のステータス</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3 text-center">
                  <div className="text-xs text-violet-600 mb-1">当月実績レベル</div>
                  <div className="text-lg font-black text-violet-700">
                    {data.currentLevel === 0 ? "—" : `LV.${data.currentLevel}`}
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 text-center">
                  <div className="text-xs text-amber-600 mb-1">👑 称号レベル</div>
                  <div className="text-lg font-black text-amber-700">
                    {data.titleLevel === 0 ? "—" : `LV.${data.titleLevel}`}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center col-span-2">
                  <div className="text-xs text-slate-500 mb-1">🐖 貯金ポイント累計</div>
                  <div className="text-xl font-black text-slate-700">
                    {data.savingsPoints.toLocaleString()}<span className="text-sm font-normal">pt</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ※ {Math.floor(data.savingsPoints / 10000)}万pt = ¥{(Math.floor(data.savingsPoints / 10000) * 10000 * 100).toLocaleString()} 換金可能目安
                  </div>
                </div>
              </div>
            </div>

            {/* 累計ボーナス */}
            <div className="rounded-3xl bg-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">累計受取ボーナス（直近2年）</div>
                <div className="text-2xl font-black text-slate-800 mt-0.5">
                  ¥{totalPaid.toLocaleString()}
                </div>
              </div>
              <div className="text-3xl">💰</div>
            </div>

            {/* 算出率テーブル切り替え */}
            <button
              onClick={() => setShowRateTable(!showRateTable)}
              className="w-full rounded-3xl bg-white p-4 shadow-sm flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span className="text-sm font-semibold text-slate-700">
                📋 ユニレベル算出率テーブルを{showRateTable ? "隠す" : "見る"}
              </span>
              <span className="text-slate-400">{showRateTable ? "▲" : "▼"}</span>
            </button>
            {showRateTable && <UnilevelRateTable />}

            {/* ボーナス履歴 */}
            <div>
              <div className="text-xs font-semibold text-slate-500 px-1 mb-2">
                ボーナス履歴（{data.history.length}件）
              </div>
              {data.history.length === 0 ? (
                <div className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow-sm">
                  ボーナス履歴がありません
                </div>
              ) : (
                <div className="space-y-3">
                  {data.history.map((h) => (
                    <BonusCard key={h.bonusMonth} h={h} />
                  ))}
                </div>
              )}
            </div>

            {/* 組織図へのリンク */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <Link
                href="/mlm-org-chart"
                className="flex items-center justify-between px-2 py-1 text-slate-700 hover:text-violet-700 transition"
              >
                <span className="font-semibold">🌲 マトリックス組織図を見る</span>
                <span className="text-slate-400">›</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
