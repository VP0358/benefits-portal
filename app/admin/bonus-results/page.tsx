"use client";

import { useState, useEffect } from "react";

// 過去15ヶ月分の月リストを生成
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

type BonusResultDetail = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  status: string;

  // ボーナス項目
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;

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

export default function BonusResultsPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [results, setResults] = useState<BonusResultDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // 検索フィルター
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "payment">("all");

  // データ取得
  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
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

  // フィルタリング
  const filteredResults = results.filter((r) => {
    // 検索クエリフィルター
    const matchesSearch =
      !searchQuery ||
      r.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

    // タブフィルター
    const matchesTab =
      activeTab === "all" || (activeTab === "payment" && r.paymentAmount > 0);

    return matchesSearch && matchesTab;
  });

  // CSVエクスポート（全項目）
  const handleExportCSV = () => {
    const headers = [
      "会員ID",
      "会員名",
      "法人名",
      "ダイレクトB",
      "ユニレベルB",
      "ランクアップB",
      "シェアB",
      "組織構築B",
      "貯金B",
      "繰越金",
      "調整金",
      "別口座",
      "支払調整前取得額",
      "調整率",
      "調整額",
      "取得額合計",
      "10%消費税",
      "源泉所得税",
      "過不足金",
      "別口座過不足金",
      "事務手数料",
      "支払額",
      "グループACT",
      "グループPT",
      "最小ライン",
      "ライン数",
      "LV1ライン",
      "LV2ライン",
      "LV3ライン",
      "自己購入PT",
      "直下ACT",
      "前回レベル",
      "タイトルレベル",
      "当月レベル",
      "強制レベル",
      "条件",
      "貯金ポイント",
      "アクティブ",
    ];

    const rows = filteredResults.map((r) => [
      r.memberCode,
      r.memberName,
      r.companyName || "",
      r.directBonus,
      r.unilevelBonus,
      r.rankUpBonus,
      r.shareBonus,
      r.structureBonus,
      r.savingsBonus,
      r.carryoverAmount,
      r.adjustmentAmount,
      r.otherPositionAmount,
      r.amountBeforeAdjustment,
      r.paymentAdjustmentRate || "",
      r.paymentAdjustmentAmount,
      r.finalAmount,
      r.consumptionTax,
      r.withholdingTax,
      r.shortageAmount,
      r.otherPositionShortage,
      r.serviceFee,
      r.paymentAmount,
      r.groupActiveCount,
      r.groupPoints,
      r.minLinePoints,
      r.lineCount,
      r.level1Lines,
      r.level2Lines,
      r.level3Lines,
      r.selfPurchasePoints,
      r.directActiveCount,
      r.previousTitleLevel,
      r.newTitleLevel,
      r.achievedLevel,
      r.forcedLevel,
      r.conditions || "",
      r.savingsPoints,
      r.isActive ? "○" : "",
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

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            <i className="fas fa-file-invoice-dollar mr-2"></i>
            ボーナス計算結果
          </h1>
          <p className="mt-2 text-gray-600">
            対象月のボーナス取得者一覧と支払対象者一覧を確認
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredResults.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          <i className="fas fa-download mr-2"></i>
          CSVエクスポート
        </button>
      </div>

      {/* 対象月選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          対象月
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full md:w-64 rounded-lg border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {bonusRun && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-semibold">計算状況</p>
              <p className="text-lg font-bold text-blue-900">
                {bonusRun.status === "confirmed" ? "確定済み" : "未確定"}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-semibold">対象会員数</p>
              <p className="text-lg font-bold text-green-900">
                {bonusRun.totalMembers}人
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 font-semibold">
                ボーナス総額
              </p>
              <p className="text-lg font-bold text-purple-900">
                ¥{bonusRun.totalBonusAmount.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-semibold">
                CAP調整額
              </p>
              <p className="text-lg font-bold text-orange-900">
                ¥{bonusRun.capAdjustmentAmount.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-lg p-4 text-center text-blue-700">
          読み込み中...
        </div>
      )}

      {/* タブ切り替え */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6 pt-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === "all"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-users mr-1"></i>
              全取得者一覧（{results.length}件）
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === "payment"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-money-check-alt mr-1"></i>
              支払対象者一覧（{results.filter((r) => r.paymentAmount > 0).length}件）
            </button>
          </nav>
        </div>

        {/* 検索 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="会員ID、名前、法人名で検索..."
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </div>

        {/* 結果テーブル（横スクロール対応・30+項目） */}
        <div className="p-6">
          {filteredResults.length === 0 ? (
            <p className="text-gray-500 text-center py-8">データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[3500px]">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-gray-800 z-10">
                      会員ID
                    </th>
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
                    <th className="px-3 py-3 text-right font-semibold bg-green-900">
                      支払調整前取得額
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">調整率</th>
                    <th className="px-3 py-3 text-right font-semibold">調整額</th>
                    <th className="px-3 py-3 text-right font-semibold bg-purple-900">
                      取得額合計
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">10%消費税</th>
                    <th className="px-3 py-3 text-right font-semibold">源泉所得税</th>
                    <th className="px-3 py-3 text-right font-semibold">過不足金</th>
                    <th className="px-3 py-3 text-right font-semibold">別口座過不足</th>
                    <th className="px-3 py-3 text-right font-semibold">事務手数料</th>
                    <th className="px-3 py-3 text-right font-semibold bg-orange-900">
                      支払額
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">グループACT</th>
                    <th className="px-3 py-3 text-right font-semibold">グループPT</th>
                    <th className="px-3 py-3 text-right font-semibold">最小ライン</th>
                    <th className="px-3 py-3 text-right font-semibold">ライン数</th>
                    <th className="px-3 py-3 text-right font-semibold">LV1ライン</th>
                    <th className="px-3 py-3 text-right font-semibold">LV2ライン</th>
                    <th className="px-3 py-3 text-right font-semibold">LV3ライン</th>
                    <th className="px-3 py-3 text-right font-semibold">自己購入PT</th>
                    <th className="px-3 py-3 text-right font-semibold">直下ACT</th>
                    <th className="px-3 py-3 text-center font-semibold">前回レベル</th>
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
                      <td className="px-3 py-2 font-mono text-xs sticky left-0 bg-white">
                        {r.memberCode}
                      </td>
                      <td className="px-3 py-2">{r.memberName}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.companyName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.directBonus.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.unilevelBonus.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.rankUpBonus.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.shareBonus.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.structureBonus.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.savingsBonus.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50">
                        ¥{r.carryoverAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50">
                        ¥{r.adjustmentAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50">
                        ¥{r.otherPositionAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold bg-green-50">
                        ¥{r.amountBeforeAdjustment.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.paymentAdjustmentRate != null
                          ? `${r.paymentAdjustmentRate}%`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        ¥{r.paymentAdjustmentAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold bg-purple-50">
                        ¥{r.finalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.consumptionTax.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        ¥{r.withholdingTax.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.shortageAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ¥{r.otherPositionShortage.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        ¥{r.serviceFee.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-bold bg-orange-50">
                        ¥{r.paymentAmount.toLocaleString()}
                      </td>
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
                      <td className="px-3 py-2 text-center font-semibold">
                        LV{r.newTitleLevel}
                      </td>
                      <td className="px-3 py-2 text-center">LV{r.achievedLevel}</td>
                      <td className="px-3 py-2 text-center">
                        {r.forcedLevel > 0 ? `LV${r.forcedLevel}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {r.conditions || <span className="text-gray-400">-</span>}
                      </td>
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
      </div>
    </main>
  );
}
