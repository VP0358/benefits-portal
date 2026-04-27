"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TravelSub = {
  id: string;
  planName: string;
  level: number;
  pricingTier: string;
  monthlyFee: number;
  status: string;
  forceStatus: string;
  startedAt: string | null;
  confirmedAt: string | null;
  canceledAt: string | null;
  note: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; btn: string }> = {
  active:    { label: "✅ 有効",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  pending:   { label: "⏳ 審査待ち", cls: "bg-amber-50 text-amber-700 border-amber-200",     btn: "bg-amber-500 hover:bg-amber-600 text-white" },
  suspended: { label: "⏸ 停止中",  cls: "bg-red-50 text-red-600 border-red-200",            btn: "bg-red-500 hover:bg-red-600 text-white" },
  canceled:  { label: "🚫 解約済み", cls: "bg-slate-100 text-slate-600 border-slate-200",    btn: "bg-slate-500 hover:bg-slate-600 text-white" },
};

const STATUS_DESCS: Record<string, string> = {
  active:    "期限内に入金が確認された状態。サービス有効。",
  pending:   "入金確認後、管理側で操作し「有効」へ変更します。",
  suspended: "期限内に入金が確認できなかった場合。一時停止。",
  canceled:  "解約申請を受理した状態。サービス終了。",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default function TravelStatusPanel({ sub, userId }: { sub: TravelSub | null; userId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function changeStatus(newStatus: string) {
    if (!sub) return;
    const label = STATUS_CONFIG[newStatus]?.label ?? newStatus;
    if (!confirm(`ステータスを「${label}」に変更しますか？`)) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/travel-subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "変更に失敗しました");
      return;
    }
    router.refresh();
  }

  if (!sub) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
        <p className="text-sm text-slate-500">旅行サブスク未登録</p>
        <p className="text-xs text-slate-400 mt-1">
          <a href="/admin/travel-subscriptions" className="underline hover:text-slate-600">旅行サブスク管理ページ</a>から登録できます
        </p>
      </div>
    );
  }

  const st = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
  const currentStatus = sub.status;

  return (
    <div className="space-y-4">
      {/* 現在のステータス */}
      <div className={`rounded-2xl border p-4 ${st.cls}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-semibold mb-0.5 opacity-70">現在のステータス</div>
            <div className="text-lg font-bold">{st.label}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-70 mb-0.5">プラン</div>
            <div className="font-bold text-sm">{sub.planName}</div>
          </div>
        </div>
        <p className="mt-2 text-xs opacity-75">{STATUS_DESCS[sub.status] ?? ""}</p>
      </div>

      {/* プラン詳細 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { label: "レベル",    value: `Lv.${sub.level}` },
          { label: "月額",      value: `¥${sub.monthlyFee.toLocaleString()}` },
          { label: "制度",      value: sub.pricingTier === "early" ? "🌸 初回50名" : "📌 51名〜" },
          { label: "確定日",    value: fmtDate(sub.confirmedAt) },
          { label: "開始日",    value: fmtDate(sub.startedAt) },
          { label: "解約日",    value: fmtDate(sub.canceledAt) },
        ].map(item => (
          <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[10px] text-slate-500 mb-0.5">{item.label}</div>
            <div className="font-semibold text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>

      {/* ステータス変更ボタン群 */}
      {currentStatus !== "canceled" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-slate-700 mb-3">📋 ステータス変更（手動）</div>
          <div className="grid grid-cols-2 gap-2">
            {(["active", "pending", "suspended", "canceled"] as const)
              .filter(s => s !== currentStatus)
              .map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button key={s} type="button"
                    onClick={() => changeStatus(s)}
                    disabled={saving}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${cfg.btn}`}>
                    {cfg.label}に変更
                  </button>
                );
              })
            }
          </div>
          {error && <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <p className="mt-3 text-[11px] text-slate-400">
            ※ 入金確認後に「有効」へ変更してください。入金が確認できない場合は「停止中」に変更します。
          </p>
        </div>
      )}

      {/* 解約済みの場合 */}
      {currentStatus === "canceled" && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-xs text-slate-500">解約済みです。再登録は旅行サブスク管理ページから行ってください。</p>
          <a href="/admin/travel-subscriptions"
            className="mt-1.5 inline-block text-xs font-semibold text-slate-700 underline hover:text-slate-900">
            旅行サブスク管理ページ →
          </a>
        </div>
      )}

      {/* 備考 */}
      {sub.note && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <div className="text-[10px] text-amber-700 font-semibold mb-0.5">備考</div>
          <p className="text-xs text-amber-800">{sub.note}</p>
        </div>
      )}
    </div>
  );
}
