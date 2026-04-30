"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

/* ─── 型定義 ─── */
type BonusRunSummary = {
  id: string;
  bonusMonth: string;
  status: "draft" | "confirmed" | "canceled";
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
  paymentAdjustmentRate: number | null;
  confirmedAt: string | null;
  createdAt: string;
};

/** 1ポジション分のデータ（ポジション別詳細タブで使用） */
type PositionRow = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  status: string;
  isActive: boolean;
  selfPurchasePoints: number;
  groupPoints: number;
  directActiveCount: number;
  achievedLevel: number;
  previousTitleLevel: number;
  newTitleLevel: number;
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;
  bonusTotal: number;
  carryoverAmount: number;
  adjustmentAmount: number;
  otherPositionAmount: number;
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
  forcedLevel: number;
  conditions: string | null;
  savingsPoints: number;
  unilevelDetail: Record<string, number> | null;
  savingsPointsAdded: number;
  createdAt: string;
};

/** テーブル行 = ポジション合算済み（positionCount≥2 なら複数ポジション持ち） */
type BonusResultRow = PositionRow & {
  baseCode: string;          // memberCodeの先頭6桁
  positionCount: number;     // ポジション数（1=単独, 2以上=複数）
  positions: PositionRow[];  // ポジション別詳細（positionCount=1 でも格納）
};

type AdjustmentRow = {
  id: string;
  bonusMonth: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
  comment: string | null;
  isTaxable?: boolean;
};

type ShortageRow = {
  id: string;
  bonusMonth: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
  comment: string | null;
};

type CsvPreviewRow = {
  memberCode: string;
  memberName: string;
  amount: string;
  comment: string;
  isTaxable?: boolean;
  error?: string;
};

/* ─── 定数 ─── */
const STATUS_STYLES = {
  draft:     { label: "計算済み（未確定）", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-300" },
  confirmed: { label: "確定済み",         bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  canceled:  { label: "取消",             bg: "bg-slate-100",  text: "text-slate-500",   border: "border-slate-200" },
};

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const s = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m] = s.split("/").map(Number);
  for (let i = 0; i < 15; i++) {
    const total = y * 12 + (m - 1) - i;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    const value = `${ny}-${String(nm).padStart(2, "0")}`;
    const label = `${ny}年${nm}月度`;
    options.push({ value, label });
  }
  return options;
}

