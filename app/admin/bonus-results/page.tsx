"use client";

import { useState, useEffect, useCallback } from "react";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

// ━━━ 定数 ━━━
const WITHHOLDING_THRESHOLD = 120000; // 源泉税12万円閾値
const WITHHOLDING_RATE = 0.1021;

// ━━━ ユーティリティ ━━━
function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const s = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m] = s.split("/").map(Number);
  for (let i = 0; i < 15; i++) {
    const total = y * 12 + (m - 1) - i;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    options.push({ value: `${ny}-${String(nm).padStart(2, "0")}`, label: `${ny}年${nm}月度` });
  }
  return options;
}

function yen(n: number) { return `¥${Math.round(n).toLocaleString()}`; }

const STATUS_LABELS: Record<string, string> = {
  active: "活動中", autoship: "オートシップ", suspended: "停止中",
  canceled: "解約", withdrawn: "退会",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  autoship: "bg-blue-100 text-blue-700",
  suspended: "bg-yellow-100 text-yellow-700",
  canceled: "bg-red-100 text-red-600",
  withdrawn: "bg-gray-100 text-gray-500",
};
const LEVEL_COLOR: Record<number, string> = {
  0: "bg-gray-100 text-gray-500",
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-red-100 text-red-700",
};

// ━━━ 型定義 ━━━
type PositionRow = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  isCompany: boolean;
  invoiceNumber: string | null;
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
  savingsPointsAdded: number;
  bonusTotal: number;
  carryoverAmount: number;
  adjustmentAmount: number;
  amountBeforeAdjustment: number;
  paymentAdjustmentRate: number | null;
  paymentAdjustmentAmount: number;
  finalAmount: number;
  consumptionTax: number;
  withholdingTax: number;
  shortageAmount: number;
  serviceFee: number;
  paymentAmount: number;
  unilevelDetail: Record<string, number> | null;
};

type BonusResultDetail = PositionRow & {
  baseCode: string;
  positionCount: number;
  positions: PositionRow[];
  minLinePoints: number;
  lineCount: number;
  forcedLevel: number;
  conditions: string | null;
  savingsPoints: number;
  groupActiveCount: number;
};

type BonusRunInfo = {
  id: string;
  bonusMonth: string;
  status: string;
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
  paymentAdjustmentRate: number | null;
  capAdjustmentAmount: number;
};

// ━━━ 行ごとの再計算（フロントエンド側） ━━━
function recalcRow(row: BonusResultDetail): BonusResultDetail {
  const amountBeforeAdj = row.amountBeforeAdjustment;
  const adjRate = row.paymentAdjustmentRate ?? 0;
  const adjAmount = Math.floor(amountBeforeAdj * (adjRate / 100));
  const finalAmt = amountBeforeAdj - adjAmount;

  // 源泉税: 法人は0、支払調整後取得額（finalAmt）の12万円超過分に10.21%
  const withholding = row.isCompany
    ? 0
    : finalAmt > WITHHOLDING_THRESHOLD
      ? Math.floor((finalAmt - WITHHOLDING_THRESHOLD) * WITHHOLDING_RATE)
      : 0;

  const payAmt = Math.max(0, finalAmt - withholding - row.serviceFee - row.shortageAmount);
  return {
    ...row,
    paymentAdjustmentAmount: adjAmount,
    finalAmount: finalAmt,
    withholdingTax: withholding,
    paymentAmount: payAmt,
  };
}

