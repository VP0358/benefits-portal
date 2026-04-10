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

type PaymentRecord = {
  memberCode: string;
  memberName: string;
  paymentAmount: number;
  withholdingTax: number;
};

type PurchaseRecord = {
  productCode: string;
  productName: string;
  monthlyData: { [month: string]: { amount: number; count: number } };
};

type SavingsInput = {
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
  comment: string | null;
};

type UpdateHistory = {
  timestamp: string;
  operator: string;
  content: string;
};

export default function BonusUtilitiesPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [activeTab, setActiveTab] = useState<
    "paymentStatement" | "purchaseList" | "bonusNote" | "savingsInput" | "updateHistory"
  >("paymentStatement");

  const [loading, setLoading] = useState(false);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [savingsInputs, setSavingsInputs] = useState<SavingsInput[]>([]);
  const [updateHistory, setUpdateHistory] = useState<UpdateHistory[]>([]);
  const [bonusNote, setBonusNote] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 備考を取得
      const noteRes = await fetch(`/api/admin/bonus-notes?bonusMonth=${selectedMonth}`);
      if (noteRes.ok) {
        const noteData = await noteRes.json();
        setBonusNote(noteData.note || "");
      }

      // ダミーデータ（実際のAPIに置き換え）
      setPaymentRecords([
        {
          memberCode: "M001",
          memberName: "山田太郎",
          paymentAmount: 150000,
          withholdingTax: 15000,
        },
        {
          memberCode: "M002",
          memberName: "佐藤花子",
          paymentAmount: 120000,
          withholdingTax: 12000,
        },
      ]);

      setPurchaseRecords([
        {
          productCode: "1000",
          productName: "基本セット",
          monthlyData: {
            "2026-02": { amount: 500000, count: 25 },
            "2026-01": { amount: 450000, count: 22 },
          },
        },
        {
          productCode: "2000",
          productName: "プレミアムセット",
          monthlyData: {
            "2026-02": { amount: 800000, count: 15 },
            "2026-01": { amount: 750000, count: 14 },
          },
        },
      ]);

      setSavingsInputs([
        {
          memberCode: "M001",
          memberName: "山田太郎",
          companyName: "山田商事",
          amount: 50000,
          comment: "登録時貯金",
        },
      ]);

      setUpdateHistory([
        {
          timestamp: "2026-02-15 14:30",
          operator: "admin",
          content: "ボーナス計算実行（2026年2月度）",
        },
        {
          timestamp: "2026-02-10 10:15",
          operator: "admin",
          content: "調整金一括登録（5件）",
        },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  // 支払調書PDF生成
  const handleGeneratePaymentStatement = async () => {
    if (selectedMembers.length === 0) {
      alert("印刷対象者を選択してください");
      return;
    }

    try {
      const res = await fetch("/api/admin/pdf/payment-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          memberCodes: selectedMembers,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `payment_statement_${selectedMonth}.pdf`;
        link.click();
      } else {
        alert("支払調書の生成に失敗しました");
      }
    } catch (error) {
      console.error("Error generating payment statement:", error);
      alert("エラーが発生しました");
    }
  };

  // 購入一覧CSV出力
  const handleExportPurchaseList = () => {
    const months = Object.keys(purchaseRecords[0]?.monthlyData || {}).sort().reverse();
    const headers = ["商品コード", "商品名", ...months.flatMap((m) => [`${m}金額`, `${m}件数`])];

    const rows = purchaseRecords.map((r) => {
      const row = [r.productCode, r.productName];
      months.forEach((month) => {
        const data = r.monthlyData[month] || { amount: 0, count: 0 };
        row.push(String(data.amount), String(data.count));
      });
      return row;
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchase_list_${selectedMonth}.csv`;
    link.click();
  };

  // ボーナス明細書備考保存
  const handleSaveBonusNote = async () => {
    try {
      const res = await fetch("/api/admin/bonus-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          note: bonusNote,
        }),
      });

      if (res.ok) {
        alert("備考を保存しました");
      } else {
        alert("備考の保存に失敗しました");
      }
    } catch (error) {
      console.error("Error saving bonus note:", error);
      alert("エラーが発生しました");
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Bonus Utilities
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ボーナス管理ユーティリティ</h1>
        <p className="text-sm text-stone-400 mt-0.5">支払調書・購入一覧・備考入力・貯金B一覧・更新履歴</p>
      </div>

      {/* 対象月選択 */}
      <div className="rounded-2xl bg-white border border-stone-100 p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
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
      <div className="rounded-2xl bg-white border border-stone-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6 pt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("paymentStatement")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === "paymentStatement"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-file-invoice mr-1"></i>
              支払調書作成
            </button>
            <button
              onClick={() => setActiveTab("purchaseList")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === "purchaseList"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-shopping-cart mr-1"></i>
              購入一覧
            </button>
            <button
              onClick={() => setActiveTab("bonusNote")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === "bonusNote"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-sticky-note mr-1"></i>
              備考入力
            </button>
            <button
              onClick={() => setActiveTab("savingsInput")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === "savingsInput"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-piggy-bank mr-1"></i>
              貯金B一覧
            </button>
            <button
              onClick={() => setActiveTab("updateHistory")}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                activeTab === "updateHistory"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <i className="fas fa-history mr-1"></i>
              更新履歴
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 支払調書作成タブ */}
          {activeTab === "paymentStatement" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  <i className="fas fa-file-invoice mr-2 text-blue-600"></i>
                  支払調書PDF作成（A4を4分割、A6フォーマット）
                </h3>
                <p className="text-gray-700 mb-4">
                  印刷対象者を選択して、支払調書PDFを生成します。
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-800">支払対象者一覧</h4>
                  <button
                    onClick={handleGeneratePaymentStatement}
                    disabled={selectedMembers.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    <i className="fas fa-print mr-1"></i>
                    支払調書を作成（{selectedMembers.length}件）
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMembers(paymentRecords.map((r) => r.memberCode));
                              } else {
                                setSelectedMembers([]);
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員ID
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          会員名
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          支払額
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          源泉徴収額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentRecords.map((r) => (
                        <tr key={r.memberCode} className="hover:bg-stone-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(r.memberCode)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembers([...selectedMembers, r.memberCode]);
                                } else {
                                  setSelectedMembers(
                                    selectedMembers.filter((m) => m !== r.memberCode)
                                  );
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono">{r.memberCode}</td>
                          <td className="px-4 py-3">{r.memberName}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            ¥{r.paymentAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600">
                            ¥{r.withholdingTax.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 購入一覧タブ */}
          {activeTab === "purchaseList" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  <i className="fas fa-shopping-cart mr-2 text-green-600"></i>
                  商品別月別購入一覧
                </h3>
                <button
                  onClick={handleExportPurchaseList}
                  disabled={purchaseRecords.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1"></i>
                  CSV出力
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        商品コード
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        商品名
                      </th>
                      <th
                        colSpan={2}
                        className="px-4 py-3 text-center font-semibold text-gray-700 bg-blue-50"
                      >
                        2026年2月
                      </th>
                      <th
                        colSpan={2}
                        className="px-4 py-3 text-center font-semibold text-gray-700 bg-green-50"
                      >
                        2026年1月
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th></th>
                      <th></th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                        金額
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                        件数
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                        金額
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                        件数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchaseRecords.map((r) => (
                      <tr key={r.productCode} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono">{r.productCode}</td>
                        <td className="px-4 py-3">{r.productName}</td>
                        <td className="px-4 py-3 text-right">
                          ¥{r.monthlyData["2026-02"]?.amount.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.monthlyData["2026-02"]?.count || 0}件
                        </td>
                        <td className="px-4 py-3 text-right">
                          ¥{r.monthlyData["2026-01"]?.amount.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.monthlyData["2026-01"]?.count || 0}件
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ボーナス明細書備考入力タブ */}
          {activeTab === "bonusNote" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className="fas fa-sticky-note mr-2 text-yellow-600"></i>
                ボーナス明細書備考入力
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {selectedMonth.replace("-", "年")}月度 備考
                  </label>
                  <textarea
                    value={bonusNote}
                    onChange={(e) => setBonusNote(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    rows={6}
                    placeholder="ボーナス明細書に表示する備考を入力してください"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveBonusNote}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold"
                  >
                    <i className="fas fa-save mr-2"></i>
                    備考を保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 貯金B入力内容一覧タブ */}
          {activeTab === "savingsInput" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className="fas fa-piggy-bank mr-2 text-pink-600"></i>
                貯金ボーナス入力内容一覧
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50">
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
                        金額
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        コメント
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {savingsInputs.map((s, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono">{s.memberCode}</td>
                        <td className="px-4 py-3">
                          {s.companyName || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3">{s.memberName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-pink-900">
                          ¥{s.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.comment || <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 更新履歴タブ */}
          {activeTab === "updateHistory" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className="fas fa-history mr-2 text-indigo-600"></i>
                ボーナス管理更新履歴
              </h3>

              <div className="space-y-3">
                {updateHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-l-4 border-indigo-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-indigo-900">
                        {h.timestamp}
                      </span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                        {h.operator}
                      </span>
                    </div>
                    <p className="text-gray-700">{h.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