/* ─── ボーナス内訳パネル（1行分を表示する共通コンポーネント） ─── */
function BonusBreakdown({ d }: { d: PositionRow }) {
  const unilevelEntries = d.unilevelDetail
    ? Object.entries(d.unilevelDetail).sort((a, b) => Number(a[0]) - Number(b[0]))
    : [];
  return (
    <div className="space-y-5">
      {/* 活動状況 */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">活動状況</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "自己購入PT", value: d.selfPurchasePoints, unit: "pt" },
            { label: "グループPT", value: d.groupPoints, unit: "pt" },
            { label: "直下アクティブ", value: d.directActiveCount, unit: "名" },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-xl font-bold text-slate-800">{value}<span className="text-xs font-normal text-slate-400 ml-1">{unit}</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* レベル情報 */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">レベル情報</h4>
        <div className="flex items-center gap-4 bg-indigo-50 rounded-xl px-5 py-4">
          <div className="text-center">
            <p className="text-xs text-indigo-400 mb-1">前回称号</p>
            <p className="text-base font-bold text-indigo-700">{LEVEL_LABELS[d.previousTitleLevel]}</p>
          </div>
          {d.previousTitleLevel !== d.newTitleLevel ? (
            <>
              <div className="text-2xl text-indigo-300">→</div>
              <div className="text-center">
                <p className="text-xs text-indigo-400 mb-1">新称号</p>
                <p className="text-base font-bold text-indigo-700">{LEVEL_LABELS[d.newTitleLevel]}</p>
              </div>
              <span className={`ml-auto text-xs px-3 py-1 rounded-full font-semibold ${d.newTitleLevel > d.previousTitleLevel ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {d.newTitleLevel > d.previousTitleLevel ? "▲ 昇格" : "▼ 降格"}
              </span>
            </>
          ) : (
            <span className="ml-auto text-xs px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">変動なし</span>
          )}
          <div className="text-center ml-4 pl-4 border-l border-indigo-200">
            <p className="text-xs text-indigo-400 mb-1">当月達成LV</p>
            <p className="text-base font-bold text-indigo-700">{LEVEL_LABELS[d.achievedLevel]}</p>
          </div>
        </div>
      </section>

      {/* ボーナス内訳 */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ボーナス内訳</h4>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">ダイレクトボーナス</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.directBonus)}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">ユニレベルボーナス</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.unilevelBonus)}</td>
              </tr>
              {unilevelEntries.map(([depth, pts]) => (
                <tr key={depth} className="bg-blue-50/40">
                  <td className="px-4 py-2 text-xs text-blue-500 pl-10">└ {depth}段目</td>
                  <td className="px-4 py-2 text-right text-xs text-blue-600 font-medium">{yen(pts)}</td>
                </tr>
              ))}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">組織構築ボーナス</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.structureBonus)}</td>
              </tr>
              {d.carryoverAmount > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">繰越金</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.carryoverAmount)}</td>
                </tr>
              )}
              {d.adjustmentAmount !== 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">調整金</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.adjustmentAmount)}</td>
                </tr>
              )}
              <tr className="bg-blue-50 font-bold">
                <td className="px-4 py-3 text-blue-800">ボーナス合計</td>
                <td className="px-4 py-3 text-right text-blue-800">{yen(d.bonusTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 支払計算 */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">支払計算</h4>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">調整前取得額</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.amountBeforeAdjustment)}</td>
              </tr>
              {(d.paymentAdjustmentRate ?? 0) > 0 && (
                <>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">支払調整率</td>
                    <td className="px-4 py-3 text-right text-orange-600">{d.paymentAdjustmentRate}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">支払調整額（差引）</td>
                    <td className="px-4 py-3 text-right text-red-500">－{yen(d.paymentAdjustmentAmount)}</td>
                  </tr>
                </>
              )}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">調整後取得額</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(d.finalAmount)}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">源泉徴収税（10.21%）</td>
                <td className="px-4 py-3 text-right text-red-500">－{yen(d.withholdingTax)}</td>
              </tr>
              {d.serviceFee > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">事務手数料</td>
                  <td className="px-4 py-3 text-right text-red-500">－{yen(d.serviceFee)}</td>
                </tr>
              )}
              <tr className="bg-emerald-50 font-bold">
                <td className="px-4 py-3 text-emerald-800 text-base">最終支払額</td>
                <td className="px-4 py-3 text-right text-emerald-800 text-lg">{yen(d.paymentAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ─── 個別報酬詳細モーダル ─── */
function BonusDetailModal({ row, onClose }: { row: BonusResultRow; onClose: () => void }) {
  const name = row.companyName || row.memberName;
  const isMulti = row.positionCount >= 2;
  // タブ: "merged" | "pos-0" | "pos-1" | ...
  const [activeTab, setActiveTab] = useState<string>("merged");

  // 現在表示するデータ
  const displayData: PositionRow =
    activeTab === "merged"
      ? row
      : row.positions[Number(activeTab.replace("pos-", ""))] ?? row;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── ヘッダー ── */}
        <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <p className="text-xs font-semibold text-blue-500 tracking-widest uppercase mb-0.5">Bonus Detail</p>
            <h3 className="text-xl font-bold text-gray-900">{name}</h3>
            {row.companyName && <p className="text-sm text-gray-500 mt-0.5">{row.memberName}</p>}
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {isMulti ? `${row.baseCode}** （${row.positionCount}ポジション）` : row.memberCode}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {row.isActive ? "アクティブ" : "非アクティブ"}
            </span>
            {isMulti && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">
                {row.positionCount} POS
              </span>
            )}
          </div>
        </div>

        {/* ── ポジション切り替えタブ（複数ポジション時のみ） ── */}
        {isMulti && (
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            <button
              onClick={() => setActiveTab("merged")}
              className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 ${
                activeTab === "merged"
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 合算（支払口座単位）
            </button>
            {row.positions.map((pos, i) => (
              <button
                key={pos.id}
                onClick={() => setActiveTab(`pos-${i}`)}
                className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 ${
                  activeTab === `pos-${i}`
                    ? "border-purple-600 text-purple-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🔷 {pos.memberCode}
              </button>
            ))}
          </div>
        )}

        {/* ── コンテンツ ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* 合算タブのみ：複数ポジション注記 */}
          {isMulti && activeTab === "merged" && (
            <div className="mb-4 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
              <p className="font-bold mb-1">💡 複数ポジション合算表示</p>
              <p>同一口座への振込となるため、全{row.positionCount}ポジションの報酬を合算しています。</p>
              <p className="mt-1">各ポジションの個別内訳はタブで切り替えて確認できます。</p>
            </div>
          )}
          {/* ポジション個別タブ：コード表示 */}
          {isMulti && activeTab !== "merged" && (
            <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <p className="font-bold">🔷 ポジション: {displayData.memberCode}</p>
              <p className="mt-0.5">このポジション単独の報酬内訳です。</p>
            </div>
          )}
          <BonusBreakdown d={displayData} />
        </div>

        {/* ── フッター ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 計算結果テーブル ─── */
function ResultTable({ results }: { results: BonusResultRow[] }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "payment">("all");
  const [detailRow, setDetailRow] = useState<BonusResultRow | null>(null);

  const filtered = results.filter((r) => {
    const matchSearch = r.memberName.includes(search) || (r.companyName || "").includes(search) || r.memberCode.includes(search);
    const matchFilter = activeFilter === "all" || (activeFilter === "payment" && r.paymentAmount > 0);
    return matchSearch && matchFilter;
  });

  const totalBonus = filtered.reduce((s, r) => s + r.bonusTotal, 0);
  const totalPayment = filtered.reduce((s, r) => s + r.paymentAmount, 0);
  const paymentCount = filtered.filter((r) => r.paymentAmount > 0).length;

  return (
    <div className="space-y-4">
      {/* 検索・フィルター */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="会員名・法人名・会員コードで検索..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 text-xs font-semibold transition ${activeFilter === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            全員（{results.length}名）
          </button>
          <button
            onClick={() => setActiveFilter("payment")}
            className={`px-4 py-2 text-xs font-semibold transition border-l ${activeFilter === "payment" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            支払対象（{results.filter(r => r.paymentAmount > 0).length}名）
          </button>
        </div>
        <span className="text-sm text-gray-600">{filtered.length} 件表示</span>
      </div>

      {/* サマリーバー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-500 font-semibold mb-0.5">ボーナス合計（表示中）</p>
          <p className="text-lg font-bold text-blue-800">{yen(totalBonus)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-500 font-semibold mb-0.5">支払総額（表示中）</p>
          <p className="text-lg font-bold text-emerald-800">{yen(totalPayment)}</p>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
          <p className="text-xs text-violet-500 font-semibold mb-0.5">支払発生者</p>
          <p className="text-lg font-bold text-violet-800">{paymentCount} 名</p>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="text-left p-2 font-semibold">会員コード</th>
              <th className="text-left p-2 font-semibold">氏名/法人名</th>
              <th className="text-left p-2 font-semibold">ステータス</th>
              <th className="text-right p-2 font-semibold">自己pt</th>
              <th className="text-right p-2 font-semibold">グループpt</th>
              <th className="text-right p-2 font-semibold">直接</th>
              <th className="text-left p-2 font-semibold">称号変動</th>
              <th className="text-left p-2 font-semibold">現レベル</th>
              <th className="text-right p-2 font-semibold">ダイレクト</th>
              <th className="text-right p-2 font-semibold">ユニレベル</th>
              <th className="text-right p-2 font-semibold">組織</th>
              <th className="text-right p-2 font-semibold">ボーナス合計</th>
              <th className="text-right p-2 font-semibold">源泉税</th>
              <th className="text-right p-2 font-semibold">支払額</th>
              <th className="text-center p-2 font-semibold">詳細</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={15} className="text-center py-8 text-gray-400">データがありません</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className={`border-b hover:bg-blue-50/30 transition ${r.paymentAmount > 0 ? "" : "opacity-60"}`}>
                {/* 会員コード：複数ポジションは baseCode-** 表示 */}
                <td className="p-2 font-mono text-xs text-slate-600">
                  {r.positionCount >= 2
                    ? <span>{r.baseCode}<span className="text-purple-400">**</span></span>
                    : r.memberCode}
                </td>
                <td className="p-2">
                  <div className="font-medium text-gray-800 flex items-center gap-1">
                    {r.companyName || r.memberName}
                    {/* 複数ポジションバッジ */}
                    {r.positionCount >= 2 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 leading-none">
                        {r.positionCount}POS
                      </span>
                    )}
                  </div>
                  {r.companyName && <div className="text-gray-500 text-[10px]">{r.memberName}</div>}
                </td>
                <td className="p-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    r.isActive ? "bg-green-100 text-green-700"
                    : r.status === "autoship" ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-500"}`}>
                    {r.isActive ? "アクティブ" : r.status === "autoship" ? "AS" : "非"}
                  </span>
                </td>
                <td className="p-2 text-right text-gray-700">{r.selfPurchasePoints}</td>
                <td className="p-2 text-right text-gray-700">{r.groupPoints}</td>
                <td className="p-2 text-right text-gray-700">{r.directActiveCount}</td>
                <td className="p-2">
                  {r.previousTitleLevel !== r.newTitleLevel ? (
                    <span className={`text-[10px] font-semibold ${r.newTitleLevel > r.previousTitleLevel ? "text-green-600" : "text-red-500"}`}>
                      {LEVEL_LABELS[r.previousTitleLevel]} → {LEVEL_LABELS[r.newTitleLevel]}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">変動なし</span>
                  )}
                </td>
                <td className="p-2 text-gray-700 text-[11px]">{LEVEL_LABELS[r.achievedLevel]}</td>
                <td className="p-2 text-right text-gray-800">{yen(r.directBonus)}</td>
                <td className="p-2 text-right text-gray-800">{yen(r.unilevelBonus)}</td>
                <td className="p-2 text-right text-gray-800">{yen(r.structureBonus)}</td>
                <td className="p-2 text-right font-bold text-slate-700">{yen(r.bonusTotal)}</td>
                <td className="p-2 text-right text-red-600">{yen(r.withholdingTax)}</td>
                <td className={`p-2 text-right font-bold ${r.paymentAmount > 0 ? "text-blue-600" : "text-gray-400"}`}>
                  {yen(r.paymentAmount)}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => setDetailRow(r)}
                    className={`px-2 py-1 border text-[10px] rounded transition font-semibold ${
                      r.positionCount >= 2
                        ? "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
                        : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                    }`}
                  >
                    {r.positionCount >= 2 ? `詳細(${r.positionCount}POS)` : "詳細"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 詳細モーダル */}
      {detailRow && <BonusDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

/* ─── メインコンポーネント ─── */
export default function BonusCalculatePage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunSummary | null>(null);
  const [results, setResults] = useState<BonusResultRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [shortages, setShortages] = useState<ShortageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 公開状況
  type PublishStatus = { total: number; published: number; unpublished: number; allPublished: boolean } | null;
  const [publishStatus, setPublishStatus] = useState<PublishStatus>(null);

  // タブ
  const [activeTab, setActiveTab] = useState<"calculation" | "adjustment" | "shortage">("calculation");

  // ページネーション
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const [shortagePage, setShortagePage] = useState(1);
  const itemsPerPage = 100;

  // 支払調整率
  const [paymentAdjustmentRate, setPaymentAdjustmentRate] = useState<number>(2);
  const [updatingRate, setUpdatingRate] = useState(false);

  // ─── モーダル制御 ───
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showShortageModal, setShowShortageModal] = useState(false);

  // CSV プレビューモーダル
  const [showAdjCsvModal, setShowAdjCsvModal] = useState(false);
  const [showShorCsvModal, setShowShorCsvModal] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);

  // ─── フォーム状態 ───
  const [newAdj, setNewAdj] = useState({ memberCode: "", memberName: "", amount: "", comment: "", isTaxable: true });
  const [adjLookingUp, setAdjLookingUp] = useState(false);

  const [newShor, setNewShor] = useState({ memberCode: "", memberName: "", amount: "", comment: "" });
  const [shorLookingUp, setShorLookingUp] = useState(false);

  // 診断情報（計算結果取得エラー時に表示）
  type DebugInfo = { status: number; hasResults: boolean; resultsCount: number; error?: string; detail?: string } | null;
  const [debugInfo, setDebugInfo] = useState<DebugInfo>(null);

  // CSV ファイル ref
  const adjCsvRef  = useRef<HTMLInputElement>(null);
  const shorCsvRef = useRef<HTMLInputElement>(null);

  // ─── API 呼び出し ───
  const fetchPublishStatus = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const res = await fetch(`/api/admin/bonus-results/publish-all?bonusMonth=${selectedMonth}`);
      if (res.ok) { const data = await res.json(); setPublishStatus(data); }
    } catch (err) { console.error(err); }
  }, [selectedMonth]);

  const fetchBonusRun = useCallback(async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bonus-run?bonusMonth=${selectedMonth}`);
      const data = await res.json();
      if (res.ok) {
        setBonusRun(data.bonusRun);
        if (data.bonusRun?.paymentAdjustmentRate != null) setPaymentAdjustmentRate(data.bonusRun.paymentAdjustmentRate);
        if (data.bonusRun) {
          // 計算結果の詳細を取得（エラーでも bonusRun は表示する）
          try {
            const resDetail = await fetch(`/api/admin/bonus-results/detail?bonusMonth=${selectedMonth}`);
            const detailData = await resDetail.json();
            if (resDetail.ok && Array.isArray(detailData.results)) {
              setResults(detailData.results);
              setDebugInfo(null);
            } else {
              setResults([]);
              setDebugInfo({
                status: resDetail.status,
                hasResults: Array.isArray(detailData.results),
                resultsCount: Array.isArray(detailData.results) ? detailData.results.length : 0,
                error: detailData.error || "不明なエラー",
                detail: detailData.detail || String(detailData),
              });
            }
          } catch (detailErr) {
            console.error("計算結果取得エラー:", detailErr);
            setResults([]);
            setDebugInfo({
              status: 0,
              hasResults: false,
              resultsCount: 0,
              error: String(detailErr),
            });
          }
          // 公開状況も取得
          try { await fetchPublishStatus(); } catch {}
        } else {
          setResults([]);
          setPublishStatus(null);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedMonth]);

  const fetchAdjustments = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bonus-adjustments?bonusMonth=${selectedMonth}`);
      if (res.ok) { const data = await res.json(); setAdjustments(data.adjustments || []); }
    } catch (err) { console.error(err); }
  }, [selectedMonth]);

  const fetchShortages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bonus-shortages?bonusMonth=${selectedMonth}`);
      if (res.ok) { const data = await res.json(); setShortages(data.shortages || []); }
    } catch (err) { console.error(err); }
  }, [selectedMonth]);

  useEffect(() => { fetchBonusRun(); }, [fetchBonusRun]);
  useEffect(() => { fetchAdjustments(); fetchShortages(); }, [fetchAdjustments, fetchShortages]);
  useEffect(() => { if (bonusRun?.status === "confirmed") fetchPublishStatus(); }, [bonusRun, fetchPublishStatus]);

  // ─── 会員コード検索（調整金） ───
  const lookupAdjMember = async () => {
    if (!newAdj.memberCode.trim()) return;
    setAdjLookingUp(true);
    try {
      const res = await fetch(`/api/admin/mlm-members/search?code=${newAdj.memberCode.trim()}`);
      if (res.ok) {
        const data = await res.json();
        const name = data.member?.user?.name || data.member?.userName || data.name || data.user?.name || "（取得失敗）";
        setNewAdj(prev => ({ ...prev, memberName: name }));
      } else {
        setNewAdj(prev => ({ ...prev, memberName: "会員が見つかりません" }));
      }
    } catch { setNewAdj(prev => ({ ...prev, memberName: "検索エラー" })); }
    finally { setAdjLookingUp(false); }
  };

  // ─── 会員コード検索（過不足金） ───
  const lookupShorMember = async () => {
    if (!newShor.memberCode.trim()) return;
    setShorLookingUp(true);
    try {
      const res = await fetch(`/api/admin/mlm-members/search?code=${newShor.memberCode.trim()}`);
      if (res.ok) {
        const data = await res.json();
        const name = data.member?.user?.name || data.member?.userName || data.name || data.user?.name || "（取得失敗）";
        setNewShor(prev => ({ ...prev, memberName: name }));
      } else {
        setNewShor(prev => ({ ...prev, memberName: "会員が見つかりません" }));
      }
    } catch { setNewShor(prev => ({ ...prev, memberName: "検索エラー" })); }
    finally { setShorLookingUp(false); }
  };

  // ─── 支払調整率保存 ───
  const handleUpdatePaymentRate = async () => {
    if (!bonusRun) return;
    setUpdatingRate(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth, paymentAdjustmentRate }),
      });
      const data = await res.json();
      if (res.ok) { alert("✅ 支払調整率を更新しました"); await fetchBonusRun(); }
      else alert(`❌ エラー: ${data.error}`);
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setUpdatingRate(false); }
  };

  // ─── ボーナス計算実行 ───
  const handleExecute = async () => {
    if (!selectedMonth) return;
    if (!confirm(`${selectedMonth}のボーナス計算を実行しますか？\n\n計算完了後、即座に「確定」状態で保存されます。`)) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth, paymentAdjustmentRate }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ボーナス計算・確定が完了しました\n対象: ${data.totalMembers}名 / アクティブ: ${data.totalActiveMembers}名\n合計ボーナス: ¥${Number(data.totalBonusAmount).toLocaleString()}\n\n次のステップ: 計算結果を確認して「全員に一括公開」を実行してください`);
        await fetchBonusRun();
        setActiveTab("calculation");
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setExecuting(false); }
  };

  // ─── draft → confirmed 強制切り替え（古いdraftレコードの救済用） ───
  const handleForceConfirm = async () => {
    if (!selectedMonth || !bonusRun) return;
    if (bonusRun.status === "confirmed") { alert("すでに確定済みです。"); return; }
    if (!confirm(`${selectedMonth}のボーナス計算を「確定」に切り替えますか？\n\n称号レベルが各会員に反映されます。`)) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        await fetchBonusRun();
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setConfirming(false); }
  };

  // ─── 全員に一括公開 ───
  const handlePublishAll = async (isPublished: boolean) => {
    if (!selectedMonth || !bonusRun) return;
    if (bonusRun.status !== "confirmed") { alert("確定済みのボーナスのみ公開できます。"); return; }
    const msg = isPublished
      ? `${selectedMonth}のボーナス明細を全会員に公開しますか？\n\n貯金ポイントが各会員に付与されます。`
      : `${selectedMonth}のボーナス明細を非公開に戻しますか？`;
    if (!confirm(msg)) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/bonus-results/publish-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth, isPublished }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        await fetchPublishStatus();
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setPublishing(false); }
  };

  // ─── ボーナス計算削除（確定済み含む強制削除対応） ───
  const handleDelete = async () => {
    if (!selectedMonth || !bonusRun) return;
    const isConfirmed = bonusRun.status === "confirmed";
    const confirmMsg = isConfirmed
      ? `⚠️ 【確定済み】${selectedMonth}のボーナス計算を強制削除しますか？\n\nこの操作は取り消せません。ボーナス結果・明細がすべて削除されます。`
      : `${selectedMonth}のボーナス計算を削除しますか？\n\nボーナス結果・明細がすべて削除されます。`;
    if (!confirm(confirmMsg)) return;
    if (isConfirmed && !confirm("確定済みデータを削除します。本当によろしいですか？")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/bonus-run?bonusMonth=${selectedMonth}&force=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ ボーナス計算を削除しました");
        setBonusRun(null);
        setResults([]);
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setDeleting(false); }
  };

  // ─── 調整金・手動追加 ───
  const handleAddAdjustment = async () => {
    if (!newAdj.memberCode || !newAdj.amount) { alert("会員コードと金額を入力してください"); return; }
    if (!selectedMonth) { alert("対象月を選択してください"); return; }
    try {
      const res = await fetch("/api/admin/bonus-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          memberCode: newAdj.memberCode,
          amount: parseInt(newAdj.amount),
          comment: newAdj.comment || null,
          isTaxable: newAdj.isTaxable,
        }),
      });
      if (res.ok) {
        alert("✅ 調整金を追加しました");
        setShowAdjustmentModal(false);
        setNewAdj({ memberCode: "", memberName: "", amount: "", comment: "", isTaxable: true });
        await fetchAdjustments();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
  };

  // ─── 調整金・削除 ───
  const handleDeleteAdjustment = async (id: string, memberName: string, amount: number) => {
    if (!confirm(`調整金を削除しますか？\n${memberName}：${yen(amount)}`)) return;
    try {
      const res = await fetch(`/api/admin/bonus-adjustments?id=${id}`, { method: "DELETE" });
      if (res.ok) { await fetchAdjustments(); }
      else { const data = await res.json(); alert(`❌ エラー: ${data.error}`); }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
  };

  // ─── 過不足金・手動追加 ───
  const handleAddShortage = async () => {
    if (!newShor.memberCode || !newShor.amount) { alert("会員コードと金額を入力してください"); return; }
    if (!selectedMonth) { alert("対象月を選択してください"); return; }
    try {
      const res = await fetch("/api/admin/bonus-shortages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          memberCode: newShor.memberCode,
          amount: parseInt(newShor.amount),
          comment: newShor.comment || null,
        }),
      });
      if (res.ok) {
        alert("✅ 過不足金を追加しました");
        setShowShortageModal(false);
        setNewShor({ memberCode: "", memberName: "", amount: "", comment: "" });
        await fetchShortages();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
  };

  // ─── 過不足金・削除 ───
  const handleDeleteShortage = async (id: string, memberName: string, amount: number) => {
    if (!confirm(`過不足金を削除しますか？\n${memberName}：${yen(amount)}`)) return;
    try {
      const res = await fetch(`/api/admin/bonus-shortages?id=${id}`, { method: "DELETE" });
      if (res.ok) { await fetchShortages(); }
      else { const data = await res.json(); alert(`❌ エラー: ${data.error}`); }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
  };

  // ─── CSVパース共通 ───
  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split(/\r?\n/);
    return lines.map(line => {
      const cols: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur); cur = ""; }
        else cur += ch;
      }
      cols.push(cur);
      return cols.map(c => c.trim());
    });
  };

  // ─── 調整金 CSV 読み込み → プレビュー ───
  const handleAdjCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const startIdx = rows[0]?.[0]?.includes("コード") || rows[0]?.[0]?.includes("code") ? 1 : 0;
      const preview: CsvPreviewRow[] = rows.slice(startIdx).filter(r => r.length >= 2 && r[0]).map(r => ({
        memberCode: r[0] || "",
        memberName: r[1] || "",
        amount: r[2] || "",
        comment: r[3] || "",
        isTaxable: r[4] ? r[4] !== "0" && r[4] !== "非課税" && r[4] !== "false" : true,
        error: !r[2] || isNaN(Number(r[2])) ? "金額が不正です" : undefined,
      }));
      setCsvPreviewRows(preview);
      setShowAdjCsvModal(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // ─── 調整金 CSV 一括登録 ───
  const handleAdjCsvUpload = async () => {
    if (!selectedMonth) { alert("対象月を選択してください"); return; }
    const validRows = csvPreviewRows.filter(r => !r.error);
    if (validRows.length === 0) { alert("有効なデータがありません"); return; }
    setCsvUploading(true);
    try {
      const res = await fetch("/api/admin/bonus-adjustments/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          items: validRows.map(r => ({
            memberCode: r.memberCode,
            amount: Number(r.amount),
            comment: r.comment || null,
            isTaxable: r.isTaxable ?? true,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const { results: r } = data;
        alert(`✅ 取込完了\n成功：${r.success}件　失敗：${r.failed}件${r.errors?.length ? "\n\nエラー詳細:\n" + r.errors.join("\n") : ""}`);
        setShowAdjCsvModal(false);
        setCsvPreviewRows([]);
        await fetchAdjustments();
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setCsvUploading(false); }
  };

  // ─── 過不足金 CSV 読み込み → プレビュー ───
  const handleShorCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const startIdx = rows[0]?.[0]?.includes("コード") || rows[0]?.[0]?.includes("code") ? 1 : 0;
      const preview: CsvPreviewRow[] = rows.slice(startIdx).filter(r => r.length >= 2 && r[0]).map(r => ({
        memberCode: r[0] || "",
        memberName: r[1] || "",
        amount: r[2] || "",
        comment: r[3] || "",
        error: !r[2] || isNaN(Number(r[2])) ? "金額が不正です" : undefined,
      }));
      setCsvPreviewRows(preview);
      setShowShorCsvModal(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // ─── 過不足金 CSV 一括登録 ───
  const handleShorCsvUpload = async () => {
    if (!selectedMonth) { alert("対象月を選択してください"); return; }
    const validRows = csvPreviewRows.filter(r => !r.error);
    if (validRows.length === 0) { alert("有効なデータがありません"); return; }
    setCsvUploading(true);
    try {
      const res = await fetch("/api/admin/bonus-shortages/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          items: validRows.map(r => ({
            memberCode: r.memberCode,
            amount: Number(r.amount),
            comment: r.comment || null,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const { results: r } = data;
        alert(`✅ 取込完了\n成功：${r.success}件　失敗：${r.failed}件${r.errors?.length ? "\n\nエラー詳細:\n" + r.errors.join("\n") : ""}`);
        setShowShorCsvModal(false);
        setCsvPreviewRows([]);
        await fetchShortages();
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: unknown) { alert(`❌ エラー: ${(err as Error).message}`); }
    finally { setCsvUploading(false); }
  };

  // ─── CSV テンプレートダウンロード（調整金） ───
  const downloadAdjTemplate = () => {
    const csv = "\uFEFF会員コード,氏名,金額,コメント,課税区分(1=課税/0=非課税)\nVP00001,山田太郎,10000,特別調整,1\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "調整金テンプレート.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── CSV テンプレートダウンロード（過不足金） ───
  const downloadShorTemplate = () => {
    const csv = "\uFEFF会員コード,氏名,金額,コメント\nVP00001,山田太郎,-5000,過払い調整\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "過不足金テンプレート.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── レンダリング ───
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="rounded-2xl bg-white border border-stone-100 px-5 py-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#c9a84c" }}>Bonus Calculation</p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">MLMボーナス計算・処理</h1>
        <p className="text-sm text-stone-400 mt-0.5">月次ボーナス計算実行・確定・調整金管理</p>
      </div>

      {/* 月選択 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-calendar text-blue-600"></i>対象月選択
        </h2>
        <div className="space-y-3">
          {/* 月選択 + 実行・削除ボタン */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {/* ボーナス計算実行 */}
            <button
              onClick={handleExecute}
              disabled={executing || loading || !!bonusRun}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {executing ? "計算中..." : "ボーナス計算実行"}
            </button>
            {/* draft → confirmed 切り替えボタン（draftの場合のみ表示） */}
            {bonusRun?.status === "draft" && (
              <button
                onClick={handleForceConfirm}
                disabled={confirming}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50"
                title="下書き状態のボーナス計算を確定に切り替えます（称号レベルを会員に反映）"
              >
                {confirming ? "確定中..." : "✅ 確定に切り替え"}
              </button>
            )}
            {/* 削除ボタン */}
            {bonusRun && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition disabled:opacity-50 ${
                  bonusRun.status === "confirmed"
                    ? "bg-red-700 text-white hover:bg-red-800"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
                title={bonusRun.status === "confirmed" ? "⚠️ 確定済みですが強制削除できます" : "ボーナス計算を削除して再計算できます"}
              >
                {deleting ? "削除中..." : bonusRun.status === "confirmed" ? "⚠️ 強制削除" : "計算削除"}
              </button>
            )}
          </div>
          {/* 強制削除の警告 */}
          {bonusRun?.status === "confirmed" && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ このボーナスは確定済みです。強制削除すると全ボーナス結果・明細が削除されます。調整金・過不足金は残ります。
            </div>
          )}
          {bonusRun?.status === "draft" && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ 計算済み（未確定）状態です。「✅ 確定に切り替え」ボタンで称号レベルを反映して確定できます。
            </div>
          )}
          {/* 支払調整率 */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex-wrap">
            <i className="fas fa-percentage text-amber-600"></i>
            <label className="text-sm font-semibold text-amber-800 whitespace-nowrap">支払調整率</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" max="100" step="0.1"
                value={paymentAdjustmentRate}
                onChange={(e) => setPaymentAdjustmentRate(parseFloat(e.target.value) || 0)}
                className="w-24 border border-amber-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
              <span className="text-sm text-amber-700">%</span>
            </div>
            <span className="text-xs text-amber-600">（デフォルト: 2%）</span>
            {bonusRun && (
              <button onClick={handleUpdatePaymentRate} disabled={updatingRate}
                className="ml-2 bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">
                {updatingRate ? "保存中..." : "調整率を保存"}
              </button>
            )}
            {bonusRun?.paymentAdjustmentRate != null && (
              <span className="text-xs text-amber-600 ml-1">現在の保存値: {bonusRun.paymentAdjustmentRate}%</span>
            )}
          </div>
        </div>
      </div>

      {/* ステータス + 公開エリア */}
      {bonusRun && (
        <div className={`rounded-xl p-5 border ${STATUS_STYLES[bonusRun.status].bg} ${STATUS_STYLES[bonusRun.status].border}`}>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLES[bonusRun.status].text}`}>
              {STATUS_STYLES[bonusRun.status].label}
            </span>
            <span className="text-gray-700 font-semibold">{selectedMonth}</span>
            {bonusRun.confirmedAt && (
              <span className="text-xs text-gray-500">確定日時: {new Date(bonusRun.confirmedAt).toLocaleString("ja-JP")}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-600">対象会員:</span> <span className="font-bold">{bonusRun.totalMembers}名</span></div>
            <div><span className="text-gray-600">アクティブ:</span> <span className="font-bold">{bonusRun.totalActiveMembers}名</span></div>
            <div><span className="text-gray-600">合計ボーナス:</span> <span className="font-bold text-blue-600">{yen(bonusRun.totalBonusAmount)}</span></div>
          </div>

          {/* 公開エリア（確定済みのみ表示） */}
          {bonusRun.status === "confirmed" && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    <i className="fas fa-eye mr-1.5"></i>会員マイページへの公開
                  </p>
                  {publishStatus ? (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-600">全件: <strong>{publishStatus.total}</strong></span>
                      <span className="text-emerald-600">公開済み: <strong>{publishStatus.published}</strong></span>
                      <span className="text-orange-500">未公開: <strong>{publishStatus.unpublished}</strong></span>
                      {publishStatus.allPublished && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✅ 全員公開済み</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">公開状況を読み込み中...</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* 一括公開ボタン */}
                  <button
                    onClick={() => handlePublishAll(true)}
                    disabled={publishing || publishStatus?.allPublished === true}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50"
                    title="確定済みの全ボーナスを会員マイページに公開し、貯金ポイントを付与します"
                  >
                    <i className="fas fa-globe mr-1.5"></i>
                    {publishing ? "公開中..." : "全員に一括公開"}
                  </button>
                  {/* 非公開に戻す */}
                  {publishStatus && publishStatus.published > 0 && (
                    <button
                      onClick={() => handlePublishAll(false)}
                      disabled={publishing}
                      className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-300 transition disabled:opacity-50"
                    >
                      非公開に戻す
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}


        </div>
      )}

      {/* タブ */}
      <div className="bg-white rounded-2xl border border-stone-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex border-b overflow-x-auto">
          {(["calculation", "adjustment", "shortage"] as const).map((tab) => {
            const labels = { calculation: "計算結果", adjustment: "調整金管理", shortage: "過不足金管理" };
            const icons  = { calculation: "fa-chart-line", adjustment: "fa-plus-circle", shortage: "fa-exclamation-circle" };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-max px-5 py-3 font-semibold text-sm transition whitespace-nowrap ${activeTab === tab ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
                <i className={`fas ${icons[tab]} mr-1.5`}></i>{labels[tab]}
                {tab === "adjustment" && adjustments.length > 0 && (
                  <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{adjustments.length}</span>
                )}
                {tab === "shortage" && shortages.length > 0 && (
                  <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">{shortages.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* ── 計算結果 ── */}
          {activeTab === "calculation" && (
            loading
              ? <div className="text-center py-8 text-gray-500 animate-pulse">読み込み中...</div>
              : !bonusRun
                ? <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-calculator text-4xl text-gray-300 mb-3 block"></i>
                    <p className="font-semibold">ボーナス計算を実行してください</p>
                    <p className="text-xs text-gray-400 mt-1">対象月を選択して「ボーナス計算実行」ボタンをクリックしてください</p>
                  </div>
                : results.length > 0
                  ? <ResultTable results={results} />
                  : <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-table text-4xl text-gray-300 mb-3 block"></i>
                      <p className="font-semibold">計算結果がありません</p>
                      <p className="text-xs text-gray-400 mt-1">データがまだ読み込まれていない場合は、
                        <button onClick={fetchBonusRun} className="text-blue-500 underline ml-1">再読み込み</button>
                        してください
                      </p>
                      {debugInfo && (
                        <div className="mt-4 text-left mx-auto max-w-lg bg-red-50 border border-red-200 rounded-lg p-4 text-xs">
                          <p className="font-bold text-red-700 mb-2">🔍 診断情報</p>
                          <p>HTTPステータス: <strong>{debugInfo.status}</strong></p>
                          <p>results配列あり: <strong>{String(debugInfo.hasResults)}</strong></p>
                          <p>件数: <strong>{debugInfo.resultsCount}</strong></p>
                          {debugInfo.error && <p className="text-red-600 mt-1">エラー: <strong>{debugInfo.error}</strong></p>}
                          {debugInfo.detail && <p className="text-red-600 mt-1">詳細: <strong>{debugInfo.detail}</strong></p>}
                        </div>
                      )}
                    </div>
          )}

          {/* ── 調整金管理 ── */}
          {activeTab === "adjustment" && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-800">調整金一覧</h3>
                  <p className="text-xs text-gray-500 mt-0.5">対象月: {selectedMonth}　計{adjustments.length}件</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={downloadAdjTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-100 transition">
                    <i className="fas fa-download text-[11px]"></i>CSVテンプレート
                  </button>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-400 text-green-700 text-xs rounded-lg hover:bg-green-100 transition cursor-pointer">
                    <i className="fas fa-file-csv text-[11px]"></i>CSV一括登録
                    <input ref={adjCsvRef} type="file" accept=".csv" className="hidden" onChange={handleAdjCsvChange} />
                  </label>
                  <button onClick={() => setShowAdjustmentModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">
                    <i className="fas fa-plus text-[11px]"></i>手動追加
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">月</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">会員コード</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">会員名</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-700">金額</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">コメント</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-700">課税</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">調整金がありません</td></tr>
                    ) : adjustments.slice((adjustmentPage - 1) * itemsPerPage, adjustmentPage * itemsPerPage).map((adj) => (
                      <tr key={adj.id} className="border-b border-gray-100 hover:bg-white">
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{adj.bonusMonth}</td>
                        <td className="px-3 py-2.5 font-mono text-sm">{adj.memberCode}</td>
                        <td className="px-3 py-2.5 text-gray-800">{adj.memberName}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-blue-700">{yen(adj.amount)}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{adj.comment || "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          {adj.isTaxable
                            ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">課税</span>
                            : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">非課税</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => handleDeleteAdjustment(adj.id, adj.memberName, adj.amount)}
                            className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 text-xs rounded hover:bg-red-100 transition">
                            <i className="fas fa-trash-alt text-[10px]"></i> 削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {adjustments.length > itemsPerPage && (
                <div className="flex justify-center gap-2 mt-2">
                  <button disabled={adjustmentPage <= 1} onClick={() => setAdjustmentPage(p => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">前</button>
                  <span className="text-xs text-gray-500 flex items-center">{adjustmentPage} / {Math.ceil(adjustments.length / itemsPerPage)}</span>
                  <button disabled={adjustmentPage >= Math.ceil(adjustments.length / itemsPerPage)} onClick={() => setAdjustmentPage(p => p + 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">次</button>
                </div>
              )}
            </div>
          )}

          {/* ── 過不足金管理 ── */}
          {activeTab === "shortage" && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-800">過不足金一覧</h3>
                  <p className="text-xs text-gray-500 mt-0.5">対象月: {selectedMonth}　計{shortages.length}件</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={downloadShorTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-100 transition">
                    <i className="fas fa-download text-[11px]"></i>CSVテンプレート
                  </button>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-400 text-orange-700 text-xs rounded-lg hover:bg-orange-100 transition cursor-pointer">
                    <i className="fas fa-file-csv text-[11px]"></i>CSV一括登録
                    <input ref={shorCsvRef} type="file" accept=".csv" className="hidden" onChange={handleShorCsvChange} />
                  </label>
                  <button onClick={() => setShowShortageModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">
                    <i className="fas fa-plus text-[11px]"></i>手動追加
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">月</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">会員コード</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">会員名</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-700">金額</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">コメント</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortages.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">過不足金がありません</td></tr>
                    ) : shortages.slice((shortagePage - 1) * itemsPerPage, shortagePage * itemsPerPage).map((sho) => (
                      <tr key={sho.id} className="border-b border-gray-100 hover:bg-white">
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{sho.bonusMonth}</td>
                        <td className="px-3 py-2.5 font-mono text-sm">{sho.memberCode}</td>
                        <td className="px-3 py-2.5 text-gray-800">{sho.memberName}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${sho.amount >= 0 ? "text-blue-700" : "text-red-600"}`}>{yen(sho.amount)}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{sho.comment || "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => handleDeleteShortage(sho.id, sho.memberName, sho.amount)}
                            className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 text-xs rounded hover:bg-red-100 transition">
                            <i className="fas fa-trash-alt text-[10px]"></i> 削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shortages.length > itemsPerPage && (
                <div className="flex justify-center gap-2 mt-2">
                  <button disabled={shortagePage <= 1} onClick={() => setShortagePage(p => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">前</button>
                  <span className="text-xs text-gray-500 flex items-center">{shortagePage} / {Math.ceil(shortages.length / itemsPerPage)}</span>
                  <button disabled={shortagePage >= Math.ceil(shortages.length / itemsPerPage)} onClick={() => setShortagePage(p => p + 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">次</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ════ モーダル群 ════ */}

      {/* ── 調整金・手動追加モーダル ── */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">調整金を手動追加</h3>
              <button onClick={() => { setShowAdjustmentModal(false); setNewAdj({ memberCode: "", memberName: "", amount: "", comment: "", isTaxable: true }); }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              対象月: <strong>{selectedMonth}</strong>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">会員コード <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input type="text" value={newAdj.memberCode}
                    onChange={(e) => setNewAdj({ ...newAdj, memberCode: e.target.value, memberName: "" })}
                    onKeyDown={(e) => e.key === "Enter" && lookupAdjMember()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="例: VP00123" />
                  <button onClick={lookupAdjMember} disabled={adjLookingUp}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs hover:bg-gray-200 disabled:opacity-50">
                    {adjLookingUp ? "検索中..." : "名前を確認"}
                  </button>
                </div>
              </div>
              {newAdj.memberName && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${newAdj.memberName.includes("見つかりません") || newAdj.memberName.includes("エラー") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                  <i className={`fas ${newAdj.memberName.includes("見つかりません") ? "fa-times-circle" : "fa-check-circle"} text-xs`}></i>
                  {newAdj.memberName}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">金額（円） <span className="text-red-500">*</span></label>
                <input type="number" value={newAdj.amount}
                  onChange={(e) => setNewAdj({ ...newAdj, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="例: 10000（マイナス可）" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">コメント（任意）</label>
                <textarea value={newAdj.comment}
                  onChange={(e) => setNewAdj({ ...newAdj, comment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={2} placeholder="調整理由など" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="adj-taxable" checked={newAdj.isTaxable}
                  onChange={(e) => setNewAdj({ ...newAdj, isTaxable: e.target.checked })}
                  className="w-4 h-4 accent-blue-600" />
                <label htmlFor="adj-taxable" className="text-sm text-gray-700 select-none">課税対象</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowAdjustmentModal(false); setNewAdj({ memberCode: "", memberName: "", amount: "", comment: "", isTaxable: true }); }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">キャンセル</button>
              <button onClick={handleAddAdjustment}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">追加する</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 過不足金・手動追加モーダル ── */}
      {showShortageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">過不足金を手動追加</h3>
              <button onClick={() => { setShowShortageModal(false); setNewShor({ memberCode: "", memberName: "", amount: "", comment: "" }); }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
              対象月: <strong>{selectedMonth}</strong>　※マイナス金額は過払い（減額）
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">会員コード <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input type="text" value={newShor.memberCode}
                    onChange={(e) => setNewShor({ ...newShor, memberCode: e.target.value, memberName: "" })}
                    onKeyDown={(e) => e.key === "Enter" && lookupShorMember()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="例: VP00123" />
                  <button onClick={lookupShorMember} disabled={shorLookingUp}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs hover:bg-gray-200 disabled:opacity-50">
                    {shorLookingUp ? "検索中..." : "名前を確認"}
                  </button>
                </div>
              </div>
              {newShor.memberName && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${newShor.memberName.includes("見つかりません") || newShor.memberName.includes("エラー") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                  <i className={`fas ${newShor.memberName.includes("見つかりません") ? "fa-times-circle" : "fa-check-circle"} text-xs`}></i>
                  {newShor.memberName}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">金額（円） <span className="text-red-500">*</span></label>
                <input type="number" value={newShor.amount}
                  onChange={(e) => setNewShor({ ...newShor, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="例: -5000（マイナス可）" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">コメント（任意）</label>
                <textarea value={newShor.comment}
                  onChange={(e) => setNewShor({ ...newShor, comment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  rows={2} placeholder="過不足理由など" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowShortageModal(false); setNewShor({ memberCode: "", memberName: "", amount: "", comment: "" }); }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">キャンセル</button>
              <button onClick={handleAddShortage}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">追加する</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 調整金 CSV プレビューモーダル ── */}
      {showAdjCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">調整金 CSV プレビュー</h3>
              <button onClick={() => { setShowAdjCsvModal(false); setCsvPreviewRows([]); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
              対象月: <strong>{selectedMonth}</strong>　全{csvPreviewRows.length}行（エラー: {csvPreviewRows.filter(r => r.error).length}件）
            </div>
            <div className="overflow-auto flex-1 px-4 py-2">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2">会員コード</th>
                    <th className="text-left p-2">氏名（CSV記載）</th>
                    <th className="text-right p-2">金額</th>
                    <th className="text-left p-2">コメント</th>
                    <th className="text-center p-2">課税</th>
                    <th className="text-left p-2">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.map((row, i) => (
                    <tr key={i} className={`border-b ${row.error ? "bg-red-50" : "hover:bg-gray-50"}`}>
                      <td className="p-2 font-mono">{row.memberCode}</td>
                      <td className="p-2">{row.memberName}</td>
                      <td className="p-2 text-right font-semibold">{row.amount ? `¥${Number(row.amount).toLocaleString()}` : "—"}</td>
                      <td className="p-2 text-gray-500">{row.comment || "—"}</td>
                      <td className="p-2 text-center">{row.isTaxable ? "課税" : "非課税"}</td>
                      <td className="p-2">{row.error ? <span className="text-red-600 text-xs">⚠ {row.error}</span> : <span className="text-green-600 text-xs">✓ OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowAdjCsvModal(false); setCsvPreviewRows([]); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">キャンセル</button>
              <button onClick={handleAdjCsvUpload} disabled={csvUploading || csvPreviewRows.filter(r => !r.error).length === 0}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition">
                {csvUploading ? "登録中..." : `${csvPreviewRows.filter(r => !r.error).length}件を一括登録`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 過不足金 CSV プレビューモーダル ── */}
      {showShorCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">過不足金 CSV プレビュー</h3>
              <button onClick={() => { setShowShorCsvModal(false); setCsvPreviewRows([]); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-3 bg-orange-50 border-b border-orange-100 text-sm text-orange-700">
              対象月: <strong>{selectedMonth}</strong>　全{csvPreviewRows.length}行（エラー: {csvPreviewRows.filter(r => r.error).length}件）
            </div>
            <div className="overflow-auto flex-1 px-4 py-2">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2">会員コード</th>
                    <th className="text-left p-2">氏名（CSV記載）</th>
                    <th className="text-right p-2">金額</th>
                    <th className="text-left p-2">コメント</th>
                    <th className="text-left p-2">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.map((row, i) => (
                    <tr key={i} className={`border-b ${row.error ? "bg-red-50" : "hover:bg-gray-50"}`}>
                      <td className="p-2 font-mono">{row.memberCode}</td>
                      <td className="p-2">{row.memberName}</td>
                      <td className={`p-2 text-right font-semibold ${Number(row.amount) < 0 ? "text-red-600" : "text-blue-700"}`}>
                        {row.amount ? `¥${Number(row.amount).toLocaleString()}` : "—"}
                      </td>
                      <td className="p-2 text-gray-500">{row.comment || "—"}</td>
                      <td className="p-2">{row.error ? <span className="text-red-600 text-xs">⚠ {row.error}</span> : <span className="text-green-600 text-xs">✓ OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowShorCsvModal(false); setCsvPreviewRows([]); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">キャンセル</button>
              <button onClick={handleShorCsvUpload} disabled={csvUploading || csvPreviewRows.filter(r => !r.error).length === 0}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition">
                {csvUploading ? "登録中..." : `${csvPreviewRows.filter(r => !r.error).length}件を一括登録`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
