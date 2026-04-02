"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const REWARD_RATE = 0.25;

type PlanStat = {
  planName:  string;
  count:     number;
  totalFee:  number;
  reward:    number;
};
type ContractDetail = {
  contractId:          string;
  contractedUserId:    string;
  contractedUserCode:  string;
  contractedUserName:  string;
  planName:            string;
  monthlyFee:          number;
  reward:              number;
  confirmedAt:         string;
};
type ReferrerEntry = {
  referrerId:    string;
  referrerCode:  string;
  referrerName:  string;
  contractCount: number;
  totalFee:      number;
  totalReward:   number;
  planStats:     PlanStat[];
  contracts:     ContractDetail[];
};
type ApiResult = {
  year:           number | null;
  month:          number | null;
  totalReferrers: number;
  totalContracts: number;
  totalFee:       number;
  totalReward:    number;
  referrers:      ReferrerEntry[];
};

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function ReferralRewardsPanel() {
  const now       = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [allTime, setAllTime] = useState(false);
  const [data,  setData]  = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const q = allTime ? "" : `?year=${year}&month=${month}`;
    const res = await fetch(`/api/admin/referral-rewards${q}`);
    const json = await res.json();
    setData(json);
    // デフォルトで全員展開
    setOpenIds(new Set(json.referrers.map((r: ReferrerEntry) => r.referrerId)));
    setLoading(false);
  }, [year, month, allTime]);

  useEffect(() => { load(); }, [load]);

  function toggleOpen(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // 年の選択肢（過去3年）
  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const periodLabel = allTime
    ? "全期間"
    : `${year}年${month}月`;

  return (
    <div className="space-y-5">

      {/* ── 月選択コントロール ── */}
      <div className="rounded-2xl bg-white border p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-600">集計期間：</span>

        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="checkbox" checked={allTime} onChange={e => setAllTime(e.target.checked)} />
          全期間
        </label>

        {!allTime && (
          <>
            <select
              className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((label, i) => (
                <option key={i + 1} value={i + 1}>{label}</option>
              ))}
            </select>
          </>
        )}

        <button
          onClick={load}
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          再読み込み
        </button>
      </div>

      {/* ── サマリーカード ── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <div className="text-xs text-emerald-600 font-medium mb-1">紹介者数</div>
            <div className="text-2xl font-bold text-emerald-700">{data.totalReferrers}<span className="text-sm font-normal ml-0.5">名</span></div>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4 text-center">
            <div className="text-xs text-blue-600 font-medium mb-1">対象契約件数</div>
            <div className="text-2xl font-bold text-blue-700">{data.totalContracts}<span className="text-sm font-normal ml-0.5">件</span></div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <div className="text-xs text-slate-500 font-medium mb-1">合計契約プラン額</div>
            <div className="text-2xl font-bold text-slate-700">¥{data.totalFee.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-center">
            <div className="text-xs text-amber-600 font-medium mb-1">報酬合計（×1/4）</div>
            <div className="text-2xl font-bold text-amber-700">¥{data.totalReward.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* ── 一覧 ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">読み込み中...</div>
      ) : !data || data.referrers.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-sm">
          <div className="text-4xl mb-3">📭</div>
          <div className="font-medium">{periodLabel} の報酬対象データがありません</div>
          <div className="text-sm mt-1">携帯契約に「確定日」を設定すると表示されます</div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.referrers.map((r, idx) => (
            <div key={r.referrerId} className="rounded-3xl bg-white shadow-sm overflow-hidden border border-slate-100">

              {/* ── 紹介者ヘッダー ── */}
              <button
                onClick={() => toggleOpen(r.referrerId)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* 順位バッジ */}
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-slate-200 text-slate-600" :
                      idx === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <Link
                        href={`/admin/users/${r.referrerId}`}
                        onClick={e => e.stopPropagation()}
                        className="font-bold text-slate-800 hover:text-emerald-600 transition-colors text-base"
                      >
                        {r.referrerName}
                      </Link>
                      <div className="text-xs text-slate-400">{r.referrerCode}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* 件数 */}
                    <div className="text-center hidden sm:block">
                      <div className="text-xs text-slate-400 mb-0.5">直紹介件数</div>
                      <div className="text-lg font-bold text-blue-700">{r.contractCount}<span className="text-xs font-normal ml-0.5">件</span></div>
                    </div>
                    {/* 合計プラン額 */}
                    <div className="text-center hidden md:block">
                      <div className="text-xs text-slate-400 mb-0.5">合計契約額</div>
                      <div className="text-lg font-bold text-slate-700">¥{r.totalFee.toLocaleString()}</div>
                    </div>
                    {/* 報酬額 */}
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-0.5">報酬額（1/4）</div>
                      <div className="text-xl font-bold text-emerald-600">¥{r.totalReward.toLocaleString()}</div>
                    </div>
                    {/* 展開ボタン */}
                    <div className={`text-slate-400 text-lg transition-transform duration-200 ${openIds.has(r.referrerId) ? "rotate-180" : ""}`}>
                      ▾
                    </div>
                  </div>
                </div>
              </button>

              {/* ── 展開：プラン統計 + 契約明細 ── */}
              {openIds.has(r.referrerId) && (
                <div className="border-t border-slate-100">

                  {/* プラン統計サマリー */}
                  <div className="px-6 py-4 bg-slate-50/60">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      📊 直紹介者の契約プラン統計
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-400">
                            <th className="text-left pb-2 font-medium">プラン名</th>
                            <th className="text-right pb-2 font-medium">件数</th>
                            <th className="text-right pb-2 font-medium">月額（1件）</th>
                            <th className="text-right pb-2 font-medium">プラン合計額</th>
                            <th className="text-right pb-2 font-medium">報酬小計（×1/4）</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.planStats.map(p => (
                            <tr key={p.planName} className="border-t border-slate-100">
                              <td className="py-2 font-medium text-slate-700">{p.planName}</td>
                              <td className="py-2 text-right text-blue-700 font-bold">{p.count}件</td>
                              <td className="py-2 text-right text-slate-500">
                                ¥{p.count > 0 ? (p.totalFee / p.count).toLocaleString() : 0}
                              </td>
                              <td className="py-2 text-right text-slate-700 font-medium">
                                ¥{p.totalFee.toLocaleString()}
                              </td>
                              <td className="py-2 text-right font-bold text-emerald-600">
                                ¥{p.reward.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200">
                          <tr className="bg-emerald-50/60">
                            <td className="py-2 font-bold text-slate-700">合計</td>
                            <td className="py-2 text-right font-bold text-blue-700">{r.contractCount}件</td>
                            <td className="py-2"></td>
                            <td className="py-2 text-right font-bold text-slate-700">¥{r.totalFee.toLocaleString()}</td>
                            <td className="py-2 text-right font-bold text-emerald-600 text-base">
                              ¥{r.totalReward.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 契約明細 */}
                  <div className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      📋 契約明細（直紹介した会員一覧）
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-400 border-b border-slate-100">
                            <th className="text-left pb-2 font-medium">会員名</th>
                            <th className="text-left pb-2 font-medium">プラン</th>
                            <th className="text-right pb-2 font-medium">月額</th>
                            <th className="text-right pb-2 font-medium">報酬（×1/4）</th>
                            <th className="text-left pb-2 font-medium">確定日</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {r.contracts.map(c => (
                            <tr key={c.contractId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5">
                                <Link
                                  href={`/admin/users/${c.contractedUserId}`}
                                  className="font-medium text-slate-700 hover:text-emerald-600"
                                >
                                  {c.contractedUserName}
                                </Link>
                                <span className="ml-2 text-xs text-slate-400">{c.contractedUserCode}</span>
                              </td>
                              <td className="py-2.5 text-slate-600">{c.planName}</td>
                              <td className="py-2.5 text-right text-slate-700 font-medium">
                                ¥{c.monthlyFee.toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right font-bold text-emerald-600">
                                ¥{c.reward.toLocaleString()}
                              </td>
                              <td className="py-2.5 text-xs text-slate-500">
                                {new Date(c.confirmedAt).toLocaleDateString("ja-JP")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 注記 */}
      <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-400 space-y-1">
        <div>※ 対象：ステータスが「有効」かつ「確定日」が設定された携帯契約のみ</div>
        <div>※ 報酬額 = 合計契約プラン額 × {(REWARD_RATE * 100).toFixed(0)}%（月額の1/4、小数点以下切り捨て）</div>
        <div>※ 紹介関係は直紹介（isActive = true）のみ対象</div>
      </div>
    </div>
  );
}
