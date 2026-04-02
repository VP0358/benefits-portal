"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; memberCode: string; name: string };
type Sub = {
  id: string;
  planName: string;
  monthlyFee: number;
  status: string;
  startedAt: string | null;
  confirmedAt: string | null;
  note: string | null;
};

interface Props {
  /** "register-only": 新規登録ボタンのみ表示 */
  /** "actions-only": 既存レコードの編集・解約ボタンのみ表示 */
  mode: "register-only" | "actions-only";
  users: User[];
  subId?: string;
  currentStatus?: string;
  sub?: Sub;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "申込中" },
  { value: "active", label: "有効" },
  { value: "suspended", label: "停止中" },
  { value: "canceled", label: "解約済" },
];

export default function TravelSubsActions({ mode, users, subId, currentStatus, sub }: Props) {
  const router = useRouter();
  const [showRegister, setShowRegister] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 新規登録フォーム
  const [regForm, setRegForm] = useState({
    userId: "",
    planName: "",
    monthlyFee: "",
    status: "pending",
    startedAt: "",
    confirmedAt: "",
    note: "",
  });

  // 編集フォーム
  const [editForm, setEditForm] = useState<Partial<Sub> & { startedAt?: string; confirmedAt?: string }>({
    planName: sub?.planName ?? "",
    monthlyFee: sub?.monthlyFee ?? 0,
    status: sub?.status ?? "pending",
    startedAt: sub?.startedAt ? sub.startedAt.slice(0, 10) : "",
    confirmedAt: sub?.confirmedAt ? sub.confirmedAt.slice(0, 10) : "",
    note: sub?.note ?? "",
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/travel-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: regForm.userId,
        planName: regForm.planName,
        monthlyFee: Number(regForm.monthlyFee),
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
    setRegForm({ userId: "", planName: "", monthlyFee: "", status: "pending", startedAt: "", confirmedAt: "", note: "" });
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
        planName: editForm.planName,
        monthlyFee: Number(editForm.monthlyFee),
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

  // ======= 新規登録モード =======
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-800 mb-4">旅行サブスク 新規登録</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">会員</label>
                  <select
                    required
                    value={regForm.userId}
                    onChange={e => setRegForm({ ...regForm, userId: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="">会員を選択</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.memberCode} {u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">プラン名</label>
                    <input
                      required
                      value={regForm.planName}
                      onChange={e => setRegForm({ ...regForm, planName: e.target.value })}
                      placeholder="例: ベーシックプラン"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">月額料金（円）</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={regForm.monthlyFee}
                      onChange={e => setRegForm({ ...regForm, monthlyFee: e.target.value })}
                      placeholder="3980"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                    <select
                      value={regForm.status}
                      onChange={e => setRegForm({ ...regForm, status: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">開始日</label>
                    <input
                      type="date"
                      value={regForm.startedAt}
                      onChange={e => setRegForm({ ...regForm, startedAt: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">確定日</label>
                    <input
                      type="date"
                      value={regForm.confirmedAt}
                      onChange={e => setRegForm({ ...regForm, confirmedAt: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">備考</label>
                  <input
                    value={regForm.note}
                    onChange={e => setRegForm({ ...regForm, note: e.target.value })}
                    placeholder="任意"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowRegister(false); setError(""); }}
                    className="rounded-xl border px-4 py-2 text-sm text-slate-600"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
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

  // ======= アクションモード（編集・解約） =======
  return (
    <div className="flex gap-1">
      {currentStatus !== "canceled" && (
        <>
          <button
            type="button"
            onClick={() => { setShowEdit(true); setError(""); }}
            className="rounded-xl border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            編集
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            解約
          </button>
        </>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">旅行サブスク 編集</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">プラン名</label>
                  <input
                    required
                    value={editForm.planName ?? ""}
                    onChange={e => setEditForm({ ...editForm, planName: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">月額料金（円）</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.monthlyFee ?? 0}
                    onChange={e => setEditForm({ ...editForm, monthlyFee: Number(e.target.value) })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                  <select
                    value={editForm.status ?? "pending"}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">開始日</label>
                  <input
                    type="date"
                    value={editForm.startedAt ?? ""}
                    onChange={e => setEditForm({ ...editForm, startedAt: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">確定日</label>
                  <input
                    type="date"
                    value={editForm.confirmedAt ?? ""}
                    onChange={e => setEditForm({ ...editForm, confirmedAt: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">備考</label>
                  <input
                    value={editForm.note ?? ""}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEdit(false); setError(""); }}
                  className="rounded-xl border px-4 py-2 text-sm text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
