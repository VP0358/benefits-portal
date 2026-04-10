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

type MonthSummary = {
  month: string;
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;
  bonusTotal: number;
  carryover: number;
  adjustment: number;
  beforeAdjustmentTotal: number;
  adjustmentRate: number;
  adjustmentAmount: number;
  finalTotal: number;
  consumptionTax: number;
  withholdingTax: number;
  shortage: number;
  serviceFee: number;
  paymentTotal: number;
  monthlyCarryover: number;
  monthlyShortage: number;
  totalPoints: number;
  pointRate: number;
  paymentRate: number;
  salesExTax: number;
  tax8: number;
  tax10: number;
  salesTotal: number;
  shareSource: number;
};

export default function BonusSummaryPage() {
  const [data, setData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // データ取得（ダミー）
  useEffect(() => {
    setLoading(true);
    // 実際のAPI実装後に置き換え
    setTimeout(() => {
      const dummyData: MonthSummary[] = generateMonthOptions().slice(0, 6).map((opt, idx) => ({
        month: opt.value,
        directBonus: idx === 0 ? 48000 : idx === 1 ? 20000 : 6000,
        unilevelBonus: idx === 0 ? 925050 : idx === 1 ? 963000 : 871500,
        rankUpBonus: idx < 2 ? 0 : 414000,
        shareBonus: 0,
        structureBonus: idx < 2 ? 284400 : 0,
        savingsBonus: 0,
        bonusTotal: idx === 0 ? 1257450 : 1259450,
        carryover: idx === 0 ? 123350 : 124550,
        adjustment: idx === 0 ? 320000 : 250000,
        beforeAdjustmentTotal: idx === 0 ? 1700800 : 1634000,
        adjustmentRate: 2,
        adjustmentAmount: idx === 0 ? -28153 : -27368,
        finalTotal: idx === 0 ? 1672647 : 1606632,
        consumptionTax: idx === 0 ? 152013 : 146007,
        withholdingTax: idx === 0 ? -16602 : -12318,
        shortage: 0,
        serviceFee: idx === 0 ? -16720 : -17160,
        paymentTotal: idx === 0 ? 1516621 : 1453664,
        monthlyCarryover: idx === 0 ? 124950 : 125750,
        monthlyShortage: 0,
        totalPoints: idx === 0 ? 35550 : 34500,
        pointRate: 100,
        paymentRate: idx === 0 ? 35.37 : 36.5,
        salesExTax: idx === 0 ? 3809400 : 3641400,
        tax8: 0,
        tax10: idx === 0 ? 380940 : 364140,
        salesTotal: idx === 0 ? 4190340 : 4005540,
        shareSource: 0,
      }));
      setData(dummyData);
      setLoading(false);
    }, 500);
  }, []);

  const handleExportCSV = () => {
    // CSV生成処理（簡易版）
    const headers = [
      "期間",
      "ダイレクトB",
      "ユニレベルB",
      "ランクアップB",
      "シェアB",
      "組織構築B",
      "貯金B",
      "ボーナス合計[a]",
      "繰越金[b]",
      "調整金[c]",
      "支払調整前取得額合計[a+b+c]",
      "支払調整率",
      "支払調整額合計[d]",
      "取得額合計[a+b+c+d]",
      "10％消費税(内税)合計",
      "源泉所得税合計",
      "過不足金",
      "事務手数料",
      "支払額合計",
      "当月繰越金",
      "当月過不足金",
      "ポイント合計[e]",
      "レート(1pt＝)[f]",
      "支払率[a/(e*f)]",
      "売上(税抜き)",
      "消費税(8％)",
      "消費税(10％)",
      "売上合計",
      "シェアB原資",
    ];

    const rows = data.map((row) => [
      row.month.replace("-", "年") + "月度",
      `¥${row.directBonus.toLocaleString()}`,
      `¥${row.unilevelBonus.toLocaleString()}`,
      `¥${row.rankUpBonus.toLocaleString()}`,
      `¥${row.shareBonus.toLocaleString()}`,
      `¥${row.structureBonus.toLocaleString()}`,
      `¥${row.savingsBonus.toLocaleString()}`,
      `¥${row.bonusTotal.toLocaleString()}`,
      `¥${row.carryover.toLocaleString()}`,
      `¥${row.adjustment.toLocaleString()}`,
      `¥${row.beforeAdjustmentTotal.toLocaleString()}`,
      `${row.adjustmentRate}%`,
      `¥${row.adjustmentAmount.toLocaleString()}`,
      `¥${row.finalTotal.toLocaleString()}`,
      `¥${row.consumptionTax.toLocaleString()}`,
      `¥${row.withholdingTax.toLocaleString()}`,
      `¥${row.shortage.toLocaleString()}`,
      `¥${row.serviceFee.toLocaleString()}`,
      `¥${row.paymentTotal.toLocaleString()}`,
      `¥${row.monthlyCarryover.toLocaleString()}`,
      `¥${row.monthlyShortage.toLocaleString()}`,
      `${row.totalPoints.toLocaleString()}pt`,
      `¥${row.pointRate}`,
      `${row.paymentRate.toFixed(2)}%`,
      `¥${row.salesExTax.toLocaleString()}`,
      `¥${row.tax8.toLocaleString()}`,
      `¥${row.tax10.toLocaleString()}`,
      `¥${row.salesTotal.toLocaleString()}`,
      `${row.shareSource}pt`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bonus_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">
            <i className="fas fa-chart-line mr-2"></i>
            ボーナス一覧
          </h1>
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm"
          >
            <i className="fas fa-download mr-2"></i>
            CSVエクスポート
          </button>
        </div>
        <p className="mt-2 text-gray-600">月別ボーナス合計・支払率・売上データ</p>
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-lg p-4 text-center text-blue-700">
          読み込み中...
        </div>
      )}

      {/* ボーナス一覧テーブル */}
      {data.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1800px]">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-gray-800 z-10">
                    期間
                  </th>
                  {data.map((item) => (
                    <th key={item.month} className="px-3 py-3 text-center font-semibold">
                      {item.month.replace("-", "年")}月度
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* ボーナス項目 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    ダイレクトB
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.directBonus.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    ユニレベルB
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.unilevelBonus.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    ランクアップB
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.rankUpBonus.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    シェアB
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.shareBonus.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    組織構築B
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.structureBonus.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    貯金B
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.savingsBonus.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-blue-50 font-bold">
                  <td className="px-3 py-2 text-gray-900 sticky left-0 bg-blue-50">
                    ボーナス合計[a]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-blue-900">
                      ¥{item.bonusTotal.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 調整項目 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    繰越金[b]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.carryover.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    調整金[c]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.adjustment.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-green-50 font-bold">
                  <td className="px-3 py-2 text-gray-900 sticky left-0 bg-green-50">
                    支払調整前取得額合計[a+b+c]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-green-900">
                      ¥{item.beforeAdjustmentTotal.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 支払調整 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    支払調整率
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      {item.adjustmentRate}%
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    支払調整額合計[d]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-red-600">
                      ¥{item.adjustmentAmount.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-purple-50 font-bold">
                  <td className="px-3 py-2 text-gray-900 sticky left-0 bg-purple-50">
                    取得額合計[a+b+c+d]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-purple-900">
                      ¥{item.finalTotal.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 税金・手数料 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    10％消費税(内税)合計
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.consumptionTax.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    源泉所得税合計
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-red-600">
                      ¥{item.withholdingTax.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    過不足金
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.shortage.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    事務手数料
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-red-600">
                      ¥{item.serviceFee.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-orange-50 font-bold text-lg">
                  <td className="px-3 py-3 text-gray-900 sticky left-0 bg-orange-50">
                    支払額合計
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-3 text-right text-orange-900">
                      ¥{item.paymentTotal.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 当月データ */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    当月繰越金
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.monthlyCarryover.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    当月過不足金
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.monthlyShortage.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* ポイント・支払率 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    ポイント合計[e]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      {item.totalPoints.toLocaleString()}pt
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    レート(1pt＝)[f]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.pointRate}
                    </td>
                  ))}
                </tr>
                <tr className="bg-yellow-50 font-bold">
                  <td className="px-3 py-2 text-gray-900 sticky left-0 bg-yellow-50">
                    支払率[a/(e*f)]
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-yellow-900">
                      {item.paymentRate.toFixed(2)}%
                    </td>
                  ))}
                </tr>

                {/* 売上 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    売上(税抜き)
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.salesExTax.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    消費税(8％)
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.tax8.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    消費税(10％)
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      ¥{item.tax10.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-indigo-50 font-bold">
                  <td className="px-3 py-2 text-gray-900 sticky left-0 bg-indigo-50">
                    売上合計
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right text-indigo-900">
                      ¥{item.salesTotal.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                    シェアB原資
                  </td>
                  {data.map((item) => (
                    <td key={item.month} className="px-3 py-2 text-right">
                      {item.shareSource}pt
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="bg-yellow-50 rounded-lg p-8 text-center text-yellow-700">
          データがありません
        </div>
      )}
    </main>
  );
}
