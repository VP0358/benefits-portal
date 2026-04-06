"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Reward {
  id: number;
  rewardMonth: string;
  rewardPoints: number;
  baseMonthlyFee: number;
  rewardRate: number;
  status: string;
  createdAt: string;
}

interface Summary {
  currentMonth: string;
  thisMonthCount: number;
  totalCount: number;
  totalPoints: number;
  rewards: Reward[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  scheduled: { label: "予定",       color: "bg-yellow-100 text-yellow-700" },
  granted:   { label: "付与済",     color: "bg-green-100 text-green-700" },
  canceled:  { label: "キャンセル", color: "bg-gray-100 text-gray-700" },
  reversed:  { label: "取消",       color: "bg-red-100 text-red-700" },
};

export default function ReferralContractsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral/contracts")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center">
        <div className="text-green-700 font-bold text-lg animate-pulse">読み込み中...</div>
      </div>
    );
  }

  const [year, month] = (data?.currentMonth ?? "").split("-");

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-20">

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-green-700 text-xl font-bold">‹</Link>
        <span className="font-bold text-green-900 text-base">📱 直紹介 携帯契約</span>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* 今月カード */}
        <div className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>
          <p className="text-sm font-semibold opacity-90 mb-1">
            {year}年{month}月の契約件数
          </p>
          <p className="text-5xl font-black">
            {data?.thisMonthCount ?? 0}
            <span className="text-xl ml-1 font-bold">件</span>
          </p>
          <p className="text-xs opacity-80 mt-2">※ 毎月末日にリセット</p>
        </div>

        {/* 合計2カード */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-xs font-semibold text-gray-600 mb-1">合計契約人数</p>
            <p className="text-3xl font-black text-gray-800">
              {data?.totalCount ?? 0}
              <span className="text-sm ml-1 text-gray-700">件</span>
            </p>
            <p className="text-[10px] text-gray-700 mt-1">累計（継続保持）</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-xs font-semibold text-gray-600 mb-1">合計予定ポイント</p>
            <p className="text-3xl font-black text-green-700">
              {(data?.totalPoints ?? 0).toLocaleString()}
              <span className="text-sm ml-1 text-green-600">pt</span>
            </p>
            <p className="text-[10px] text-gray-700 mt-1">報酬額の1/4を自動算出</p>
          </div>
        </div>

        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 font-medium leading-relaxed">
          💡 <strong>合計予定ポイントについて</strong><br />
          管理者が設定した携帯契約プランの月額 × 報酬率 の
          <strong>1/4</strong>が紹介者ポイントとして自動計算されます。
        </div>

        {/* 報酬履歴 */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📋 報酬履歴</h2>
          {!data?.rewards.length ? (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm font-medium text-gray-700">まだ契約実績がありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.rewards.map(r => {
                const [ry, rm] = r.rewardMonth.split("-");
                const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.scheduled;
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{ry}年{rm}月</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5">
                        月額 {Number(r.baseMonthlyFee).toLocaleString()}円
                        <span className="text-gray-600 font-normal ml-1">
                          × {(Number(r.rewardRate) * 100).toFixed(1)}%
                        </span>
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-700">予定ポイント</p>
                      <p className="text-xl font-black text-green-700">
                        +{r.rewardPoints.toLocaleString()}
                        <span className="text-xs ml-0.5">pt</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
