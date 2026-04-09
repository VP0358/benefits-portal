"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BonusSettings {
  id: number;
  directBonusAmount: number;
  // LV.1（3段目まで）
  unilevelLv1Rate1: number;
  unilevelLv1Rate2: number;
  unilevelLv1Rate3: number;
  // LV.2（5段目まで）
  unilevelLv2Rate1: number;
  unilevelLv2Rate2: number;
  unilevelLv2Rate3: number;
  unilevelLv2Rate4: number;
  unilevelLv2Rate5: number;
  // LV.3（7段目まで）
  unilevelLv3Rate1: number;
  unilevelLv3Rate2: number;
  unilevelLv3Rate3: number;
  unilevelLv3Rate4: number;
  unilevelLv3Rate5: number;
  unilevelLv3Rate6: number;
  unilevelLv3Rate7: number;
  // LV.4（7段目まで）
  unilevelLv4Rate1: number;
  unilevelLv4Rate2: number;
  unilevelLv4Rate3: number;
  unilevelLv4Rate4: number;
  unilevelLv4Rate5: number;
  unilevelLv4Rate6: number;
  unilevelLv4Rate7: number;
  // LV.5（7段目まで）
  unilevelLv5Rate1: number;
  unilevelLv5Rate2: number;
  unilevelLv5Rate3: number;
  unilevelLv5Rate4: number;
  unilevelLv5Rate5: number;
  unilevelLv5Rate6: number;
  unilevelLv5Rate7: number;
  // 組織構築ボーナス（LV3以上）
  structureLv3Rate: number;
  structureLv4Rate: number;
  structureLv5Rate: number;
  // その他設定
  activeThresholdPoints: number;
  serviceFeeAmount: number;
  minPayoutAmount: number;
}

interface SavingsConfig {
  id: number;
  registrationRate: number;
  autoshipRate: number;
  bonusRate: number;
}