// ━━━ 詳細モーダル ━━━
function BonusDetailModal({ row, onClose }: { row: BonusResultDetail; onClose: () => void }) {
  const isMulti = (row.positionCount ?? 1) >= 2;
  const [activeTab, setActiveTab] = useState<"merged" | number>("merged");
  const displayData = activeTab === "merged" || !isMulti ? row : (row.positions?.[activeTab as number] ?? row);
  const name = row.companyName || row.memberName;
  const unilevelEntries = displayData.unilevelDetail
    ? Object.entries(displayData.unilevelDetail).sort((a, b) => Number(a[0]) - Number(b[0]))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <div>
            <p className="text-xs font-bold text-violet-500 tracking-widest uppercase mb-0.5">Bonus Detail</p>
            <h3 className="text-xl font-bold text-gray-900">{name}</h3>
            {row.companyName && <p className="text-sm text-gray-500">{row.memberName}</p>}
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {isMulti ? `${row.baseCode}** (${row.positionCount}POS)` : row.memberCode}
            </p>
            {row.invoiceNumber && (
              <p className="text-xs text-indigo-600 font-mono mt-0.5">登録番号: {row.invoiceNumber}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            {row.isCompany && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">法人</span>}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {row.isActive ? "アクティブ" : "非アクティブ"}
            </span>
          </div>
        </div>

        {/* ポジション切り替えタブ */}
        {isMulti && (
          <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 gap-1 overflow-x-auto">
            <button onClick={() => setActiveTab("merged")}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${activeTab === "merged" ? "border-violet-600 text-violet-700 bg-white" : "border-transparent text-gray-500"}`}>
              📊 合算
            </button>
            {row.positions?.map((pos, i) => (
              <button key={pos.memberCode} onClick={() => setActiveTab(i)}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${activeTab === i ? "border-indigo-500 text-indigo-700 bg-white" : "border-transparent text-gray-500"}`}>
                {pos.memberCode}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* 活動状況 */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">活動状況</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "自己購入PT", value: `${displayData.selfPurchasePoints}pt` },
                { label: "グループPT", value: `${displayData.groupPoints}pt` },
                { label: "直接アクティブ", value: `${displayData.directActiveCount}名` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                  <p className="text-base font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* レベル情報 */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">レベル・称号</h4>
            <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3 flex-wrap">
              <div className="text-center">
                <p className="text-[10px] text-indigo-400 mb-0.5">前回称号</p>
                <p className="text-sm font-bold text-indigo-700">{LEVEL_LABELS[displayData.previousTitleLevel]}</p>
              </div>
              {displayData.previousTitleLevel !== displayData.newTitleLevel ? (
                <>
                  <span className="text-xl text-indigo-300">→</span>
                  <div className="text-center">
                    <p className="text-[10px] text-indigo-400 mb-0.5">新称号</p>
                    <p className="text-sm font-bold text-indigo-700">{LEVEL_LABELS[displayData.newTitleLevel]}</p>
                  </div>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${displayData.newTitleLevel > displayData.previousTitleLevel ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {displayData.newTitleLevel > displayData.previousTitleLevel ? "▲ 昇格" : "▼ 降格"}
                  </span>
                </>
              ) : (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">変動なし</span>
              )}
              <div className="text-center ml-4 pl-4 border-l border-indigo-200">
                <p className="text-[10px] text-indigo-400 mb-0.5">当月達成LV</p>
                <p className="text-sm font-bold text-indigo-700">{LEVEL_LABELS[displayData.achievedLevel]}</p>
              </div>
            </div>
          </section>

          {/* ボーナス内訳 */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">ボーナス内訳</h4>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
              <table className="w-full">
                <tbody className="divide-y divide-gray-50">
                  <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">ダイレクトボーナス</td><td className="px-4 py-2.5 text-right font-semibold">{yen(displayData.directBonus)}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">ユニレベルボーナス</td><td className="px-4 py-2.5 text-right font-semibold">{yen(displayData.unilevelBonus)}</td></tr>
                  {unilevelEntries.map(([d, pts]) => (
                    <tr key={d} className="bg-blue-50/40">
                      <td className="px-4 py-1.5 text-xs text-blue-500 pl-10">└ {d}段目</td>
                      <td className="px-4 py-1.5 text-right text-xs text-blue-600 font-medium">{yen(pts)}</td>
                    </tr>
                  ))}
                  <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">組織構築ボーナス</td><td className="px-4 py-2.5 text-right font-semibold">{yen(displayData.structureBonus)}</td></tr>
                  {(displayData.savingsPointsAdded > 0) && (
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-600">貯金ボーナス (今月追加: {(displayData.savingsPointsAdded / 10).toFixed(1)}pt)</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{yen(displayData.savingsBonus)}</td>
                    </tr>
                  )}
                  {displayData.carryoverAmount !== 0 && (
                    <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">繰越金</td><td className="px-4 py-2.5 text-right font-semibold">{yen(displayData.carryoverAmount)}</td></tr>
                  )}
                  {displayData.adjustmentAmount !== 0 && (
                    <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">調整金</td><td className="px-4 py-2.5 text-right font-semibold">{yen(displayData.adjustmentAmount)}</td></tr>
                  )}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-4 py-2.5 text-blue-800">支払調整前取得額</td>
                    <td className="px-4 py-2.5 text-right text-blue-800">{yen(displayData.amountBeforeAdjustment)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 支払計算（合算のみ） */}
          {(activeTab === "merged" || !isMulti) && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">支払計算</h4>
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">支払調整前取得金額</td><td className="px-4 py-2.5 text-right font-semibold">{yen(row.amountBeforeAdjustment)}</td></tr>
                    {(row.paymentAdjustmentRate ?? 0) > 0 && <>
                      <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">支払調整率</td><td className="px-4 py-2.5 text-right text-orange-600">{row.paymentAdjustmentRate}%</td></tr>
                      <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">支払調整額</td><td className="px-4 py-2.5 text-right text-red-500">－{yen(row.paymentAdjustmentAmount)}</td></tr>
                    </>}
                    <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">取得額</td><td className="px-4 py-2.5 text-right font-semibold">{yen(row.finalAmount)}</td></tr>
                    <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">10%消費税（内税）</td><td className="px-4 py-2.5 text-right text-gray-500">{yen(row.consumptionTax)}</td></tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-600">
                        源泉所得税{row.isCompany && <span className="ml-1 text-[10px] text-orange-600 font-semibold">（法人のため対象外）</span>}
                        {!row.isCompany && row.finalAmount > WITHHOLDING_THRESHOLD && (
                          <span className="ml-1 text-[10px] text-gray-400">取得額12万超過分×10.21%</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-500">－{yen(row.withholdingTax)}</td>
                    </tr>
                    {row.shortageAmount !== 0 && (
                      <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">過不足金</td><td className={`px-4 py-2.5 text-right ${row.shortageAmount >= 0 ? "text-blue-600" : "text-red-500"}`}>{yen(row.shortageAmount)}</td></tr>
                    )}
                    {row.serviceFee > 0 && (
                      <tr className="hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-600">事務手数料</td><td className="px-4 py-2.5 text-right text-red-500">－{yen(row.serviceFee)}</td></tr>
                    )}
                    <tr className="bg-emerald-50 font-bold">
                      <td className="px-4 py-2.5 text-emerald-800 text-base">支払額</td>
                      <td className="px-4 py-2.5 text-right text-emerald-800 text-lg">{yen(row.paymentAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {row.invoiceNumber && (
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  登録番号（インボイス）: <span className="font-mono font-semibold text-gray-700">{row.invoiceNumber}</span>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メインページ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function BonusResultsPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [results, setResults] = useState<BonusResultDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<BonusResultDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "payment">("all");

  // 再計算用: 行ごとの上書き値 { resultId: { serviceFee?, shortageAmount?, paymentAdjustmentRate? } }
  const [overrides, setOverrides] = useState<Record<string, {
    serviceFee?: number;
    shortageAmount?: number;
    paymentAdjustmentRate?: number;
  }>>({});

  const fetchData = useCallback(async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setOverrides({});
    try {
      const res = await fetch(`/api/admin/bonus-results/detail?bonusMonth=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setBonusRun(data.bonusRun);
        setResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // オーバーライド適用済みの行を取得
  const getDisplayRow = useCallback((r: BonusResultDetail): BonusResultDetail => {
    const ov = overrides[r.id] ?? {};
    const merged: BonusResultDetail = {
      ...r,
      serviceFee:            ov.serviceFee            ?? r.serviceFee,
      shortageAmount:        ov.shortageAmount        ?? r.shortageAmount,
      paymentAdjustmentRate: ov.paymentAdjustmentRate ?? r.paymentAdjustmentRate,
    };
    return recalcRow(merged);
  }, [overrides]);

  // フィルター
  const filteredResults = results.filter(r => {
    const code = r.baseCode || r.memberCode;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || code.toLowerCase().includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      (r.companyName?.toLowerCase().includes(q) ?? false);
    const dr = getDisplayRow(r);
    const matchTab = activeTab === "all" || (activeTab === "payment" && dr.paymentAmount > 0);
    return matchSearch && matchTab;
  });

  const paymentResults = results.filter(r => getDisplayRow(r).paymentAmount > 0);
  const totalPayment = paymentResults.reduce((s, r) => s + getDisplayRow(r).paymentAmount, 0);

  // CSV出力
  const handleExportCSV = () => {
    const headers = [
      "会員コード", "氏名/法人名", "法人", "ステータス",
      "自己PT", "グループPT", "直接",
      "称号変動", "現レベル",
      "ダイレクトB", "ユニレベルB", "組織構築B", "貯金PT(今月追加)",
      "調整金", "ボーナス合計",
      "源泉税", "事務費", "支払額",
      // 詳細参照用
      "前称号", "支払調整前取得額", "支払調整率(%)", "支払調整額", "取得額",
      "10%消費税(内税)", "過不足金", "登録番号(インボイス)",
    ];
    const rows = filteredResults.map(r => {
      const dr = getDisplayRow(r);
      const titleChange = dr.newTitleLevel > dr.previousTitleLevel ? "昇格"
        : dr.newTitleLevel < dr.previousTitleLevel ? "降格" : "変動なし";
      const bonusTotal = dr.directBonus + dr.unilevelBonus + dr.structureBonus
        + dr.carryoverAmount + dr.adjustmentAmount;
      return [
        r.baseCode || r.memberCode,
        r.companyName || r.memberName,
        r.isCompany ? "法人" : "",
        STATUS_LABELS[r.status] || r.status,
        dr.selfPurchasePoints,
        dr.groupPoints,
        dr.directActiveCount,
        titleChange,
        LEVEL_LABELS[dr.achievedLevel],
        dr.directBonus,
        dr.unilevelBonus,
        dr.structureBonus,
        (dr.savingsPointsAdded / 10).toFixed(1),
        dr.adjustmentAmount + dr.carryoverAmount,
        bonusTotal,
        dr.withholdingTax,
        dr.serviceFee,
        dr.paymentAmount,
        // 詳細参照用
        LEVEL_LABELS[dr.previousTitleLevel],
        dr.amountBeforeAdjustment,
        dr.paymentAdjustmentRate || "",
        dr.paymentAdjustmentAmount,
        dr.finalAmount,
        dr.consumptionTax,
        dr.shortageAmount,
        r.invoiceNumber || "",
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bonus_results_${selectedMonth}.csv`; a.click();
  };

  const statusLabel: Record<string, string> = { confirmed: "確定済み", draft: "未確定", canceled: "取消" };

  return (
    <main className="space-y-5">
      {/* ページヘッダー */}
      <div className="rounded-2xl bg-white border border-stone-100 px-5 py-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-0.5 text-violet-600">Bonus Results</p>
        <h1 className="text-2xl font-bold text-stone-900">ボーナス計算結果</h1>
        <p className="text-sm text-stone-400 mt-0.5">対象月のボーナス取得者一覧・支払対象者一覧</p>
      </div>

      {/* 操作エリア */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">対象月</label>
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setSearchQuery(""); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-48"
            >
              {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold border border-gray-200 transition">
            <i className="fas fa-sync-alt mr-1.5"></i>更新
          </button>
          <button onClick={handleExportCSV} disabled={filteredResults.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50 transition">
            <i className="fas fa-download mr-1.5"></i>CSVエクスポート
          </button>
        </div>

        {/* サマリーカード */}
        {bonusRun && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-semibold mb-0.5">計算状況</p>
              <p className="text-base font-bold text-blue-900">{statusLabel[bonusRun.status] || bonusRun.status}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs text-green-500 font-semibold mb-0.5">対象 / アクティブ</p>
              <p className="text-base font-bold text-green-900">{bonusRun.totalMembers}名 / {bonusRun.totalActiveMembers}名</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-xs text-violet-500 font-semibold mb-0.5">支払対象 / 支払総額</p>
              <p className="text-base font-bold text-violet-900">{paymentResults.length}名</p>
              <p className="text-xs text-violet-700 font-semibold">{yen(totalPayment)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
              <p className="text-xs text-orange-500 font-semibold mb-0.5">ボーナス総額</p>
              <p className="text-base font-bold text-orange-900">{yen(bonusRun.totalBonusAmount)}</p>
            </div>
          </div>
        )}

        {!bonusRun && !loading && (
          <div className="mt-4 bg-gray-50 rounded-xl p-6 text-center text-gray-400">
            <i className="fas fa-calculator text-3xl text-gray-300 mb-2 block"></i>
            <p className="font-semibold text-gray-500">この月のボーナスデータがありません</p>
            <p className="text-xs mt-1">「ボーナス計算・処理」ページで計算を実行してください</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-xl p-4 text-center text-blue-700 animate-pulse">
          <i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...
        </div>
      )}

      {/* テーブルエリア */}
      {bonusRun && !loading && (
        <div className="bg-white rounded-2xl border border-stone-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
          {/* タブ */}
          <div className="border-b border-gray-200 px-5 pt-4 flex gap-1">
            {([
              { key: "all", label: "全取得者一覧", count: results.length, color: "violet" },
              { key: "payment", label: "支払対象者一覧", count: paymentResults.length, color: "emerald" },
            ] as const).map(({ key, label, count, color }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
                  activeTab === key ? `border-${color}-600 text-${color}-600` : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {label}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === key ? `bg-${color}-100 text-${color}-700` : "bg-gray-100 text-gray-500"}`}>
                  {count}件
                </span>
              </button>
            ))}
          </div>

          {/* 検索 + 件数 */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="会員コード・名前・法人名で検索..."
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-500">{filteredResults.length}件</span>
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 font-medium">
              <i className="fas fa-edit mr-1"></i>事務費・過不足金・支払調整率は直接入力で再計算されます
            </div>
          </div>

          {/* テーブル */}
          <div className="p-4 overflow-x-auto">
            {filteredResults.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-search text-4xl text-gray-200 mb-3 block"></i>
                <p className="font-semibold">該当データがありません</p>
              </div>
            ) : (
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-slate-800 text-white text-[11px]">
                  <tr>
                    {/* 基本情報 */}
                    <th className="px-2 py-2.5 text-left font-semibold sticky left-0 bg-slate-800 z-10 min-w-[110px]">会員コード</th>
                    <th className="px-2 py-2.5 text-left font-semibold min-w-[130px]">氏名／法人名</th>
                    <th className="px-2 py-2.5 text-center font-semibold min-w-[70px]">ステータス</th>
                    <th className="px-2 py-2.5 text-right font-semibold min-w-[55px]">自己PT</th>
                    <th className="px-2 py-2.5 text-right font-semibold min-w-[65px]">グループPT</th>
                    <th className="px-2 py-2.5 text-right font-semibold min-w-[40px]">直接</th>
                    {/* 称号 */}
                    <th className="px-2 py-2.5 text-center font-semibold bg-indigo-900 min-w-[72px]">称号変動</th>
                    <th className="px-2 py-2.5 text-center font-semibold bg-indigo-900 min-w-[65px]">現レベル</th>
                    {/* ボーナス */}
                    <th className="px-2 py-2.5 text-right font-semibold bg-blue-900 min-w-[80px]">ダイレクトB</th>
                    <th className="px-2 py-2.5 text-right font-semibold bg-blue-900 min-w-[80px]">ユニレベルB</th>
                    <th className="px-2 py-2.5 text-right font-semibold bg-blue-900 min-w-[75px]">組織構築B</th>
                    <th className="px-2 py-2.5 text-right font-semibold bg-emerald-900 min-w-[65px]">貯金PT</th>
                    {/* 調整・合計 */}
                    <th className="px-2 py-2.5 text-right font-semibold min-w-[65px]">調整金</th>
                    <th className="px-2 py-2.5 text-right font-semibold bg-slate-700 min-w-[90px]">ボーナス合計</th>
                    {/* 控除・支払 */}
                    <th className="px-2 py-2.5 text-right font-semibold text-red-300 min-w-[72px]">源泉税</th>
                    <th className="px-2 py-2.5 text-right font-semibold min-w-[65px]">事務費</th>
                    <th className="px-2 py-2.5 text-right font-semibold bg-emerald-800 min-w-[90px]">支払額</th>
                    <th className="px-2 py-2.5 text-center font-semibold min-w-[50px]">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredResults.map(r => {
                    const dr = getDisplayRow(r);
                    const isMulti = (r.positionCount ?? 1) >= 2;
                    const displayCode = isMulti ? r.baseCode : r.memberCode;
                    const titleChange = dr.newTitleLevel > dr.previousTitleLevel ? "▲昇格"
                      : dr.newTitleLevel < dr.previousTitleLevel ? "▼降格" : "－";
                    const titleChangeColor = dr.newTitleLevel > dr.previousTitleLevel
                      ? "text-green-600 font-bold"
                      : dr.newTitleLevel < dr.previousTitleLevel
                        ? "text-red-500 font-bold"
                        : "text-gray-400";
                    // ボーナス合計 = ダイレクトB + ユニレベルB + 組織構築B + 調整金（繰越含む）
                    const bonusTotal = dr.directBonus + dr.unilevelBonus + dr.structureBonus
                      + dr.carryoverAmount + dr.adjustmentAmount;

                    return (
                      <tr key={r.id}
                        className={`hover:bg-violet-50/30 transition ${dr.paymentAmount > 0 ? "" : "opacity-60"}`}>
                        {/* 会員コード */}
                        <td className="px-2 py-2 font-mono text-slate-600 sticky left-0 bg-white text-[11px]">
                          {isMulti ? <span>{displayCode}<span className="text-purple-400">**</span></span> : displayCode}
                        </td>
                        {/* 氏名/法人名 */}
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            {r.isCompany && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-600">法人</span>
                            )}
                            <span className="font-semibold text-gray-800">{r.companyName || r.memberName}</span>
                            {isMulti && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700">{r.positionCount}POS</span>
                            )}
                          </div>
                          {r.companyName && <div className="text-gray-400 text-[10px]">{r.memberName}</div>}
                        </td>
                        {/* ステータス */}
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        {/* 自己PT */}
                        <td className="px-2 py-2 text-right text-gray-600">{dr.selfPurchasePoints}</td>
                        {/* グループPT */}
                        <td className="px-2 py-2 text-right text-gray-600">{dr.groupPoints}</td>
                        {/* 直接アクティブ */}
                        <td className="px-2 py-2 text-right text-gray-600">{dr.directActiveCount}</td>
                        {/* 称号変動 */}
                        <td className={`px-2 py-2 text-center bg-indigo-50/30 text-[11px] ${titleChangeColor}`}>{titleChange}</td>
                        {/* 現レベル */}
                        <td className="px-2 py-2 text-center bg-indigo-50/30">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${LEVEL_COLOR[dr.achievedLevel] ?? "bg-gray-100 text-gray-500"}`}>
                            {LEVEL_LABELS[dr.achievedLevel]}
                          </span>
                        </td>
                        {/* ダイレクトB */}
                        <td className="px-2 py-2 text-right bg-blue-50/30 font-medium">
                          {dr.directBonus > 0 ? yen(dr.directBonus) : <span className="text-gray-300">－</span>}
                        </td>
                        {/* ユニレベルB */}
                        <td className="px-2 py-2 text-right bg-blue-50/30 font-medium">
                          {dr.unilevelBonus > 0 ? yen(dr.unilevelBonus) : <span className="text-gray-300">－</span>}
                        </td>
                        {/* 組織構築B */}
                        <td className="px-2 py-2 text-right bg-blue-50/30 font-medium">
                          {dr.structureBonus > 0 ? yen(dr.structureBonus) : <span className="text-gray-300">－</span>}
                        </td>
                        {/* 貯金PT（01ポジション以外は「－」） */}
                        <td className="px-2 py-2 text-right bg-emerald-50/40 font-medium text-emerald-700">
                          {dr.savingsPointsAdded > 0
                            ? `+${(dr.savingsPointsAdded / 10).toFixed(1)}pt`
                            : <span className="text-gray-300">－</span>}
                        </td>
                        {/* 調整金（繰越含む） */}
                        <td className="px-2 py-2 text-right text-gray-500">
                          {(dr.adjustmentAmount !== 0 || dr.carryoverAmount > 0)
                            ? yen(dr.adjustmentAmount + dr.carryoverAmount)
                            : <span className="text-gray-300">－</span>}
                        </td>
                        {/* ボーナス合計 */}
                        <td className="px-2 py-2 text-right bg-slate-50 font-bold text-slate-700">
                          {yen(bonusTotal)}
                        </td>
                        {/* 源泉税 */}
                        <td className="px-2 py-2 text-right text-red-500">
                          {r.isCompany
                            ? <span className="text-[9px] text-gray-400">法人除外</span>
                            : dr.withholdingTax > 0
                              ? `－${yen(dr.withholdingTax)}`
                              : <span className="text-gray-300">－</span>}
                        </td>
                        {/* 事務費 */}
                        <td className="px-2 py-2 text-right text-gray-500">
                          {dr.serviceFee > 0
                            ? `－${yen(dr.serviceFee)}`
                            : <span className="text-gray-300">－</span>}
                        </td>
                        {/* 支払額 */}
                        <td className={`px-2 py-2 text-right font-bold bg-emerald-50/50 ${dr.paymentAmount > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                          {yen(dr.paymentAmount)}
                        </td>
                        {/* 詳細ボタン */}
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => setDetailRow(getDisplayRow(r))}
                            className={`px-2 py-1 text-[10px] rounded font-semibold border transition ${
                              isMulti
                                ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100"
                            }`}>
                            {isMulti ? `${r.positionCount}POS` : "詳細"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 集計フッター */}
          {filteredResults.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-600">
              <span>表示: <b className="text-gray-800">{filteredResults.length}件</b></span>
              <span>ダイレクトB: <b className="text-blue-700">{yen(filteredResults.reduce((s, r) => s + getDisplayRow(r).directBonus, 0))}</b></span>
              <span>ユニレベルB: <b className="text-blue-700">{yen(filteredResults.reduce((s, r) => s + getDisplayRow(r).unilevelBonus, 0))}</b></span>
              <span>組織構築B: <b className="text-blue-700">{yen(filteredResults.reduce((s, r) => s + getDisplayRow(r).structureBonus, 0))}</b></span>
              <span>貯金PT(追加計): <b className="text-emerald-600">{filteredResults.reduce((s, r) => s + getDisplayRow(r).savingsPointsAdded, 0) > 0 ? `+${(filteredResults.reduce((s, r) => s + getDisplayRow(r).savingsPointsAdded, 0) / 10).toFixed(1)}pt` : "0pt"}</b></span>
              <span>ボーナス合計: <b className="text-slate-700">{yen(filteredResults.reduce((s, r) => { const dr = getDisplayRow(r); return s + dr.directBonus + dr.unilevelBonus + dr.structureBonus + dr.carryoverAmount + dr.adjustmentAmount; }, 0))}</b></span>
              <span>源泉税計: <b className="text-red-600">{yen(filteredResults.reduce((s, r) => s + getDisplayRow(r).withholdingTax, 0))}</b></span>
              <span>事務費計: <b className="text-gray-600">{yen(filteredResults.reduce((s, r) => s + getDisplayRow(r).serviceFee, 0))}</b></span>
              <span className="font-bold">支払額合計: <b className="text-emerald-700 text-sm">{yen(filteredResults.reduce((s, r) => s + getDisplayRow(r).paymentAmount, 0))}</b></span>
            </div>
          )}
        </div>
      )}

      {/* 詳細モーダル */}
      {detailRow && <BonusDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </main>
  );
}
