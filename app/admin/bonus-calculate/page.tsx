"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

/* ─── 型定義 ─── */
type BonusRunSummary = {
  id: string;
  bonusMonth: string;
  status: "draft" | "confirmed" | "canceled";
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
  paymentAdjustmentRate: number | null;
  confirmedAt: string | null;
  createdAt: string;
};

type BonusResultRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  mlmMemberCode: string;
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
  savingsBonus: number;
  totalBonus: number;
  unilevelDetail: Record<string, number> | null;
  savingsPointsAdded: number;
};

type AdjustmentRow = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
  comment: string | null;
  isTaxable?: boolean;
};

type ShortageRow = {
  id: string;
  memberCode: string;
  memberName: string;
  companyName: string | null;
  amount: number;
  comment: string | null;
};

type SavingsBonusConfig = {
  id: string | null;
  registrationRate: number;
  autoshipRate: number;
  bonusRate: number;
};

/* ─── 定数 ─── */
const STATUS_STYLES = {
  draft: {
    label: "下書き（計算中）",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  confirmed: {
    label: "確定済み",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
  canceled: {
    label: "取消",
    bg: "bg-slate-100",
    text: "text-slate-500",
    border: "border-slate-200",
  },
};

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

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

/* ─── 計算結果テーブル ─── */
function ResultTable({ results }: { results: BonusResultRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = results.filter(
    (r) =>
      r.memberName.includes(search) ||
      r.memberEmail.includes(search) ||
      r.mlmMemberCode.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="会員名・メール・コードで検索..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">
          {filtered.length} / {results.length} 件
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-x-auto" style={{ minWidth: "900px" }}>
        <table className="w-full text-xs">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-2 font-semibold">会員</th>
              <th className="text-left p-2 font-semibold">ステータス</th>
              <th className="text-right p-2 font-semibold">自己pt</th>
              <th className="text-right p-2 font-semibold">グループpt</th>
              <th className="text-right p-2 font-semibold">直接</th>
              <th className="text-left p-2 font-semibold">称号変動</th>
              <th className="text-left p-2 font-semibold">現レベル</th>
              <th className="text-right p-2 font-semibold">ダイレクト</th>
              <th className="text-right p-2 font-semibold">ユニレベル</th>
              <th className="text-right p-2 font-semibold">組織</th>
              <th className="text-right p-2 font-semibold">貯金</th>
              <th className="text-right p-2 font-semibold">合計</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <div className="font-medium text-gray-800">{r.memberName}</div>
                  <div className="text-gray-500 text-[10px]">{r.mlmMemberCode}</div>
                </td>
                <td className="p-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.isActive ? "アクティブ" : "非"}
                  </span>
                </td>
                <td className="p-2 text-right text-gray-700">{r.selfPurchasePoints}</td>
                <td className="p-2 text-right text-gray-700">{r.groupPoints}</td>
                <td className="p-2 text-right text-gray-700">{r.directActiveCount}</td>
                <td className="p-2">
                  {r.previousTitleLevel !== r.newTitleLevel ? (
                    <span className="text-blue-600 font-semibold text-[10px]">
                      {LEVEL_LABELS[r.previousTitleLevel]} → {LEVEL_LABELS[r.newTitleLevel]}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">変動なし</span>
                  )}
                </td>
                <td className="p-2 text-gray-700 text-[11px]">
                  {LEVEL_LABELS[r.achievedLevel]}
                </td>
                <td className="p-2 text-right text-gray-800">{yen(r.directBonus)}</td>
                <td className="p-2 text-right text-gray-800">{yen(r.unilevelBonus)}</td>
                <td className="p-2 text-right text-gray-800">{yen(r.structureBonus)}</td>
                <td className="p-2 text-right text-green-600">{yen(r.savingsBonus)}</td>
                <td className="p-2 text-right font-bold text-blue-600">{yen(r.totalBonus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── メインコンポーネント ─── */
export default function BonusCalculatePage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunSummary | null>(null);
  const [results, setResults] = useState<BonusResultRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [shortages, setShortages] = useState<ShortageRow[]>([]);
  const [savingsConfig, setSavingsConfig] = useState<SavingsBonusConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // タブ状態
  const [activeTab, setActiveTab] = useState<"calculation" | "adjustment" | "shortage" | "savings">(
    "calculation"
  );

  // ページネーション
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const [shortagePage, setShortagePage] = useState(1);
  const itemsPerPage = 100;

  // ファイルアップロード用ref
  const adjustmentFileRef = useRef<HTMLInputElement>(null);
  const shortageFileRef = useRef<HTMLInputElement>(null);

  // モーダル制御
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [showSavingsConfigModal, setShowSavingsConfigModal] = useState(false);

  // フォーム状態
  const [newAdjustment, setNewAdjustment] = useState({
    memberCode: "",
    amount: "",
    comment: "",
    isTaxable: false,
  });

  const [newShortage, setNewShortage] = useState({
    memberCode: "",
    amount: "",
    comment: "",
  });

  // ボーナス実行状況を取得
  const fetchBonusRun = useCallback(async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bonus-run?bonusMonth=${selectedMonth}`);
      const data = await res.json();
      if (res.ok) {
        setBonusRun(data.bonusRun);
        // 結果も取得
        if (data.bonusRun) {
          const resDetail = await fetch(
            `/api/admin/bonus-results/detail?bonusMonth=${selectedMonth}`
          );
          const detailData = await resDetail.json();
          if (resDetail.ok && detailData.results) {
            setResults(detailData.results);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch bonus run:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  // 調整金・過不足金を取得
  const fetchAdjustments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bonus-adjustments");
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.adjustments || []);
      }
    } catch (err) {
      console.error("Failed to fetch adjustments:", err);
    }
  }, []);

  const fetchShortages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bonus-shortages");
      if (res.ok) {
        const data = await res.json();
        setShortages(data.shortages || []);
      }
    } catch (err) {
      console.error("Failed to fetch shortages:", err);
    }
  }, []);

  const fetchSavingsConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/savings-bonus-config");
      if (res.ok) {
        const data = await res.json();
        setSavingsConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch savings config:", err);
    }
  }, []);

  useEffect(() => {
    fetchBonusRun();
  }, [fetchBonusRun]);

  useEffect(() => {
    fetchAdjustments();
    fetchShortages();
    fetchSavingsConfig();
  }, [fetchAdjustments, fetchShortages, fetchSavingsConfig]);

  // ボーナス計算実行
  const handleExecute = async () => {
    if (!selectedMonth) return;
    if (!confirm(`${selectedMonth}のボーナス計算を実行しますか？`)) return;

    setExecuting(true);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ ボーナス計算を開始しました");
        await fetchBonusRun();
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ エラー: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  // ボーナス計算削除
  const handleDelete = async () => {
    if (!selectedMonth || !bonusRun) return;
    if (bonusRun.status === "confirmed") {
      alert("確定済みのボーナス計算は削除できません");
      return;
    }
    if (!confirm(`${selectedMonth}のボーナス計算を削除しますか？`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/bonus-run?bonusMonth=${selectedMonth}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ ボーナス計算を削除しました");
        setBonusRun(null);
        setResults([]);
      } else {
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ エラー: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // 調整金追加
  const handleAddAdjustment = async () => {
    if (!newAdjustment.memberCode || !newAdjustment.amount) {
      alert("会員コードと金額を入力してください");
      return;
    }

    try {
      const res = await fetch("/api/admin/bonus-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: newAdjustment.memberCode,
          amount: parseInt(newAdjustment.amount),
          comment: newAdjustment.comment || null,
          isTaxable: newAdjustment.isTaxable,
        }),
      });

      if (res.ok) {
        alert("✅ 調整金を追加しました");
        setShowAdjustmentModal(false);
        setNewAdjustment({ memberCode: "", amount: "", comment: "", isTaxable: false });
        await fetchAdjustments();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ エラー: ${err.message}`);
    }
  };

  // 過不足金追加
  const handleAddShortage = async () => {
    if (!newShortage.memberCode || !newShortage.amount) {
      alert("会員コードと金額を入力してください");
      return;
    }

    try {
      const res = await fetch("/api/admin/bonus-shortages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: newShortage.memberCode,
          amount: parseInt(newShortage.amount),
          comment: newShortage.comment || null,
        }),
      });

      if (res.ok) {
        alert("✅ 過不足金を追加しました");
        setShowShortageModal(false);
        setNewShortage({ memberCode: "", amount: "", comment: "" });
        await fetchShortages();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ エラー: ${err.message}`);
    }
  };

  // 貯金ボーナス設定更新
  const handleUpdateSavingsConfig = async () => {
    if (!savingsConfig) return;

    try {
      const res = await fetch("/api/admin/savings-bonus-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationRate: savingsConfig.registrationRate,
          autoshipRate: savingsConfig.autoshipRate,
          bonusRate: savingsConfig.bonusRate,
        }),
      });

      if (res.ok) {
        alert("✅ 貯金ボーナス設定を更新しました");
        setShowSavingsConfigModal(false);
        await fetchSavingsConfig();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ エラー: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Bonus Calculation
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">MLMボーナス計算・処理</h1>
        <p className="text-sm text-stone-400 mt-0.5">月次ボーナス計算実行・確定・調整金管理</p>
      </div>

      {/* メインコンテンツ */}
      <div className="space-y-6">
        {/* 月選択 */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fas fa-calendar mr-2"></i>
            対象月選択
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleExecute}
              disabled={executing || loading || !!bonusRun}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {executing ? "実行中..." : "ボーナス計算実行"}
            </button>
            {bonusRun && bonusRun.status !== "confirmed" && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "削除中..." : "計算削除"}
              </button>
            )}
          </div>
        </div>

        {/* ステータス表示 */}
        {bonusRun && (
          <div
            className={`rounded-lg p-6 border ${STATUS_STYLES[bonusRun.status].bg} ${
              STATUS_STYLES[bonusRun.status].border
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      STATUS_STYLES[bonusRun.status].text
                    }`}
                  >
                    {STATUS_STYLES[bonusRun.status].label}
                  </span>
                  <span className="text-gray-700 font-semibold">{selectedMonth}</span>
                </div>
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">対象会員:</span>{" "}
                    <span className="font-bold">{bonusRun.totalMembers}名</span>
                  </div>
                  <div>
                    <span className="text-gray-600">アクティブ:</span>{" "}
                    <span className="font-bold">{bonusRun.totalActiveMembers}名</span>
                  </div>
                  <div>
                    <span className="text-gray-600">合計ボーナス:</span>{" "}
                    <span className="font-bold text-blue-600">
                      {yen(bonusRun.totalBonusAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="bg-white rounded-2xl border border-stone-100">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("calculation")}
              className={`flex-1 px-6 py-3 font-semibold transition ${
                activeTab === "calculation"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-chart-line mr-2"></i>
              計算結果
            </button>
            <button
              onClick={() => setActiveTab("adjustment")}
              className={`flex-1 px-6 py-3 font-semibold transition ${
                activeTab === "adjustment"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-plus-circle mr-2"></i>
              調整金管理
            </button>
            <button
              onClick={() => setActiveTab("shortage")}
              className={`flex-1 px-6 py-3 font-semibold transition ${
                activeTab === "shortage"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-exclamation-circle mr-2"></i>
              過不足金管理
            </button>
            <button
              onClick={() => setActiveTab("savings")}
              className={`flex-1 px-6 py-3 font-semibold transition ${
                activeTab === "savings"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <i className="fas fa-piggy-bank mr-2"></i>
              貯金ボーナス設定
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="p-6">
            {activeTab === "calculation" && (
              <div>
                {loading ? (
                  <div className="text-center py-8 text-gray-600">
                    <p className="animate-pulse">読み込み中...</p>
                  </div>
                ) : results.length > 0 ? (
                  <ResultTable results={results} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    計算結果がありません。ボーナス計算を実行してください。
                  </div>
                )}
              </div>
            )}

            {activeTab === "adjustment" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800">調整金一覧</h3>
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    調整金追加
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200 border-b">
                      <tr>
                        <th className="text-left p-3">会員コード</th>
                        <th className="text-left p-3">会員名</th>
                        <th className="text-right p-3">金額</th>
                        <th className="text-left p-3">コメント</th>
                        <th className="text-left p-3">課税対象</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.slice((adjustmentPage - 1) * itemsPerPage, adjustmentPage * itemsPerPage).map((adj) => (
                        <tr key={adj.id} className="border-b hover:bg-white">
                          <td className="p-3 font-mono">{adj.memberCode}</td>
                          <td className="p-3">{adj.memberName}</td>
                          <td className="p-3 text-right font-semibold">{yen(adj.amount)}</td>
                          <td className="p-3 text-gray-600">{adj.comment || "-"}</td>
                          <td className="p-3">
                            {adj.isTaxable ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                課税
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                非課税
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "shortage" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800">過不足金一覧</h3>
                  <button
                    onClick={() => setShowShortageModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    過不足金追加
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200 border-b">
                      <tr>
                        <th className="text-left p-3">会員コード</th>
                        <th className="text-left p-3">会員名</th>
                        <th className="text-right p-3">金額</th>
                        <th className="text-left p-3">コメント</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortages.slice((shortagePage - 1) * itemsPerPage, shortagePage * itemsPerPage).map((sho) => (
                        <tr key={sho.id} className="border-b hover:bg-white">
                          <td className="p-3 font-mono">{sho.memberCode}</td>
                          <td className="p-3">{sho.memberName}</td>
                          <td className="p-3 text-right font-semibold">{yen(sho.amount)}</td>
                          <td className="p-3 text-gray-600">{sho.comment || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "savings" && savingsConfig && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800">貯金ボーナス設定</h3>
                  <button
                    onClick={() => setShowSavingsConfigModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    設定編集
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        登録時ボーナス率
                      </label>
                      <div className="text-2xl font-bold text-blue-600">
                        {savingsConfig.registrationRate}%
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        自己購入ポイントに対する率
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        オートシップボーナス率
                      </label>
                      <div className="text-2xl font-bold text-green-600">
                        {savingsConfig.autoshipRate}%
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        オートシップ決済時のボーナス率
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ボーナス計算時率
                      </label>
                      <div className="text-2xl font-bold text-purple-600">
                        {savingsConfig.bonusRate}%
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        月次コミッション合計に対する率
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 調整金追加モーダル */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl border border-stone-100-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">調整金追加</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  会員コード
                </label>
                <input
                  type="text"
                  value={newAdjustment.memberCode}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, memberCode: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例: VP00123"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">金額</label>
                <input
                  type="number"
                  value={newAdjustment.amount}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例: 10000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  コメント（任意）
                </label>
                <textarea
                  value={newAdjustment.comment}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, comment: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="調整理由など"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAdjustment.isTaxable}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, isTaxable: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">課税対象</label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddAdjustment}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 過不足金追加モーダル */}
      {showShortageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl border border-stone-100-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">過不足金追加</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  会員コード
                </label>
                <input
                  type="text"
                  value={newShortage.memberCode}
                  onChange={(e) => setNewShortage({ ...newShortage, memberCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例: VP00123"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">金額</label>
                <input
                  type="number"
                  value={newShortage.amount}
                  onChange={(e) => setNewShortage({ ...newShortage, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例: -5000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  コメント（任意）
                </label>
                <textarea
                  value={newShortage.comment}
                  onChange={(e) => setNewShortage({ ...newShortage, comment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="過不足理由など"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowShortageModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddShortage}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 貯金ボーナス設定編集モーダル */}
      {showSavingsConfigModal && savingsConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl border border-stone-100-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">貯金ボーナス設定編集</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  登録時ボーナス率（%）
                </label>
                <input
                  type="number"
                  value={savingsConfig.registrationRate}
                  onChange={(e) =>
                    setSavingsConfig({
                      ...savingsConfig,
                      registrationRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  オートシップボーナス率（%）
                </label>
                <input
                  type="number"
                  value={savingsConfig.autoshipRate}
                  onChange={(e) =>
                    setSavingsConfig({ ...savingsConfig, autoshipRate: parseFloat(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ボーナス計算時率（%）
                </label>
                <input
                  type="number"
                  value={savingsConfig.bonusRate}
                  onChange={(e) =>
                    setSavingsConfig({ ...savingsConfig, bonusRate: parseFloat(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  step="0.1"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSavingsConfigModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateSavingsConfig}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
