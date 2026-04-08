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
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;
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
  forceLevel: number | null;
  conditionMet: boolean;
  savingsPoints: number;
  isActive: boolean;
};

export default function BonusResultsPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [results, setResults] = useState<BonusResultDetail[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [capAdjustment, setCapAdjustment] = useState({
    totalSales: 0,
    totalBonus: 0,
    recipientCount: 0,
    adjustmentRate: 0
  });

  // データ取得（ダミー）
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);

    // 実際のAPI実装後に置き換え
    setTimeout(() => {
      setResults([]);
      setCapAdjustment({
        totalSales: 0,
        totalBonus: 0,
        recipientCount: 0,
        adjustmentRate: 0
      });
      setLoading(false);
    }, 500);
  }, [selectedMonth]);

  const filteredResults = results.filter(
    (r) =>
      r.memberName.includes(search) ||
      r.memberCode.includes(search) ||
      (r.companyName && r.companyName.includes(search))
  );

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-file-invoice-dollar mr-2"></i>
          ボーナス計算結果
        </h1>
        <p className="mt-2 text-gray-600">
          ボーナス取得者一覧・支払対象者一覧の確認
        </p>
      </div>

      {/* 対象月選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">対象月</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-lg p-4 text-center text-blue-700">
          読み込み中...
        </div>
      )}

      {/* CAP調整 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          <i className="fas fa-chart-bar mr-2"></i>
          CAP調整
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-700">総売上</div>
            <div className="text-2xl font-bold text-blue-900">
              ¥{capAdjustment.totalSales.toLocaleString()}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-700">ボーナス取得額合計</div>
            <div className="text-2xl font-bold text-green-900">
              ¥{capAdjustment.totalBonus.toLocaleString()}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-700">ボーナス取得者数</div>
            <div className="text-2xl font-bold text-purple-900">
              {capAdjustment.recipientCount}人
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-700">支払い調整率</div>
            <div className="text-2xl font-bold text-orange-900">
              {capAdjustment.adjustmentRate}%
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-trash mr-2"></i>
            ボーナス結果キャッシュの削除（未実装）
          </button>
        </div>
      </div>

      {/* ボーナス取得者一覧 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {selectedMonth.replace("-", "年")}月度 ボーナス取得者一覧
          </h2>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-download mr-2"></i>
            CSVエクスポート（未実装）
          </button>
        </div>

        <input
          type="text"
          placeholder="会員名・会員ID・法人名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="text-sm text-gray-600">{filteredResults.length}件表示</div>

        {filteredResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[2000px]">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">会員ID</th>
                  <th className="px-2 py-2 text-left font-semibold">会員名</th>
                  <th className="px-2 py-2 text-left font-semibold">法人名</th>
                  <th className="px-2 py-2 text-right font-semibold">ダイレクトB</th>
                  <th className="px-2 py-2 text-right font-semibold">ユニレベルB</th>
                  <th className="px-2 py-2 text-right font-semibold">ランクアップB</th>
                  <th className="px-2 py-2 text-right font-semibold">シェアB</th>
                  <th className="px-2 py-2 text-right font-semibold">組織構築B</th>
                  <th className="px-2 py-2 text-right font-semibold">貯金B</th>
                  <th className="px-2 py-2 text-right font-semibold">繰越金</th>
                  <th className="px-2 py-2 text-right font-semibold">調整金</th>
                  <th className="px-2 py-2 text-right font-semibold">他ポジション</th>
                  <th className="px-2 py-2 text-right font-semibold">支払調整前取得額</th>
                  <th className="px-2 py-2 text-right font-semibold">支払調整率</th>
                  <th className="px-2 py-2 text-right font-semibold">支払調整額</th>
                  <th className="px-2 py-2 text-right font-semibold">取得額</th>
                  <th className="px-2 py-2 text-right font-semibold">10%消費税(内税)</th>
                  <th className="px-2 py-2 text-right font-semibold">源泉所得税</th>
                  <th className="px-2 py-2 text-right font-semibold">過不足金</th>
                  <th className="px-2 py-2 text-right font-semibold">他ポジション過不足金</th>
                  <th className="px-2 py-2 text-right font-semibold">事務手数料</th>
                  <th className="px-2 py-2 text-right font-semibold">支払額</th>
                  <th className="px-2 py-2 text-right font-semibold">グループACT</th>
                  <th className="px-2 py-2 text-right font-semibold">グループpt</th>
                  <th className="px-2 py-2 text-right font-semibold">最小系列pt</th>
                  <th className="px-2 py-2 text-center font-semibold">系列</th>
                  <th className="px-2 py-2 text-center font-semibold">LV.1達成系列数</th>
                  <th className="px-2 py-2 text-center font-semibold">LV.2達成系列数</th>
                  <th className="px-2 py-2 text-center font-semibold">LV.3達成系列数</th>
                  <th className="px-2 py-2 text-right font-semibold">自己購入pt</th>
                  <th className="px-2 py-2 text-center font-semibold">直ACT</th>
                  <th className="px-2 py-2 text-center font-semibold">旧レベル</th>
                  <th className="px-2 py-2 text-center font-semibold">称号レベル</th>
                  <th className="px-2 py-2 text-center font-semibold">当月判定レベル</th>
                  <th className="px-2 py-2 text-center font-semibold">強制レベル</th>
                  <th className="px-2 py-2 text-center font-semibold">条件</th>
                  <th className="px-2 py-2 text-right font-semibold">貯金ポイント</th>
                  <th className="px-2 py-2 text-center font-semibold">アクティブ</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">{row.memberCode}</td>
                    <td className="px-2 py-2">{row.memberName}</td>
                    <td className="px-2 py-2">{row.companyName || "-"}</td>
                    <td className="px-2 py-2 text-right">¥{row.directBonus.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.unilevelBonus.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.rankUpBonus.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.shareBonus.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.structureBonus.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.savingsBonus.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.carryoverAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.adjustmentAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.otherPositionAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.amountBeforeAdjustment.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{row.paymentAdjustmentRate || "-"}%</td>
                    <td className="px-2 py-2 text-right">¥{row.paymentAdjustmentAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-bold">¥{row.finalAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.consumptionTax.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.withholdingTax.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.shortageAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.otherPositionShortage.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">¥{row.serviceFee.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-bold text-green-700">¥{row.paymentAmount.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{row.groupActiveCount}</td>
                    <td className="px-2 py-2 text-right">{row.groupPoints.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{row.minLinePoints.toLocaleString()}</td>
                    <td className="px-2 py-2 text-center">{row.lineCount}</td>
                    <td className="px-2 py-2 text-center">{row.level1Lines}</td>
                    <td className="px-2 py-2 text-center">{row.level2Lines}</td>
                    <td className="px-2 py-2 text-center">{row.level3Lines}</td>
                    <td className="px-2 py-2 text-right">{row.selfPurchasePoints.toLocaleString()}</td>
                    <td className="px-2 py-2 text-center">{row.directActiveCount}</td>
                    <td className="px-2 py-2 text-center">{row.previousTitleLevel}</td>
                    <td className="px-2 py-2 text-center">{row.newTitleLevel}</td>
                    <td className="px-2 py-2 text-center">{row.achievedLevel}</td>
                    <td className="px-2 py-2 text-center">{row.forceLevel || "-"}</td>
                    <td className="px-2 py-2 text-center">{row.conditionMet ? "✅" : "-"}</td>
                    <td className="px-2 py-2 text-right">{row.savingsPoints.toLocaleString()}</td>
                    <td className="px-2 py-2 text-center">{row.isActive ? "✅" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? "読み込み中..." : "データがありません"}
          </div>
        )}
      </div>

      {/* 支払対象者一覧 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            支払対象者一覧
          </h2>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-download mr-2"></i>
            CSVエクスポート（未実装）
          </button>
        </div>

        <p className="text-sm text-gray-600">
          支払額が0円以上のボーナス取得者一覧（簡易版）
        </p>

        {filteredResults.filter(r => r.paymentAmount > 0).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">会員ID</th>
                  <th className="px-4 py-2 text-left font-semibold">名前</th>
                  <th className="px-4 py-2 text-right font-semibold">ダイレクトB</th>
                  <th className="px-4 py-2 text-right font-semibold">ユニレベルB</th>
                  <th className="px-4 py-2 text-right font-semibold">ランクアップB</th>
                  <th className="px-4 py-2 text-right font-semibold">シェアB</th>
                  <th className="px-4 py-2 text-right font-semibold">組織構築B</th>
                  <th className="px-4 py-2 text-right font-semibold">貯金B</th>
                  <th className="px-4 py-2 text-right font-semibold">繰越金</th>
                  <th className="px-4 py-2 text-right font-semibold">調整金</th>
                  <th className="px-4 py-2 text-right font-semibold">支払調整前取得額</th>
                  <th className="px-4 py-2 text-right font-semibold">支払調整率</th>
                  <th className="px-4 py-2 text-right font-semibold">支払調整額</th>
                  <th className="px-4 py-2 text-right font-semibold">取得額</th>
                  <th className="px-4 py-2 text-right font-semibold">10%消費税(内税)</th>
                  <th className="px-4 py-2 text-right font-semibold">源泉所得税</th>
                  <th className="px-4 py-2 text-right font-semibold">過不足金</th>
                  <th className="px-4 py-2 text-right font-semibold">事務手数料</th>
                  <th className="px-4 py-2 text-right font-semibold text-green-700">支払額</th>
                  <th className="px-4 py-2 text-left font-semibold">登録番号</th>
                  <th className="px-4 py-2 text-left font-semibold">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults
                  .filter((r) => r.paymentAmount > 0)
                  .map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{row.memberCode}</td>
                      <td className="px-4 py-2">{row.memberName}</td>
                      <td className="px-4 py-2 text-right">¥{row.directBonus.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.unilevelBonus.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.rankUpBonus.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.shareBonus.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.structureBonus.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.savingsBonus.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.carryoverAmount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.adjustmentAmount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.amountBeforeAdjustment.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{row.paymentAdjustmentRate || "-"}%</td>
                      <td className="px-4 py-2 text-right">¥{row.paymentAdjustmentAmount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-bold">¥{row.finalAmount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.consumptionTax.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.withholdingTax.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.shortageAmount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">¥{row.serviceFee.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700">¥{row.paymentAmount.toLocaleString()}</td>
                      <td className="px-4 py-2">-</td>
                      <td className="px-4 py-2">{row.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">支払対象者がいません</div>
        )}
      </div>
    </main>
  );
}
