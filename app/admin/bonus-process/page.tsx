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

  // モーダル制御
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [showSavingsConfigModal, setShowSavingsConfigModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadType, setBulkUploadType] = useState<"adjustment" | "shortage">("adjustment");

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

  const [bulkData, setBulkData] = useState("");

  // データ取得
  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ボーナス実行情報を取得（ダミー）
      // 実際のAPIに置き換える
      setBonusRun({
        id: "1",
        bonusMonth: selectedMonth,
        status: "draft",
        paymentAdjustmentRate: 2.0,
        totalBonusAmount: 1500000,
        totalMembers: 25,
      });

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
      // 会員コードからmlmMemberIdを検索
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
      // 会員コードからmlmMemberIdを検索
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

  // 一括アップロード処理
  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      alert("データを入力してください");
      return;
    }

    try {
      // CSVパース（簡易版）
      const lines = bulkData.trim().split("\n");
      const items = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const [memberCode, amount, comment] = line.split(",").map((s) => s.trim());
        if (memberCode && amount) {
          items.push({
            memberCode,
            amount: Number(amount),
            comment: comment || "",
            isTaxable: bulkUploadType === "adjustment" ? true : undefined,
          });
        }
      }

      if (items.length === 0) {
        alert("有効なデータがありません");
        return;
      }

      const endpoint =
        bulkUploadType === "adjustment"
          ? "/api/admin/bonus-adjustments/bulk-upload"
          : "/api/admin/bonus-shortages/bulk-upload";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: selectedMonth,
          items,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(
          `一括登録完了\n成功: ${result.results.success}件\n失敗: ${result.results.failed}件`
        );
        setShowBulkUploadModal(false);
        setBulkData("");
        fetchData();
      } else {
        alert("一括登録に失敗しました");
      }
    } catch (error) {
      console.error("Error bulk uploading:", error);
      alert("エラーが発生しました");
    }
  };

  // 削除処理
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

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-calculator mr-2"></i>
          ボーナス計算処理
        </h1>
        <p className="mt-2 text-gray-600">
          対象月を選択して、調整金・過不足金・貯金ボーナス設定を管理
        </p>
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
                {bonusRun.status === "draft" ? "未計算" : "計算済み"}
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
                支払調整率
              </p>
              <p className="text-lg font-bold text-orange-900">
                {bonusRun.paymentAdjustmentRate != null
                  ? `${bonusRun.paymentAdjustmentRate}%`
                  : "未設定"}
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

      {/* 調整金セクション */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            <i className="fas fa-edit mr-2 text-violet-600"></i>
            調整金入力
          </h2>
          <div className="space-x-2">
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm"
            >
              <i className="fas fa-plus mr-1"></i>
              手動追加
            </button>
            <button
              onClick={() => {
                setBulkUploadType("adjustment");
                setShowBulkUploadModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <i className="fas fa-upload mr-1"></i>
              一括アップロード
            </button>
          </div>
        </div>

        <div className="p-6">
          {adjustments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              調整金データがありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      会員コード
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      会員名
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      法人名
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      コメント
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      課税
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{adj.memberCode}</td>
                      <td className="px-4 py-3">{adj.memberName}</td>
                      <td className="px-4 py-3">
                        {adj.companyName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ¥{adj.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {adj.comment || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {adj.isTaxable ? (
                          <span className="text-green-600">対象</span>
                        ) : (
                          <span className="text-gray-400">対象外</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 過不足金セクション */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            <i className="fas fa-balance-scale mr-2 text-blue-600"></i>
            過不足金入力（源泉対象外）
          </h2>
          <div className="space-x-2">
            <button
              onClick={() => setShowShortageModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <i className="fas fa-plus mr-1"></i>
              手動追加
            </button>
            <button
              onClick={() => {
                setBulkUploadType("shortage");
                setShowBulkUploadModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <i className="fas fa-upload mr-1"></i>
              一括アップロード
            </button>
          </div>
        </div>

        <div className="p-6">
          {shortages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              過不足金データがありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      会員コード
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      会員名
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      法人名
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      コメント
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shortages.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{s.memberCode}</td>
                      <td className="px-4 py-3">{s.memberName}</td>
                      <td className="px-4 py-3">
                        {s.companyName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ¥{s.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.comment || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteShortage(s.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 貯金ボーナス設定セクション */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            <i className="fas fa-piggy-bank mr-2 text-pink-600"></i>
            貯金ボーナス設定
          </h2>
          <button
            onClick={() => setShowSavingsConfigModal(true)}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm"
          >
            <i className="fas fa-cog mr-1"></i>
            設定を編集
          </button>
        </div>

        <div className="p-6">
          {savingsConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <p className="text-sm text-blue-600 font-semibold mb-2">
                  登録時
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {savingsConfig.registrationRate}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                <p className="text-sm text-green-600 font-semibold mb-2">
                  オートシップ
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {savingsConfig.autoshipRate}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <p className="text-sm text-purple-600 font-semibold mb-2">
                  ボーナス
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {savingsConfig.bonusRate}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              設定データがありません
            </p>
          )}
        </div>
      </div>

      {/* 調整金追加モーダル */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">調整金を追加</h3>
            </div>
            <div className="p-6 space-y-4">
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
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  placeholder="例: M001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  金額（円）
                </label>
                <input
                  type="number"
                  value={newAdjustment.amount}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, amount: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  placeholder="10000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  コメント
                </label>
                <textarea
                  value={newAdjustment.comment}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, comment: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  rows={3}
                  placeholder="調整理由など"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newAdjustment.isTaxable}
                  onChange={(e) =>
                    setNewAdjustment({ ...newAdjustment, isTaxable: e.target.checked })
                  }
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  源泉徴収対象とする
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setNewAdjustment({ memberCode: "", amount: "", comment: "", isTaxable: true });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddAdjustment}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 過不足金追加モーダル */}
      {showShortageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">過不足金を追加</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  会員コード
                </label>
                <input
                  type="text"
                  value={newShortage.memberCode}
                  onChange={(e) =>
                    setNewShortage({ ...newShortage, memberCode: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="例: M001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  金額（円）
                </label>
                <input
                  type="number"
                  value={newShortage.amount}
                  onChange={(e) =>
                    setNewShortage({ ...newShortage, amount: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="-5000"
                />
                <p className="mt-1 text-xs text-gray-500">
                  ※ マイナス値で過払い、プラス値で不足
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  コメント
                </label>
                <textarea
                  value={newShortage.comment}
                  onChange={(e) =>
                    setNewShortage({ ...newShortage, comment: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  placeholder="調整理由など"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowShortageModal(false);
                  setNewShortage({ memberCode: "", amount: "", comment: "" });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddShortage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 貯金ボーナス設定編集モーダル */}
      {showSavingsConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                貯金ボーナス設定を編集
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  登録時（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newSavingsConfig.registrationRate}
                  onChange={(e) =>
                    setNewSavingsConfig({
                      ...newSavingsConfig,
                      registrationRate: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  オートシップ（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newSavingsConfig.autoshipRate}
                  onChange={(e) =>
                    setNewSavingsConfig({
                      ...newSavingsConfig,
                      autoshipRate: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ボーナス（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newSavingsConfig.bonusRate}
                  onChange={(e) =>
                    setNewSavingsConfig({
                      ...newSavingsConfig,
                      bonusRate: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowSavingsConfigModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateSavingsConfig}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括アップロードモーダル */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {bulkUploadType === "adjustment" ? "調整金" : "過不足金"}
                一括アップロード
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  データ（CSV形式）
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 font-mono text-sm"
                  rows={12}
                  placeholder={`例:\nM001,10000,特別調整\nM002,-5000,過払い\nM003,3000,追加報酬`}
                />
                <p className="mt-2 text-xs text-gray-500">
                  形式: 会員コード,金額,コメント（1行1件）
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkData("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkUpload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                アップロード
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
