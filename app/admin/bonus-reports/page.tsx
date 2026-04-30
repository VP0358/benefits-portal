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

type LevelChangeRecord = {
  memberCode: string;
  memberName: string;
  previousLevel: number;
  newLevel: number;
  changeType: "promotion" | "demotion";
};

type CarryoverRecord = {
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
};

type AdjustmentRecord = {
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
  comment: string | null;
};

type BonusResultSummary = {
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
  structureBonus: number;
  bonusTotal: number;
  withholdingTax: number;
  serviceFee: number;
  paymentAdjustmentRate: number | null;
  paymentAdjustmentAmount: number;
  finalAmount: number;
  paymentAmount: number;
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

export default function BonusReportsPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [activeTab, setActiveTab] = useState<
    "all" | "payment" | "webfricom" | "levelChanges" | "carryover" | "adjustments"
  >("all");

  const [loading, setLoading] = useState(false);
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [bonusResults, setBonusResults] = useState<BonusResultSummary[]>([]);
  const [levelChanges, setLevelChanges] = useState<LevelChangeRecord[]>([]);
  const [carryoverList, setCarryoverList] = useState<CarryoverRecord[]>([]);
  const [adjustmentList, setAdjustmentList] = useState<AdjustmentRecord[]>([]);

  // 取得者・支払対象者の検索
  const [resultSearch, setResultSearch] = useState("");

  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ボーナス計算結果（取得者・支払対象者一覧）
      const resultsRes = await fetch(`/api/admin/bonus-results/detail?bonusMonth=${selectedMonth}`);
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setBonusRun(data.bonusRun || null);
        setBonusResults(data.results || []);
      } else {
        setBonusRun(null);
        setBonusResults([]);
      }

      // レベル昇格・降格データ
      const levelRes = await fetch(`/api/admin/bonus-reports/level-changes?bonusMonth=${selectedMonth}`);
      if (levelRes.ok) {
        const levelData = await levelRes.json();
        setLevelChanges(levelData.levelChanges || []);
      }

      // 繰越金データ
      const carryoverRes = await fetch(`/api/admin/bonus-reports/carryover?bonusMonth=${selectedMonth}`);
      if (carryoverRes.ok) {
        const carryoverData = await carryoverRes.json();
        setCarryoverList(carryoverData.carryover || []);
      }

      // 調整金データ
      const adjRes = await fetch(`/api/admin/bonus-adjustments?bonusMonth=${selectedMonth}`);
      if (adjRes.ok) {
        const adjData = await adjRes.json();
        setAdjustmentList(adjData.adjustments || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  // フィルタリング済み結果
  const filteredResults = bonusResults.filter((r) => {
    const matchSearch =
      !resultSearch ||
      r.memberCode.includes(resultSearch) ||
      r.memberName.includes(resultSearch) ||
      (r.companyName || "").includes(resultSearch);
    return matchSearch;
  });
  const paymentResults = bonusResults.filter((r) => r.paymentAmount > 0);
  const filteredPaymentResults = paymentResults.filter((r) => {
    const matchSearch =
      !resultSearch ||
      r.memberCode.includes(resultSearch) ||
      r.memberName.includes(resultSearch) ||
      (r.companyName || "").includes(resultSearch);
    return matchSearch;
  });

  const displayResults = activeTab === "payment" ? filteredPaymentResults : filteredResults;
  const totalPayment = paymentResults.reduce((s, r) => s + r.paymentAmount, 0);

  // Webフリコム形式出力（固定長120文字）
  const handleExportWebfricom = async () => {
    try {
      const res = await fetch(`/api/admin/export/webfricom?bonusMonth=${selectedMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `webfricom_${selectedMonth}.txt`;
        link.click();
      } else {
        alert("Webフリコムデータの取得に失敗しました");
      }
    } catch (error) {
      console.error("Error exporting webfricom:", error);
      alert("エラーが発生しました");
    }
  };

  // 取得者一覧 CSV
  const handleExportAllResults = () => {
    const headers = ["会員コード", "氏名", "法人名", "ACT", "レベル", "自己PT", "グループPT", "直下", "ダイレクトB", "ユニレベルB", "組織B", "ボーナス合計", "源泉税", "支払額"];
    const rows = filteredResults.map((r) => [
      r.memberCode, r.memberName, r.companyName || "", r.isActive ? "○" : "",
      LEVEL_LABELS[r.achievedLevel], r.selfPurchasePoints, r.groupPoints, r.directActiveCount,
      r.directBonus, r.unilevelBonus, r.structureBonus, r.bonusTotal, r.withholdingTax, r.paymentAmount,
    ]);
    exportCSV(headers, rows, `bonus_all_${selectedMonth}.csv`);
  };

  // 支払対象者 CSV
  const handleExportPaymentResults = () => {
    const headers = ["会員コード", "氏名", "法人名", "ACT", "レベル", "自己PT", "グループPT", "直下", "ダイレクトB", "ユニレベルB", "組織B", "ボーナス合計", "源泉税", "支払額"];
    const rows = filteredPaymentResults.map((r) => [
      r.memberCode, r.memberName, r.companyName || "", r.isActive ? "○" : "",
      LEVEL_LABELS[r.achievedLevel], r.selfPurchasePoints, r.groupPoints, r.directActiveCount,
      r.directBonus, r.unilevelBonus, r.structureBonus, r.bonusTotal, r.withholdingTax, r.paymentAmount,
    ]);
    exportCSV(headers, rows, `bonus_payment_${selectedMonth}.csv`);
  };

  const exportCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
  };

  // レベル昇格・降格者CSV
  const handleExportLevelChanges = () => {
    const headers = ["会員ID", "会員名", "前回レベル", "新レベル", "変動"];
    const rows = levelChanges.map((r) => [r.memberCode, r.memberName, `LV${r.previousLevel}`, `LV${r.newLevel}`, r.changeType === "promotion" ? "昇格" : "降格"]);
    exportCSV(headers, rows, `level_changes_${selectedMonth}.csv`);
  };

  // 繰越金リストCSV
  const handleExportCarryover = () => {
    const headers = ["会員ID", "法人名", "会員名", "金額"];
    const rows = carryoverList.map((r) => [r.memberCode, r.companyName || "", r.memberName, r.amount]);
    exportCSV(headers, rows, `carryover_${selectedMonth}.csv`);
  };

  // 調整金リストCSV
  const handleExportAdjustments = () => {
    const headers = ["会員ID", "法人名", "会員名", "金額", "コメント"];
    const rows = adjustmentList.map((r) => [r.memberCode, r.companyName || "", r.memberName, r.amount, r.comment || ""]);
    exportCSV(headers, rows, `adjustments_${selectedMonth}.csv`);
  };

  const TAB_CONFIG = [
    { key: "all",          label: "取得者一覧",        icon: "fa-users",          count: bonusResults.length },
    { key: "payment",      label: "支払対象者一覧",    icon: "fa-money-check-alt", count: paymentResults.length },
    { key: "webfricom",    label: "Webフリコム出力",   icon: "fa-file-export",     count: null },
    { key: "levelChanges", label: "昇格・降格者",      icon: "fa-level-up-alt",    count: levelChanges.length },
    { key: "carryover",    label: "繰越金リスト",      icon: "fa-arrow-circle-right", count: carryoverList.length },
    { key: "adjustments",  label: "調整金リスト",      icon: "fa-edit",            count: adjustmentList.length },
  ] as const;

  const statusLabel: Record<string, string> = {
    confirmed: "確定済み", draft: "未確定（下書き）", canceled: "取消済み",
  };

  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div className="rounded-2xl bg-white border border-stone-100 px-5 py-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#7c3aed" }}>Bonus Reports</p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ボーナス関連レポート</h1>
        <p className="text-sm text-stone-400 mt-0.5">取得者一覧・支払対象者・支払データ出力・昇格降格・繰越金・調整金</p>
      </div>

      {/* 対象月選択 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">対象月</label>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setResultSearch(""); }}
              className="w-full md:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-semibold border border-gray-200"
          >
            <i className="fas fa-sync-alt mr-2"></i>更新
          </button>
        </div>

        {/* サマリー */}
        {bonusRun && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-semibold mb-1">計算状況</p>
              <p className="text-lg font-bold text-blue-900">{statusLabel[bonusRun.status] || bonusRun.status}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs text-green-500 font-semibold mb-1">対象 / アクティブ</p>
              <p className="text-lg font-bold text-green-900">{bonusRun.totalMembers}名 / {bonusRun.totalActiveMembers}名</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
              <p className="text-xs text-violet-500 font-semibold mb-1">ボーナス総額</p>
              <p className="text-lg font-bold text-violet-900">{yen(bonusRun.totalBonusAmount)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs text-orange-500 font-semibold mb-1">支払対象 / 支払総額</p>
              <p className="text-lg font-bold text-orange-900">{paymentResults.length}名</p>
              <p className="text-xs text-orange-600 font-semibold mt-0.5">{yen(totalPayment)}</p>
            </div>
          </div>
        )}

        {!bonusRun && !loading && (
          <div className="mt-4 bg-gray-50 rounded-xl p-5 text-center text-gray-500">
            <i className="fas fa-calculator text-3xl text-gray-300 mb-2 block"></i>
            <p className="font-semibold text-sm">この月のボーナス計算データがありません</p>
            <p className="text-xs text-gray-400 mt-1">「MLMボーナス計算・処理」ページでボーナス計算を実行してください</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-xl p-4 text-center text-blue-700 animate-pulse">
          <i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="bg-white rounded-2xl border border-stone-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-0 px-4 pt-3 min-w-max">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-4 font-semibold text-sm border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                {tab.label}
                {tab.count !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${
                    activeTab === tab.key ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">

          {/* ── 取得者一覧 ── */}
          {(activeTab === "all" || activeTab === "payment") && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    {activeTab === "all"
                      ? `${selectedMonth.replace("-", "年")}月度 ボーナス取得者一覧`
                      : `${selectedMonth.replace("-", "年")}月度 支払対象者一覧`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeTab === "all"
                      ? `全 ${filteredResults.length} 件 / ボーナス発生者全員を表示`
                      : `全 ${filteredPaymentResults.length} 件 / 支払額が発生する会員のみ表示`}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={activeTab === "all" ? handleExportAllResults : handleExportPaymentResults}
                    disabled={displayResults.length === 0}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-semibold disabled:opacity-50"
                  >
                    <i className="fas fa-download mr-1.5"></i>CSV出力
                  </button>
                </div>
              </div>

              {/* 検索 */}
              <input
                type="text"
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                placeholder="会員コード・名前・法人名で検索..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />

              {/* 集計行 */}
              {displayResults.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-indigo-400 font-semibold mb-0.5">ボーナス合計（表示中）</p>
                    <p className="text-base font-bold text-indigo-800">
                      {yen(displayResults.reduce((s, r) => s + r.bonusTotal, 0))}
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-emerald-400 font-semibold mb-0.5">支払総額（表示中）</p>
                    <p className="text-base font-bold text-emerald-800">
                      {yen(displayResults.reduce((s, r) => s + r.paymentAmount, 0))}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-red-400 font-semibold mb-0.5">源泉税合計（表示中）</p>
                    <p className="text-base font-bold text-red-700">
                      {yen(displayResults.reduce((s, r) => s + r.withholdingTax, 0))}
                    </p>
                  </div>
                </div>
              )}

              {/* テーブル */}
              {displayResults.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                  {!bonusRun ? "ボーナス計算データがありません" : "該当するデータがありません"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold min-w-[120px]">会員コード</th>
                        <th className="px-3 py-3 text-left font-semibold min-w-[130px]">氏名 / 法人名</th>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {displayResults.map((r, idx) => (
                        <tr key={r.id || idx} className={`hover:bg-violet-50/30 transition ${r.paymentAmount > 0 ? "" : "opacity-60"}`}>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{r.memberCode}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-gray-800">{r.companyName || r.memberName}</div>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Webフリコム出力 ── */}
          {activeTab === "webfricom" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  <i className="fas fa-university mr-2 text-blue-600"></i>
                  Webフリコム形式データ出力
                </h3>
                <p className="text-gray-700 mb-4">
                  {selectedMonth.replace("-", "年")}月度の支払データを固定長120文字のWebフリコム形式で出力します。
                </p>
                <button
                  onClick={handleExportWebfricom}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  <i className="fas fa-download mr-2"></i>
                  Webフリコムデータをダウンロード
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-semibold mb-2"><i className="fas fa-info-circle mr-1"></i>ファイル形式について</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>固定長120文字のテキストファイル（.txt）</li>
                  <li>各行に1件の振込データを含む</li>
                  <li>支払額がプラスの会員のみ出力</li>
                  <li>銀行コード、支店コード、口座番号、金額などを含む</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── レベル昇格・降格者 ── */}
          {activeTab === "levelChanges" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-800">
                  <i className="fas fa-level-up-alt mr-2 text-green-600"></i>
                  {selectedMonth.replace("-", "年")}月度 レベル昇格・降格者
                </h3>
                <button
                  onClick={handleExportLevelChanges}
                  disabled={levelChanges.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1.5"></i>CSV出力
                </button>
              </div>

              {levelChanges.length === 0 ? (
                <p className="text-gray-500 text-center py-10">レベル変動データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員名</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">前回レベル</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">新レベル</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">変動</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {levelChanges.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.memberCode}</td>
                          <td className="px-4 py-3">{item.memberName}</td>
                          <td className="px-4 py-3 text-center text-gray-600">LV{item.previousLevel}</td>
                          <td className="px-4 py-3 text-center font-bold">LV{item.newLevel}</td>
                          <td className="px-4 py-3 text-center">
                            {item.changeType === "promotion" ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <i className="fas fa-arrow-up mr-1"></i>昇格
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                <i className="fas fa-arrow-down mr-1"></i>降格
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── 繰越金リスト ── */}
          {activeTab === "carryover" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-800">
                  <i className="fas fa-arrow-circle-right mr-2 text-orange-600"></i>
                  {selectedMonth.replace("-", "年")}月度 繰越金リスト
                </h3>
                <button
                  onClick={handleExportCarryover}
                  disabled={carryoverList.length === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-semibold disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1.5"></i>CSV出力
                </button>
              </div>

              {carryoverList.length === 0 ? (
                <p className="text-gray-500 text-center py-10">繰越金データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">法人名</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員名</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">繰越金額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {carryoverList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.memberCode}</td>
                          <td className="px-4 py-3 text-gray-600">{item.companyName || <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-3">{item.memberName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-900">{yen(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── 調整金リスト ── */}
          {activeTab === "adjustments" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-800">
                  <i className="fas fa-edit mr-2 text-purple-600"></i>
                  {selectedMonth.replace("-", "年")}月度 調整金リスト
                </h3>
                <button
                  onClick={handleExportAdjustments}
                  disabled={adjustmentList.length === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1.5"></i>CSV出力
                </button>
              </div>

              {adjustmentList.length === 0 ? (
                <p className="text-gray-500 text-center py-10">調整金データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">法人名</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員名</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">調整金額</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">コメント</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adjustmentList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.memberCode}</td>
                          <td className="px-4 py-3 text-gray-600">{item.companyName || <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-3">{item.memberName}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${item.amount >= 0 ? "text-purple-900" : "text-red-600"}`}>
                            {yen(item.amount)}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{item.comment || <span className="text-gray-400">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
