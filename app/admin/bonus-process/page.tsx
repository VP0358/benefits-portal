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
};

type SavingsBonusConfig = {
  registrationRate: number;
  autoshipRate: number;
  bonusRate: number;
};

export default function BonusProcessPage() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [bonusRun, setBonusRun] = useState<BonusRunInfo | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [shortagePayments, setShortagePayments] = useState<AdjustmentRow[]>([]);
  const [savingsConfig, setSavingsConfig] = useState<SavingsBonusConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // データ取得
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);

    // ボーナス実行情報取得（簡易版 - 後でAPI実装）
    fetch(`/api/admin/bonus-runs?month=${selectedMonth}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.length > 0) {
          setBonusRun(data[0]);
        } else {
          setBonusRun(null);
        }
      })
      .catch(() => setBonusRun(null))
      .finally(() => setLoading(false));

    // 調整金取得（ダミーデータ）
    setAdjustments([]);
    // 過不足金取得（ダミーデータ）
    setShortagePayments([]);
  }, [selectedMonth]);

  // 貯金ボーナス設定取得
  useEffect(() => {
    fetch("/api/admin/savings-bonus-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSavingsConfig(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-calculator mr-2"></i>
          ボーナス計算処理
        </h1>
        <p className="mt-2 text-gray-600">
          ボーナス計算の管理、調整金・過不足金・貯金ボーナスの設定
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

      {/* ボーナス計算情報 */}
      {bonusRun && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">ボーナス計算情報</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">ステータス</div>
              <div className="text-lg font-semibold text-gray-800">
                {bonusRun.status === "confirmed" ? "✅ 確定済み" : 
                 bonusRun.status === "draft" ? "📝 下書き" : "❌ 取消"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">支払い調整率</div>
              <div className="text-lg font-semibold text-gray-800">
                {bonusRun.paymentAdjustmentRate !== null
                  ? `${bonusRun.paymentAdjustmentRate}%`
                  : "未設定"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">総ボーナス額</div>
              <div className="text-lg font-semibold text-gray-800">
                ¥{bonusRun.totalBonusAmount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">取得者数</div>
              <div className="text-lg font-semibold text-gray-800">
                {bonusRun.totalMembers}人
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled
            >
              <i className="fas fa-calculator mr-2"></i>
              ボーナス計算（未実装）
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              disabled
            >
              <i className="fas fa-trash mr-2"></i>
              削除（未実装）
            </button>
          </div>
        </div>
      )}

      {!loading && !bonusRun && (
        <div className="bg-yellow-50 rounded-lg p-4 text-center text-yellow-700">
          {selectedMonth}のボーナス計算データがありません。
        </div>
      )}

      {/* 調整金入力 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          <i className="fas fa-edit mr-2"></i>
          調整金入力
        </h2>
        <p className="text-sm text-gray-600">
          手動入力またはExcelアップロードで調整金を登録（現在は表示のみ）
        </p>

        {adjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">会員ID</th>
                  <th className="px-4 py-2 text-left">法人名</th>
                  <th className="px-4 py-2 text-left">名前</th>
                  <th className="px-4 py-2 text-right">金額</th>
                  <th className="px-4 py-2 text-left">コメント</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{row.memberCode}</td>
                    <td className="px-4 py-2">{row.companyName || "-"}</td>
                    <td className="px-4 py-2">{row.memberName}</td>
                    <td className="px-4 py-2 text-right">¥{row.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">{row.comment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">調整金データがありません</div>
        )}

        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-plus mr-2"></i>
            新規登録（未実装）
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-upload mr-2"></i>
            Excelアップロード（未実装）
          </button>
        </div>
      </div>

      {/* 過不足金入力（源泉対象外） */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          <i className="fas fa-balance-scale mr-2"></i>
          過不足金入力（源泉対象外）
        </h2>
        <p className="text-sm text-gray-600">
          手動入力またはExcelアップロードで過不足金を登録（現在は表示のみ）
        </p>

        {shortagePayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">会員ID</th>
                  <th className="px-4 py-2 text-left">法人名</th>
                  <th className="px-4 py-2 text-left">名前</th>
                  <th className="px-4 py-2 text-right">金額</th>
                  <th className="px-4 py-2 text-left">コメント</th>
                </tr>
              </thead>
              <tbody>
                {shortagePayments.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{row.memberCode}</td>
                    <td className="px-4 py-2">{row.companyName || "-"}</td>
                    <td className="px-4 py-2">{row.memberName}</td>
                    <td className="px-4 py-2 text-right">¥{row.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">{row.comment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">過不足金データがありません</div>
        )}

        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-plus mr-2"></i>
            新規登録（未実装）
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled
          >
            <i className="fas fa-upload mr-2"></i>
            Excelアップロード（未実装）
          </button>
        </div>
      </div>

      {/* 貯金ボーナス設定 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          <i className="fas fa-piggy-bank mr-2"></i>
          貯金ボーナス設定
        </h2>
        {savingsConfig ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-700 font-medium">登録時</div>
              <div className="text-2xl font-bold text-blue-900">{savingsConfig.registrationRate}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-700 font-medium">オートシップ</div>
              <div className="text-2xl font-bold text-green-900">{savingsConfig.autoshipRate}%</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-700 font-medium">ボーナス</div>
              <div className="text-2xl font-bold text-purple-900">{savingsConfig.bonusRate}%</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">設定を読み込み中...</div>
        )}

        <button
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          disabled
        >
          <i className="fas fa-cog mr-2"></i>
          設定変更（未実装）
        </button>
      </div>
    </main>
  );
}
