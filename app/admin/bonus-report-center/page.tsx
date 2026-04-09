"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ─── 月リスト生成 ─── */
function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月度`;
    options.push({ value, label });
  }
  return options;
}

/* ─── 型定義 ─── */
type BonusResultDetail = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  status: string;
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
  groupPoints: number;
  minLinePoints: number;
  lineCount: number;
  level1Lines: number;
  level2Lines: number;
  level3Lines: number;
  selfPurchasePoints: number;
  directActiveCount: number;
  previousTitleLevel: number;
  newTitleLevel: number;
  achievedLevel: number;
  forcedLevel: number;
  conditions: string | null;
  savingsPoints: number;
  isActive: boolean;
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

type MonthSummary = {
  month: string;
  directBonus: number;
  unilevelBonus: number;
  structureBonus: number;
  savingsBonus: number;
  bonusTotal: number;
  paymentTotal: number;
  totalMembers: number;
  totalActiveMembers: number;
};

/* ─── メインコンポーネント ─── */
export default function BonusReportCenterPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");

  // タブ管理
  const [activeTab, setActiveTab] = useState<"results" | "reports" | "summary">("results");
  const [resultsSubTab, setResultsSubTab] = useState<"all" | "payment">("all");
  const [reportsSubTab, setReportsSubTab] = useState<"webfricom" | "levelChanges" | "carryover" | "adjustments">("webfricom");

  // データ状態
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [results, setResults] = useState<BonusResultDetail[]>([]);
  const [levelChanges, setLevelChanges] = useState<LevelChangeRecord[]>([]);
  const [carryoverList, setCarryoverList] = useState<CarryoverRecord[]>([]);
  const [adjustmentList, setAdjustmentList] = useState<AdjustmentRecord[]>([]);
  const [summaryList, setSummaryList] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // 検索
  const [searchQuery, setSearchQuery] = useState("");

  // データ取得
  useEffect(() => {
    if (selectedMonth) {
      fetchResultsData();
      fetchReportsData();
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const fetchResultsData = async () => {
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

  const fetchReportsData = async () => {
    try {
      // レベル昇格・降格データ
      const levelRes = await fetch(`/api/admin/bonus-reports/level-changes?bonusMonth=${selectedMonth}`);
      if (levelRes.ok) {
        const data = await levelRes.json();
        setLevelChanges(data.levelChanges || []);
      }

      // 繰越金データ
      const carryoverRes = await fetch(`/api/admin/bonus-reports/carryover?bonusMonth=${selectedMonth}`);
      if (carryoverRes.ok) {
        const data = await carryoverRes.json();
        setCarryoverList(data.carryover || []);
      }

      // 調整金データ
      const adjRes = await fetch(`/api/admin/bonus-adjustments?bonusMonth=${selectedMonth}`);
      if (adjRes.ok) {
        const data = await adjRes.json();
        setAdjustmentList(data.adjustments || []);
      }
    } catch (error) {
      console.error("Error fetching reports data:", error);
    }
  };

  const fetchSummaryData = async () => {
    // 直近6ヶ月のサマリーデータを取得
    const summaryData: MonthSummary[] = [];
    for (const opt of monthOptions.slice(0, 6)) {
      try {
        const res = await fetch(`/api/admin/bonus-results/detail?bonusMonth=${opt.value}`);
        if (res.ok) {
          const data = await res.json();
          if (data.bonusRun) {
            summaryData.push({
              month: opt.value,
              directBonus: data.results?.reduce((acc: number, r: BonusResultDetail) => acc + r.directBonus, 0) || 0,
              unilevelBonus: data.results?.reduce((acc: number, r: BonusResultDetail) => acc + r.unilevelBonus, 0) || 0,
              structureBonus: data.results?.reduce((acc: number, r: BonusResultDetail) => acc + r.structureBonus, 0) || 0,
              savingsBonus: data.results?.reduce((acc: number, r: BonusResultDetail) => acc + r.savingsBonus, 0) || 0,
              bonusTotal: data.bonusRun.totalBonusAmount || 0,
              paymentTotal: data.results?.reduce((acc: number, r: BonusResultDetail) => acc + r.paymentAmount, 0) || 0,
              totalMembers: data.bonusRun.totalMembers || 0,
              totalActiveMembers: data.bonusRun.totalActiveMembers || 0,
            });
          }
        }
      } catch {
        // スキップ
      }
    }
    setSummaryList(summaryData);
  };

  // フィルタリング
  const filteredResults = results.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = resultsSubTab === "all" || (resultsSubTab === "payment" && r.paymentAmount > 0);
    return matchesSearch && matchesTab;
  });

  // CSVエクスポート
  const handleExportResultCSV = () => {
    const headers = [
      "会員ID", "会員名", "法人名", "ダイレクトB", "ユニレベルB", "ランクアップB", "シェアB",
      "組織構築B", "貯金B", "繰越金", "調整金", "別口座", "支払調整前取得額", "調整率", "調整額",
      "取得額合計", "10%消費税", "源泉所得税", "過不足金", "別口座過不足金", "事務手数料", "支払額",
      "グループACT", "グループPT", "最小ライン", "ライン数", "LV1ライン", "LV2ライン", "LV3ライン",
      "自己購入PT", "直下ACT", "前回レベル", "タイトルレベル", "当月レベル", "強制レベル", "条件",
      "貯金ポイント", "アクティブ",
    ];
    const rows = filteredResults.map((r) => [
      r.memberCode, r.memberName, r.companyName || "", r.directBonus, r.unilevelBonus,
      r.rankUpBonus, r.shareBonus, r.structureBonus, r.savingsBonus, r.carryoverAmount,
      r.adjustmentAmount, r.otherPositionAmount, r.amountBeforeAdjustment,
      r.paymentAdjustmentRate || "", r.paymentAdjustmentAmount, r.finalAmount,
      r.consumptionTax, r.withholdingTax, r.shortageAmount, r.otherPositionShortage,
      r.serviceFee, r.paymentAmount, r.groupActiveCount, r.groupPoints, r.minLinePoints,
      r.lineCount, r.level1Lines, r.level2Lines, r.level3Lines, r.selfPurchasePoints,
      r.directActiveCount, r.previousTitleLevel, r.newTitleLevel, r.achievedLevel,
      r.forcedLevel, r.conditions || "", r.savingsPoints, r.isActive ? "○" : "",
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
    } catch {
      alert("エラーが発生しました");
    }
  };

  const handleExportLevelChanges = () => {
    const headers = ["会員ID", "会員名", "前回レベル", "新レベル", "変動"];
    const rows = levelChanges.map((r) => [
      r.memberCode, r.memberName, `LV${r.previousLevel}`, `LV${r.newLevel}`,
      r.changeType === "promotion" ? "昇格" : "降格",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `level_changes_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-800 transition">
                ← 戻る
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">
                <i className="fas fa-file-invoice-dollar mr-2"></i>
                📊 ボーナス結果・レポート
              </h1>
            </div>
            {activeTab === "results" && (
              <button
                onClick={handleExportResultCSV}
                disabled={filteredResults.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <i className="fas fa-download mr-2"></i>
                CSVエクスポート
              </button>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* メインタブ */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === "results"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-list mr-2"></i>
              ボーナス計算結果
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === "reports"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-file-alt mr-2"></i>
              ボーナス関連レポート
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === "summary"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-chart-bar mr-2"></i>
              月次サマリー
            </button>
          </div>

          <div className="p-6">
            {/* ─── ボーナス計算結果タブ ─── */}
            {activeTab === "results" && (
              <div className="space-y-4">
                {/* 月選択 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-gray-700">対象月:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* サマリーカード */}
                {bonusRun && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-blue-600 font-semibold">計算状況</p>
                      <p className="text-lg font-bold text-blue-900">
                        {bonusRun.status === "confirmed" ? "✅ 確定済み" : "⏳ 未確定"}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-green-600 font-semibold">対象会員数</p>
                      <p className="text-lg font-bold text-green-900">{bonusRun.totalMembers}人</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs text-purple-600 font-semibold">ボーナス総額</p>
                      <p className="text-lg font-bold text-purple-900">
                        ¥{bonusRun.totalBonusAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-xs text-orange-600 font-semibold">CAP調整額</p>
                      <p className="text-lg font-bold text-orange-900">
                        ¥{(bonusRun.capAdjustmentAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="text-center py-4 text-gray-600 animate-pulse">読み込み中...</div>
                )}

                {/* サブタブ */}
                <div className="border-b">
                  <nav className="flex space-x-4">
                    <button
                      onClick={() => setResultsSubTab("all")}
                      className={`pb-2 px-1 font-semibold text-sm border-b-2 transition ${
                        resultsSubTab === "all"
                          ? "border-violet-600 text-violet-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      全取得者一覧（{results.length}件）
                    </button>
                    <button
                      onClick={() => setResultsSubTab("payment")}
                      className={`pb-2 px-1 font-semibold text-sm border-b-2 transition ${
                        resultsSubTab === "payment"
                          ? "border-violet-600 text-violet-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      支払対象者一覧（{results.filter((r) => r.paymentAmount > 0).length}件）
                    </button>
                  </nav>
                </div>

                {/* 検索 */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="会員ID、名前、法人名で検索..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* 結果テーブル */}
                {filteredResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">データがありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[3500px]">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-gray-800 z-10">会員ID</th>
                          <th className="px-3 py-3 text-left font-semibold">会員名</th>
                          <th className="px-3 py-3 text-left font-semibold">法人名</th>
                          <th className="px-3 py-3 text-right font-semibold">ダイレクトB</th>
                          <th className="px-3 py-3 text-right font-semibold">ユニレベルB</th>
                          <th className="px-3 py-3 text-right font-semibold">ランクアップB</th>
                          <th className="px-3 py-3 text-right font-semibold">シェアB</th>
                          <th className="px-3 py-3 text-right font-semibold">組織構築B</th>
                          <th className="px-3 py-3 text-right font-semibold">貯金B</th>
                          <th className="px-3 py-3 text-right font-semibold bg-blue-900">繰越金</th>
                          <th className="px-3 py-3 text-right font-semibold bg-blue-900">調整金</th>
                          <th className="px-3 py-3 text-right font-semibold bg-blue-900">別口座</th>
                          <th className="px-3 py-3 text-right font-semibold bg-green-900">支払調整前取得額</th>
                          <th className="px-3 py-3 text-right font-semibold">調整率</th>
                          <th className="px-3 py-3 text-right font-semibold">調整額</th>
                          <th className="px-3 py-3 text-right font-semibold bg-purple-900">取得額合計</th>
                          <th className="px-3 py-3 text-right font-semibold">10%消費税</th>
                          <th className="px-3 py-3 text-right font-semibold">源泉所得税</th>
                          <th className="px-3 py-3 text-right font-semibold">過不足金</th>
                          <th className="px-3 py-3 text-right font-semibold">別口座過不足</th>
                          <th className="px-3 py-3 text-right font-semibold">事務手数料</th>
                          <th className="px-3 py-3 text-right font-semibold bg-orange-900">支払額</th>
                          <th className="px-3 py-3 text-right font-semibold">グループACT</th>
                          <th className="px-3 py-3 text-right font-semibold">グループPT</th>
                          <th className="px-3 py-3 text-right font-semibold">最小ライン</th>
                          <th className="px-3 py-3 text-right font-semibold">ライン数</th>
                          <th className="px-3 py-3 text-right font-semibold">LV1ライン</th>
                          <th className="px-3 py-3 text-right font-semibold">LV2ライン</th>
                          <th className="px-3 py-3 text-right font-semibold">LV3ライン</th>
                          <th className="px-3 py-3 text-right font-semibold">自己購入PT</th>
                          <th className="px-3 py-3 text-right font-semibold">直下ACT</th>
                          <th className="px-3 py-3 text-center font-semibold">前回LV</th>
                          <th className="px-3 py-3 text-center font-semibold">タイトルLV</th>
                          <th className="px-3 py-3 text-center font-semibold">当月LV</th>
                          <th className="px-3 py-3 text-center font-semibold">強制LV</th>
                          <th className="px-3 py-3 text-left font-semibold">条件</th>
                          <th className="px-3 py-3 text-right font-semibold">貯金PT</th>
                          <th className="px-3 py-3 text-center font-semibold">ACT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredResults.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs sticky left-0 bg-white">{r.memberCode}</td>
                            <td className="px-3 py-2">{r.memberName}</td>
                            <td className="px-3 py-2 text-gray-600">{r.companyName || "-"}</td>
                            <td className="px-3 py-2 text-right">¥{r.directBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.unilevelBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.rankUpBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.shareBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.structureBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.savingsBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right bg-blue-50">¥{r.carryoverAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right bg-blue-50">¥{r.adjustmentAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right bg-blue-50">¥{r.otherPositionAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-semibold bg-green-50">¥{r.amountBeforeAdjustment.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{r.paymentAdjustmentRate != null ? `${r.paymentAdjustmentRate}%` : "-"}</td>
                            <td className="px-3 py-2 text-right text-red-600">¥{r.paymentAdjustmentAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-semibold bg-purple-50">¥{r.finalAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.consumptionTax.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-red-600">¥{r.withholdingTax.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.shortageAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.otherPositionShortage.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-red-600">¥{r.serviceFee.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-bold bg-orange-50">¥{r.paymentAmount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{r.groupActiveCount}</td>
                            <td className="px-3 py-2 text-right">{r.groupPoints}pt</td>
                            <td className="px-3 py-2 text-right">{r.minLinePoints}pt</td>
                            <td className="px-3 py-2 text-right">{r.lineCount}</td>
                            <td className="px-3 py-2 text-right">{r.level1Lines}</td>
                            <td className="px-3 py-2 text-right">{r.level2Lines}</td>
                            <td className="px-3 py-2 text-right">{r.level3Lines}</td>
                            <td className="px-3 py-2 text-right">{r.selfPurchasePoints}pt</td>
                            <td className="px-3 py-2 text-right">{r.directActiveCount}</td>
                            <td className="px-3 py-2 text-center">LV{r.previousTitleLevel}</td>
                            <td className="px-3 py-2 text-center font-semibold">LV{r.newTitleLevel}</td>
                            <td className="px-3 py-2 text-center">LV{r.achievedLevel}</td>
                            <td className="px-3 py-2 text-center">{r.forcedLevel > 0 ? `LV${r.forcedLevel}` : "-"}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{r.conditions || "-"}</td>
                            <td className="px-3 py-2 text-right">{r.savingsPoints}pt</td>
                            <td className="px-3 py-2 text-center">
                              {r.isActive ? (
                                <span className="text-green-600 font-bold">○</span>
                              ) : (
                                <span className="text-gray-400">-</span>
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

            {/* ─── ボーナス関連レポートタブ ─── */}
            {activeTab === "reports" && (
              <div className="space-y-4">
                {/* 月選択 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-gray-700">対象月:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* サブタブ */}
                <div className="border-b">
                  <nav className="flex space-x-4">
                    {[
                      { key: "webfricom", label: "Webフリコム出力", icon: "fas fa-file-export" },
                      { key: "levelChanges", label: `昇格・降格者（${levelChanges.length}件）`, icon: "fas fa-level-up-alt" },
                      { key: "carryover", label: `繰越金（${carryoverList.length}件）`, icon: "fas fa-redo" },
                      { key: "adjustments", label: `調整金（${adjustmentList.length}件）`, icon: "fas fa-adjust" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setReportsSubTab(tab.key as typeof reportsSubTab)}
                        className={`pb-2 px-1 font-semibold text-sm border-b-2 transition ${
                          reportsSubTab === tab.key
                            ? "border-violet-600 text-violet-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <i className={`${tab.icon} mr-1`}></i>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Webフリコム出力 */}
                {reportsSubTab === "webfricom" && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Webフリコム形式出力</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        固定長120文字フォーマットのWebフリコム振込データを出力します。
                      </p>
                      <button
                        onClick={handleExportWebfricom}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                      >
                        <i className="fas fa-download mr-2"></i>
                        Webフリコムデータを出力（{selectedMonth}）
                      </button>
                    </div>
                  </div>
                )}

                {/* 昇格・降格者一覧 */}
                {reportsSubTab === "levelChanges" && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={handleExportLevelChanges}
                        disabled={levelChanges.length === 0}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        <i className="fas fa-download mr-2"></i>
                        CSVエクスポート
                      </button>
                    </div>
                    {levelChanges.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">データがありません</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left p-3">会員ID</th>
                              <th className="text-left p-3">会員名</th>
                              <th className="text-center p-3">前回レベル</th>
                              <th className="text-center p-3">新レベル</th>
                              <th className="text-center p-3">変動</th>
                            </tr>
                          </thead>
                          <tbody>
                            {levelChanges.map((r, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono">{r.memberCode}</td>
                                <td className="p-3">{r.memberName}</td>
                                <td className="p-3 text-center">LV{r.previousLevel}</td>
                                <td className="p-3 text-center font-semibold">LV{r.newLevel}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    r.changeType === "promotion"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {r.changeType === "promotion" ? "昇格" : "降格"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 繰越金一覧 */}
                {reportsSubTab === "carryover" && (
                  <div className="space-y-4">
                    {carryoverList.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">繰越金データがありません</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left p-3">会員ID</th>
                              <th className="text-left p-3">法人名</th>
                              <th className="text-left p-3">会員名</th>
                              <th className="text-right p-3">繰越金額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {carryoverList.map((r, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono">{r.memberCode}</td>
                                <td className="p-3 text-gray-600">{r.companyName || "-"}</td>
                                <td className="p-3">{r.memberName}</td>
                                <td className="p-3 text-right font-semibold">¥{r.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 調整金一覧 */}
                {reportsSubTab === "adjustments" && (
                  <div className="space-y-4">
                    {adjustmentList.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">調整金データがありません</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left p-3">会員ID</th>
                              <th className="text-left p-3">法人名</th>
                              <th className="text-left p-3">会員名</th>
                              <th className="text-right p-3">金額</th>
                              <th className="text-left p-3">コメント</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adjustmentList.map((r, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono">{r.memberCode}</td>
                                <td className="p-3 text-gray-600">{r.companyName || "-"}</td>
                                <td className="p-3">{r.memberName}</td>
                                <td className="p-3 text-right font-semibold">¥{r.amount.toLocaleString()}</td>
                                <td className="p-3 text-gray-600">{r.comment || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── 月次サマリータブ ─── */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">直近6ヶ月のボーナスサマリー</h3>
                {summaryList.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">サマリーデータがありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th className="text-left p-3">対象月</th>
                          <th className="text-right p-3">対象会員</th>
                          <th className="text-right p-3">アクティブ</th>
                          <th className="text-right p-3">ダイレクトB</th>
                          <th className="text-right p-3">ユニレベルB</th>
                          <th className="text-right p-3">組織構築B</th>
                          <th className="text-right p-3">貯金B</th>
                          <th className="text-right p-3">ボーナス総額</th>
                          <th className="text-right p-3">支払総額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {summaryList.map((s, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 font-semibold text-gray-800">{s.month}</td>
                            <td className="p-3 text-right">{s.totalMembers}人</td>
                            <td className="p-3 text-right text-green-600">{s.totalActiveMembers}人</td>
                            <td className="p-3 text-right">¥{s.directBonus.toLocaleString()}</td>
                            <td className="p-3 text-right">¥{s.unilevelBonus.toLocaleString()}</td>
                            <td className="p-3 text-right">¥{s.structureBonus.toLocaleString()}</td>
                            <td className="p-3 text-right text-green-600">¥{s.savingsBonus.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-blue-600">¥{s.bonusTotal.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-purple-600">¥{s.paymentTotal.toLocaleString()}</td>
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
    </div>
  );
}
