"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PointsCheckClientProps {
  userName: string;
  memberCode: string;
  availablePoints: number;
}

interface DashboardPoints {
  mlmLastMonthPoints: number;
  mlmCurrentMonthPoints: number;
  savingsBonusPoints: number;
  mobileReferralPoints: number;
}

export default function PointsCheckClient({
  userName,
  memberCode,
  availablePoints
}: PointsCheckClientProps) {
  const [points, setPoints] = useState<DashboardPoints>({
    mlmLastMonthPoints: 0,
    mlmCurrentMonthPoints: 0,
    savingsBonusPoints: 0,
    mobileReferralPoints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my/dashboard-points")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setPoints(data);
        }
      })
      .catch(err => console.error('ポイント取得エラー:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalPoints = 
    points.mlmLastMonthPoints +
    points.mlmCurrentMonthPoints +
    points.savingsBonusPoints +
    points.mobileReferralPoints;

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-10">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-green-600 flex items-center gap-1 text-sm font-medium hover:text-green-700">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-green-800">⭐ ポイント確認</h1>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-5">
        {/* ユーザー情報カード */}
        <div className="bg-gradient-to-br from-green-500 to-green-400 rounded-2xl p-5 text-white shadow-lg">
          <div className="mb-3">
            <p className="text-sm opacity-90 font-medium">会員情報</p>
            <p className="text-xl font-bold">{userName} さん</p>
            <p className="text-xs opacity-80">会員コード：{memberCode}</p>
          </div>
        </div>

        {/* 利用可能ポイント */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium mb-2">利用可能ポイント</p>
            <p className="text-4xl font-bold text-green-600 mb-1">
              {availablePoints.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">ポイント</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow">
            <p className="text-gray-500 text-sm">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* ポイント内訳 */}
            <div className="bg-white rounded-2xl p-5 shadow space-y-4">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2">
                📊 ポイント内訳
              </h2>

              {/* MLM先月ポイント */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-purple-800">MLM先月ポイント</p>
                  <p className="text-xs text-gray-600">前月の購入実績</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">
                    {points.mlmLastMonthPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-500 font-medium">VPpt</p>
                </div>
              </div>

              {/* MLM今月ポイント */}
              <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-pink-800">MLM今月ポイント</p>
                  <p className="text-xs text-gray-600">今月（昨日まで）の購入実績</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-pink-600">
                    {points.mlmCurrentMonthPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-pink-500 font-medium">VPpt</p>
                </div>
              </div>

              {/* 貯金ボーナスポイント */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-blue-800">貯金ボーナスポイント</p>
                  <p className="text-xs text-gray-600">自動積立・達成ボーナス</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {points.savingsBonusPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">SAVpt</p>
                </div>
              </div>

              {/* 携帯紹介ポイント */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-orange-800">携帯紹介ポイント</p>
                  <p className="text-xs text-gray-600">VP未来phone契約紹介</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">
                    {points.mobileReferralPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-orange-500 font-medium">MPIpt</p>
                </div>
              </div>
            </div>

            {/* 合計ポイント */}
            <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-2xl p-5 text-white shadow-lg">
              <div className="text-center">
                <p className="text-sm opacity-90 font-medium mb-2">今月の獲得ポイント合計</p>
                <p className="text-5xl font-bold mb-1">
                  {totalPoints.toLocaleString()}
                </p>
                <p className="text-xs opacity-80">ポイント</p>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2">
              <p className="font-bold text-gray-700">📌 ポイントについて</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>VPpt: MLM購入実績（100円 = 1pt）</li>
                <li>SAVpt: 貯金ボーナス（自動積立・達成報酬）</li>
                <li>MPIpt: 携帯紹介ポイント（1契約 = 1,000pt）</li>
                <li>利用可能ポイントは福利厚生サービスで使用できます</li>
              </ul>
            </div>
          </>
        )}

        {/* アクションボタン */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/points/use"
            className="bg-green-500 text-white font-bold py-3 rounded-xl text-center hover:bg-green-600 transition shadow">
            💎 ポイントを使う
          </Link>
          <Link href="/points/history"
            className="bg-blue-500 text-white font-bold py-3 rounded-xl text-center hover:bg-blue-600 transition shadow">
            📊 ポイント履歴
          </Link>
        </div>
      </main>
    </div>
  );
}
