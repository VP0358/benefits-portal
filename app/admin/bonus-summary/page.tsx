"use client";

import { useState, useEffect } from "react";

type MonthSummary = {
  month: string;
  status: string;
  totalMembers: number;
  totalActiveMembers: number;
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;
  bonusTotal: number;
  carryover: number;
  adjustment: number;
  otherPosition: number;
  beforeAdjustmentTotal: number;
  adjustmentRate: number;
  adjustmentAmount: number;
  finalTotal: number;
  consumptionTax: number;
  withholdingTax: number;
  shortage: number;
  serviceFee: number;
  paymentTotal: number;
  totalPoints: number;
  selfPoints: number;
  purchaseCount: number;
  pointRate: number;
  paymentRate: number;
  salesExTax: number;
  tax8: number;
  tax10: number;
  salesTotal: number;
  shareSource: number;
  capAdjustmentAmount: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft:     "下書き",
  confirmed: "確定",
  published: "公開済",
};
const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

export default function BonusSummaryPage() {
  const [data, setData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bonus-summary");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.summaries ?? []);
    } catch (e) {
      console.error(e);
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "期間",
      "ステータス",
      "総会員数",
      "アクティブ会員数",
      "ダイレクトB",
      "ユニレベルB",
      "ランクアップB",
      "シェアB",
      "組織構築B",
      "貯金B",
      "ボーナス合計[a]",
      "繰越金[b]",
      "調整金[c]",
      "他ポジション[d]",
      "支払調整前取得額合計[a+b+c+d]",
      "支払調整率",
      "支払調整額合計[e]",
      "取得額合計[a+b+c+d+e]",
      "10％消費税(内税)合計",
      "源泉所得税合計",
      "過不足金",
      "事務手数料",
      "支払額合計",
      "グループポイント合計",
      "自己購入ポイント",
      "購入件数",
      "支払率",
      "売上(税抜き)",
      "消費税(8％)",
      "消費税(10％)",
      "売上合計",
    ];

    const rows = data.map((row) => [
      row.month.replace("-", "年") + "月度",
      STATUS_LABELS[row.status] ?? row.status,
      row.totalMembers,
      row.totalActiveMembers,
      row.directBonus,
      row.unilevelBonus,
      row.rankUpBonus,
      row.shareBonus,
      row.structureBonus,
      row.savingsBonus,
      row.bonusTotal,
      row.carryover,
      row.adjustment,
      row.otherPosition,
      row.beforeAdjustmentTotal,
      `${row.adjustmentRate}%`,
      row.adjustmentAmount,
      row.finalTotal,
      row.consumptionTax,
      row.withholdingTax,
      row.shortage,
      row.serviceFee,
      row.paymentTotal,
      row.totalPoints,
      row.selfPoints,
      row.purchaseCount,
      `${row.paymentRate.toFixed(2)}%`,
      row.salesExTax,
      row.tax8,
      row.tax10,
      row.salesTotal,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    }).replace(/\//g, "-");
    link.download = `bonus_summary_${today}.csv`;
    link.click();
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
              Bonus Summary
            </p>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
              ボーナス一覧
            </h1>
            <p className="text-sm text-stone-400 mt-0.5">月別ボーナス合計・支払率・売上データ</p>
          </div>
          <div className="ml-auto flex gap-3">
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium disabled:opacity-50"
            >
              <i className="fas fa-sync-alt mr-1"></i>
              更新
            </button>
            <button
              onClick={handleExportCSV}
              disabled={data.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-semibold disabled:opacity-50"
            >
              <i className="fas fa-download mr-1"></i>
              CSVエクスポート
            </button>
          </div>
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="bg-blue-50 rounded-2xl p-6 text-center text-blue-700">
          <i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="bg-red-50 rounded-2xl p-4 text-red-600 text-sm">
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {/* データなし */}
      {!loading && !error && data.length === 0 && (
        <div className="bg-yellow-50 rounded-2xl p-8 text-center text-yellow-700">
          <i className="fas fa-info-circle mr-2"></i>
          ボーナス計算データがありません。ボーナス計算を実行してください。
        </div>
      )}

      {/* ボーナス一覧テーブル */}
      {data.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1800px]">
              <thead className="bg-stone-800 text-white">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-stone-800 z-10 min-w-[160px]">
                    期間
                  </th>
                  {data.map((item) => (
                    <th key={item.month} className="px-3 py-3 text-center font-semibold min-w-[110px]">
                      <div>{item.month.replace("-", "年")}月度</div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 会員数 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    会員数
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">総会員数</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">{item.totalMembers.toLocaleString()}名</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">アクティブ会員数</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">{item.totalActiveMembers.toLocaleString()}名</td>
                  ))}
                </tr>

                {/* ボーナス内訳 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    ボーナス内訳
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">ダイレクトB</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.directBonus.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">ユニレベルB</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.unilevelBonus.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">ランクアップB</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.rankUpBonus.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">シェアB</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.shareBonus.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">組織構築B</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.structureBonus.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">貯金B</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.savingsBonus.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="bg-blue-50 font-bold">
                  <td className="px-3 py-2 text-blue-900 sticky left-0 bg-blue-50">ボーナス合計[a]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-blue-900">¥{item.bonusTotal.toLocaleString()}</td>
                  ))}
                </tr>

                {/* 調整項目 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    調整・繰越
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">繰越金[b]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.carryover.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">調整金[c]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.adjustment.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">他ポジション[d]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.otherPosition.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="bg-green-50 font-bold">
                  <td className="px-3 py-2 text-green-900 sticky left-0 bg-green-50">支払調整前取得額合計[a+b+c+d]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-green-900">¥{item.beforeAdjustmentTotal.toLocaleString()}</td>
                  ))}
                </tr>

                {/* 支払調整 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    支払調整
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">支払調整率</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">{item.adjustmentRate}%</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">支払調整額合計[e]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-red-600">¥{item.adjustmentAmount.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="bg-purple-50 font-bold">
                  <td className="px-3 py-2 text-purple-900 sticky left-0 bg-purple-50">取得額合計[a+b+c+d+e]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-purple-900">¥{item.finalTotal.toLocaleString()}</td>
                  ))}
                </tr>

                {/* 税金・手数料 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    税金・手数料
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">10％消費税(内税)合計</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.consumptionTax.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">源泉所得税合計</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-red-600">¥{item.withholdingTax.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">過不足金</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.shortage.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">事務手数料</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-red-600">¥{item.serviceFee.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="bg-orange-50 font-bold text-sm">
                  <td className="px-3 py-3 text-orange-900 sticky left-0 bg-orange-50">支払額合計</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-3 text-right text-orange-900">¥{item.paymentTotal.toLocaleString()}</td>
                  ))}
                </tr>

                {/* ポイント・支払率 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    ポイント・支払率
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">グループポイント合計</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">{item.totalPoints.toLocaleString()}pt</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">自己購入ポイント</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">{item.selfPoints.toLocaleString()}pt</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">購入件数</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">{item.purchaseCount.toLocaleString()}件</td>
                  ))}
                </tr>
                <tr className="bg-yellow-50 font-bold">
                  <td className="px-3 py-2 text-yellow-900 sticky left-0 bg-yellow-50">支払率[ボーナス/売上]</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-yellow-900">{item.paymentRate.toFixed(2)}%</td>
                  ))}
                </tr>

                {/* 売上 */}
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-bold text-xs text-stone-500 uppercase tracking-wider sticky left-0 bg-stone-50" colSpan={data.length + 1}>
                    売上
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">売上(税抜き)</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.salesExTax.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">消費税(8％)</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.tax8.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white pl-5">消費税(10％)</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">¥{item.tax10.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="bg-indigo-50 font-bold">
                  <td className="px-3 py-2 text-indigo-900 sticky left-0 bg-indigo-50">売上合計</td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-indigo-900">¥{item.salesTotal.toLocaleString()}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
