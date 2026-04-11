"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

// ── 型定義 ─────────────────────────────────────────────────
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
  newTitleLevel: number;
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  carryoverAmount: number;
  adjustmentAmount: number;
  otherPositionAmount: number;
  totalBonus: number;
  amountBeforeAdjustment: number;
  paymentAdjustmentRate: number | null;
  paymentAdjustmentAmount: number;
  finalAmount: number;
  consumptionTax: number;
  withholdingTax: number;
  shortageAmount: number;
  otherPositionShortage: number;
  serviceFee: number;
  paymentAmount: number;
  groupActiveCount: number;
  minLinePoints: number;
  lineCount: number;
  level1Lines: number;
  level2Lines: number;
  level3Lines: number;
  conditions: string | null;
  savingsPoints: number;
  savingsPointsAdded: number;
  unilevelDetail: { depth: number; amount: number; rate: number }[];
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

// ── カラー定数 ──────────────────────────────────────────────
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const PAGE_BG    = "#eee8e0";
const CARD_BG    = "#0d1e38";
const NAVY       = "#0a1628";
const NAVY_CARD2 = "#122444";
const LINEN      = "#f5f0e8";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

function DataRow({ label, value, gold, highlight }: {
  label: string; value: React.ReactNode; gold?: boolean; highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-4 last:border-0 text-xs"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: gold ? `${GOLD}10` : highlight ? "rgba(255,255,255,0.02)" : "transparent",
      }}
    >
      <span style={{ color: gold ? GOLD : "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="font-bold" style={{ color: gold ? GOLD_LIGHT : "rgba(255,255,255,0.75)" }}>
        {value}
      </span>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1">
      <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: `${GOLD}60` }}>
        {title}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}12` }}>
        {children}
      </div>
    </div>
  );
}

/* ─── ダウンロードボタン ─── */
function DownloadButton({ month, isCurrentMonth }: { month: string; isCurrentMonth: boolean }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      // 新タブでHTMLを表示（印刷→PDF保存で日本語正常表示）
      const url = `/api/my/bonus-statement-pdf?month=${month}`;
      const win = window.open(url, "_blank");
      if (!win) {
        alert("ポップアップがブロックされています。ブラウザの設定で許可してください。");
      }
    } catch {
      alert("開けませんでした");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50"
      style={{
        background: isCurrentMonth
          ? `linear-gradient(135deg,${GOLD},${ORANGE})`
          : `${GOLD}18`,
        color: isCurrentMonth ? "#fff" : GOLD,
        border: isCurrentMonth ? "none" : `1px solid ${GOLD}30`,
      }}
    >
      {downloading ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          生成中...
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF
        </>
      )}
    </button>
  );
}

/* ─── ボーナスカード ─── */
function BonusCard({
  h, defaultOpen, isCurrentMonth,
}: {
  h: BonusHistory; defaultOpen: boolean; isCurrentMonth: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: CARD_BG,
        border: isCurrentMonth ? `1.5px solid ${GOLD}50` : `1px solid ${GOLD}18`,
        boxShadow: isCurrentMonth ? `0 0 20px ${GOLD}15` : "none",
      }}
    >
      {/* 当月バッジライン */}
      {isCurrentMonth && (
        <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD} 30%,${GOLD_LIGHT} 50%,${GOLD} 70%,transparent)` }} />
      )}

      {/* サマリーヘッダー */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ background: open ? `${GOLD}06` : "transparent" }}
      >
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{h.bonusMonth}</span>
              {isCurrentMonth && (
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${GOLD}25`, color: GOLD_LIGHT }}
                >
                  当月
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: h.isActive ? "#34d399" : "rgba(255,255,255,0.2)" }}
              />
              <span style={{ color: h.isActive ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                {h.isActive ? "アクティブ" : "非アクティブ"}
              </span>
              {h.achievedLevel > 0 && (
                <span
                  className="rounded-full text-[10px] px-2 py-0.5 font-bold"
                  style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
                >
                  {LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div className="text-right">
            <div className="text-xl font-black" style={{ color: GOLD_LIGHT }}>
              {yen(h.paymentAmount)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: `${GOLD}50` }}>
              {open ? "▲ 閉じる" : "▼ 詳細"}
            </div>
          </div>
        </button>

        {/* ダウンロードボタン */}
        <div className="ml-3 flex-shrink-0">
          <DownloadButton month={h.bonusMonth} isCurrentMonth={isCurrentMonth} />
        </div>
      </div>

      {/* 詳細展開 */}
      {open && (
        <div style={{ borderTop: `1px solid ${GOLD}12` }}>
          {/* ボーナス種別 */}
          <SubSection title="ボーナス種別">
            <DataRow label="ダイレクトB"   value={yen(h.directBonus)} />
            <DataRow label="ユニレベルB"   value={yen(h.unilevelBonus)} />
            <DataRow label="組織構築B"     value={yen(h.structureBonus)} />
            <DataRow label="繰越金"        value={yen(h.carryoverAmount)} />
            <DataRow label="調整金"        value={yen(h.adjustmentAmount)} />
            <DataRow label="他ポジション"  value={yen(h.otherPositionAmount)} />
            <DataRow label="支払調整前取得額" value={yen(h.totalBonus)} gold />
          </SubSection>

          {/* 支払い計算 */}
          <SubSection title="支払い計算">
            <DataRow label="支払調整前取得額" value={yen(h.amountBeforeAdjustment)} />
            <DataRow label="支払調整率"       value={h.paymentAdjustmentRate != null ? `${h.paymentAdjustmentRate}%` : "—"} />
            <DataRow label="支払調整額"       value={yen(h.paymentAdjustmentAmount)} />
            <DataRow label="取得額（調整後）" value={yen(h.finalAmount)} />
            <DataRow label="10%消費税（内税）" value={yen(h.consumptionTax)} />
            <DataRow label="源泉所得税"       value={yen(h.withholdingTax)} />
            <DataRow label="過不足金"         value={yen(h.shortageAmount)} />
            <DataRow label="他ポジション過不足" value={yen(h.otherPositionShortage)} />
            <DataRow label="事務手数料"       value={yen(h.serviceFee)} />
            <DataRow label="支払額"           value={yen(h.paymentAmount)} gold />
          </SubSection>

          {/* 組織データ */}
          <SubSection title="組織データ">
            <DataRow label="グループACT"   value={`${h.groupActiveCount}名`} />
            <DataRow label="グループpt"    value={`${h.groupPoints.toLocaleString()}pt`} />
            <DataRow label="最小系列pt"    value={`${h.minLinePoints.toLocaleString()}pt`} />
            <DataRow label="系列数"        value={h.lineCount} />
            <DataRow label="LV.1系列数"    value={h.level1Lines} />
            <DataRow label="LV.2系列数"    value={h.level2Lines} />
            <DataRow label="LV.3系列数"    value={h.level3Lines} />
            <DataRow label="自己購入pt"    value={`${h.selfPurchasePoints}pt`} />
            <DataRow label="直紹介ACT"     value={`${h.directActiveCount}名`} />
            <DataRow label="旧称号レベル"  value={h.previousTitleLevel > 0 ? `LV.${h.previousTitleLevel}` : "—"} />
            <DataRow label="新称号レベル"  value={h.newTitleLevel > 0 ? `LV.${h.newTitleLevel}` : "—"} />
            <DataRow label="当月判定レベル" value={h.achievedLevel > 0 ? LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}` : "—"} />
            <DataRow label="条件達成"      value={h.conditions ?? "—"} />
            <DataRow label="貯金pt（累計）" value={`${h.savingsPoints.toLocaleString()}pt`} />
            <DataRow label="貯金pt（今月追加）" value={h.savingsPointsAdded > 0 ? `+${h.savingsPointsAdded}pt` : "—"} />
          </SubSection>

          {/* ユニレベル段数内訳 */}
          {h.unilevelDetail.length > 0 && (
            <div className="px-4 pt-4 pb-5">
              <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: `${GOLD}60` }}>
                ユニレベル段数別
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}12` }}>
                <div
                  className="grid grid-cols-3 text-xs font-semibold px-4 py-2.5"
                  style={{ background: `${GOLD}08`, color: `${GOLD}70`, borderBottom: `1px solid ${GOLD}12` }}
                >
                  <span>段</span>
                  <span className="text-right">算出率</span>
                  <span className="text-right">金額</span>
                </div>
                {h.unilevelDetail.map((d) => (
                  <div
                    key={d.depth}
                    className="grid grid-cols-3 px-4 py-2.5 text-xs"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span className="font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>{d.depth}段目</span>
                    <span className="text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{d.rate}%</span>
                    <span className="text-right font-bold text-white/80">{yen(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── メインページ ─── */
export default function MlmBonusHistoryPage() {
  const [data,    setData]    = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/my/mlm-bonus-history")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 過去1年分のフィルタ
  const oneYearAgo = (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 12);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const currentMonthHistory = data?.history.find((h) => h.bonusMonth === currentMonth);
  const pastHistory = data?.history.filter((h) =>
    h.bonusMonth !== currentMonth &&
    (showAll || h.bonusMonth >= oneYearAgo)
  ) ?? [];

  const totalPaid12 = data?.history
    .filter((h) => h.bonusMonth >= oneYearAgo)
    .reduce((s, h) => s + h.paymentAmount, 0) ?? 0;

  const totalPaidAll = data?.history.reduce((s, h) => s + h.paymentAmount, 0) ?? 0;

  return (
    <div className="min-h-screen pb-12" style={{ background: PAGE_BG }}>

      {/* ヘッダー */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: "rgba(245,240,232,0.96)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`,
          boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset",
        }}
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 transition"
            style={{ color: "rgba(10,22,40,0.60)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>

          <div className="flex items-center gap-2 ml-1 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-base font-semibold" style={{ color: NAVY }}>ボーナス履歴</h1>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-40"
            style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ローディング */}
        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
            <p className="text-sm" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="rounded-2xl p-6 text-center text-sm border border-red-500/20 bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* ── 現在ステータス ── */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl p-3.5 text-center"
                style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                <div className="text-xs mb-1" style={{ color: `${GOLD}70` }}>当月レベル</div>
                <div className="text-xl font-black" style={{ color: GOLD }}>
                  {data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 text-center"
                style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}25` }}>
                <div className="text-xs mb-1" style={{ color: `${ORANGE}80` }}>称号</div>
                <div className="text-xl font-black" style={{ color: ORANGE }}>
                  {data.titleLevel > 0 ? `LV.${data.titleLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>貯金pt</div>
                <div className="text-sm font-black" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {data.savingsPoints.toLocaleString()}
                  <span className="text-xs font-normal ml-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>pt</span>
                </div>
              </div>
            </div>

            {/* ── 累計カード ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: `linear-gradient(150deg,#0d1e45,#162a56)`,
                border: `1px solid ${GOLD}30`,
              }}
            >
              <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD},${ORANGE},transparent)` }} />
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: `${GOLD}70` }}>過去12ヶ月</div>
                  <div className="text-2xl font-black" style={{ color: GOLD_LIGHT }}>{yen(totalPaid12)}</div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>全期間累計</div>
                  <div className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.70)" }}>{yen(totalPaidAll)}</div>
                </div>
              </div>
            </div>

            {/* ── 当月明細 ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-bold tracking-wide" style={{ color: `${GOLD}70` }}>
                  ▶ 当月ボーナス明細（{currentMonth}）
                </h2>
              </div>
              {currentMonthHistory ? (
                <BonusCard h={currentMonthHistory} defaultOpen={true} isCurrentMonth={true} />
              ) : (
                <div
                  className="rounded-2xl p-6 text-center text-sm"
                  style={{ background: `${CARD_BG}99`, border: `1px dashed ${GOLD}20` }}
                >
                  <p style={{ color: "rgba(255,255,255,0.3)" }}>
                    当月（{currentMonth}）のボーナスはまだ確定していません
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                    月次バッチ処理後に表示されます
                  </p>
                </div>
              )}
            </div>

            {/* ── 過去1年の履歴 ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
                  ▶ 過去の報酬明細
                  <span className="ml-2 font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>
                    （{showAll ? "全期間" : "過去12ヶ月"}）
                  </span>
                </h2>
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs px-2.5 py-1 rounded-lg transition"
                  style={{
                    background: showAll ? `${GOLD}18` : "rgba(255,255,255,0.05)",
                    color: showAll ? GOLD : "rgba(255,255,255,0.4)",
                    border: `1px solid ${showAll ? `${GOLD}30` : "rgba(255,255,255,0.10)"}`,
                  }}
                >
                  {showAll ? "12ヶ月に絞る" : "全期間表示"}
                </button>
              </div>

              {pastHistory.length === 0 ? (
                <div
                  className="rounded-2xl p-8 text-center text-sm"
                  style={{ background: `${CARD_BG}80`, color: "rgba(255,255,255,0.25)" }}
                >
                  {showAll ? "ボーナス履歴がありません" : "過去12ヶ月のボーナス履歴がありません"}
                </div>
              ) : (
                <div className="space-y-3">
                  {pastHistory.map((h) => (
                    <BonusCard key={h.bonusMonth} h={h} defaultOpen={false} isCurrentMonth={false} />
                  ))}
                </div>
              )}
            </div>

            {/* ── 全件表示中のヒント ── */}
            {!showAll && data.history.length > pastHistory.length + (currentMonthHistory ? 1 : 0) && (
              <div className="text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs underline transition"
                  style={{ color: `${GOLD}60` }}
                >
                  さらに古い明細を表示（全{data.history.length}件）
                </button>
              </div>
            )}

            {/* ── PDF一括DLセクション ── */}
            <div
              className="rounded-2xl p-4"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.18)" }}
            >
              <p className="text-xs font-bold mb-3" style={{ color: `${NAVY}70` }}>
                📥 ダウンロードについて
              </p>
              <p className="text-xs" style={{ color: `${NAVY}55` }}>
                各月の「PDF」ボタンから、その月のボーナス明細書をPDFでダウンロードできます。
                確定済み（バッチ処理完了）の月のみ対象です。
              </p>
            </div>

            {/* 組織図リンク */}
            <Link
              href="/mlm-org-chart"
              className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-95"
              style={{
                background: `linear-gradient(150deg,${CARD_BG} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}22`,
                boxShadow: "0 4px 16px rgba(10,22,40,0.14)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${GOLD}18` }}>
                  <span>🌐</span>
                </div>
                <span className="font-semibold text-sm text-white">組織図を見る</span>
              </div>
              <span style={{ color: `${GOLD}55` }}>›</span>
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
