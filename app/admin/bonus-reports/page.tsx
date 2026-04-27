"use client";

import { useState, useEffect } from "react";

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

export default function BonusReportsPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [activeTab, setActiveTab] = useState<
    "webfricom" | "levelChanges" | "carryover" | "adjustments"
  >("webfricom");

  const [loading, setLoading] = useState(false);
  const [levelChanges, setLevelChanges] = useState<LevelChangeRecord[]>([]);
  const [carryoverList, setCarryoverList] = useState<CarryoverRecord[]>([]);
  const [adjustmentList, setAdjustmentList] = useState<AdjustmentRecord[]>([]);

  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // レベル昇格・降格データを取得
      const levelRes = await fetch(
        `/api/admin/bonus-reports/level-changes?bonusMonth=${selectedMonth}`
      );
      if (levelRes.ok) {
        const levelData = await levelRes.json();
        setLevelChanges(levelData.levelChanges || []);
      }

      // 繰越金データを取得
      const carryoverRes = await fetch(
        `/api/admin/bonus-reports/carryover?bonusMonth=${selectedMonth}`
      );
      if (carryoverRes.ok) {
        const carryoverData = await carryoverRes.json();
        setCarryoverList(carryoverData.carryover || []);
      }

      // 調整金データを取得
      const adjRes = await fetch(
        `/api/admin/bonus-adjustments?bonusMonth=${selectedMonth}`
      );
      if (adjRes.ok) {
        const adjData = await adjRes.json();
        setAdjustmentList(adjData.adjustments || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  // Webフリコム形式出力（固定長120文字）
  const handleExportWebfricom = async () => {
    try {
      const res = await fetch(
        `/api/admin/export/webfricom?bonusMonth=${selectedMonth}`
      );
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

  // レベル昇格・降格者CSV出力
  const handleExportLevelChanges = () => {
    const headers = ["会員ID", "会員名", "前回レベル", "新レベル", "変動"];
    const rows = levelChanges.map((r) => [
      r.memberCode,
      r.memberName,
      `LV${r.previousLevel}`,
      `LV${r.newLevel}`,
      r.changeType === "promotion" ? "昇格" : "降格",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `level_changes_${selectedMonth}.csv`;
    link.click();
  };

  // 繰越金リストCSV出力
  const handleExportCarryover = () => {
    const headers = ["会員ID", "法人名", "会員名", "金額"];
    const rows = carryoverList.map((r) => [
      r.memberCode,
      r.companyName || "",
      r.memberName,
      r.amount,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carryover_${selectedMonth}.csv`;
    link.click();
  };

  // 調整金リストCSV出力
  const handleExportAdjustments = () => {
    const headers = ["会員ID", "法人名", "会員名", "金額", "コメント"];
    const rows = adjustmentList.map((r) => [
      r.memberCode,
      r.companyName || "",
      r.memberName,
      r.amount,
      r.comment || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adjustments_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-file-alt mr-2"></i>
          ボーナス関連レポート
        </h1>
        <p className="mt-2 text-gray-600">
          支払データ出力、昇格・降格者、繰越金、調整金の一覧を確認
        </p>
      </div>

      {/* 対象月選択 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
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
      </div>

      {loading && (
        <div className="bg-blue-50 rounded-lg p-4 text-center text-blue-700">
          読み込み中...
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="bg-white rounded-2xl border border-stone-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6 pt-4">
            <button
              onClick={() => setActiveTab("webfricom")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === "webfricom"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-file-export mr-1"></i>
              Webフリコム出力
            </button>
            <button
              onClick={() => setActiveTab("levelChanges")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === "levelChanges"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-level-up-alt mr-1"></i>
              昇格・降格者一覧（{levelChanges.length}件）
            </button>
            <button
              onClick={() => setActiveTab("carryover")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === "carryover"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-arrow-circle-right mr-1"></i>
              繰越金リスト（{carryoverList.length}件）
            </button>
            <button
              onClick={() => setActiveTab("adjustments")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === "adjustments"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-edit mr-1"></i>
              調整金リスト（{adjustmentList.length}件）
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Webフリコム出力タブ */}
          {activeTab === "webfricom" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
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
                <p className="font-semibold mb-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  ファイル形式について
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>固定長120文字のテキストファイル（.txt）</li>
                  <li>各行に1件の振込データを含む</li>
                  <li>支払額がプラスの会員のみ出力</li>
                  <li>銀行コード、支店コード、口座番号、金額などを含む</li>
                </ul>
              </div>
            </div>
          )}

          {/* レベル昇格・降格者一覧タブ */}
          {activeTab === "levelChanges" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  <i className="fas fa-level-up-alt mr-2 text-green-600"></i>
                  {selectedMonth.replace("-", "年")}月度 レベル昇格・降格者
                </h3>
                <button
                  onClick={handleExportLevelChanges}
                  disabled={levelChanges.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1"></i>
                  CSV出力
                </button>
              </div>

              {levelChanges.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  レベル変動データがありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員ID
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員名
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          前回レベル
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          新レベル
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                          変動
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {levelChanges.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono">{item.memberCode}</td>
                          <td className="px-4 py-3">{item.memberName}</td>
                          <td className="px-4 py-3 text-center">
                            LV{item.previousLevel}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            LV{item.newLevel}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.changeType === "promotion" ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <i className="fas fa-arrow-up mr-1"></i>
                                昇格
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                <i className="fas fa-arrow-down mr-1"></i>
                                降格
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

          {/* 繰越金リストタブ */}
          {activeTab === "carryover" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  <i className="fas fa-arrow-circle-right mr-2 text-orange-600"></i>
                  {selectedMonth.replace("-", "年")}月度 繰越金リスト
                </h3>
                <button
                  onClick={handleExportCarryover}
                  disabled={carryoverList.length === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1"></i>
                  CSV出力
                </button>
              </div>

              {carryoverList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  繰越金データがありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員ID
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          法人名
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員名
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          繰越金額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {carryoverList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono">{item.memberCode}</td>
                          <td className="px-4 py-3">
                            {item.companyName || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{item.memberName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-900">
                            ¥{item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 調整金リストタブ */}
          {activeTab === "adjustments" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  <i className="fas fa-edit mr-2 text-purple-600"></i>
                  {selectedMonth.replace("-", "年")}月度 調整金リスト
                </h3>
                <button
                  onClick={handleExportAdjustments}
                  disabled={adjustmentList.length === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1"></i>
                  CSV出力
                </button>
              </div>

              {adjustmentList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  調整金データがありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員ID
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          法人名
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員名
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          調整金額
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          コメント
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {adjustmentList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono">{item.memberCode}</td>
                          <td className="px-4 py-3">
                            {item.companyName || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{item.memberName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-purple-900">
                            ¥{item.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {item.comment || (
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
        </div>
      </div>
    </main>
  );
}
