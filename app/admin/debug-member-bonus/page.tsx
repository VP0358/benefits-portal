"use client";
import { useState } from "react";

type DebugData = {
  member: {
    memberCode: string;
    name: string;
    status: string;
    currentLevel: number;
    conditionAchieved: boolean;
    forcedLevel: number;
    referrer: { memberCode: string; name: string } | null;
    upline: { memberCode: string; name: string } | null;
  };
  bonusMonth: string;
  selfPurchase: {
    total: number;
    products: {
      productCode: string;
      productName: string;
      points: number;
      totalPoints: number;
      purchaseStatus: string;
      orderType: string | null;
      paymentStatus: string | null;
    }[];
  };
  directReferrals: {
    total: number;
    activeCount: number;
    newPositionCount: number;
    members: {
      memberCode: string;
      name: string;
      status: string;
      selfPurchasePoints: number;
      isActive: boolean;
      newProductPts: number;
      purchaseCount: number;
    }[];
  };
  bonusRuns: {
    id: number;
    bonusMonth: string;
    status: string;
    totalMembers: number;
    totalActiveMembers: number;
    totalBonusAmount: number;
    createdAt: string;
  }[];
  bonusResults: {
    bonusRunId: number;
    bonusMonth: string;
    runStatus: string;
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
    carryoverAmount: number;
    adjustmentAmount: number;
    otherPositionAmount: number;
    bonusTotal: number;
    amountBeforeAdjustment: number;
    finalAmount: number;
    consumptionTax: number;
    withholdingTax: number;
    shortageAmount: number;
    paymentAmount: number;
    savingsPointsAdded: number;
    groupActiveCount: number;
    minLinePoints: number;
    lineCount: number;
    unilevelDetail: Record<string, number> | null;
  }[];
  violaPureReference: {
    directActiveCount: number;
    newPt: number;
    continuePt: number;
    totalPt: number;
    newPositionCount: number;
    newO1PositionCount: number;
    currentPositionCount: number;
    currentO1PositionCount: number;
  };
  analysis: {
    description: string;
    directActiveCountMatch: boolean;
    ourDirectActiveCount: number;
    theirDirectActiveCount: number;
  };
};

function Cell({ label, ours, theirs }: { label: string; ours: string | number; theirs: string | number }) {
  const match = String(ours) === String(theirs);
  return (
    <tr className={match ? "bg-green-50" : "bg-red-50"}>
      <td className="px-4 py-2 text-sm font-medium text-gray-700 border">{label}</td>
      <td className={`px-4 py-2 text-sm font-bold border text-center ${match ? "text-green-700" : "text-red-700"}`}>{ours}</td>
      <td className="px-4 py-2 text-sm border text-center text-gray-500">{theirs}</td>
      <td className="px-4 py-2 text-center border">{match ? "✅" : "❌ 不一致"}</td>
    </tr>
  );
}

