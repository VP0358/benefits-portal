"use client";

import { useState, useEffect, useRef } from "react";

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

type BonusRunInfo = {
  id: string;
  bonusMonth: string;
  status: string;
  paymentAdjustmentRate: number | null;
  totalBonusAmount: number;
  totalMembers: number;
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

export default function BonusProcessPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [shortages, setShortages] = useState<ShortageRow[]>([]);
  const [savingsConfig, setSavingsConfig] = useState<SavingsBonusConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // ページネーション状態
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
    isTaxable: true,
  });

  const [newShortage, setNewShortage] = useState({
    memberCode: "",
    amount: "",
    comment: "",
  });

  const [newSavingsConfig, setNewSavingsConfig] = useState({
    registrationRate: 20,
    autoshipRate: 5,
    bonusRate: 3,
  });

  // データ取得
  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ボーナス実行情報を取得
      const runRes = await fetch(`/api/admin/bonus-run?bonusMonth=${selectedMonth}`);
      if (runRes.ok) {
        const runData = await runRes.json();
        setBonusRun(runData.bonusRun);
      }

      // 調整金を取得
      const adjRes = await fetch(`/api/admin/bonus-adjustments?bonusMonth=${selectedMonth}`);
      if (adjRes.ok) {
        const adjData = await adjRes.json();
        setAdjustments(adjData.adjustments || []);
      }

      // 過不足金を取得
      const shortRes = await fetch(`/api/admin/bonus-shortages?bonusMonth=${selectedMonth}`);
      if (shortRes.ok) {
        const shortData = await shortRes.json();
        setShortages(shortData.shortages || []);
      }

      // 貯金ボーナス設定を取得
      const configRes = await fetch("/api/admin/savings-bonus-config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setSavingsConfig(configData.config);
        setNewSavingsConfig({
          registrationRate: configData.config.registrationRate,
          autoshipRate: configData.config.autoshipRate,
          bonusRate: configData.config.bonusRate,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  // 調整金追加
  const handleAddAdjustment = async () => {
    if (!newAdjustment.memberCode || !newAdjustment.amount) {
      alert("会員コードと金額を入力してください");
      return;
    }

    try {
      const memberRes = await fetch(`/api/admin/mlm-members/search?code=${newAdjustment.memberCode}`);
      if (!memberRes.ok) {
        alert("会員が見つかりません");
        return;
      }
      const memberData = await memberRes.json();

      const res = await fetch("/api/admin/bonus-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          mlmMemberId: memberData.member.id,
          adjustmentType: "manual",
          amount: Number(newAdjustment.amount),
          comment: newAdjustment.comment,
          isTaxable: newAdjustment.isTaxable,
        }),
      });

      if (res.ok) {
        alert("調整金を追加しました");
        setShowAdjustmentModal(false);
        setNewAdjustment({ memberCode: "", amount: "", comment: "", isTaxable: true });
        fetchData();
      } else {
        alert("調整金の追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding adjustment:", error);
      alert("エラーが発生しました");
    }
  };

  // 過不足金追加
  const handleAddShortage = async () => {
    if (!newShortage.memberCode || !newShortage.amount) {
      alert("会員コードと金額を入力してください");
      return;
    }

    try {
      const memberRes = await fetch(`/api/admin/mlm-members/search?code=${newShortage.memberCode}`);
      if (!memberRes.ok) {
        alert("会員が見つかりません");
        return;
      }
      const memberData = await memberRes.json();

      const res = await fetch("/api/admin/bonus-shortages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          mlmMemberId: memberData.member.id,
          amount: Number(newShortage.amount),
          comment: newShortage.comment,
        }),
      });

      if (res.ok) {
        alert("過不足金を追加しました");
        setShowShortageModal(false);
        setNewShortage({ memberCode: "", amount: "", comment: "" });
        fetchData();
      } else {
        alert("過不足金の追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding shortage:", error);
      alert("エラーが発生しました");
    }
  };

  // 貯金ボーナス設定更新
  const handleUpdateSavingsConfig = async () => {
    try {
      const res = await fetch("/api/admin/savings-bonus-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSavingsConfig),
      });

      if (res.ok) {
        alert("貯金ボーナス設定を更新しました");
        setShowSavingsConfigModal(false);
        fetchData();
      } else {
        alert("設定の更新に失敗しました");
      }
    } catch (error) {
      console.error("Error updating savings config:", error);
      alert("エラーが発生しました");
    }
  };

  // ファイルアップロード処理（調整金）
  const handleAdjustmentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bonusMonth", selectedMonth);

    try {
      const res = await fetch("/api/admin/bonus-adjustments/bulk-upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.count}件の調整金をアップロードしました`);
        fetchData();
      } else {
        const error = await res.json();
        alert(`アップロード失敗: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("エラーが発生しました");
    }

    // リセット
    if (adjustmentFileRef.current) {
      adjustmentFileRef.current.value = "";
    }
  };

  // ファイルアップロード処理（過不足金）
  const handleShortageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bonusMonth", selectedMonth);

    try {
      const res = await fetch("/api/admin/bonus-shortages/bulk-upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.count}件の過不足金をアップロードしました`);
        fetchData();
      } else {
        const error = await res.json();
        alert(`アップロード失敗: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("エラーが発生しました");
    }

    // リセット
    if (shortageFileRef.current) {
      shortageFileRef.current.value = "";
    }
  };

  // 削除処理（調整金）
  const handleDeleteAdjustment = async (id: string) => {
    if (!confirm("この調整金を削除しますか？")) return;

    try {
      const res = await fetch(`/api/admin/bonus-adjustments?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("削除しました");
        fetchData();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      alert("エラーが発生しました");
    }
  };

  // 削除処理（過不足金）
  const handleDeleteShortage = async (id: string) => {
    if (!confirm("この過不足金を削除しますか？")) return;

    try {
      const res = await fetch(`/api/admin/bonus-shortages?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("削除しました");
        fetchData();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting shortage:", error);
      alert("エラーが発生しました");
    }
  };

  // ボーナス計算実行
  const handleExecuteBonus = async () => {
    if (!confirm(`${selectedMonth}のボーナス計算を実行しますか？`)) return;

    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusMonth: selectedMonth }),
      });

      if (res.ok) {
        alert("ボーナス計算を実行しました");
        fetchData();
      } else {
        const error = await res.json();
        alert(`実行失敗: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Error executing bonus:", error);
      alert("エラーが発生しました");
    }
  };

  // ボーナス計算削除
  const handleDeleteBonus = async () => {
    if (!confirm(`${selectedMonth}のボーナス計算を削除しますか？`)) return;

    try {
      const res = await fetch(`/api/admin/bonus-run?bonusMonth=${selectedMonth}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("ボーナス計算を削除しました");
        fetchData();
      } else {
        const error = await res.json();
        alert(`削除失敗: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Error deleting bonus:", error);
      alert("エラーが発生しました");
    }
  };

  // ページネーション計算
  const getPagedData = (data: any[], page: number) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  const pagedAdjustments = getPagedData(adjustments, adjustmentPage);
  const pagedShortages = getPagedData(shortages, shortagePage);
  const adjustmentTotalPages = getTotalPages(adjustments);
  const shortageTotalPages = getTotalPages(shortages);

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-calculator mr-2"></i>
          ボーナス計算処理
        </h1>
        <p className="mt-2 text-gray-600">対象月を選択してボーナス計算を実行します</p>
      </div>

      {/* 対象月選択 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">対象月</label>
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setAdjustmentPage(1);
            setShortagePage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ボーナス実行情報 */}
      {bonusRun && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            <i className="fas fa-info-circle mr-2"></i>
            ボーナス実行情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">ステータス</div>
              <div className="text-lg font-bold text-blue-900">
                {bonusRun.status === "confirmed" ? "確定済み" : "未確定"}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">対象会員数</div>
              <div className="text-lg font-bold text-green-900">{bonusRun.totalMembers}名</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">総ボーナス額</div>
              <div className="text-lg font-bold text-purple-900">
                ¥{bonusRun.totalBonusAmount.toLocaleString()}
              </div>
            </div>
            {bonusRun.paymentAdjustmentRate !== null && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">支払調整率</div>
                <div className="text-lg font-bold text-orange-900">
                  {bonusRun.paymentAdjustmentRate}%
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleExecuteBonus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <i className="fas fa-play mr-2"></i>
              ボーナス計算実行
            </button>
            <button
              onClick={handleDeleteBonus}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <i className="fas fa-trash mr-2"></i>
              ボーナス計算削除
            </button>
          </div>
        </div>
      )}

      {/* 調整金入力 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          <i className="fas fa-edit mr-2"></i>
          調整金入力
        </h2>

        {/* 一括アップロード */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            <i className="fas fa-upload mr-2"></i>
            一括アップロード
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={adjustmentFileRef}
              onChange={handleAdjustmentFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={() => adjustmentFileRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <i className="fas fa-folder-open mr-2"></i>
              ファイルを選択
            </button>
            <span className="text-sm text-gray-600">
              データ（CSV形式）をアップロード
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <i className="fas fa-info-circle mr-1"></i>
            形式: 会員コード,金額,コメント
          </div>
        </div>

        {/* 手動追加 */}
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition mb-4"
        >
          <i className="fas fa-plus mr-2"></i>
          手動追加
        </button>

        {/* 調整金リスト */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            調整金リスト（全{adjustments.length}件）
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">会員ID</th>
                <th className="px-4 py-3 text-left">法人名</th>
                <th className="px-4 py-3 text-left">名前</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3 text-left">コメント</th>
                <th className="px-4 py-3 text-center">処理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedAdjustments.length > 0 ? (
                pagedAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{adj.memberCode}</td>
                    <td className="px-4 py-3">{adj.companyName || "-"}</td>
                    <td className="px-4 py-3">{adj.memberName}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ¥{adj.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{adj.comment || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteAdjustment(adj.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション（調整金） */}
        {adjustmentTotalPages > 1 && (
          <div className="mt-4 flex justify-center items-center gap-2">
            <button
              onClick={() => setAdjustmentPage((p) => Math.max(1, p - 1))}
              disabled={adjustmentPage === 1}
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-sm text-gray-700">
              {adjustmentPage} / {adjustmentTotalPages}
            </span>
            <button
              onClick={() => setAdjustmentPage((p) => Math.min(adjustmentTotalPages, p + 1))}
              disabled={adjustmentPage === adjustmentTotalPages}
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* 過不足金入力（源泉対象外） */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          <i className="fas fa-balance-scale mr-2"></i>
          過不足金入力（源泉対象外）
        </h2>

        {/* 一括アップロード */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            <i className="fas fa-upload mr-2"></i>
            一括アップロード
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={shortageFileRef}
              onChange={handleShortageFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={() => shortageFileRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <i className="fas fa-folder-open mr-2"></i>
              ファイルを選択
            </button>
            <span className="text-sm text-gray-600">
              データ（CSV形式）をアップロード
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <i className="fas fa-info-circle mr-1"></i>
            形式: 会員コード,金額,コメント
          </div>
        </div>

        {/* 手動追加 */}
        <button
          onClick={() => setShowShortageModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition mb-4"
        >
          <i className="fas fa-plus mr-2"></i>
          手動追加
        </button>

        {/* 過不足金リスト */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            過不足金リスト（全{shortages.length}件）
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">会員ID</th>
                <th className="px-4 py-3 text-left">法人名</th>
                <th className="px-4 py-3 text-left">名前</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3 text-left">コメント</th>
                <th className="px-4 py-3 text-center">処理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedShortages.length > 0 ? (
                pagedShortages.map((shortage) => (
                  <tr key={shortage.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{shortage.memberCode}</td>
                    <td className="px-4 py-3">{shortage.companyName || "-"}</td>
                    <td className="px-4 py-3">{shortage.memberName}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ¥{shortage.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{shortage.comment || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteShortage(shortage.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション（過不足金） */}
        {shortageTotalPages > 1 && (
          <div className="mt-4 flex justify-center items-center gap-2">
            <button
              onClick={() => setShortagePage((p) => Math.max(1, p - 1))}
              disabled={shortagePage === 1}
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-sm text-gray-700">
              {shortagePage} / {shortageTotalPages}
            </span>
            <button
              onClick={() => setShortagePage((p) => Math.min(shortageTotalPages, p + 1))}
              disabled={shortagePage === shortageTotalPages}
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* 貯金ボーナス設定 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          <i className="fas fa-piggy-bank mr-2"></i>
          貯金ボーナス設定
        </h2>
        {savingsConfig && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">登録時ポイント率</div>
              <div className="text-lg font-bold text-blue-900">
                {savingsConfig.registrationRate}%
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">オートシップ率</div>
              <div className="text-lg font-bold text-green-900">
                {savingsConfig.autoshipRate}%
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">ボーナス率</div>
              <div className="text-lg font-bold text-purple-900">
                {savingsConfig.bonusRate}%
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowSavingsConfigModal(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <i className="fas fa-cog mr-2"></i>
          設定を編集
        </button>
      </div>

      {/* 調整金追加モーダル */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">調整金を追加</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">会員コード</label>
                <input
                  type="text"
                  value={newAdjustment.memberCode}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, memberCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">金額</label>
                <input
                  type="number"
                  value={newAdjustment.amount}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">コメント</label>
                <textarea
                  value={newAdjustment.comment}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, comment: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
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
                <label className="text-sm text-gray-700">源泉課税対象</label>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleAddAdjustment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setNewAdjustment({ memberCode: "", amount: "", comment: "", isTaxable: true });
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 過不足金追加モーダル */}
      {showShortageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">過不足金を追加</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">会員コード</label>
                <input
                  type="text"
                  value={newShortage.memberCode}
                  onChange={(e) =>
                    setNewShortage({ ...newShortage, memberCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">金額</label>
                <input
                  type="number"
                  value={newShortage.amount}
                  onChange={(e) =>
                    setNewShortage({ ...newShortage, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">コメント</label>
                <textarea
                  value={newShortage.comment}
                  onChange={(e) =>
                    setNewShortage({ ...newShortage, comment: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleAddShortage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setShowShortageModal(false);
                  setNewShortage({ memberCode: "", amount: "", comment: "" });
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 貯金ボーナス設定モーダル */}
      {showSavingsConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">貯金ボーナス設定を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  登録時ポイント率 (%)
                </label>
                <input
                  type="number"
                  value={newSavingsConfig.registrationRate}
                  onChange={(e) =>
                    setNewSavingsConfig({
                      ...newSavingsConfig,
                      registrationRate: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  オートシップ率 (%)
                </label>
                <input
                  type="number"
                  value={newSavingsConfig.autoshipRate}
                  onChange={(e) =>
                    setNewSavingsConfig({
                      ...newSavingsConfig,
                      autoshipRate: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ボーナス率 (%)
                </label>
                <input
                  type="number"
                  value={newSavingsConfig.bonusRate}
                  onChange={(e) =>
                    setNewSavingsConfig({
                      ...newSavingsConfig,
                      bonusRate: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleUpdateSavingsConfig}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                更新
              </button>
              <button
                onClick={() => setShowSavingsConfigModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
