"use client";

import { useState, useEffect, useCallback } from "react";

// 過去15ヶ月分の月リストを生成（JST基準）
function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const s = new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  });
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

type PaymentRecord = {
  id: string;
  memberCode: string;
  memberName: string;
  memberNameKana: string;
  companyName: string | null;
  paymentAmount: number;
  withholdingTax: number;
  finalAmount: number;
  consumptionTax: number;
  serviceFee: number;
  adjustmentAmount: number;
  carryoverAmount: number;
  shortageAmount: number;
  bonusMonth: string;
};

type PurchaseRecord = {
  productCode: string;
  productName: string;
  monthlyData: Record<string, { amount: number; count: number; points: number }>;
};

type SavingsRecord = {
  memberCode: string;
  memberName: string;
  companyName: string | null;
  savingsPoints: number;
  savingsPointsAdded: number;
  savingsBonus: number;
};

type HistoryItem = {
  id: string;
  timestamp: string;
  adminId: string | null;
  action: string;
  tableName: string;
  targetId: string;
  content: string;
};

type BonusRunInfo = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  note: string;
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

export default function BonusUtilitiesPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [activeTab, setActiveTab] = useState<
    "paymentStatement" | "purchaseList" | "bonusNote" | "savingsInput" | "updateHistory"
  >("paymentStatement");

  const [loading, setLoading] = useState(false);
  const [paymentRecords, setPaymentRecords]   = useState<PaymentRecord[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [purchaseMonths, setPurchaseMonths]   = useState<string[]>([]);
  const [savingsRecords, setSavingsRecords]   = useState<SavingsRecord[]>([]);
  const [historyItems, setHistoryItems]       = useState<HistoryItem[]>([]);
  const [bonusRunInfo, setBonusRunInfo]       = useState<BonusRunInfo | null>(null);
  const [bonusNote, setBonusNote]             = useState("");
  const [noteSaving, setNoteSaving]           = useState(false);
  const [noteMsg, setNoteMsg]                 = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError]                     = useState<string | null>(null);

  // タブ切り替えとデータ取得
  const fetchTabData = useCallback(async (tab: string, month: string) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "paymentStatement") {
        const res = await fetch(`/api/admin/bonus-utilities?bonusMonth=${month}&tab=payment`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPaymentRecords(data.records ?? []);
        setSelectedMembers([]);
      } else if (tab === "purchaseList") {
        const res = await fetch(`/api/admin/bonus-utilities?bonusMonth=${month}&tab=purchase`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPurchaseRecords(data.records ?? []);
        setPurchaseMonths(data.months ?? []);
      } else if (tab === "savingsInput") {
        const res = await fetch(`/api/admin/bonus-utilities?bonusMonth=${month}&tab=savings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSavingsRecords(data.records ?? []);
      } else if (tab === "updateHistory") {
        const res = await fetch(`/api/admin/bonus-utilities?bonusMonth=${month}&tab=history`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHistoryItems(data.history ?? []);
        setBonusRunInfo(data.bonusRun ?? null);
      } else if (tab === "bonusNote") {
        const res = await fetch(`/api/admin/bonus-notes?bonusMonth=${month}`);
        if (res.ok) {
          const data = await res.json();
          setBonusNote(data.note ?? "");
        }
      }
    } catch (e) {
      console.error(e);
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  // 月変更時に現在のタブのデータを再取得
  useEffect(() => {
    if (selectedMonth) {
      fetchTabData(activeTab, selectedMonth);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // タブ変更時にデータ取得
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    fetchTabData(tab, selectedMonth);
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
        body: JSON.stringify({ bonusMonth: selectedMonth, memberCodes: selectedMembers }),
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
    } catch {
      alert("エラーが発生しました");
    }
  };

  // 支払調書CSV出力
  const handleExportPaymentCSV = () => {
    const targets = selectedMembers.length > 0
      ? paymentRecords.filter((r) => selectedMembers.includes(r.memberCode))
      : paymentRecords;

    const headers = ["会員コード", "法人名", "会員名", "フリガナ", "支払額", "源泉徴収額", "取得額", "消費税", "事務手数料", "調整金", "繰越金", "過不足金"];
    const rows = targets.map((r) => [
      r.memberCode,
      r.companyName ?? "",
      r.memberName,
      r.memberNameKana,
      r.paymentAmount,
      r.withholdingTax,
      r.finalAmount,
      r.consumptionTax,
      r.serviceFee,
      r.adjustmentAmount,
      r.carryoverAmount,
      r.shortageAmount,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment_records_${selectedMonth}.csv`;
    link.click();
  };

  // 購入一覧CSV出力
  const handleExportPurchaseCSV = () => {
    const headers = ["商品コード", "商品名", ...purchaseMonths.flatMap((m) => [`${m}金額`, `${m}件数`])];
    const rows = purchaseRecords.map((r) => {
      const row: (string | number)[] = [r.productCode, r.productName];
      purchaseMonths.forEach((m) => {
        const d = r.monthlyData[m] ?? { amount: 0, count: 0 };
        row.push(d.amount, d.count);
      });
      return row;
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchase_list_${selectedMonth}.csv`;
    link.click();
  };

  // ボーナス備考保存
  const handleSaveBonusNote = async () => {
    setNoteSaving(true);
    setNoteMsg("");
    try {
      const res = await fetch("/api/admin/bonus-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth, note: bonusNote }),
      });
      setNoteMsg(res.ok ? "✅ 保存しました" : "❌ 保存に失敗しました");
    } catch {
      setNoteMsg("❌ エラーが発生しました");
    } finally {
      setNoteSaving(false);
    }
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const tabs = [
    { key: "paymentStatement", label: "支払調書作成",     icon: "fa-file-invoice" },
    { key: "purchaseList",     label: "購入一覧",         icon: "fa-shopping-cart" },
    { key: "bonusNote",        label: "備考入力",         icon: "fa-sticky-note" },
    { key: "savingsInput",     label: "貯金ポイント一覧", icon: "fa-piggy-bank" },
    { key: "updateHistory",    label: "更新履歴",         icon: "fa-history" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Bonus Utilities
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ボーナス管理ユーティリティ</h1>
        <p className="text-sm text-stone-400 mt-0.5">支払調書・購入一覧・備考入力・貯金ポイント一覧・更新履歴</p>
      </div>

      {/* 対象月選択 */}
      <div className="rounded-2xl bg-white border border-stone-100 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">対象月</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full md:w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 rounded-2xl px-5 py-3 text-sm text-red-600">
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {/* タブ + コンテンツ */}
      <div className="rounded-2xl bg-white border border-stone-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {/* タブナビゲーション */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-6 pt-4 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`pb-3 px-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                  activeTab === t.key
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className={`fas ${t.icon} mr-1`}></i>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading && (
            <div className="text-center text-blue-600 py-8">
              <i className="fas fa-spinner fa-spin mr-2"></i>読み込み中...
            </div>
          )}

          {/* ============== 支払調書作成タブ ============== */}
          {!loading && activeTab === "paymentStatement" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-2xl p-5">
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  <i className="fas fa-file-invoice mr-2 text-blue-600"></i>
                  支払調書 PDF / CSV 出力
                </h3>
                <p className="text-sm text-gray-600">
                  印刷対象者を選択して支払調書PDFを生成するか、CSV形式でダウンロードできます。
                </p>
              </div>

              {paymentRecords.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <i className="fas fa-inbox text-3xl mb-3 block"></i>
                  {selectedMonth.replace("-", "年")}月度の支払データがありません
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <span className="text-sm text-gray-600 font-medium">
                      {paymentRecords.length}名の支払データ
                      {selectedMembers.length > 0 && ` （${selectedMembers.length}名選択中）`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportPaymentCSV}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium"
                      >
                        <i className="fas fa-download mr-1"></i>
                        CSV出力
                      </button>
                      <button
                        onClick={handleGeneratePaymentStatement}
                        disabled={selectedMembers.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        <i className="fas fa-print mr-1"></i>
                        PDF作成（{selectedMembers.length}件）
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) =>
                                setSelectedMembers(e.target.checked ? paymentRecords.map((r) => r.memberCode) : [])
                              }
                              checked={selectedMembers.length === paymentRecords.length && paymentRecords.length > 0}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">会員コード</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">法人名</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">会員名</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">取得額</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">源泉徴収額</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">支払額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paymentRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(r.memberCode)}
                                onChange={(e) =>
                                  setSelectedMembers(
                                    e.target.checked
                                      ? [...selectedMembers, r.memberCode]
                                      : selectedMembers.filter((m) => m !== r.memberCode)
                                  )
                                }
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{r.memberCode}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{r.companyName ?? "-"}</td>
                            <td className="px-4 py-3 font-medium">{r.memberName}</td>
                            <td className="px-4 py-3 text-right font-semibold">¥{r.finalAmount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-red-600">¥{r.withholdingTax.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-bold text-orange-700">¥{r.paymentAmount.toLocaleString()}</td>
                          </tr>
                        ))}
                        {/* 合計行 */}
                        <tr className="bg-stone-100 font-bold">
                          <td colSpan={4} className="px-4 py-3 text-right text-gray-700">合計</td>
                          <td className="px-4 py-3 text-right">
                            ¥{paymentRecords.reduce((s, r) => s + r.finalAmount, 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600">
                            ¥{paymentRecords.reduce((s, r) => s + r.withholdingTax, 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-700">
                            ¥{paymentRecords.reduce((s, r) => s + r.paymentAmount, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============== 購入一覧タブ ============== */}
          {!loading && activeTab === "purchaseList" && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-base font-bold text-gray-800">
                  <i className="fas fa-shopping-cart mr-2 text-emerald-600"></i>
                  商品別月別購入一覧（直近{purchaseMonths.length}ヶ月）
                </h3>
                <button
                  onClick={handleExportPurchaseCSV}
                  disabled={purchaseRecords.length === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50"
                >
                  <i className="fas fa-download mr-1"></i>CSV出力
                </button>
              </div>

              {purchaseRecords.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <i className="fas fa-inbox text-3xl mb-3 block"></i>
                  購入データがありません
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-stone-800 text-white">
                        <th className="px-4 py-3 text-left font-semibold" rowSpan={2}>商品コード</th>
                        <th className="px-4 py-3 text-left font-semibold" rowSpan={2}>商品名</th>
                        {purchaseMonths.map((m, i) => (
                          <th
                            key={m}
                            colSpan={2}
                            className={`px-4 py-2 text-center font-semibold ${i % 2 === 0 ? "bg-stone-700" : "bg-stone-600"}`}
                          >
                            {m.replace("-", "年")}月
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-stone-100 text-xs text-gray-600">
                        {purchaseMonths.flatMap((m) => [
                          <th key={`${m}-amt`} className="px-3 py-2 text-right font-semibold">金額</th>,
                          <th key={`${m}-cnt`} className="px-3 py-2 text-right font-semibold">件数</th>,
                        ])}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {purchaseRecords.map((r) => (
                        <tr key={r.productCode} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-mono text-xs">{r.productCode}</td>
                          <td className="px-4 py-3 font-medium">{r.productName}</td>
                          {purchaseMonths.map((m) => {
                            const d = r.monthlyData[m] ?? { amount: 0, count: 0 };
                            return [
                              <td key={`${r.productCode}-${m}-a`} className="px-3 py-3 text-right">
                                {d.amount > 0 ? `¥${d.amount.toLocaleString()}` : "-"}
                              </td>,
                              <td key={`${r.productCode}-${m}-c`} className="px-3 py-3 text-right text-gray-500">
                                {d.count > 0 ? `${d.count}件` : "-"}
                              </td>,
                            ];
                          })}
                        </tr>
                      ))}
                      {/* 月別合計行 */}
                      <tr className="bg-stone-100 font-bold text-sm">
                        <td colSpan={2} className="px-4 py-3 text-right text-gray-700">月合計</td>
                        {purchaseMonths.map((m) => {
                          const totalAmt = purchaseRecords.reduce((s, r) => s + (r.monthlyData[m]?.amount ?? 0), 0);
                          const totalCnt = purchaseRecords.reduce((s, r) => s + (r.monthlyData[m]?.count ?? 0), 0);
                          return [
                            <td key={`total-${m}-a`} className="px-3 py-3 text-right text-orange-700">¥{totalAmt.toLocaleString()}</td>,
                            <td key={`total-${m}-c`} className="px-3 py-3 text-right text-gray-600">{totalCnt}件</td>,
                          ];
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============== 備考入力タブ ============== */}
          {!loading && activeTab === "bonusNote" && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-base font-bold text-gray-800">
                <i className="fas fa-sticky-note mr-2 text-yellow-600"></i>
                ボーナス明細書備考入力
              </h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {selectedMonth.replace("-", "年")}月度 備考
                </label>
                <textarea
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none"
                  rows={6}
                  placeholder="ボーナス明細書に表示する備考を入力してください"
                />
              </div>
              {noteMsg && (
                <p className={`text-sm font-medium ${noteMsg.startsWith("✅") ? "text-emerald-700" : "text-red-600"}`}>
                  {noteMsg}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveBonusNote}
                  disabled={noteSaving}
                  className="px-6 py-2.5 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition font-semibold text-sm disabled:opacity-50"
                >
                  <i className="fas fa-save mr-2"></i>
                  {noteSaving ? "保存中..." : "備考を保存"}
                </button>
              </div>
            </div>
          )}

          {/* ============== 貯金ポイント一覧タブ ============== */}
          {!loading && activeTab === "savingsInput" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-800">
                <i className="fas fa-piggy-bank mr-2 text-pink-600"></i>
                貯金ポイント（SAVpt）一覧 — {selectedMonth.replace("-", "年")}月度
              </h3>

              {savingsRecords.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <i className="fas fa-inbox text-3xl mb-3 block"></i>
                  貯金ポイント追加データがありません
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員コード</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">法人名</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員名</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">貯金pt累計</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">今月追加pt</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">貯金ボーナス</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {savingsRecords.map((s, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-mono text-xs">{s.memberCode}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{s.companyName ?? "-"}</td>
                          <td className="px-4 py-3 font-medium">{s.memberName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-pink-700">{s.savingsPoints.toLocaleString()}pt</td>
                          <td className="px-4 py-3 text-right text-emerald-700">+{s.savingsPointsAdded.toLocaleString()}pt</td>
                          <td className="px-4 py-3 text-right font-bold">¥{s.savingsBonus.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-stone-100 font-bold">
                        <td colSpan={3} className="px-4 py-3 text-right text-gray-700">合計</td>
                        <td className="px-4 py-3 text-right text-pink-700">
                          {savingsRecords.reduce((s, r) => s + r.savingsPoints, 0).toLocaleString()}pt
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700">
                          +{savingsRecords.reduce((s, r) => s + r.savingsPointsAdded, 0).toLocaleString()}pt
                        </td>
                        <td className="px-4 py-3 text-right">
                          ¥{savingsRecords.reduce((s, r) => s + r.savingsBonus, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============== 更新履歴タブ ============== */}
          {!loading && activeTab === "updateHistory" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-800">
                <i className="fas fa-history mr-2 text-indigo-600"></i>
                ボーナス管理更新履歴
              </h3>

              {/* ボーナスランの状態 */}
              {bonusRunInfo && (
                <div className="bg-indigo-50 rounded-xl px-5 py-4 flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-indigo-500 font-semibold mr-2">ステータス:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[bonusRunInfo.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[bonusRunInfo.status] ?? bonusRunInfo.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-500 font-semibold mr-2">作成日時:</span>
                    {fmtDate(bonusRunInfo.createdAt)}
                  </div>
                  {bonusRunInfo.confirmedAt && (
                    <div>
                      <span className="text-indigo-500 font-semibold mr-2">確定日時:</span>
                      {fmtDate(bonusRunInfo.confirmedAt)}
                    </div>
                  )}
                  {bonusRunInfo.note && (
                    <div className="w-full">
                      <span className="text-indigo-500 font-semibold mr-2">メモ:</span>
                      {bonusRunInfo.note}
                    </div>
                  )}
                </div>
              )}

              {historyItems.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <i className="fas fa-history text-3xl mb-3 block"></i>
                  {bonusRunInfo ? "操作履歴がありません" : "ボーナス計算データがありません"}
                </div>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((h) => (
                    <div
                      key={h.id}
                      className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl px-4 py-3 border-l-4 border-indigo-400"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-indigo-700">
                          {fmtDate(h.timestamp)}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {h.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{h.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{h.tableName} / {h.targetId}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
