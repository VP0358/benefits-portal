"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TRAVEL_PRICING_TIERS,
  TRAVEL_LEVEL_FEES,
  TRAVEL_LEVELS,
  getTravelFee,
  getTravelPlanName,
  type PricingTier,
} from "@/lib/travel-pricing";

type User = { id: string; memberCode: string; name: string };
type Sub = {
  id: string;
  planName: string;
  level: number;
  pricingTier: string;
  monthlyFee: number;
  status: string;
  startedAt: string | null;
  confirmedAt: string | null;
  note: string | null;
};

interface Props {
  mode: "register-only" | "actions-only";
  users: User[];
  subId?: string;
  currentStatus?: string;
  sub?: Sub;
}

const STATUS_OPTIONS = [
  { value: "pending",   label: "申込中" },
  { value: "active",    label: "有効" },
  { value: "suspended", label: "停止中" },
  { value: "canceled",  label: "解約済" },
];

/** Lv 選択ボタン群 */
function LevelSelector({
  tier,
  selected,
  onChange,
}: {
  tier: PricingTier;
  selected: number;
  onChange: (lv: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {TRAVEL_LEVELS.map(lv => {
          const fee = TRAVEL_LEVEL_FEES[tier][lv];
          const isActive = selected === lv;
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onChange(lv)}
              className={`rounded-xl border-2 py-2.5 text-center transition-all ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              <div className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-700"}`}>
                Lv{lv}
              </div>
              <div className={`text-xs mt-0.5 font-semibold ${isActive ? "text-slate-200" : "text-slate-700"}`}>
                ¥{fee.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 料金一覧プレビュー */
function PricingPreview({ tier }: { tier: PricingTier }) {
  const tierLabel = tier === "early" ? "初回申込者50名まで" : "申込者51名から";
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-800">
      <div className="font-semibold text-slate-700 mb-2">
        📋 {tierLabel} の料金
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {TRAVEL_LEVELS.map(lv => (
          <div key={lv}>
            <div className="text-slate-700">Lv{lv}</div>
            <div className="font-semibold text-slate-800">
              ¥{TRAVEL_LEVEL_FEES[tier][lv].toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TravelSubsActions({ mode, users, subId, currentStatus, sub }: Props) {
  const router = useRouter();
  const [showRegister, setShowRegister] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── 新規登録フォーム ──────────────────────────────
  const [regForm, setRegForm] = useState({
    userId: "",
    pricingTier: "early" as PricingTier,
    level: 1,
    status: "pending",
    startedAt: "",
    confirmedAt: "",
    note: "",
  });

  const regFee = getTravelFee(regForm.pricingTier, regForm.level);
  const regPlanName = getTravelPlanName(regForm.pricingTier, regForm.level);

  // ── 編集フォーム ──────────────────────────────────
  const [editForm, setEditForm] = useState({
    pricingTier: (sub?.pricingTier ?? "early") as PricingTier,
    level: sub?.level ?? 1,
    status: sub?.status ?? "pending",
    startedAt: sub?.startedAt ? sub.startedAt.slice(0, 10) : "",
    confirmedAt: sub?.confirmedAt ? sub.confirmedAt.slice(0, 10) : "",
    note: sub?.note ?? "",
  });

  const editFee = getTravelFee(editForm.pricingTier, editForm.level);
  const editPlanName = getTravelPlanName(editForm.pricingTier, editForm.level);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/travel-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: regForm.userId,
        level: regForm.level,
        pricingTier: regForm.pricingTier,
        status: regForm.status,
        startedAt: regForm.startedAt || null,
        confirmedAt: regForm.confirmedAt || null,
        note: regForm.note || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "登録に失敗しました。");
      return;
    }
    setShowRegister(false);
    setRegForm({ userId: "", pricingTier: "early", level: 1, status: "pending", startedAt: "", confirmedAt: "", note: "" });
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!subId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/travel-subscriptions/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: editForm.level,
        pricingTier: editForm.pricingTier,
        status: editForm.status,
        startedAt: editForm.startedAt || null,
        confirmedAt: editForm.confirmedAt || null,
        note: editForm.note || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "更新に失敗しました。");
      return;
    }
    setShowEdit(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!subId || !confirm("このサブスクリプションを解約しますか？")) return;
    setSaving(true);
    const res = await fetch(`/api/admin/travel-subscriptions/${subId}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) { setError("解約に失敗しました。"); return; }
    router.refresh();
  }

  // ════════════════════════════════════════
  // 新規登録モード
  // ════════════════════════════════════════
  if (mode === "register-only") {
    return (
      <div>
        <button
          onClick={() => setShowRegister(true)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          ＋ 新規登録
        </button>

        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl my-4">
              <h2 className="text-lg font-bold text-slate-800 mb-1">✈️ 旅行サブスク 新規登録</h2>
              <p className="text-xs text-slate-700 mb-5">Lvを選択すると月額が自動で設定されます</p>

              <form onSubmit={handleRegister} className="space-y-5">
                {/* 会員選択 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">会員 *</label>
                  <select
                    required
                    value={regForm.userId}
                    onChange={e => setRegForm({ ...regForm, userId: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium text-slate-800"
                  >
                    <option value="">会員を選択してください</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.memberCode}　{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* 更新制度 選択 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-2">更新制度 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRAVEL_PRICING_TIERS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setRegForm({ ...regForm, pricingTier: t.value as PricingTier })}
                        className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                          regForm.pricingTier === t.value
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-800 hover:border-slate-400"
                        }`}
                      >
                        {t.value === "early" ? "🌸 " : "📌 "}{t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lv 選択 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-2">レベル *</label>
                  <LevelSelector
                    tier={regForm.pricingTier}
                    selected={regForm.level}
                    onChange={lv => setRegForm({ ...regForm, level: lv })}
                  />
                </div>

                {/* 月額プレビュー */}
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-600 font-medium">設定プラン</div>
                    <div className="text-sm font-bold text-emerald-800 mt-0.5">{regPlanName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-600">月額料金</div>
                    <div className="text-2xl font-bold text-emerald-700">¥{regFee.toLocaleString()}</div>
                  </div>
                </div>

                {/* ステータス・日付 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">ステータス</label>
                    <select
                      value={regForm.status}
                      onChange={e => setRegForm({ ...regForm, status: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">開始日</label>
                    <input type="date" value={regForm.startedAt}
                      onChange={e => setRegForm({ ...regForm, startedAt: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">確定日</label>
                    <input type="date" value={regForm.confirmedAt}
                      onChange={e => setRegForm({ ...regForm, confirmedAt: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">備考</label>
                    <input value={regForm.note}
                      onChange={e => setRegForm({ ...regForm, note: e.target.value })}
                      placeholder="任意"
                      className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800" />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button"
                    onClick={() => { setShowRegister(false); setError(""); }}
                    className="rounded-xl border px-5 py-2.5 text-sm text-slate-800 hover:bg-slate-50">
                    キャンセル
                  </button>
                  <button type="submit" disabled={saving}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? "登録中..." : "登録する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // アクションモード（編集・解約）
  // ════════════════════════════════════════
  return (
    <div className="flex gap-1">
      {currentStatus !== "canceled" && (
        <>
          <button type="button"
            onClick={() => { setShowEdit(true); setError(""); }}
            className="rounded-xl border px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50">
            Lv変更
          </button>
          <button type="button" onClick={handleCancel} disabled={saving}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
            解約
          </button>
        </>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl my-4">
            <h2 className="text-lg font-bold text-slate-800 mb-1">✈️ 旅行サブスク 編集</h2>
            <p className="text-xs text-slate-700 mb-5">Lvを変更すると月額が自動で更新されます</p>

            <form onSubmit={handleEdit} className="space-y-5">
              {/* 更新制度 */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">更新制度 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRAVEL_PRICING_TIERS.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setEditForm({ ...editForm, pricingTier: t.value as PricingTier })}
                      className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                        editForm.pricingTier === t.value
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-800 hover:border-slate-400"
                      }`}>
                      {t.value === "early" ? "🌸 " : "📌 "}{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lv 選択 */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">レベル *</label>
                <LevelSelector
                  tier={editForm.pricingTier}
                  selected={editForm.level}
                  onChange={lv => setEditForm({ ...editForm, level: lv })}
                />
              </div>

              {/* 料金一覧プレビュー */}
              <PricingPreview tier={editForm.pricingTier} />

              {/* 月額プレビュー */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-600 font-medium">変更後プラン</div>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">{editPlanName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-600">月額料金</div>
                  <div className="text-2xl font-bold text-emerald-700">¥{editFee.toLocaleString()}</div>
                </div>
              </div>

              {/* ステータス・日付・備考 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">ステータス</label>
                  <select value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800">
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">開始日</label>
                  <input type="date" value={editForm.startedAt}
                    onChange={e => setEditForm({ ...editForm, startedAt: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">確定日</label>
                  <input type="date" value={editForm.confirmedAt}
                    onChange={e => setEditForm({ ...editForm, confirmedAt: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">備考</label>
                  <input value={editForm.note}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-800" />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button"
                  onClick={() => { setShowEdit(false); setError(""); }}
                  className="rounded-xl border px-5 py-2.5 text-sm text-slate-800 hover:bg-slate-50">
                  キャンセル
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
