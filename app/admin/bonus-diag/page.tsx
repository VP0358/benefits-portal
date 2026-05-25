"use client";
import { useState } from "react";

type DirectMember = {
  memberCode: string;
  name: string;
  status: string;
  selfPurchasePoints: number;
  newPt: number;
  continuePt: number;
  isActive: boolean;
  isO1Position: boolean;
  purchaseCount: number;
};

type BonusResultItem = {
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
};

type DebugData = {
  member: {
    memberCode: string;
    name: string;
    status: string;
    currentLevel: number;
    conditionAchieved: boolean;
    forcedLevel: number | null;
    referrer: { memberCode: string; name: string } | null;
    upline: { memberCode: string; name: string } | null;
  };
  bonusMonth: string;
  selfPurchase: {
    total: number;
    newPt: number;
    continuePt: number;
    products: {
      productCode: string;
      productName: string;
      points: number;
      totalPoints: number;
      quantity: number;
      purchaseStatus: string;
      orderType: string | null;
      slipType: string | null;
      paymentStatus: string | null;
    }[];
  };
  directReferrals: {
    total: number;
    activeCount: number;
    newPositionCount: number;
    newO1PositionCount: number;
    members: DirectMember[];
  };
  groupPointEstimate: {
    selfPt: number;
    subtreePt: number;
    estimatedGP: number;
    breakdown: { productCode: string; totalPts: number; memberCount: number }[];
    note: string;
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
  bonusResults: BonusResultItem[];
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
    directActive: { ours: number; theirs: number; match: boolean };
    newPositionCount: { ours: number; theirs: number; match: boolean };
    groupPoints: { oursBonusResult: number | null; estimatedGP: number; theirs: number; bonusResultMatch: boolean | null };
    selfPurchase: { ours: number; isActive: boolean };
  };
};

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function OkBadge({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ 一致</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">✗ 不一致</span>;
}

export default function BonusDiagPage() {
  const [memberCode, setMemberCode] = useState("89248801");
  const [bonusMonth, setBonusMonth] = useState("2026-04");
  const [data, setData] = useState<DebugData | null>(null);
  const [rawJson, setRawJson] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<"visual" | "raw">("visual");

  const fetchDebug = async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(
        `/api/admin/debug-member-bonus?memberCode=${memberCode}&bonusMonth=${bonusMonth}`
      );
      const json = await res.json();
      if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
      setData(json);
      setRawJson(JSON.stringify(json, null, 2));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const ref = data?.violaPureReference;
  const br = data?.bonusResults?.[0];

  return (
    <main className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">🔍 会員ボーナス詳細デバッグ</h1>
        <p className="text-sm text-gray-500 mt-1">viola-pure.biz との数値比較・原因追究ツール</p>
      </div>

      {/* 検索フォーム */}
      <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">会員コード</label>
          <input value={memberCode} onChange={e => setMemberCode(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="89248801" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">対象月</label>
          <input type="month" value={bonusMonth} onChange={e => setBonusMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={fetchDebug} disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? "取得中..." : "デバッグ取得"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">❌ {error}</div>}

      {data && (
        <>
          <div className="flex gap-2 border-b border-gray-200">
            {(["visual", "raw"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t === "visual" ? "📊 ビジュアル" : "📄 JSON"}
              </button>
            ))}
          </div>

          {tab === "raw" && (
            <pre className="bg-gray-900 text-green-300 p-4 rounded-xl text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap">
              {rawJson}
            </pre>
          )}

          {tab === "visual" && (
            <div className="space-y-6">

              {/* ① 会員基本情報 */}
              <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">① 会員基本情報</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-400 text-xs">会員コード</span><p className="font-mono font-bold">{data.member.memberCode}</p></div>
                  <div><span className="text-gray-400 text-xs">名前</span><p className="font-bold">{data.member.name}</p></div>
                  <div><span className="text-gray-400 text-xs">ステータス</span><p className="font-bold">{data.member.status}</p></div>
                  <div><span className="text-gray-400 text-xs">称号LV(DB)</span><p className="font-bold">LV.{data.member.currentLevel}</p></div>
                  <div><span className="text-gray-400 text-xs">条件達成</span><p className="font-bold">{data.member.conditionAchieved ? "✅ 達成" : "❌ 未達成"}</p></div>
                  <div><span className="text-gray-400 text-xs">強制LV</span><p className="font-bold">{data.member.forcedLevel ?? "なし"}</p></div>
                  <div><span className="text-gray-400 text-xs">紹介者</span><p className="font-mono text-xs">{data.member.referrer ? `${data.member.referrer.memberCode} ${data.member.referrer.name}` : "なし"}</p></div>
                  <div><span className="text-gray-400 text-xs">直上者</span><p className="font-mono text-xs">{data.member.upline ? `${data.member.upline.memberCode} ${data.member.upline.name}` : "なし"}</p></div>
                </div>
              </section>

              {/* ② 当月自己購買 */}
              <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">② {data.bonusMonth} 自己購買</h2>
                <div className="flex gap-4 mb-4">
                  <div className="bg-blue-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-blue-400">自己pt合計</p>
                    <p className="text-lg font-bold text-blue-700">{data.selfPurchase.total}pt</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">商品1000(新規)</p>
                    <p className="text-lg font-bold">{data.selfPurchase.newPt}pt</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">商品2000(継続)</p>
                    <p className="text-lg font-bold">{data.selfPurchase.continuePt}pt</p>
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${data.selfPurchase.total >= 150 ? "bg-green-50" : "bg-red-50"}`}>
                    <p className="text-xs text-gray-400">アクティブ判定</p>
                    <p className={`text-lg font-bold ${data.selfPurchase.total >= 150 ? "text-green-700" : "text-red-700"}`}>
                      {data.selfPurchase.total >= 150 ? "✅ アクティブ" : "❌ 非アクティブ"}
                    </p>
                  </div>
                </div>
                {data.selfPurchase.products.length === 0 ? (
                  <p className="text-gray-400 text-sm">購買データなし</p>
                ) : (
                  <table className="text-xs w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">商品CD</th>
                        <th className="text-left px-3 py-2">商品名</th>
                        <th className="text-right px-3 py-2">pt</th>
                        <th className="text-right px-3 py-2">合計pt</th>
                        <th className="text-right px-3 py-2">数量</th>
                        <th className="text-left px-3 py-2">状態</th>
                        <th className="text-left px-3 py-2">注文種別</th>
                        <th className="text-left px-3 py-2">伝票種別</th>
                        <th className="text-left px-3 py-2">入金</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.selfPurchase.products.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-bold">{p.productCode}</td>
                          <td className="px-3 py-2">{p.productName}</td>
                          <td className="px-3 py-2 text-right">{p.points}</td>
                          <td className="px-3 py-2 text-right font-bold">{p.totalPoints}</td>
                          <td className="px-3 py-2 text-right">{p.quantity}</td>
                          <td className="px-3 py-2">{p.purchaseStatus}</td>
                          <td className="px-3 py-2">{p.orderType ?? "-"}</td>
                          <td className="px-3 py-2">{p.slipType ?? "-"}</td>
                          <td className="px-3 py-2">{p.paymentStatus ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* ③ viola-pure.biz 比較 */}
              <section className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">③ viola-pure.biz との比較（{data.bonusMonth}）</h2>
                <p className="text-xs text-gray-400 mb-4">参照システムの「前月ポイント状況」＝4月度として比較</p>
                {ref && (
                  <table className="text-sm w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">項目</th>
                        <th className="text-right px-4 py-2 bg-blue-50 text-blue-700">viola-pure.biz</th>
                        <th className="text-right px-4 py-2 bg-emerald-50 text-emerald-700">VPシステム</th>
                        <th className="text-center px-4 py-2">判定</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">直アクティブ数</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{ref.directActiveCount}名</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{data.directReferrals.activeCount}名</td>
                        <td className="px-4 py-3 text-center"><OkBadge ok={data.directReferrals.activeCount === ref.directActiveCount} /></td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">新規ポジション数</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{ref.newPositionCount}件</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{data.directReferrals.newPositionCount}件</td>
                        <td className="px-4 py-3 text-center"><OkBadge ok={data.directReferrals.newPositionCount === ref.newPositionCount} /></td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">新規O1ポジション数</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{ref.newO1PositionCount}件</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{data.directReferrals.newO1PositionCount}件</td>
                        <td className="px-4 py-3 text-center"><OkBadge ok={data.directReferrals.newO1PositionCount === ref.newO1PositionCount} /></td>
                      </tr>
                      <tr className="bg-yellow-50">
                        <td className="px-4 py-3 font-medium text-yellow-800">新規pt（商品1000）</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{ref.newPt}pt</td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-700">
                          自己:{data.selfPurchase.newPt}pt
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-400">要調査</td>
                      </tr>
                      <tr className="bg-yellow-50">
                        <td className="px-4 py-3 font-medium text-yellow-800">継続pt（商品2000）</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{ref.continuePt}pt</td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-700">
                          自己:{data.selfPurchase.continuePt}pt
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-400">要調査</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">グループPT (GP)</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{ref.totalPt}pt</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {br ? `${br.groupPoints}pt` : `推定${data.groupPointEstimate.estimatedGP}pt`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {br
                            ? <OkBadge ok={br.groupPoints === ref.totalPt} />
                            : <span className="text-xs text-gray-400">BonusResultなし</span>}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </section>

              {/* ④ GP推定内訳 */}
              <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">④ GP推定内訳（傘下7段集計）</h2>
                <p className="text-xs text-gray-400 mb-3">{data.groupPointEstimate.note}</p>
                <div className="flex gap-4 mb-3">
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">自己pt</p>
                    <p className="text-lg font-bold">{data.groupPointEstimate.selfPt}pt</p>
                  </div>
                  <div className="text-xl text-gray-400 self-center">+</div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">傘下7段合計pt（アクティブフィルタなし）</p>
                    <p className="text-lg font-bold">{data.groupPointEstimate.subtreePt}pt</p>
                  </div>
                  <div className="text-xl text-gray-400 self-center">=</div>
                  <div className="bg-blue-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-blue-400">推定GP</p>
                    <p className="text-lg font-bold text-blue-700">{data.groupPointEstimate.estimatedGP}pt</p>
                  </div>
                </div>
                {data.groupPointEstimate.breakdown.map(r => (
                  <div key={r.productCode} className="text-sm text-gray-600">
                    商品{r.productCode}: {r.totalPts}pt（{r.memberCount}名）
                  </div>
                ))}
              </section>

              {/* ⑤ 直下紹介者一覧 */}
              <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
                  ⑤ 直下紹介者（{data.directReferrals.total}名 / アクティブ{data.directReferrals.activeCount}名）
                </h2>
                {data.directReferrals.members.length === 0 ? (
                  <p className="text-gray-400 text-sm">直下紹介者なし</p>
                ) : (
                  <table className="text-xs w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">会員コード</th>
                        <th className="text-left px-3 py-2">名前</th>
                        <th className="text-left px-3 py-2">ステータス</th>
                        <th className="text-right px-3 py-2">自己pt</th>
                        <th className="text-right px-3 py-2">商品1000pt</th>
                        <th className="text-right px-3 py-2">商品2000pt</th>
                        <th className="text-center px-3 py-2">O1</th>
                        <th className="text-center px-3 py-2">アクティブ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.directReferrals.members.map((m, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${m.isActive ? "" : "opacity-50"}`}>
                          <td className="px-3 py-2 font-mono">{m.memberCode}</td>
                          <td className="px-3 py-2">{m.name}</td>
                          <td className="px-3 py-2">{m.status}</td>
                          <td className="px-3 py-2 text-right font-bold">{m.selfPurchasePoints}pt</td>
                          <td className="px-3 py-2 text-right text-blue-600">{m.newPt}pt</td>
                          <td className="px-3 py-2 text-right text-slate-600">{m.continuePt}pt</td>
                          <td className="px-3 py-2 text-center">{m.isO1Position ? "✅" : ""}</td>
                          <td className="px-3 py-2 text-center">{m.isActive ? "✅" : "❌"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* ⑥ BonusResult */}
              {data.bonusResults.length > 0 && (
                <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">⑥ BonusResult（最新ラン）</h2>
                  {data.bonusResults.slice(0, 1).map((br2, i) => (
                    <div key={i} className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">アクティブ</p>
                          <p className="font-bold">{br2.isActive ? "✅ はい" : "❌ いいえ"}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">自己購入PT</p>
                          <p className="font-bold">{br2.selfPurchasePoints}pt</p>
                        </div>
                        <div className={`rounded-xl p-3 ${br2.groupPoints === (ref?.totalPt ?? -1) ? "bg-green-50" : "bg-red-50"}`}>
                          <p className="text-xs text-gray-400">グループPT(GP)</p>
                          <p className={`font-bold ${br2.groupPoints === (ref?.totalPt ?? -1) ? "text-green-700" : "text-red-600"}`}>
                            {br2.groupPoints}pt
                            {ref && <span className="text-xs ml-1 text-gray-400">(参照:{ref.totalPt})</span>}
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 ${br2.directActiveCount === (ref?.directActiveCount ?? -1) ? "bg-green-50" : "bg-red-50"}`}>
                          <p className="text-xs text-gray-400">直アクティブ数</p>
                          <p className={`font-bold ${br2.directActiveCount === (ref?.directActiveCount ?? -1) ? "text-green-700" : "text-red-600"}`}>
                            {br2.directActiveCount}名
                            {ref && <span className="text-xs ml-1 text-gray-400">(参照:{ref.directActiveCount})</span>}
                          </p>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-3">
                          <p className="text-xs text-indigo-400">当月達成LV</p>
                          <p className="font-bold text-indigo-700">LV.{br2.achievedLevel}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-3">
                          <p className="text-xs text-indigo-400">称号変動</p>
                          <p className="font-bold text-indigo-700">LV.{br2.previousTitleLevel}→LV.{br2.newTitleLevel}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 col-span-2">
                          <p className="text-xs text-emerald-400">最終支払額</p>
                          <p className="font-bold text-emerald-700 text-lg">{yen(br2.paymentAmount)}</p>
                        </div>
                      </div>
                      <table className="text-sm w-full border-collapse">
                        <tbody className="divide-y divide-gray-100">
                          <tr><td className="px-4 py-2 text-gray-500">ダイレクトB</td><td className="px-4 py-2 text-right">{yen(br2.directBonus)}</td></tr>
                          <tr><td className="px-4 py-2 text-gray-500">ユニレベルB</td><td className="px-4 py-2 text-right">{yen(br2.unilevelBonus)}</td></tr>
                          {br2.unilevelDetail && Object.entries(br2.unilevelDetail).map(([d, v]) => (
                            <tr key={d} className="bg-blue-50/40">
                              <td className="px-4 py-1 text-xs text-blue-500 pl-10">└ {d}段目</td>
                              <td className="px-4 py-1 text-right text-xs text-blue-600">{yen(v)}</td>
                            </tr>
                          ))}
                          <tr><td className="px-4 py-2 text-gray-500">組織構築B</td><td className="px-4 py-2 text-right">{yen(br2.structureBonus)}</td></tr>
                          <tr><td className="px-4 py-2 text-gray-500">繰越金</td><td className="px-4 py-2 text-right">{yen(br2.carryoverAmount)}</td></tr>
                          <tr><td className="px-4 py-2 text-gray-500">調整金</td><td className="px-4 py-2 text-right">{yen(br2.adjustmentAmount)}</td></tr>
                          <tr className="bg-blue-50 font-bold"><td className="px-4 py-3 text-blue-800">ボーナス合計</td><td className="px-4 py-3 text-right text-blue-800">{yen(br2.bonusTotal)}</td></tr>
                          <tr><td className="px-4 py-2 text-gray-500">消費税(内)</td><td className="px-4 py-2 text-right">{yen(br2.consumptionTax)}</td></tr>
                          <tr><td className="px-4 py-2 text-red-400">源泉税</td><td className="px-4 py-2 text-right text-red-500">−{yen(br2.withholdingTax)}</td></tr>
                          <tr><td className="px-4 py-2 text-gray-500">過不足金</td><td className="px-4 py-2 text-right">{yen(br2.shortageAmount)}</td></tr>
                          <tr className="bg-emerald-50 font-bold"><td className="px-4 py-3 text-emerald-800 text-base">最終支払額</td><td className="px-4 py-3 text-right text-emerald-800 text-lg">{yen(br2.paymentAmount)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </section>
              )}

            </div>
          )}
        </>
      )}
    </main>
  );
}
