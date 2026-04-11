"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVEL_LABELS, UNILEVEL_RATES } from "@/lib/mlm-bonus";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

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

function yen(amount: number) { return `¥${amount.toLocaleString()}`; }

/* ─── レベルバッジ ─── */
function LevelBadge({ level, label, type = "current" }: { level: number; label: string; type?: "current" | "title" }) {
  if (level === 0) return <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>—</span>;
  return (
    <span className="inline-block rounded-full text-xs px-2.5 py-0.5 font-bold border"
      style={type === "title"
        ? { background: `${GOLD}18`, color: GOLD_LIGHT, borderColor: `${GOLD}35` }
        : { background: "rgba(129,140,248,0.15)", color: "#a5b4fc", borderColor: "rgba(129,140,248,0.35)" }}>
      {type === "title" ? "👑 " : "⭐ "}{label}
    </span>
  );
}

/* ─── 月次ボーナスカード ─── */
function BonusCard({ h }: { h: BonusHistory }) {
  const [expanded, setExpanded] = useState(false);
  const levelChanged = h.previousTitleLevel !== h.newTitleLevel;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18`, boxShadow: "0 4px 16px rgba(10,22,40,0.15)" }}>
      {/* ヘッダー */}
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition"
        style={{ background: expanded ? `${GOLD}06` : "transparent" }}
        onClick={() => setExpanded(!expanded)}>
        {/* 月・アクティブ */}
        <div className="flex-shrink-0 text-center" style={{ minWidth: "72px" }}>
          <p className="font-bold text-white text-sm">{h.bonusMonth.slice(0, 7)}</p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: h.isActive ? "#34d399" : "rgba(255,255,255,0.20)" }}/>
            <span className="text-[10px] font-label"
              style={{ color: h.isActive ? "#34d399" : "rgba(255,255,255,0.28)" }}>
              {h.isActive ? "アクティブ" : "非アクティブ"}
            </span>
          </div>
        </div>

        {/* レベル */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-jp" style={{ color: "rgba(255,255,255,0.35)" }}>実績:</span>
            <LevelBadge level={h.achievedLevel} label={h.achievedLevelLabel} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-jp" style={{ color: "rgba(255,255,255,0.35)" }}>称号:</span>
            <LevelBadge level={h.newTitleLevel} label={h.newTitleLevelLabel} type="title" />
            {levelChanged && (
              <span className="text-[10px] font-semibold" style={{ color: "#34d399" }}>
                ↑ {h.previousTitleLevelLabel} → {h.newTitleLevelLabel}
              </span>
            )}
          </div>
        </div>

        {/* 合計 */}
        <div className="flex-shrink-0 text-right">
          <p className="text-lg font-black" style={{ color: GOLD_LIGHT }}>{yen(h.totalBonus)}</p>
          <p className="text-[10px] font-label mt-0.5" style={{ color: `${GOLD}45` }}>{expanded ? "▲" : "▼ 詳細"}</p>
        </div>
      </button>

      {/* 詳細 */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${GOLD}12` }}>

          {/* ポイント情報 */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[9px] font-label tracking-widest mb-2" style={{ color: `${GOLD}55` }}>POINTS</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "自己購入", value: `${h.selfPurchasePoints}pt` },
                { label: "グループ計", value: `${h.groupPoints.toLocaleString()}pt` },
                { label: "直紹介ACT", value: `${h.directActiveCount}名` },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}12` }}>
                  <p className="text-[9px] font-jp mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.80)" }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ボーナス内訳 */}
          <div className="px-4 pt-2 pb-4">
            <p className="text-[9px] font-label tracking-widest mb-2" style={{ color: `${GOLD}55` }}>BONUS DETAIL</p>
            <div className="space-y-1.5">
              {[
                { label: "ダイレクトボーナス", amount: h.directBonus,   desc: "直接紹介者のs1000購入" },
                { label: "ユニレベルボーナス", amount: h.unilevelBonus, desc: "傘下7段のポイント×算出率" },
                { label: "組織構築ボーナス",   amount: h.structureBonus,desc: "最小系列pt×3〜4%（LV.3以上）" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: item.amount > 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${item.amount > 0 ? `${GOLD}18` : "rgba(255,255,255,0.04)"}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold font-jp"
                      style={{ color: item.amount > 0 ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.30)" }}>
                      {item.label}
                    </p>
                    <p className="text-[10px] font-jp mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{item.desc}</p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0"
                    style={{ color: item.amount > 0 ? GOLD_LIGHT : "rgba(255,255,255,0.20)" }}>
                    {yen(item.amount)}
                  </p>
                </div>
              ))}
            </div>

            {/* ユニレベル段数別 */}
            {h.unilevelDetail.length > 0 && (
              <div className="mt-3">
                <p className="text-[9px] font-label tracking-widest mb-2" style={{ color: `${GOLD}45` }}>UNILEVEL BY DEPTH</p>
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}12` }}>
                  <div className="grid grid-cols-3 text-[10px] font-label px-4 py-2"
                    style={{ background: `${GOLD}08`, color: `${GOLD}60`, borderBottom: `1px solid ${GOLD}10` }}>
                    <span>段</span><span className="text-right">算出率</span><span className="text-right">金額</span>
                  </div>
                  {h.unilevelDetail.map(d => (
                    <div key={d.depth} className="grid grid-cols-3 px-4 py-2 text-xs"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span className="font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>{d.depth}段目</span>
                      <span className="text-right" style={{ color: "rgba(255,255,255,0.35)" }}>{d.rate}%</span>
                      <span className="text-right font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>{yen(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 貯金pt */}
            {h.savingsPointsAdded > 0 && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3"
                style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                <span>🐖</span>
                <p className="text-xs font-jp" style={{ color: GOLD }}>
                  今月の貯金pt追加: <span className="font-bold">+{h.savingsPointsAdded}pt</span>
                </p>
              </div>
            )}

            {/* 合計 */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3 mt-3"
              style={{ background: `linear-gradient(135deg,${NAVY_CARD2},${NAVY_CARD3})`, border: `1px solid ${GOLD}30` }}>
              <span className="text-sm font-bold font-jp" style={{ color: GOLD }}>合計ボーナス</span>
              <span className="text-xl font-black" style={{ color: GOLD_LIGHT }}>{yen(h.totalBonus)}</span>
            </div>
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
    <div className="rounded-2xl overflow-hidden"
      style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18` }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}10` }}>
        <p className="text-sm font-bold font-jp" style={{ color: "rgba(255,255,255,0.80)" }}>
          📋 ユニレベルボーナス算出率表
        </p>
      </div>
      <div className="px-4 py-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: "360px" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${GOLD}15` }}>
              <th className="text-left py-2 px-2 font-label" style={{ color: `${GOLD}60` }}>実績レベル</th>
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <th key={d} className="text-center py-2 px-1.5 font-label" style={{ color: `${GOLD}50` }}>{d}段</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map(lv => {
              const rates = UNILEVEL_RATES[lv];
              const label = lv === 0 ? "LV.0/未達成" : `LV.${lv}`;
              return (
                <tr key={lv} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="py-2 px-2 font-semibold font-jp whitespace-nowrap"
                    style={{ color: "rgba(255,255,255,0.65)" }}>{label}</td>
                  {rates.map((r, i) => (
                    <td key={i} className="text-center py-2 px-1.5 font-bold"
                      style={{ color: r > 0 ? GOLD : "rgba(255,255,255,0.18)" }}>
                      {r > 0 ? `${r}%` : "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[10px] mt-3 font-jp" style={{ color: "rgba(255,255,255,0.25)" }}>
          ※ 条件未達成の場合は実績レベルに関わらず LV.0 と同じ算出率が適用されます
        </p>
      </div>
    </div>
  );
}

/* ─── メインページ ─── */
export default function MlmBonusPage() {
  const [data, setData]               = useState<BonusData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showRateTable, setShowRateTable] = useState(false);

  useEffect(() => {
    fetch("/api/my/mlm-bonus-history")
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = data?.history.reduce((s, h) => s + h.totalBonus, 0) ?? 0;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle,${NAVY}33,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>MLMボーナス履歴</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18` }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
            <p className="text-sm font-jp" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-6 text-center text-sm font-jp"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* 現在ステータスカード */}
            <div className="rounded-3xl overflow-hidden"
              style={{ background: `linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}35`, boxShadow: `0 16px 48px rgba(10,22,40,0.28)` }}>
              <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
              <div className="px-5 py-5">
                <p className="font-label text-[9px] tracking-[0.22em] mb-3" style={{ color: `${GOLD}70` }}>CURRENT STATUS</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-label text-[9px] tracking-wider mb-1" style={{ color: "rgba(129,140,248,0.70)" }}>当月実績</p>
                    <p className="text-xl font-black" style={{ color: "#a5b4fc" }}>
                      {data.currentLevel === 0 ? "—" : `LV.${data.currentLevel}`}
                    </p>
                    {data.currentLevelLabel && data.currentLevel > 0 && (
                      <p className="text-[9px] mt-0.5 font-jp" style={{ color: "rgba(165,180,252,0.55)" }}>{data.currentLevelLabel}</p>
                    )}
                  </div>
                  <div className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-label text-[9px] tracking-wider mb-1" style={{ color: `${GOLD}70` }}>👑 称号</p>
                    <p className="text-xl font-black" style={{ color: GOLD }}>
                      {data.titleLevel === 0 ? "—" : `LV.${data.titleLevel}`}
                    </p>
                    {data.titleLevelLabel && data.titleLevel > 0 && (
                      <p className="text-[9px] mt-0.5 font-jp" style={{ color: `${GOLD}55` }}>{data.titleLevelLabel}</p>
                    )}
                  </div>
                </div>
                {/* 貯金ポイント */}
                <div className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-label text-[9px] tracking-wider mb-0.5" style={{ color: `${GOLD}55` }}>🐖 貯金ポイント累計</p>
                      <p className="text-xl font-black text-white">
                        {data.savingsPoints.toLocaleString()}<span className="text-sm font-normal ml-1" style={{ color: `${GOLD}55` }}>pt</span>
                      </p>
                    </div>
                    <p className="text-xs font-jp text-right" style={{ color: "rgba(255,255,255,0.30)" }}>
                      {Math.floor(data.savingsPoints / 10000)}万pt<br/>
                      <span style={{ color: GOLD }}>= ¥{(Math.floor(data.savingsPoints / 10000) * 10000 * 100).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 累計ボーナス */}
            <div className="flex items-center justify-between rounded-2xl px-5 py-4"
              style={{ background: NAVY_CARD, border: `1px solid ${GOLD}22`, boxShadow: "0 4px 16px rgba(10,22,40,0.15)" }}>
              <div>
                <p className="font-label text-[9px] tracking-[0.18em] mb-1" style={{ color: `${GOLD}55` }}>TOTAL BONUS（直近2年）</p>
                <p className="text-2xl font-black" style={{ color: GOLD_LIGHT }}>¥{totalPaid.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}>
                💰
              </div>
            </div>

            {/* 算出率テーブル切り替え */}
            <button onClick={() => setShowRateTable(!showRateTable)}
              className="w-full rounded-2xl transition"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.22)" }}>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-semibold font-jp" style={{ color: NAVY }}>
                  📋 ユニレベル算出率テーブル
                </span>
                <span className="text-xs font-label" style={{ color: GOLD_DARK }}>
                  {showRateTable ? "▲ 閉じる" : "▼ 開く"}
                </span>
              </div>
            </button>
            {showRateTable && <UnilevelRateTable />}

            {/* ボーナス履歴 */}
            <div>
              <p className="text-[9px] font-label tracking-widest mb-3 px-1" style={{ color: GOLD_DARK }}>
                BONUS HISTORY（{data.history.length}件）
              </p>
              {data.history.length === 0 ? (
                <div className="rounded-2xl p-10 text-center"
                  style={{ background: NAVY_CARD, border: `1px solid ${GOLD}15` }}>
                  <p className="text-sm font-jp" style={{ color: "rgba(255,255,255,0.30)" }}>ボーナス履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.history.map(h => <BonusCard key={h.bonusMonth} h={h} />)}
                </div>
              )}
            </div>

            {/* 組織図リンク */}
            <Link href="/mlm-org-chart"
              className="flex items-center justify-between rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-95"
              style={{ background: `linear-gradient(145deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}22`, boxShadow: "0 4px 16px rgba(10,22,40,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.07)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                  </svg>
                </div>
                <p className="text-sm font-jp font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>マトリックス組織図を見る</p>
              </div>
              <span style={{ color: `${GOLD}60` }}>›</span>
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
