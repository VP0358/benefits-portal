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

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function DataRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 border-b border-white/5 last:border-0 text-xs ${accent ? "bg-amber-500/10" : ""}`}>
      <span className={accent ? "text-amber-300 font-semibold" : "text-white/40"}>{label}</span>
      <span className={accent ? "text-amber-300 font-bold" : "text-white/75 font-medium"}>{value}</span>
    </div>
  );
}

function BonusCard({ h, defaultOpen }: { h: BonusHistory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* 月次サマリー */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/3 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold text-white">{h.bonusMonth}</div>
            <div className={`text-xs mt-0.5 flex items-center gap-1.5 ${h.isActive ? "text-emerald-400" : "text-white/30"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${h.isActive ? "bg-emerald-400" : "bg-white/20"}`}></span>
              {h.isActive ? "アクティブ" : "非アクティブ"}
            </div>
          </div>
          {h.achievedLevel > 0 && (
            <span className="rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/20 text-xs px-2.5 py-0.5 font-bold">
              {LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}`}
            </span>
          )}
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <div className="text-lg font-black text-amber-400">{yen(h.paymentAmount)}</div>
            <div className="text-[10px] text-white/30">{open ? "▲ 閉じる" : "▼ 詳細"}</div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5">
          {/* ボーナス種別 */}
          <div className="px-3 pt-3 pb-1">
            <div className="text-xs font-bold text-white/30 px-1 mb-1.5 tracking-wider">💰 ボーナス種別</div>
            <div className="rounded-xl overflow-hidden border border-white/5">
              <DataRow label="ダイレクトB" value={yen(h.directBonus)} />
              <DataRow label="ユニレベルB" value={yen(h.unilevelBonus)} />
              <DataRow label="ランクアップB" value={yen(h.rankUpBonus)} />
              <DataRow label="シェアB" value={yen(h.shareBonus)} />
              <DataRow label="組織構築B" value={yen(h.structureBonus)} />
              <DataRow label="貯金B" value={yen(h.savingsBonus)} />
              <DataRow label="繰越金" value={yen(h.carryoverAmount)} />
              <DataRow label="調整金" value={yen(h.adjustmentAmount)} />
              <DataRow label="他ポジション" value={yen(h.otherPositionAmount)} />
              <DataRow label="総支払報酬" value={yen(h.totalBonus)} accent />
            </div>
          </div>

          {/* 支払い計算 */}
          <div className="px-3 pt-3 pb-1">
            <div className="text-xs font-bold text-white/30 px-1 mb-1.5 tracking-wider">📊 支払い計算</div>
            <div className="rounded-xl overflow-hidden border border-white/5">
              <DataRow label="支払調整前取得額" value={yen(h.amountBeforeAdjustment)} />
              <DataRow label="支払調整率" value={h.paymentAdjustmentRate != null ? `${h.paymentAdjustmentRate}%` : "—"} />
              <DataRow label="支払調整額" value={yen(h.paymentAdjustmentAmount)} />
              <DataRow label="取得額（調整後）" value={yen(h.finalAmount)} />
              <DataRow label="10%消費税（内税）" value={yen(h.consumptionTax)} />
              <DataRow label="源泉所得税" value={yen(h.withholdingTax)} />
              <DataRow label="過不足金" value={yen(h.shortageAmount)} />
              <DataRow label="他ポジション過不足" value={yen(h.otherPositionShortage)} />
              <DataRow label="事務手数料" value={yen(h.serviceFee)} />
              <DataRow label="支払額" value={yen(h.paymentAmount)} accent />
            </div>
          </div>

          {/* 組織データ */}
          <div className="px-3 pt-3 pb-1">
            <div className="text-xs font-bold text-white/30 px-1 mb-1.5 tracking-wider">🌳 組織データ</div>
            <div className="rounded-xl overflow-hidden border border-white/5">
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
              <DataRow label="アクティブ" value={h.isActive ? <span className="text-emerald-400">●</span> : <span className="text-white/20">—</span>} />
            </div>
          </div>

          {/* ユニレベル段数内訳 */}
          {h.unilevelDetail.length > 0 && (
            <div className="px-3 pt-3 pb-4">
              <div className="text-xs font-bold text-white/30 px-1 mb-1.5 tracking-wider">🌊 ユニレベル段数別</div>
              <div className="rounded-xl overflow-hidden border border-white/5">
                <div className="grid grid-cols-3 border-b border-white/5 text-xs text-white/30 font-semibold px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span>段</span><span className="text-right">算出率</span><span className="text-right">金額</span>
                </div>
                {h.unilevelDetail.map((d) => (
                  <div key={d.depth} className="grid grid-cols-3 px-3 py-2 border-b border-white/5 last:border-0 text-xs">
                    <span className="font-semibold text-white/60">{d.depth}段目</span>
                    <span className="text-right text-white/40">{d.rate}%</span>
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
          <h1 className="text-base font-bold text-white ml-1">ボーナス履歴</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {data && (
          <>
            {/* 現在ステータス */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3.5 text-center border border-violet-400/20"
                style={{ background: "rgba(139,92,246,0.1)" }}>
                <div className="text-xs text-violet-400/70 mb-1">当月レベル</div>
                <div className="text-xl font-black text-violet-300">
                  {data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border border-amber-400/20"
                style={{ background: "rgba(245,158,11,0.1)" }}>
                <div className="text-xs text-amber-400/70 mb-1">👑 称号</div>
                <div className="text-xl font-black text-amber-300">
                  {data.titleLevel > 0 ? `LV.${data.titleLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border border-white/10"
                style={{ background: "#111827" }}>
                <div className="text-xs text-white/40 mb-1">🐖 貯金pt</div>
                <div className="text-sm font-black text-white/80">
                  {data.savingsPoints.toLocaleString()}<span className="text-xs font-normal text-white/30">pt</span>
                </div>
              </div>
            </div>

            {/* 累計支払額 */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div>
                <div className="text-xs text-white/40 mb-1">累計支払ボーナス（直近3年）</div>
                <div className="text-3xl font-black text-amber-400">{yen(totalPaid)}</div>
              </div>
              <div className="text-4xl opacity-60">💎</div>
            </div>

            {/* 履歴リスト */}
            <div className="text-xs text-white/30 px-1 font-semibold tracking-wide">履歴（{data.history.length}件）</div>
            {data.history.length === 0 ? (
              <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
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