export default function BonusSettingsPage() {
  const [bonusSettings, setBonusSettings] = useState<BonusSettings | null>(null);
  const [savingsConfig, setSavingsConfig] = useState<SavingsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // データ取得
  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bonus-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得エラー");
      setBonusSettings(data.bonusSettings);
      setSavingsConfig(data.savingsConfig);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 保存
  const handleSave = async () => {
    setError("");
    setSuccessMessage("");

    if (!bonusSettings || !savingsConfig) {
      setError("設定データが読み込まれていません");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/bonus-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusSettings, savingsConfig }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存エラー");

      setSuccessMessage("✅ ボーナス設定を保存しました");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 animate-pulse">読み込み中...</p>
      </div>
    );
  }

  if (!bonusSettings || !savingsConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">❌ {error || "設定データの取得に失敗しました"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="text-gray-600 hover:text-gray-800 transition"
            >
              ← 戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-800">⚙️ ボーナス設定</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "💾 保存"}
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 成功メッセージ */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">❌ {error}</p>
          </div>
        )}

        {/* 貯金ボーナス設定 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            💰 貯金ボーナス（SAVpt）設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                登録時ボーナス（%）
              </label>
              <input
                type="number"
                value={savingsConfig.registrationRate}
                onChange={(e) =>
                  setSavingsConfig({
                    ...savingsConfig,
                    registrationRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                新規登録時に付与される貯金ボーナス割合（デフォルト: 20%）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                オートシップボーナス（%）
              </label>
              <input
                type="number"
                value={savingsConfig.autoshipRate}
                onChange={(e) =>
                  setSavingsConfig({
                    ...savingsConfig,
                    autoshipRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                オートシップ決済完了時に付与される割合（デフォルト: 5%）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ボーナス計算時（%）
              </label>
              <input
                type="number"
                value={savingsConfig.bonusRate}
                onChange={(e) =>
                  setSavingsConfig({
                    ...savingsConfig,
                    bonusRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                毎月25日のボーナス計算時に付与される割合（デフォルト: 3%）
              </p>
            </div>
          </div>
        </section>

        {/* ダイレクトボーナス設定 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🎯 ダイレクトボーナス設定
          </h2>
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              直接紹介ボーナス金額（円）
            </label>
            <input
              type="number"
              value={bonusSettings.directBonusAmount}
              onChange={(e) =>
                setBonusSettings({
                  ...bonusSettings,
                  directBonusAmount: parseInt(e.target.value) || 0,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="100"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              直接紹介1名あたりのボーナス金額（デフォルト: ¥2,000）
            </p>
          </div>
        </section>

        {/* ユニレベルボーナス設定（レベル別） */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📊 ユニレベルボーナス設定（レベル別）
          </h2>

          {/* LV.1（3段目まで） */}
          <div className="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="text-md font-bold text-blue-800 mb-3">LV.1（最大3段目まで）</h3>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((step) => {
                const key = `unilevelLv1Rate${step}` as keyof BonusSettings;
                return (
                  <div key={step}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {step}段目（%）
                    </label>
                    <input
                      type="number"
                      value={bonusSettings[key] as number}
                      onChange={(e) =>
                        setBonusSettings({
                          ...bonusSettings,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">デフォルト: 15%, 7%, 3%</p>
          </div>

          {/* LV.2（5段目まで） */}
          <div className="mb-6 border border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-md font-bold text-green-800 mb-3">LV.2（最大5段目まで）</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((step) => {
                const key = `unilevelLv2Rate${step}` as keyof BonusSettings;
                return (
                  <div key={step}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {step}段目（%）
                    </label>
                    <input
                      type="number"
                      value={bonusSettings[key] as number}
                      onChange={(e) =>
                        setBonusSettings({
                          ...bonusSettings,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">デフォルト: 15%, 7%, 3%, 1%, 1%</p>
          </div>

          {/* LV.3（7段目まで） */}
          <div className="mb-6 border border-yellow-200 rounded-lg p-4 bg-yellow-50">
            <h3 className="text-md font-bold text-yellow-800 mb-3">LV.3（最大7段目まで）</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                const key = `unilevelLv3Rate${step}` as keyof BonusSettings;
                return (
                  <div key={step}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {step}段目（%）
                    </label>
                    <input
                      type="number"
                      value={bonusSettings[key] as number}
                      onChange={(e) =>
                        setBonusSettings({
                          ...bonusSettings,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">デフォルト: 15%, 8%, 5%, 4%, 2%, 1%, 1%</p>
          </div>

          {/* LV.4（7段目まで） */}
          <div className="mb-6 border border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="text-md font-bold text-purple-800 mb-3">LV.4（最大7段目まで）</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                const key = `unilevelLv4Rate${step}` as keyof BonusSettings;
                return (
                  <div key={step}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {step}段目（%）
                    </label>
                    <input
                      type="number"
                      value={bonusSettings[key] as number}
                      onChange={(e) =>
                        setBonusSettings({
                          ...bonusSettings,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">デフォルト: 15%, 9%, 6%, 5%, 3%, 2%, 1%</p>
          </div>

          {/* LV.5（7段目まで） */}
          <div className="mb-6 border border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="text-md font-bold text-red-800 mb-3">LV.5（最大7段目まで）</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                const key = `unilevelLv5Rate${step}` as keyof BonusSettings;
                return (
                  <div key={step}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {step}段目（%）
                    </label>
                    <input
                      type="number"
                      value={bonusSettings[key] as number}
                      onChange={(e) =>
                        setBonusSettings({
                          ...bonusSettings,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">デフォルト: 15%, 10%, 7%, 6%, 4%, 3%, 2%</p>
          </div>
        </section>

        {/* 組織構築ボーナス設定（LV3以上） */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🏢 組織構築ボーナス設定（LV3以上）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                LV.3（%）
              </label>
              <input
                type="number"
                value={bonusSettings.structureLv3Rate}
                onChange={(e) =>
                  setBonusSettings({
                    ...bonusSettings,
                    structureLv3Rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                LV.3の組織構築ボーナス割合（デフォルト: 3%）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                LV.4（%）
              </label>
              <input
                type="number"
                value={bonusSettings.structureLv4Rate}
                onChange={(e) =>
                  setBonusSettings({
                    ...bonusSettings,
                    structureLv4Rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                LV.4の組織構築ボーナス割合（デフォルト: 3.5%）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                LV.5（%）
              </label>
              <input
                type="number"
                value={bonusSettings.structureLv5Rate}
                onChange={(e) =>
                  setBonusSettings({
                    ...bonusSettings,
                    structureLv5Rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                LV.5の組織構築ボーナス割合（デフォルト: 4%）
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            💡 LV3以上の会員に適用されます。無制限段数で最小系列売上から計算されます。
          </p>
        </section>

        {/* その他の設定 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            ⚙️ その他の設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                アクティブ判定基準（pt）
              </label>
              <input
                type="number"
                value={bonusSettings.activeThresholdPoints}
                onChange={(e) =>
                  setBonusSettings({
                    ...bonusSettings,
                    activeThresholdPoints: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="10"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                アクティブ会員と判定される最低購入ポイント（デフォルト: 150pt）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                事務手数料（円）
              </label>
              <input
                type="number"
                value={bonusSettings.serviceFeeAmount}
                onChange={(e) =>
                  setBonusSettings({
                    ...bonusSettings,
                    serviceFeeAmount: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="10"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                振込時の事務手数料（デフォルト: ¥440）
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                最低振込額（円）
              </label>
              <input
                type="number"
                value={bonusSettings.minPayoutAmount}
                onChange={(e) =>
                  setBonusSettings({
                    ...bonusSettings,
                    minPayoutAmount: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="100"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                最低振込金額（手数料控除後、デフォルト: ¥2,560）
              </p>
            </div>
          </div>
        </section>

        {/* 注意事項 */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-sm font-bold text-yellow-800 mb-2">⚠️ 注意事項</h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• ボーナス設定の変更は、次回以降のボーナス計算に反映されます</li>
            <li>• 既に計算済みのボーナスには影響しません</li>
            <li>• 貯金ボーナスの割合変更は、次回付与時から適用されます</li>
            <li>• 一度付与された貯金ポイントは変更できません</li>
            <li>• ユニレベルボーナスの報酬段数は会員レベルにより異なります（LV1=3段、LV2=5段、LV3‑5=7段）</li>
          </ul>
        </section>

        {/* 保存ボタン（下部） */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? "保存中..." : "💾 設定を保存"}
          </button>
        </div>
      </main>
    </div>
  );
}
