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
  const [reportsSubTab, setReportsSubTab] = useState<"webfricom" | "levelChanges" | "carryover" | "adjustments" | "payments" | "purchases">("webfricom");

  // データ状態
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [results, setResults] = useState<BonusResultDetail[]>([]);
  const [levelChanges, setLevelChanges] = useState<LevelChangeRecord[]>([]);
  const [carryoverList, setCarryoverList] = useState<CarryoverRecord[]>([]);
  const [adjustmentList, setAdjustmentList] = useState<AdjustmentRecord[]>([]);
  const [summaryList, setSummaryList] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // CAP調整率（デフォルト2%）
  const [capAdjRate, setCapAdjRate] = useState<number>(2);
  const [savingCapRate, setSavingCapRate] = useState(false);

  // 備考
  const [bonusNote, setBonusNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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
        // CAP調整率を反映
        if (data.bonusRun?.paymentAdjustmentRate != null) {
          setCapAdjRate(data.bonusRun.paymentAdjustmentRate);
        }
        // 備考を反映
        if (data.bonusRun?.note) {
          setBonusNote(data.bonusRun.note || "");
        }
      }
    } catch (error) {
      console.error("Error fetching bonus results:", error);
    }
    setLoading(false);
  };

  // CAP調整率保存
  const handleSaveCapRate = async () => {
    if (!bonusRun) return;
    setSavingCapRate(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth, paymentAdjustmentRate: capAdjRate }),
      });
      if (res.ok) {
        alert("✅ CAP調整率を保存しました");
        await fetchResultsData();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch {
      alert("❌ エラーが発生しました");
    } finally {
      setSavingCapRate(false);
    }
  };

  // 備考保存
  const handleSaveNote = async () => {
    if (!bonusRun) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth, note: bonusNote }),
      });
      if (res.ok) {
        alert("✅ 備考を保存しました");
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch {
      alert("❌ エラーが発生しました");
    } finally {
      setSavingNote(false);
    }
  };

  // ボーナス明細PDFダウンロード（会員毎）
  const handleDownloadStatementPDF = async (memberCode: string) => {
    try {
      const res = await fetch(`/api/admin/bonus-reports/statement-pdf?bonusMonth=${selectedMonth}&memberCode=${memberCode}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bonus_statement_${memberCode}_${selectedMonth}.pdf`;
        link.click();
      } else {
        alert("PDFの生成に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    }
  };

  // 支払調書CSVダウンロード
  const handleDownloadPaymentSlip = () => {
    const paymentTargets = results.filter((r) => r.paymentAmount > 0);
    const headers = ["会員コード", "会員名", "法人名", "支払額", "源泉所得税", "手取り額"];
    const rows = paymentTargets.map((r) => [
      r.memberCode,
      r.memberName,
      r.companyName || "",
      r.paymentAmount,
      r.withholdingTax,
      r.paymentAmount - r.withholdingTax,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment_slip_${selectedMonth}.csv`;
    link.click();
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
    const matchesTab = resultsSubTab === "all" || (resultsSubTab === "payment" && r.paymentAmount > 4000);
    return matchesSearch && matchesTab;
  });

  // CSVエクスポート
  const handleExportResultCSV = () => {
    const headers = [
      "会員ID", "会員名", "法人名", "ダイレクトB", "ユニレベルB", "ランクアップB", "シェアB",
      "組織構築B", "繰越金", "調整金", "別口座", "支払調整前取得額", "調整率", "調整額",
      "取得額合計", "10%消費税", "源泉所得税", "過不足金", "別口座過不足金", "事務手数料", "支払額",
      "グループACT", "グループPT", "最小ライン", "ライン数", "LV1ライン", "LV2ライン", "LV3ライン",
      "自己購入PT", "直下ACT", "前回レベル", "タイトルレベル", "当月レベル", "強制レベル", "条件",
      "貯金ポイント", "アクティブ",
    ];
    const rows = filteredResults.map((r) => [
      r.memberCode, r.memberName, r.companyName || "", r.directBonus, r.unilevelBonus,
      r.rankUpBonus, r.shareBonus, r.structureBonus, r.carryoverAmount,
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
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
            Bonus Reports
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ボーナス結果・レポート</h1>
          <p className="text-sm text-stone-400 mt-0.5">計算結果・明細・サマリーレポートの確認</p>
        </div>
        <div>
          {activeTab === "results" && (
            <button
              onClick={handleExportResultCSV}
              disabled={filteredResults.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 2px 8px rgba(5,150,105,0.3)" }}
            >
              <i className="fas fa-download text-xs"></i>
              CSVエクスポート
            </button>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="space-y-6">
        {/* メインタブ */}
        <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex border-b border-stone-100">
            <button
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3.5 text-sm font-semibold transition border-b-2 ${
                activeTab === "results"
                  ? "border-amber-500 text-amber-700 bg-amber-50/50"
                  : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              <i className="fas fa-list mr-2 text-xs"></i>
              ボーナス計算結果
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-6 py-3.5 text-sm font-semibold transition border-b-2 ${
                activeTab === "reports"
                  ? "border-amber-500 text-amber-700 bg-amber-50/50"
                  : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              <i className="fas fa-file-alt mr-2 text-xs"></i>
              ボーナス関連レポート
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === "summary"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-stone-50"
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                    {/* CAP調整率 & 備考 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CAP調整率 */}
                      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <i className="fas fa-percentage text-amber-600"></i>
                        <label className="text-sm font-semibold text-amber-800 whitespace-nowrap">CAP調整率</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" max="100" step="0.1"
                            value={capAdjRate}
                            onChange={(e) => setCapAdjRate(parseFloat(e.target.value) || 0)}
                            className="w-20 border border-amber-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                          />
                          <span className="text-sm text-amber-700">%</span>
                        </div>
                        <span className="text-xs text-amber-600">（デフォルト: 2%）</span>
                        <button
                          onClick={handleSaveCapRate}
                          disabled={savingCapRate}
                          className="ml-auto bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          {savingCapRate ? "保存中..." : "保存"}
                        </button>
                      </div>

                      {/* 備考 */}
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <i className="fas fa-comment text-slate-500"></i>
                        <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">備考</label>
                        <input
                          type="text"
                          value={bonusNote}
                          onChange={(e) => setBonusNote(e.target.value)}
                          placeholder="明細に表示される備考を入力..."
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          onClick={handleSaveNote}
                          disabled={savingNote || !bonusRun}
                          className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          {savingNote ? "保存中..." : "保存"}
                        </button>
                      </div>
                    </div>

                    {/* 支払調書・全明細PDFボタン */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleDownloadPaymentSlip}
                        disabled={results.filter((r) => r.paymentAmount > 0).length === 0}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        <i className="fas fa-file-invoice-dollar"></i>
                        支払調書 CSV
                      </button>
                      <button
                        onClick={handleExportResultCSV}
                        disabled={filteredResults.length === 0}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        <i className="fas fa-download"></i>
                        CSVエクスポート
                      </button>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="text-center py-4 text-gray-600 animate-pulse">読み込み中...</div>
                )}

                {/* サブタブ */}
                <div className="border-b overflow-x-auto">
                  <nav className="flex space-x-1 min-w-max">
                    <button
                      onClick={() => setResultsSubTab("all")}
                      className={`pb-2 px-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                        resultsSubTab === "all"
                          ? "border-violet-600 text-violet-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <i className="fas fa-users mr-1 text-xs"></i>
                      取得者一覧（{results.length}件）
                    </button>
                    <button
                      onClick={() => setResultsSubTab("payment")}
                      className={`pb-2 px-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                        resultsSubTab === "payment"
                          ? "border-violet-600 text-violet-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <i className="fas fa-money-bill-wave mr-1 text-xs"></i>
                      支払対象者（{results.filter((r) => r.paymentAmount > 4000).length}件）
                      <span className="ml-1 text-[10px] text-orange-500">※4,000円超</span>
                    </button>
                  </nav>
                </div>
                {/* 支払対象者の繰越ルール説明 */}
                {resultsSubTab === "payment" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-xs text-orange-700">
                    <i className="fas fa-info-circle mr-1"></i>
                    支払額が4,000円以下の会員は繰越となり、累計が4,000円を超えた月に支払対象となります。
                  </div>
                )}

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
                          <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-gray-800 z-10">操作</th>
                          <th className="px-3 py-3 text-left font-semibold sticky left-16 bg-gray-800 z-10">会員ID</th>
                          <th className="px-3 py-3 text-left font-semibold">会員名</th>
                          <th className="px-3 py-3 text-left font-semibold">法人名</th>
                          <th className="px-3 py-3 text-right font-semibold">ダイレクトB</th>
                          <th className="px-3 py-3 text-right font-semibold">ユニレベルB</th>
                          <th className="px-3 py-3 text-right font-semibold">ランクアップB</th>
                          <th className="px-3 py-3 text-right font-semibold">シェアB</th>
                          <th className="px-3 py-3 text-right font-semibold">組織構築B</th>
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
                          <tr key={r.id} className="hover:bg-stone-50">
                            <td className="px-2 py-2 sticky left-0 bg-white z-10">
                              <button
                                onClick={() => handleDownloadStatementPDF(r.memberCode)}
                                className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition whitespace-nowrap"
                                title="明細PDFダウンロード"
                              >
                                <i className="fas fa-file-pdf mr-1"></i>PDF
                              </button>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs sticky left-16 bg-white z-10">{r.memberCode}</td>
                            <td className="px-3 py-2">{r.memberName}</td>
                            <td className="px-3 py-2 text-gray-600">{r.companyName || "-"}</td>
                            <td className="px-3 py-2 text-right">¥{r.directBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.unilevelBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.rankUpBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.shareBonus.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">¥{r.structureBonus.toLocaleString()}</td>
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
                <div className="border-b overflow-x-auto">
                  <nav className="flex space-x-1 min-w-max">
                    {[
                      { key: "webfricom", label: "Webフリコム出力", icon: "fas fa-file-export" },
                      { key: "levelChanges", label: `昇格・降格（${levelChanges.length}件）`, icon: "fas fa-level-up-alt" },
                      { key: "carryover", label: `繰越金（${carryoverList.length}件）`, icon: "fas fa-redo" },
                      { key: "adjustments", label: `調整金（${adjustmentList.length}件）`, icon: "fas fa-adjust" },
                      { key: "payments", label: "支払調書", icon: "fas fa-file-invoice-dollar" },
                      { key: "purchases", label: "購入実績", icon: "fas fa-shopping-cart" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setReportsSubTab(tab.key as typeof reportsSubTab)}
                        className={`pb-2 px-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                          reportsSubTab === tab.key
                            ? "border-violet-600 text-violet-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <i className={`${tab.icon} mr-1 text-xs`}></i>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Webフリコム出力 */}
                {reportsSubTab === "webfricom" && (
                  <div className="space-y-4">
                    <div className="bg-stone-50 rounded-lg p-6">
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
                              <tr key={idx} className="border-b hover:bg-stone-50">
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
                              <tr key={idx} className="border-b hover:bg-stone-50">
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

                {/* 支払調書 */}
                {reportsSubTab === "payments" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        支払対象者（4,000円超）: <span className="font-bold text-indigo-700">{results.filter((r) => r.paymentAmount > 4000).length}件</span>
                      </p>
                      <button
                        onClick={handleDownloadPaymentSlip}
                        disabled={results.filter((r) => r.paymentAmount > 4000).length === 0}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-semibold"
                      >
                        <i className="fas fa-download mr-2"></i>
                        支払調書 CSV出力
                      </button>
                    </div>
                    {results.filter((r) => r.paymentAmount > 4000).length === 0 ? (
                      <p className="text-gray-500 text-center py-8">支払調書データがありません</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-indigo-900 text-white">
                            <tr>
                              <th className="text-left p-3">会員コード</th>
                              <th className="text-left p-3">会員名</th>
                              <th className="text-left p-3">法人名</th>
                              <th className="text-right p-3">支払額</th>
                              <th className="text-right p-3">源泉所得税</th>
                              <th className="text-right p-3">手取り額</th>
                              <th className="text-center p-3">明細PDF</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {results.filter((r) => r.paymentAmount > 4000).map((r) => (
                              <tr key={r.id} className="hover:bg-indigo-50">
                                <td className="p-3 font-mono text-xs">{r.memberCode}</td>
                                <td className="p-3">{r.memberName}</td>
                                <td className="p-3 text-gray-600">{r.companyName || "-"}</td>
                                <td className="p-3 text-right font-semibold text-green-700">¥{r.paymentAmount.toLocaleString()}</td>
                                <td className="p-3 text-right text-red-600">¥{r.withholdingTax.toLocaleString()}</td>
                                <td className="p-3 text-right font-bold text-indigo-900">¥{(r.paymentAmount - r.withholdingTax).toLocaleString()}</td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleDownloadStatementPDF(r.memberCode)}
                                    className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                                  >
                                    <i className="fas fa-file-pdf mr-1"></i>PDF
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 購入実績 */}
                {reportsSubTab === "purchases" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      {selectedMonth}の会員購入実績（自己購入ポイントが記録されている会員）
                    </p>
                    {results.filter((r) => r.selfPurchasePoints > 0).length === 0 ? (
                      <p className="text-gray-500 text-center py-8">購入実績データがありません</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-green-800 text-white">
                            <tr>
                              <th className="text-left p-3">会員コード</th>
                              <th className="text-left p-3">会員名</th>
                              <th className="text-right p-3">自己購入PT</th>
                              <th className="text-right p-3">グループPT</th>
                              <th className="text-right p-3">直下ACT</th>
                              <th className="text-center p-3">ACT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {results
                              .filter((r) => r.selfPurchasePoints > 0)
                              .sort((a, b) => b.selfPurchasePoints - a.selfPurchasePoints)
                              .map((r) => (
                              <tr key={r.id} className="hover:bg-green-50">
                                <td className="p-3 font-mono text-xs">{r.memberCode}</td>
                                <td className="p-3">{r.memberName}</td>
                                <td className="p-3 text-right font-semibold text-green-700">{r.selfPurchasePoints}pt</td>
                                <td className="p-3 text-right">{r.groupPoints}pt</td>
                                <td className="p-3 text-right">{r.directActiveCount}</td>
                                <td className="p-3 text-center">
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
                              <tr key={idx} className="border-b hover:bg-stone-50">
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
                          <th className="text-right p-3">ボーナス総額</th>
                          <th className="text-right p-3">支払総額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {summaryList.map((s, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="p-3 font-semibold text-gray-800">{s.month}</td>
                            <td className="p-3 text-right">{s.totalMembers}人</td>
                            <td className="p-3 text-right text-green-600">{s.totalActiveMembers}人</td>
                            <td className="p-3 text-right">¥{s.directBonus.toLocaleString()}</td>
                            <td className="p-3 text-right">¥{s.unilevelBonus.toLocaleString()}</td>
                            <td className="p-3 text-right">¥{s.structureBonus.toLocaleString()}</td>
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
      </div>
    </div>
  );
}