export default function DebugMemberBonusPage() {
  const [memberCode, setMemberCode] = useState("89248801");
  const [bonusMonth, setBonusMonth] = useState("2026-04");
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_data = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/debug-member-bonus?memberCode=${memberCode}&bonusMonth=${bonusMonth}`);
      if (!res.ok) {
        const e = await res.json();
        setError(e.error || "エラーが発生しました");
        return;
      }
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const br = data?.bonusResults[0]; // 最新のBonusResult
  const ref = data?.violaPureReference;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔍 ボーナス計算デバッグ</h1>
        <p className="text-sm text-gray-500 mt-1">viola-pure.biz との数値比較・原因調査ツール</p>
      </div>

      {/* 検索フォーム */}
      <div className="flex gap-3 items-end bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">会員コード</label>
          <input
            value={memberCode}
            onChange={e => setMemberCode(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">対象月</label>
          <input
            value={bonusMonth}
            onChange={e => setBonusMonth(e.target.value)}
            placeholder="2026-04"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetch_data}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "取得中..." : "取得"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {data && (
        <div className="space-y-6">

          {/* 会員情報 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-3">👤 会員情報</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">名前:</span> <span className="font-semibold">{data.member.name}</span></div>
              <div><span className="text-gray-500">コード:</span> <span className="font-mono">{data.member.memberCode}</span></div>
              <div><span className="text-gray-500">ステータス:</span> <span className="font-semibold">{data.member.status}</span></div>
              <div><span className="text-gray-500">条件達成:</span> <span>{data.member.conditionAchieved ? "✅" : "❌"}</span></div>
              <div><span className="text-gray-500">現在LV:</span> <span>{data.member.currentLevel}</span></div>
              <div><span className="text-gray-500">強制LV:</span> <span>{data.member.forcedLevel}</span></div>
              <div><span className="text-gray-500">紹介者:</span> <span className="font-mono">{data.member.referrer?.memberCode} {data.member.referrer?.name}</span></div>
              <div><span className="text-gray-500">直上者:</span> <span className="font-mono">{data.member.upline?.memberCode} {data.member.upline?.name}</span></div>
            </div>
          </section>

          {/* viola-pure.biz との比較表 */}
          {br && ref && (
            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-indigo-600 text-white px-4 py-3">
                <h2 className="font-bold">📊 viola-pure.biz との比較（{data.bonusMonth}）</h2>
                <p className="text-xs text-indigo-200 mt-0.5">左: 当システム | 右: viola-pure.biz（参照）</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 border">項目</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-blue-600 border">当システム</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 border">viola-pure.biz</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 border">一致</th>
                  </tr>
                </thead>
                <tbody>
                  <Cell label="アクティブ判定" ours={br.isActive ? "アクティブ" : "非アクティブ"} theirs="アクティブ（推定）" />
                  <Cell label="直アクティブ数" ours={br.directActiveCount} theirs={ref.directActiveCount} />
                  <Cell label="グループPT（合計）" ours={br.groupPoints} theirs={ref.totalPt} />
                  <Cell label="自己購入PT" ours={br.selfPurchasePoints} theirs="150（推定）" />
                  <Cell label="達成レベル" ours={br.achievedLevel} theirs="－" />
                  <Cell label="ダイレクトB" ours={`¥${br.directBonus.toLocaleString()}`} theirs="－" />
                  <Cell label="ユニレベルB" ours={`¥${br.unilevelBonus.toLocaleString()}`} theirs="－" />
                  <Cell label="組織構築B" ours={`¥${br.structureBonus.toLocaleString()}`} theirs="－" />
                  <Cell label="ボーナス合計" ours={`¥${br.bonusTotal.toLocaleString()}`} theirs="－" />
                  <Cell label="最終支払額" ours={`¥${br.paymentAmount.toLocaleString()}`} theirs="－" />
                </tbody>
              </table>
            </section>
          )}

          {/* viola-pure.biz 参照値 */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h2 className="font-bold text-amber-800 mb-3">📋 viola-pure.biz 前月（4月）ポイント状況</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">直アクティブ数</p>
                <p className="text-xl font-bold text-amber-700">{ref?.directActiveCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">新規PT</p>
                <p className="text-xl font-bold text-amber-700">{ref?.newPt.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">継続PT</p>
                <p className="text-xl font-bold text-amber-700">{ref?.continuePt.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">合計PT</p>
                <p className="text-xl font-bold text-amber-700">{ref?.totalPt.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">新規ポジション数</p>
                <p className="text-xl font-bold text-amber-700">{ref?.newPositionCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">新規01ポジション数</p>
                <p className="text-xl font-bold text-amber-700">{ref?.newO1PositionCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">現在のポジション数</p>
                <p className="text-xl font-bold text-amber-700">{ref?.currentPositionCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-gray-500">現在のO1ポジション数</p>
                <p className="text-xl font-bold text-amber-700">{ref?.currentO1PositionCount}</p>
              </div>
            </div>
          </section>

          {/* 自己購買データ */}
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-3">🛒 {data.bonusMonth} 自己購買データ（合計: {data.selfPurchase.total}pt）</h2>
            {data.selfPurchase.products.length === 0 ? (
              <p className="text-sm text-red-500">❌ 購買データなし</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 border">商品コード</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 border">商品名</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 border">PT</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500 border">合計PT</th>
                    <th className="px-3 py-2 text-center text-xs text-gray-500 border">ステータス</th>
                    <th className="px-3 py-2 text-center text-xs text-gray-500 border">注文種別</th>
                  </tr>
                </thead>
                <tbody>
                  {data.selfPurchase.products.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border font-mono">{p.productCode}</td>
                      <td className="px-3 py-2 border">{p.productName}</td>
                      <td className="px-3 py-2 border text-right">{p.points}</td>
                      <td className="px-3 py-2 border text-right font-semibold">{p.totalPoints}</td>
                      <td className="px-3 py-2 border text-center">{p.purchaseStatus}</td>
                      <td className="px-3 py-2 border text-center">{p.orderType ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 直下紹介者一覧 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-1">
              👥 直下紹介者（referrerId = {memberCode}）
              <span className="ml-2 text-sm font-normal text-gray-500">
                {data.directReferrals.total}名中 アクティブ
                <span className={`ml-1 font-bold ${data.directReferrals.activeCount === ref?.directActiveCount ? "text-green-600" : "text-red-600"}`}>
                  {data.directReferrals.activeCount}名
                </span>
                {data.directReferrals.activeCount !== ref?.directActiveCount && (
                  <span className="ml-2 text-red-500 text-xs">（viola-pure.biz: {ref?.directActiveCount}名 ❌）</span>
                )}
              </span>
            </h2>
            <table className="w-full text-sm mt-3">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 border">会員コード</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 border">名前</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 border">ステータス</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500 border">当月購入PT</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 border">アクティブ</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500 border">新規商品PT</th>
                </tr>
              </thead>
              <tbody>
                {data.directReferrals.members.map(r => (
                  <tr key={r.memberCode} className={r.isActive ? "bg-green-50" : "bg-gray-50"}>
                    <td className="px-3 py-2 border font-mono text-xs">{r.memberCode}</td>
                    <td className="px-3 py-2 border">{r.name}</td>
                    <td className="px-3 py-2 border text-center text-xs">{r.status}</td>
                    <td className="px-3 py-2 border text-right font-semibold">{r.selfPurchasePoints}</td>
                    <td className="px-3 py-2 border text-center">{r.isActive ? "✅" : "❌"}</td>
                    <td className="px-3 py-2 border text-right">{r.newProductPts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* BonusResult 詳細 */}
          {data.bonusResults.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-bold text-gray-800 mb-3">📊 BonusResult 詳細（{data.bonusMonth}）</h2>
              {data.bonusResults.map(br => (
                <div key={br.bonusRunId} className="mb-4 border rounded-xl overflow-hidden">
                  <div className="bg-slate-700 text-white px-4 py-2 text-sm font-semibold">
                    BonusRun ID: {br.bonusRunId} （{br.runStatus}）
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
                    {[
                      ["アクティブ", br.isActive ? "✅" : "❌"],
                      ["自己購入PT", `${br.selfPurchasePoints}pt`],
                      ["グループPT", `${br.groupPoints}pt`],
                      ["直下アクティブ", `${br.directActiveCount}名`],
                      ["達成LV", br.achievedLevel],
                      ["前回称号LV", br.previousTitleLevel],
                      ["新称号LV", br.newTitleLevel],
                      ["グループアクティブ", `${br.groupActiveCount}名`],
                      ["ダイレクトB", `¥${br.directBonus.toLocaleString()}`],
                      ["ユニレベルB", `¥${br.unilevelBonus.toLocaleString()}`],
                      ["組織構築B", `¥${br.structureBonus.toLocaleString()}`],
                      ["繰越金", `¥${br.carryoverAmount.toLocaleString()}`],
                      ["調整金", `¥${br.adjustmentAmount.toLocaleString()}`],
                      ["他ポジション", `¥${br.otherPositionAmount.toLocaleString()}`],
                      ["ボーナス合計", `¥${br.bonusTotal.toLocaleString()}`],
                      ["調整前取得額", `¥${br.amountBeforeAdjustment.toLocaleString()}`],
                      ["最終取得額", `¥${br.finalAmount.toLocaleString()}`],
                      ["消費税(内)", `¥${br.consumptionTax.toLocaleString()}`],
                      ["源泉税", `¥${br.withholdingTax.toLocaleString()}`],
                      ["過不足金", `¥${br.shortageAmount.toLocaleString()}`],
                      ["最終支払額", `¥${br.paymentAmount.toLocaleString()}`],
                      ["貯金PT追加", `${br.savingsPointsAdded}pt`],
                      ["最小系列PT", `${br.minLinePoints}pt`],
                      ["系列数", `${br.lineCount}`],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                  {br.unilevelDetail && (
                    <div className="bg-blue-50 px-4 py-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">ユニレベル段別詳細:</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(br.unilevelDetail).sort((a, b) => Number(a[0]) - Number(b[0])).map(([depth, pts]) => (
                          <span key={depth} className="text-xs bg-white border border-blue-200 rounded px-2 py-1">
                            {depth}段目: ¥{Number(pts).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {data.bonusResults.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 font-semibold">❌ {data.bonusMonth} の BonusResult が存在しません</p>
              <p className="text-sm text-red-500 mt-1">ボーナス計算ページで {data.bonusMonth} を再計算してください</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
