"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

/* ─── 型定義 ─── */
type BonusRunSummary = {
  id: string;
  bonusMonth: string;
  status: "draft" | "confirmed" | "canceled";
  totalMembers: number;
  totalActiveMembers: number;
  totalBonusAmount: number;
  confirmedAt: string | null;
  createdAt: string;
};

type BonusResultRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  mlmMemberCode: string;
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
  savingsBonus: number;
  totalBonus: number;
  unilevelDetail: Record<string, number> | null;
  savingsPointsAdded: number;
};

type BonusRunDetail = BonusRunSummary & {
  closingDate: string;
  results: BonusResultRow[];
};

/* ─── 定数 ─── */
const STATUS_STYLES = {
  draft:     { label: "下書き（計算中）", bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-300" },
  confirmed: { label: "確定済み",         bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  canceled:  { label: "取消",             bg: "bg-slate-100",  text: "text-slate-500",   border: "border-slate-200" },
};

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

/* ─── 現在月を取得 ─── */
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ─── 前月を取得 ─── */
function getPrevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ─── 計算結果テーブル ─── */
function ResultTable({ results }: { results: BonusResultRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = results.filter(
    (r) =>
      r.memberName.includes(search) ||
      r.memberEmail.includes(search) ||
      r.mlmMemberCode.includes(search)
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="名前・メール・会員コードで検索..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
      <div className="text-xs text-slate-500">{filtered.length}件</div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-2 px-3 text-left text-slate-600 font-semibold">会員</th>
              <th className="py-2 px-3 text-center text-slate-600 font-semibold">状態</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold">自己pt</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold">グループpt</th>
              <th className="py-2 px-3 text-center text-slate-600 font-semibold">直紹介A</th>
              <th className="py-2 px-3 text-center text-slate-600 font-semibold">旧称号→新称号</th>
              <th className="py-2 px-3 text-center text-slate-600 font-semibold">当月LV</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold">ダイレクト</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold">ユニレベル</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold">組織構築</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold">貯金</th>
              <th className="py-2 px-3 text-right text-slate-600 font-semibold font-bold">合計</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const levelChanged = r.previousTitleLevel !== r.newTitleLevel;
              return (
                <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${r.isActive ? "" : "opacity-60"}`}>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-slate-800">{r.memberName}</div>
                    <div className="text-slate-400">{r.mlmMemberCode}</div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.isActive ? "✅ Active" : "❌"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">{r.selfPurchasePoints}</td>
                  <td className="py-2 px-3 text-right">{r.groupPoints.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center">{r.directActiveCount}名</td>
                  <td className="py-2 px-3 text-center">
                    {levelChanged ? (
                      <span className="text-emerald-600 font-bold">
                        {LEVEL_LABELS[r.previousTitleLevel] ?? "—"} → {LEVEL_LABELS[r.newTitleLevel] ?? "—"}
                      </span>
                    ) : (
                      <span className="text-slate-400">{LEVEL_LABELS[r.newTitleLevel] ?? "—"}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-violet-700">
                    {LEVEL_LABELS[r.achievedLevel] ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-right">{yen(r.directBonus)}</td>
                  <td className="py-2 px-3 text-right">{yen(r.unilevelBonus)}</td>
                  <td className="py-2 px-3 text-right">{yen(r.structureBonus)}</td>
                  <td className="py-2 px-3 text-right">{yen(r.savingsBonus)}</td>
                  <td className="py-2 px-3 text-right font-black text-slate-900">{yen(r.totalBonus)}</td>
                </tr>
              );
            })}
          </tbody>
          {/* フッター合計 */}
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-300">
              <td colSpan={7} className="py-2 px-3 font-bold text-slate-700">合計</td>
              <td className="py-2 px-3 text-right font-bold">
                {yen(filtered.reduce((s, r) => s + r.directBonus, 0))}
              </td>
              <td className="py-2 px-3 text-right font-bold">
                {yen(filtered.reduce((s, r) => s + r.unilevelBonus, 0))}
              </td>
              <td className="py-2 px-3 text-right font-bold">
                {yen(filtered.reduce((s, r) => s + r.structureBonus, 0))}
              </td>
              <td className="py-2 px-3 text-right font-bold">
                {yen(filtered.reduce((s, r) => s + r.savingsBonus, 0))}
              </td>
              <td className="py-2 px-3 text-right font-black text-violet-800 text-sm">
                {yen(filtered.reduce((s, r) => s + r.totalBonus, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ─── メインページ ─── */
export default function BonusRunPage() {
  const [runs, setRuns] = useState<BonusRunSummary[]>([]);
  const [detail, setDetail] = useState<BonusRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [targetMonth, setTargetMonth] = useState(getPrevMonth());
  const [closingDate, setClosingDate] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 一覧取得
  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bonus-run");
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  // 詳細取得
  const fetchDetail = useCallback(async (month: string) => {
    const res = await fetch(`/api/admin/bonus-run?month=${month}`);
    if (!res.ok) return;
    const data = await res.json();
    setDetail(data);
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // ボーナス計算実行
  const handleCalculate = async (mode: "calculate" | "confirm") => {
    if (!targetMonth) return;
    if (mode === "confirm") {
      if (!confirm(`${targetMonth}のボーナスを確定します。確定後は再計算が必要です。よろしいですか？`)) return;
    }

    const setter = mode === "confirm" ? setConfirming : setCalculating;
    setter(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/bonus-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusMonth: targetMonth,
          closingDate: closingDate || new Date().toISOString(),
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error ?? "計算に失敗しました" });
        return;
      }
      setMsg({ type: "ok", text: data.message });
      await fetchRuns();
      await fetchDetail(targetMonth);
    } catch {
      setMsg({ type: "err", text: "通信エラーが発生しました" });
    } finally {
      setter(false);
    }
  };

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">🧮 MLMボーナス計算</h1>
        <p className="text-sm text-slate-600 mt-1">
          月次ボーナスの計算・確定を行います。計算はいつでも再実行できます。確定すると会員の称号レベルが更新されます。
        </p>
      </div>

      {/* ━━━ 計算実行パネル ━━━ */}
      <div className="rounded-2xl bg-white border border-stone-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">📅 ボーナス計算実行</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象月 (YYYY-MM)</label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">締め日（省略可）</label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            msg.type === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {msg.type === "ok" ? "✅ " : "❌ "}{msg.text}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* 計算（下書き） */}
          <button
            onClick={() => handleCalculate("calculate")}
            disabled={calculating || confirming}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition"
          >
            {calculating ? (
              <><span className="animate-spin">⏳</span> 計算中...</>
            ) : (
              <><span>🧮</span> 計算実行（下書き）</>
            )}
          </button>

          {/* 確定 */}
          <button
            onClick={() => handleCalculate("confirm")}
            disabled={calculating || confirming}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {confirming ? (
              <><span className="animate-spin">⏳</span> 確定中...</>
            ) : (
              <><span>✅</span> 計算して確定</>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p>💡 <strong>計算実行（下書き）</strong>：結果をプレビューできます。会員データは更新されません。</p>
          <p>💡 <strong>計算して確定</strong>：ボーナスを確定し、会員の称号レベル・貯金ptを更新します。</p>
        </div>
      </div>

      {/* ━━━ 計算結果詳細 ━━━ */}
      {detail && (
        <div className="rounded-2xl bg-white border border-stone-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              📊 {detail.bonusMonth} 計算結果
            </h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[detail.status].bg} ${STATUS_STYLES[detail.status].text} ${STATUS_STYLES[detail.status].border}`}>
              {STATUS_STYLES[detail.status].label}
            </span>
          </div>

          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "対象会員数", value: `${detail.totalMembers}名`, icon: "👥" },
              { label: "アクティブ数", value: `${detail.totalActiveMembers}名`, icon: "✅" },
              { label: "ボーナス総額", value: yen(detail.totalBonusAmount), icon: "💰" },
              { label: "確定日時", value: detail.confirmedAt ? new Date(detail.confirmedAt).toLocaleString("ja-JP") : "未確定", icon: "📅" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <span>{item.icon}</span>{item.label}
                </div>
                <div className="text-base font-bold text-slate-800 mt-1 break-all">{item.value}</div>
              </div>
            ))}
          </div>

          {/* 詳細テーブル */}
          <ResultTable results={detail.results} />
        </div>
      )}

      {/* ━━━ 過去の計算履歴 ━━━ */}
      <div className="rounded-2xl bg-white border border-stone-100 p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">🗂️ 計算履歴</h2>

        {loading ? (
          <div className="text-center text-slate-400 py-8">読み込み中...</div>
        ) : runs.length === 0 ? (
          <div className="text-center text-slate-400 py-8">計算履歴がありません</div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const st = STATUS_STYLES[run.status];
              return (
                <button
                  key={run.id}
                  onClick={() => fetchDetail(run.bonusMonth)}
                  className={`w-full flex items-center gap-4 rounded-2xl border ${st.border} ${st.bg} px-4 py-3 text-left hover:opacity-90 transition`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${st.text}`}>{run.bonusMonth}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${st.bg} ${st.text} ${st.border}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      対象: {run.totalMembers}名 / Active: {run.totalActiveMembers}名 / 総額: {yen(run.totalBonusAmount)}
                    </div>
                  </div>
                  <span className="text-slate-400">›</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
