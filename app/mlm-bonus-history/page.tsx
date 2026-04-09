"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVEL_LABELS, UNILEVEL_RATES } from "@/lib/mlm-bonus";

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

function SubRow({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 border-b border-slate-50 last:border-0 text-xs ${bold ? "bg-violet-50 font-bold" : ""}`}>
      <span className={bold ? "text-violet-700" : "text-slate-500"}>{label}</span>
      <span className={bold ? "text-violet-700" : "text-slate-800"}>{value}</span>
    </div>
  );
}

function BonusCard({ h, defaultOpen }: { h: BonusHistory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 月次サマリー（クリックで展開） */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold text-slate-800">{h.bonusMonth}</div>
            <div className={`text-xs mt-0.5 ${h.isActive ? "text-emerald-600" : "text-slate-400"}`}>
              {h.isActive ? "✅ アクティブ" : "❌ 非アクティブ"}
            </div>
          </div>
          {h.achievedLevel > 0 && (
            <span className="rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-xs px-2 py-0.5 font-bold">
              {LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}`}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-base font-black text-slate-800">{yen(h.paymentAmount)}</div>
          <div className="text-xs text-slate-400">{open ? "▲ 閉じる" : "▼ 詳細"}</div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {/* ボーナス種別 */}
          <div className="px-1 pt-3 pb-1">
            <div className="text-xs font-bold text-slate-400 px-3 mb-1">💰 ボーナス種別</div>
            <div className="rounded-xl overflow-hidden border border-slate-100 mx-2">
              <SubRow label="ダイレクトB" value={yen(h.directBonus)} />
              <SubRow label="ユニレベルB" value={yen(h.unilevelBonus)} />
              <SubRow label="ランクアップB" value={yen(h.rankUpBonus)} />
              <SubRow label="シェアB" value={yen(h.shareBonus)} />
              <SubRow label="組織構築B" value={yen(h.structureBonus)} />
              <SubRow label="貯金B" value={yen(h.savingsBonus)} />
              <SubRow label="繰越金" value={yen(h.carryoverAmount)} />
              <SubRow label="調整金" value={yen(h.adjustmentAmount)} />
              <SubRow label="他ポジション" value={yen(h.otherPositionAmount)} />
              <SubRow label="総支払報酬" value={yen(h.totalBonus)} bold />
            </div>
          </div>

          {/* 支払い計算 */}
          <div className="px-1 pt-3 pb-1">
            <div className="text-xs font-bold text-slate-400 px-3 mb-1">📊 支払い計算</div>
            <div className="rounded-xl overflow-hidden border border-slate-100 mx-2">
              <SubRow label="支払調整前取得額" value={yen(h.amountBeforeAdjustment)} />
              <SubRow label="支払調整率" value={h.paymentAdjustmentRate != null ? `${h.paymentAdjustmentRate}%` : "—"} />
              <SubRow label="支払調整額" value={yen(h.paymentAdjustmentAmount)} />
              <SubRow label="取得額（調整後）" value={yen(h.finalAmount)} />
              <SubRow label="10%消費税（内税）" value={yen(h.consumptionTax)} />
              <SubRow label="源泉所得税" value={yen(h.withholdingTax)} />
              <SubRow label="過不足金" value={yen(h.shortageAmount)} />
              <SubRow label="他ポジション過不足" value={yen(h.otherPositionShortage)} />
              <SubRow label="事務手数料" value={yen(h.serviceFee)} />
              <SubRow label="支払額" value={yen(h.paymentAmount)} bold />
            </div>
          </div>

          {/* 組織データ */}
          <div className="px-1 pt-3 pb-1">
            <div className="text-xs font-bold text-slate-400 px-3 mb-1">🌳 組織データ</div>
            <div className="rounded-xl overflow-hidden border border-slate-100 mx-2">
              <SubRow label="グループACT" value={h.groupActiveCount} />
              <SubRow label="グループpt" value={`${h.groupPoints.toLocaleString()}pt`} />
              <SubRow label="最小系列pt" value={`${h.minLinePoints.toLocaleString()}pt`} />
              <SubRow label="系列数" value={h.lineCount} />
              <SubRow label="LV.1系列数" value={h.level1Lines} />
              <SubRow label="LV.2系列数" value={h.level2Lines} />
              <SubRow label="LV.3系列数" value={h.level3Lines} />
              <SubRow label="自己購入pt" value={`${h.selfPurchasePoints}pt`} />
              <SubRow label="直紹介ACT" value={`${h.directActiveCount}名`} />
              <SubRow label="旧称号レベル" value={h.previousTitleLevel > 0 ? `LV.${h.previousTitleLevel}` : "—"} />
              <SubRow label="新称号レベル" value={h.newTitleLevel > 0 ? `LV.${h.newTitleLevel}` : "—"} />
              <SubRow label="当月判定レベル" value={h.achievedLevel > 0 ? LEVEL_LABELS[h.achievedLevel] ?? `LV.${h.achievedLevel}` : "—"} />
              <SubRow label="条件達成" value={h.conditions ?? "—"} />
              <SubRow label="貯金pt（累計）" value={`${h.savingsPoints.toLocaleString()}pt`} />
              <SubRow label="貯金pt（今月追加）" value={h.savingsPointsAdded > 0 ? `+${h.savingsPointsAdded}pt` : "—"} />
              <SubRow label="アクティブ" value={h.isActive ? "○" : "—"} />
            </div>
          </div>

          {/* ユニレベル段数内訳 */}
          {h.unilevelDetail.length > 0 && (
            <div className="px-1 pt-3 pb-3">
              <div className="text-xs font-bold text-slate-400 px-3 mb-1">🌊 ユニレベル段数別</div>
              <div className="rounded-xl overflow-hidden border border-slate-100 mx-2">
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold px-3 py-1.5">
                  <span>段</span><span className="text-right">算出率</span><span className="text-right">金額</span>
                </div>
                {h.unilevelDetail.map((d) => (
                  <div key={d.depth} className="grid grid-cols-3 px-3 py-2 border-b border-slate-50 last:border-0 text-xs">
                    <span className="font-semibold text-slate-700">{d.depth}段目</span>
                    <span className="text-right text-slate-600">{d.rate}%</span>
                    <span className="text-right font-bold text-slate-800">{yen(d.amount)}</span>
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
    <div className="min-h-screen bg-[#e6f2dc]">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-green-600 text-sm font-medium hover:text-green-700">← 戻る</Link>
          <h1 className="text-lg font-bold text-slate-800">💰 ボーナス履歴</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm shadow-sm">{error}</div>}

        {data && (
          <>
            {/* 現在ステータス */}
            <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-center">
                <div className="text-xs text-violet-500 mb-1">当月レベル</div>
                <div className="text-xl font-black text-violet-700">
                  {data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                <div className="text-xs text-amber-500 mb-1">👑 称号</div>
                <div className="text-xl font-black text-amber-700">
                  {data.titleLevel > 0 ? `LV.${data.titleLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">🐖 貯金pt</div>
                <div className="text-sm font-black text-slate-700">
                  {data.savingsPoints.toLocaleString()}<span className="text-xs font-normal">pt</span>
                </div>
              </div>
            </div>

            {/* 累計支払額 */}
            <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">累計支払ボーナス（直近3年）</div>
                <div className="text-2xl font-black text-slate-800 mt-0.5">{yen(totalPaid)}</div>
              </div>
              <div className="text-3xl">💎</div>
            </div>

            {/* 履歴リスト */}
            <div className="text-xs text-slate-500 px-1 font-semibold">履歴（{data.history.length}件）</div>
            {data.history.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">ボーナス履歴がありません</div>
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
