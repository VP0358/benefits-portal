"use client";

import { useState, useEffect } from "react";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

// 過去15ヶ月分の月リストを生成（JST基準）
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

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

/** 1ポジション分の詳細 */
type PositionRow = {
  id: string;
  memberCode: string;
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

/** APIから返るテーブル行（複数ポジションは合算済み） */
type BonusResultDetail = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  status: string;
  // 複数ポジション対応
  baseCode: string;
  positionCount: number;
  positions: PositionRow[];

  // ボーナス項目
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;

  // 合計・調整
  bonusTotal: number;
  carryoverAmount: number;
  adjustmentAmount: number;
  otherPositionAmount: number;
  amountBeforeAdjustment: number;

  // 支払調整
  paymentAdjustmentRate: number | null;
  paymentAdjustmentAmount: number;
  finalAmount: number;

  // 税金・手数料
  consumptionTax: number;
  withholdingTax: number;
  shortageAmount: number;
  otherPositionShortage: number;
  serviceFee: number;
  paymentAmount: number;

  // グループ情報
  groupActiveCount: number;
  groupPoints: number;
  minLinePoints: number;
  lineCount: number;
  level1Lines: number;
  level2Lines: number;
  level3Lines: number;

  // 個人情報
  selfPurchasePoints: number;
  directActiveCount: number;

  // レベル情報
  previousTitleLevel: number;
  newTitleLevel: number;
  achievedLevel: number;
  forcedLevel: number;

  // 条件・フラグ
  conditions: string | null;
  savingsPoints: number;
  isActive: boolean;

  // ユニレベル段数別
  unilevelDetail: Record<string, number> | null;
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

/* ─── ボーナス内訳セクション（合算 or ポジション別で共用） ─── */
function BonusBreakdown({ data }: { data: PositionRow | BonusResultDetail }) {
  const unilevelEntries = data.unilevelDetail
    ? Object.entries(data.unilevelDetail).sort((a, b) => Number(a[0]) - Number(b[0]))
    : [];
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-50">
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-600">ダイレクトボーナス</td>
            <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.directBonus)}</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-600">ユニレベルボーナス</td>
            <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.unilevelBonus)}</td>
          </tr>
          {unilevelEntries.length > 0 && unilevelEntries.map(([depth, pts]) => (
            <tr key={depth} className="bg-blue-50/40">
              <td className="px-4 py-2 text-xs text-blue-500 pl-10">└ {depth}段目</td>
              <td className="px-4 py-2 text-right text-xs text-blue-600 font-medium">{yen(pts)}</td>
            </tr>
          ))}
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-600">組織構築ボーナス</td>
            <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.structureBonus)}</td>
          </tr>
          {data.rankUpBonus > 0 && (
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">ランクアップボーナス</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.rankUpBonus)}</td>
            </tr>
          )}
          {data.shareBonus > 0 && (
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">シェアボーナス</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.shareBonus)}</td>
            </tr>
          )}
          {data.carryoverAmount > 0 && (
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">繰越金</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.carryoverAmount)}</td>
            </tr>
          )}
          {data.adjustmentAmount !== 0 && (
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">調整金</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(data.adjustmentAmount)}</td>
            </tr>
          )}
          <tr className="bg-blue-50 font-bold">
            <td className="px-4 py-3 text-blue-800">ボーナス合計</td>
            <td className="px-4 py-3 text-right text-blue-800">{yen(data.bonusTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─── 個別報酬詳細モーダル ─── */
function BonusDetailModal({ row, onClose }: { row: BonusResultDetail; onClose: () => void }) {
  const isMulti = (row.positionCount ?? 1) >= 2;
  const [activeTab, setActiveTab] = useState<"merged" | number>("merged");

  const name = row.companyName || row.memberName;

  // 表示するデータ（合算 or ポジション個別）
  const displayData: PositionRow | BonusResultDetail =
    activeTab === "merged" || !isMulti
      ? row
      : (row.positions?.[activeTab] ?? row);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <div>
            <p className="text-xs font-semibold text-violet-500 tracking-widest uppercase mb-0.5">Bonus Detail</p>
            <h3 className="text-xl font-bold text-gray-900">{name}</h3>
            {row.companyName && <p className="text-sm text-gray-500 mt-0.5">{row.memberName}</p>}
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {isMulti ? `${row.baseCode}-** （${row.positionCount}ポジション）` : row.memberCode}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            <div className="flex items-center gap-2">
              {isMulti && (
                <span className="text-xs px-2 py-1 rounded-full font-bold bg-purple-100 text-purple-700">
                  {row.positionCount}POS
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {row.isActive ? "アクティブ" : "非アクティブ"}
              </span>
            </div>
          </div>
        </div>

        {/* ポジション切り替えタブ（複数ポジション時のみ） */}
        {isMulti && (
          <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-3 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("merged")}
              className={`pb-2.5 px-4 text-xs font-bold rounded-t border-b-2 transition whitespace-nowrap ${
                activeTab === "merged"
                  ? "border-violet-600 text-violet-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 合算（支払口座単位）
            </button>
            {row.positions?.map((pos, i) => (
              <button
                key={pos.memberCode}
                onClick={() => setActiveTab(i)}
                className={`pb-2.5 px-4 text-xs font-bold rounded-t border-b-2 transition whitespace-nowrap ${
                  activeTab === i
                    ? "border-indigo-500 text-indigo-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🔷 {pos.memberCode}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* 合算注記 */}
          {isMulti && activeTab === "merged" && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-800">
              <p className="font-bold mb-1">💡 複数ポジション合算表示</p>
              <p>同一口座への振込となるため、全{row.positionCount}ポジションの報酬を合算しています。</p>
              <p className="mt-1 text-xs">各ポジションの個別内訳はタブで切り替えて確認できます。</p>
            </div>
          )}

          {/* ポジション個別注記 */}
          {isMulti && activeTab !== "merged" && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800">
              <p className="font-bold">🔷 ポジション: {(displayData as PositionRow).memberCode}</p>
              <p className="mt-0.5 text-xs">このポジション単独の報酬内訳です。</p>
            </div>
          )}

          {/* ── 活動状況 ── */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">活動状況</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">自己購入PT</p>
                <p className="text-xl font-bold text-slate-800">{displayData.selfPurchasePoints}<span className="text-xs font-normal text-slate-400 ml-1">pt</span></p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">グループPT</p>
                <p className="text-xl font-bold text-slate-800">{displayData.groupPoints}<span className="text-xs font-normal text-slate-400 ml-1">pt</span></p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">直下アクティブ</p>
                <p className="text-xl font-bold text-slate-800">{displayData.directActiveCount}<span className="text-xs font-normal text-slate-400 ml-1">名</span></p>
              </div>
            </div>
          </section>

          {/* ── レベル情報 ── */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">レベル情報</h4>
            <div className="flex items-center gap-4 bg-indigo-50 rounded-xl px-5 py-4 flex-wrap">
              <div className="text-center">
                <p className="text-xs text-indigo-400 mb-1">前回称号</p>
                <p className="text-base font-bold text-indigo-700">{LEVEL_LABELS[displayData.previousTitleLevel]}</p>
              </div>
              {displayData.previousTitleLevel !== displayData.newTitleLevel ? (
                <>
                  <div className="text-2xl text-indigo-300">→</div>
                  <div className="text-center">
                    <p className="text-xs text-indigo-400 mb-1">新称号</p>
                    <p className="text-base font-bold text-indigo-700">{LEVEL_LABELS[displayData.newTitleLevel]}</p>
                  </div>
                  <span className={`ml-auto text-xs px-3 py-1 rounded-full font-semibold ${displayData.newTitleLevel > displayData.previousTitleLevel ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {displayData.newTitleLevel > displayData.previousTitleLevel ? "▲ 昇格" : "▼ 降格"}
                  </span>
                </>
              ) : (
                <span className="ml-auto text-xs px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">変動なし</span>
              )}
              <div className="text-center ml-4 pl-4 border-l border-indigo-200">
                <p className="text-xs text-indigo-400 mb-1">当月達成LV</p>
                <p className="text-base font-bold text-indigo-700">{LEVEL_LABELS[displayData.achievedLevel]}</p>
              </div>
            </div>
          </section>

          {/* ── ボーナス内訳 ── */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ボーナス内訳</h4>
            <BonusBreakdown data={displayData} />
          </section>

          {/* ── 支払計算（合算タブのみ） ── */}
          {(activeTab === "merged" || !isMulti) && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">支払計算</h4>
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">調整前取得額</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(row.amountBeforeAdjustment)}</td>
                    </tr>
                    {(row.paymentAdjustmentRate ?? 0) > 0 && (
                      <>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">支払調整率</td>
                          <td className="px-4 py-3 text-right text-orange-600">{row.paymentAdjustmentRate}%</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">支払調整額（差引）</td>
                          <td className="px-4 py-3 text-right text-red-500">－{yen(row.paymentAdjustmentAmount)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">調整後取得額</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{yen(row.finalAmount)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">源泉徴収税（10.21%）</td>
                      <td className="px-4 py-3 text-right text-red-500">－{yen(row.withholdingTax)}</td>
                    </tr>
                    {row.serviceFee > 0 && (
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">事務手数料</td>
                        <td className="px-4 py-3 text-right text-red-500">－{yen(row.serviceFee)}</td>
                      </tr>
                    )}
                    {row.shortageAmount !== 0 && (
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">過不足金</td>
                        <td className={`px-4 py-3 text-right ${row.shortageAmount >= 0 ? "text-blue-600" : "text-red-500"}`}>{yen(row.shortageAmount)}</td>
                      </tr>
                    )}
                    <tr className="bg-emerald-50 font-bold">
                      <td className="px-4 py-3 text-emerald-800 text-base">最終支払額</td>
                      <td className="px-4 py-3 text-right text-emerald-800 text-lg">{yen(row.paymentAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BonusResultsPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [results, setResults] = useState<BonusResultDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<BonusResultDetail | null>(null);

  // 検索・フィルター
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "payment">("all");

  // データ取得
  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bonus-results/detail?bonusMonth=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setBonusRun(data.bonusRun);
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Error fetching bonus results:", error);
    }
    setLoading(false);
  };

  // フィルタリング（baseCode または memberCode で検索）
  const filteredResults = results.filter((r) => {
    const code = r.baseCode || r.memberCode;
    const matchesSearch =
      !searchQuery ||
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesTab = activeTab === "all" || (activeTab === "payment" && r.paymentAmount > 0);
    return matchesSearch && matchesTab;
  });

  const paymentResults = results.filter((r) => r.paymentAmount > 0);
  const totalPaymentAmount = paymentResults.reduce((s, r) => s + r.paymentAmount, 0);
  const totalBonusShown = filteredResults.reduce((s, r) => s + r.bonusTotal, 0);

  // CSVエクスポート（全項目）
  const handleExportCSV = () => {
    const headers = [
      "会員コード", "会員名", "法人名", "ステータス", "ACT", "ポジション数",
      "自己購入PT", "グループPT", "直下ACT",
      "ダイレクトB", "ユニレベルB", "ランクアップB", "シェアB", "組織構築B",
      "繰越金", "調整金", "支払調整前取得額",
      "調整率", "調整額", "取得額合計",
      "源泉所得税", "過不足金", "事務手数料", "支払額",
      "前回レベル", "タイトルレベル", "当月レベル",
    ];

    const rows = filteredResults.map((r) => [
      r.baseCode || r.memberCode, r.memberName, r.companyName || "", r.status, r.isActive ? "○" : "", r.positionCount ?? 1,
      r.selfPurchasePoints, r.groupPoints, r.directActiveCount,
      r.directBonus, r.unilevelBonus, r.rankUpBonus, r.shareBonus, r.structureBonus,
      r.carryoverAmount, r.adjustmentAmount, r.amountBeforeAdjustment,
      r.paymentAdjustmentRate || "", r.paymentAdjustmentAmount, r.finalAmount,
      r.withholdingTax, r.shortageAmount, r.serviceFee, r.paymentAmount,
      r.previousTitleLevel, r.newTitleLevel, r.achievedLevel,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bonus_results_${selectedMonth}.csv`;
    link.click();
  };

  const statusLabel: Record<string, string> = {
    confirmed: "確定済み", draft: "未確定（下書き）", canceled: "取消済み",
  };

  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div className="rounded-2xl bg-white border border-stone-100 px-5 py-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#7c3aed" }}>Bonus Results</p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ボーナス計算結果</h1>
        <p className="text-sm text-stone-400 mt-0.5">対象月のボーナス取得者一覧・支払対象者一覧を確認</p>
      </div>

      {/* 対象月選択 + エクスポート */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-semibold text-gray-700 mb-2">対象月</label>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setSearchQuery(""); }}
              className="w-full md:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredResults.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 text-sm font-semibold"
          >
            <i className="fas fa-download mr-2"></i>CSVエクスポート
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-semibold border border-gray-200"
          >
            <i className="fas fa-sync-alt mr-2"></i>更新
          </button>
        </div>

        {/* サマリーカード */}
        {bonusRun && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-semibold mb-1">計算状況</p>
              <p className="text-lg font-bold text-blue-900">{statusLabel[bonusRun.status] || bonusRun.status}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs text-green-500 font-semibold mb-1">対象会員数</p>
              <p className="text-lg font-bold text-green-900">{bonusRun.totalMembers}名</p>
              <p className="text-xs text-green-400 mt-0.5">アクティブ {bonusRun.totalActiveMembers}名</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
              <p className="text-xs text-violet-500 font-semibold mb-1">ボーナス総額</p>
              <p className="text-lg font-bold text-violet-900">{yen(bonusRun.totalBonusAmount)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs text-orange-500 font-semibold mb-1">支払対象 / 支払総額</p>
              <p className="text-lg font-bold text-orange-900">{paymentResults.length}名</p>
              <p className="text-xs text-orange-600 font-semibold mt-0.5">{yen(totalPaymentAmount)}</p>
            </div>
          </div>
        )}

        {!bonusRun && !loading && (
          <div className="mt-4 bg-gray-50 rounded-xl p-6 text-center text-gray-500">
            <i className="fas fa-calculator text-3xl text-gray-300 mb-2 block"></i>
            <p className="font-semibold">この月のボーナス計算データがありません</p>
            <p className="text-xs text-gray-400 mt-1">「MLMボーナス計算・処理」ページでボーナス計算を実行してください</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-xl p-4 text-center text-blue-700 animate-pulse">
          <i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...
        </div>
      )}

      {/* タブ + 検索 + テーブル */}
      {bonusRun && !loading && (
        <div className="bg-white rounded-2xl border border-stone-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {/* タブ */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 px-6 pt-4">
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
                  activeTab === "all"
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className="fas fa-users mr-1.5"></i>
                全取得者一覧
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{results.length}件</span>
              </button>
              <button
                onClick={() => setActiveTab("payment")}
                className={`pb-3 px-4 font-semibold text-sm border-b-2 transition ${
                  activeTab === "payment"
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className="fas fa-money-check-alt mr-1.5"></i>
                支払対象者一覧
                <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{paymentResults.length}件</span>
              </button>
            </nav>
          </div>

          {/* 検索 + 件数 */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="会員コード・名前・法人名で検索..."
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{filteredResults.length}件表示</span>
              {filteredResults.length > 0 && (
                <span className="text-violet-600 font-semibold">ボーナス計 {yen(totalBonusShown)}</span>
              )}
            </div>
          </div>

          {/* テーブル */}
          <div className="p-6">
            {filteredResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-search text-4xl text-gray-200 mb-3 block"></i>
                <p className="font-semibold">該当するデータがありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-slate-800 z-10 min-w-[120px]">会員コード</th>
                      <th className="px-3 py-3 text-left font-semibold min-w-[140px]">氏名 / 法人名</th>
                      <th className="px-3 py-3 text-center font-semibold">ACT</th>
                      <th className="px-3 py-3 text-center font-semibold">レベル</th>
                      <th className="px-3 py-3 text-right font-semibold">自己PT</th>
                      <th className="px-3 py-3 text-right font-semibold">GrpPT</th>
                      <th className="px-3 py-3 text-right font-semibold">直下</th>
                      <th className="px-3 py-3 text-right font-semibold bg-blue-900">ダイレクト</th>
                      <th className="px-3 py-3 text-right font-semibold bg-blue-900">ユニレベル</th>
                      <th className="px-3 py-3 text-right font-semibold bg-blue-900">組織</th>
                      <th className="px-3 py-3 text-right font-semibold bg-indigo-900">B合計</th>
                      <th className="px-3 py-3 text-right font-semibold">源泉税</th>
                      <th className="px-3 py-3 text-right font-semibold bg-emerald-900">支払額</th>
                      <th className="px-3 py-3 text-center font-semibold">詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredResults.map((r) => {
                      const isMulti = (r.positionCount ?? 1) >= 2;
                      const displayCode = isMulti ? r.baseCode : r.memberCode;
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-violet-50/30 transition ${r.paymentAmount > 0 ? "" : "opacity-60"}`}
                        >
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-600 sticky left-0 bg-white">
                            {isMulti
                              ? <span>{displayCode}<span className="text-purple-400">-**</span></span>
                              : displayCode
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800">{r.companyName || r.memberName}</span>
                              {isMulti && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                  {r.positionCount}POS
                                </span>
                              )}
                            </div>
                            {r.companyName && <div className="text-gray-400 text-[10px]">{r.memberName}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {r.isActive
                              ? <span className="text-green-600 font-bold">●</span>
                              : <span className="text-gray-300">○</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${r.achievedLevel > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
                              {LEVEL_LABELS[r.achievedLevel]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{r.selfPurchasePoints}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{r.groupPoints}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{r.directActiveCount}</td>
                          <td className="px-3 py-2.5 text-right bg-blue-50/50 font-medium">{yen(r.directBonus)}</td>
                          <td className="px-3 py-2.5 text-right bg-blue-50/50 font-medium">{yen(r.unilevelBonus)}</td>
                          <td className="px-3 py-2.5 text-right bg-blue-50/50 font-medium">{yen(r.structureBonus)}</td>
                          <td className="px-3 py-2.5 text-right bg-indigo-50/50 font-bold text-indigo-800">{yen(r.bonusTotal)}</td>
                          <td className="px-3 py-2.5 text-right text-red-500">{yen(r.withholdingTax)}</td>
                          <td className={`px-3 py-2.5 text-right font-bold bg-emerald-50/50 ${r.paymentAmount > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                            {yen(r.paymentAmount)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => setDetailRow(r)}
                              className={`px-2 py-1 text-[10px] rounded transition font-semibold border ${
                                isMulti
                                  ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                  : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100"
                              }`}
                            >
                              {isMulti ? `詳細(${r.positionCount}POS)` : "詳細"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {detailRow && <BonusDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </main>
  );
}
