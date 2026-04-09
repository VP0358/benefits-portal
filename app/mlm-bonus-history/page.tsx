"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

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
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;
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

// ── カラー定数 ──
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const PAGE_BG    = "#eee8e0";
const CARD_BG    = "#0d1e38";
const NAVY       = "#0a1628";
const NAVY_CARD2 = "#122444";

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function DataRow({ label, value, gold }: { label: string; value: React.ReactNode; gold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 last:border-0 text-xs`}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: gold ? `${GOLD}10` : "transparent"
      }}>
      <span style={{ color: gold ? GOLD : "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="font-bold" style={{ color: gold ? GOLD_LIGHT : "rgba(255,255,255,0.75)" }}>{value}</span>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1">
      <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: `${GOLD}60` }}>{title}</div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}12` }}>
        {children}
      </div>
    </div>
  );
}

function BonusCard({ h, defaultOpen }: { h: BonusHistory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
      {/* 月次サマリー */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition"
        style={{ background: open ? `${GOLD}06` : "transparent" }}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold text-white">{h.bonusMonth}</div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.isActive ? "#34d399" : "rgba(255,255,255,0.2)" }}></span>
              <span style={{ color: h.isActive ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                {h.isActive ? "アクティブ" : "非アクティブ"}
              </span>
            </div>
          </div>
          {h.achievedLevel > 0 && (
            <span className="rounded-full text-xs px-2.5 py-0.5 font-bold border"
              style={{ background: `${GOLD}15`, color: GOLD, borderColor: `${GOLD}30` }}>
              {LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}`}
            </span>
          )}
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <div className="text-lg font-black" style={{ color: GOLD_LIGHT }}>{yen(h.paymentAmount)}</div>
            <div className="text-[10px] mt-0.5" style={{ color: `${GOLD}50` }}>{open ? "▲ 閉じる" : "▼ 詳細"}</div>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${GOLD}12` }}>
          {/* ボーナス種別 */}
          <SubSection title="ボーナス種別">
            <DataRow label="ダイレクトB" value={yen(h.directBonus)} />
            <DataRow label="ユニレベルB" value={yen(h.unilevelBonus)} />
            <DataRow label="ランクアップB" value={yen(h.rankUpBonus)} />
            <DataRow label="シェアB" value={yen(h.shareBonus)} />
            <DataRow label="組織構築B" value={yen(h.structureBonus)} />
            <DataRow label="貯金B" value={yen(h.savingsBonus)} />
            <DataRow label="繰越金" value={yen(h.carryoverAmount)} />
            <DataRow label="調整金" value={yen(h.adjustmentAmount)} />
            <DataRow label="他ポジション" value={yen(h.otherPositionAmount)} />
            <DataRow label="総支払報酬" value={yen(h.totalBonus)} gold />
          </SubSection>

          {/* 支払い計算 */}
          <SubSection title="支払い計算">
            <DataRow label="支払調整前取得額" value={yen(h.amountBeforeAdjustment)} />
            <DataRow label="支払調整率" value={h.paymentAdjustmentRate != null ? `${h.paymentAdjustmentRate}%` : "—"} />
            <DataRow label="支払調整額" value={yen(h.paymentAdjustmentAmount)} />
            <DataRow label="取得額（調整後）" value={yen(h.finalAmount)} />
            <DataRow label="10%消費税（内税）" value={yen(h.consumptionTax)} />
            <DataRow label="源泉所得税" value={yen(h.withholdingTax)} />
            <DataRow label="過不足金" value={yen(h.shortageAmount)} />
            <DataRow label="他ポジション過不足" value={yen(h.otherPositionShortage)} />
            <DataRow label="事務手数料" value={yen(h.serviceFee)} />
            <DataRow label="支払額" value={yen(h.paymentAmount)} gold />
          </SubSection>

          {/* 組織データ */}
          <SubSection title="組織データ">
            <DataRow label="グループACT" value={h.groupActiveCount} />
            <DataRow label="グループpt" value={`${h.groupPoints.toLocaleString()}pt`} />
            <DataRow label="最小系列pt" value={`${h.minLinePoints.toLocaleString()}pt`} />
            <DataRow label="系列数" value={h.lineCount} />
            <DataRow label="LV.1系列数" value={h.level1Lines} />
            <DataRow label="LV.2系列数" value={h.level2Lines} />
            <DataRow label="LV.3系列数" value={h.level3Lines} />
            <DataRow label="自己購入pt" value={`${h.selfPurchasePoints}pt`} />
            <DataRow label="直紹介ACT" value={`${h.directActiveCount}名`} />
            <DataRow label="旧称号レベル" value={h.previousTitleLevel > 0 ? `LV.${h.previousTitleLevel}` : "—"} />
            <DataRow label="新称号レベル" value={h.newTitleLevel > 0 ? `LV.${h.newTitleLevel}` : "—"} />
            <DataRow label="当月判定レベル" value={h.achievedLevel > 0 ? LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}` : "—"} />
            <DataRow label="条件達成" value={h.conditions ?? "—"} />
            <DataRow label="貯金pt（累計）" value={`${h.savingsPoints.toLocaleString()}pt`} />
            <DataRow label="貯金pt（今月追加）" value={h.savingsPointsAdded > 0 ? `+${h.savingsPointsAdded}pt` : "—"} />
            <DataRow label="アクティブ" value={h.isActive
              ? <span style={{ color: "#34d399" }}>●</span>
              : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>} />
          </SubSection>

          {/* ユニレベル段数内訳 */}
          {h.unilevelDetail.length > 0 && (
            <div className="px-4 pt-4 pb-5">
              <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: `${GOLD}60` }}>ユニレベル段数別</div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}12` }}>
                <div className="grid grid-cols-3 text-xs font-semibold px-4 py-2.5"
                  style={{ background: `${GOLD}08`, color: `${GOLD}70`, borderBottom: `1px solid ${GOLD}12` }}>
                  <span>段</span><span className="text-right">算出率</span><span className="text-right">金額</span>
                </div>
                {h.unilevelDetail.map((d) => (
                  <div key={d.depth} className="grid grid-cols-3 px-4 py-2.5 text-xs"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
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

export default function MlmBonusHistoryPage() {
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-bonus-history")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = data?.history.reduce((s, h) => s + h.paymentAmount, 0) ?? 0;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: 'rgba(245,240,232,0.96)', backdropFilter: 'blur(20px) saturate(160%)', borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.60)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>ボーナス履歴</h1>
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
            {/* 現在ステータス */}
            <div className="grid grid-cols-3 gap-3">
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
                  {data.savingsPoints.toLocaleString()}<span className="text-xs font-normal ml-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>pt</span>
                </div>
              </div>
            </div>

            {/* 累計支払額 */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: `linear-gradient(150deg, #0d1e45, #162a56)`, border: `1px solid ${GOLD}30` }}>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, ${ORANGE}, transparent)` }}></div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs mb-1" style={{ color: `${GOLD}70` }}>累計支払ボーナス（直近3年）</div>
                  <div className="text-3xl font-black" style={{ color: GOLD_LIGHT }}>{yen(totalPaid)}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: GOLD }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 履歴リスト */}
            <div className="text-xs font-semibold tracking-wide px-1" style={{ color: `${GOLD}60` }}>
              履歴（{data.history.length}件）
            </div>
            {data.history.length === 0 ? (
              <div className="rounded-2xl p-10 text-center text-sm" style={{ background: CARD_BG, color: "rgba(255,255,255,0.25)" }}>
                ボーナス履歴がありません
              </div>
            ) : (
              <div className="space-y-3">
                {data.history.map((h, i) => (
                  <BonusCard key={h.bonusMonth} h={h} defaultOpen={i === 0} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
