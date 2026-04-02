"use client";

import { useState } from "react";

type Contract = {
  id:          string;
  userName:    string;
  memberCode:  string;
  planName:    string;
  monthlyFee:  number;
  reward:      number;
  confirmedAt: string | null;
};
type Data = {
  year:            number;
  month:           number;
  thisMonthCount:  number;
  totalCount:      number;
  thisMonthFee:    number;
  thisMonthReward: number;
  contracts:       Contract[];
};

const MONTH_NAMES = ["1","2","3","4","5","6","7","8","9","10","11","12"];

export default function ReferralContractsButton() {
  const [open,    setOpen]    = useState(false);
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (data) return; // キャッシュ済みなら再フェッチしない
    setLoading(true);
    const res = await fetch("/api/my/referral-contracts");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  return (
    <>
      {/* ボタン */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">📱</div>
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-800">今月の直紹介 携帯契約</div>
            <div className="text-xs text-slate-400 mt-0.5">直紹介した会員の今月の契約件数</div>
          </div>
        </div>
        <div className="text-slate-400 text-lg">›</div>
      </button>

      {/* モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-800">📱 直紹介 携帯契約状況</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-slate-400">読み込み中...</div>
            ) : !data ? (
              <div className="py-10 text-center text-slate-400">データを取得できませんでした</div>
            ) : (
              <>
                {/* 今月サマリー */}
                <div className="rounded-2xl bg-blue-50 p-4 mb-5">
                  <div className="text-xs text-blue-600 font-semibold mb-3">
                    {data.year}年{MONTH_NAMES[data.month - 1]}月 実績
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3 text-center">
                      <div className="text-xs text-slate-400 mb-1">今月の新規契約</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {data.thisMonthCount}<span className="text-sm font-normal ml-0.5">件</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-center">
                      <div className="text-xs text-slate-400 mb-1">累計有効契約</div>
                      <div className="text-2xl font-bold text-slate-700">
                        {data.totalCount}<span className="text-sm font-normal ml-0.5">件</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-center">
                      <div className="text-xs text-slate-400 mb-1">今月 合計契約額</div>
                      <div className="text-lg font-bold text-slate-700">
                        ¥{data.thisMonthFee.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-center">
                      <div className="text-xs text-slate-400 mb-1">今月 報酬見込み（1/4）</div>
                      <div className="text-lg font-bold text-emerald-600">
                        ¥{data.thisMonthReward.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 契約明細 */}
                {data.contracts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-slate-400 text-sm">
                    今月の新規契約はまだありません
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 mb-2">今月の契約明細</div>
                    {data.contracts.map(c => (
                      <div key={c.id} className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-700">{c.userName}</div>
                            <div className="text-xs text-slate-400">{c.memberCode}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">{c.planName}</div>
                            <div className="text-sm font-bold text-slate-700">¥{c.monthlyFee.toLocaleString()}</div>
                            <div className="text-xs font-bold text-emerald-600">報酬 ¥{c.reward.toLocaleString()}</div>
                          </div>
                        </div>
                        {c.confirmedAt && (
                          <div className="mt-1 text-xs text-slate-400">
                            確定日: {new Date(c.confirmedAt).toLocaleDateString("ja-JP")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-400 text-center">
                  ※ 報酬は月額の1/4。実際の支払いは管理者にお問い合わせください。
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
