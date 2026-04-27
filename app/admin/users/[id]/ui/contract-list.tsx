"use client";

import { useState } from "react";

type Contract = {
  id: string;
  contractNumber: string;
  planName: string;
  monthlyFee: number;
  status: string;
  startedAt?: string | null;
  confirmedAt?: string | null;
  canceledAt?: string | null;
  note?: string | null;
  createdAt?: string | null;
  isCampaign?: boolean;
};

function statusLabel(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "申込中",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    active:    { label: "有効",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    canceled:  { label: "解約済",  cls: "bg-red-50 text-red-700 border-red-200" },
    suspended: { label: "停止",    cls: "bg-slate-100 text-slate-700 border-slate-200" },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-800 border-slate-200" };
}

export default function ContractList({ contracts: initial }: { contracts: Contract[] }) {
  const [contracts, setContracts] = useState(initial);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<Partial<Contract>>({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function startEdit(c: Contract) {
    setEditId(c.id);
    setEditForm({
      contractNumber: c.contractNumber,
      planName:       c.planName,
      monthlyFee:     c.monthlyFee,
      status:         c.status,
      startedAt:      c.startedAt  ? c.startedAt.slice(0, 10)  : "",
      confirmedAt:    c.confirmedAt ? c.confirmedAt.slice(0, 10) : "",
      note:           c.note ?? "",
    });
    setError("");
    setSuccessMsg("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({});
    setError("");
    setSuccessMsg("");
  }

  async function saveEdit(contractId: string) {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    const res = await fetch(`/api/admin/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractNumber: editForm.contractNumber,
        planName:       editForm.planName,
        monthlyFee:     Number(editForm.monthlyFee),
        status:         editForm.status,
        startedAt:      editForm.startedAt   || null,
        confirmedAt:    editForm.confirmedAt  || null,
        note:           editForm.note         || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "更新に失敗しました。");
      return;
    }

    const updated = await res.json();

    // 報酬自動作成メッセージ
    if (updated.rewardsCreated > 0) {
      setSuccessMsg(
        `✅ 契約を有効化しました。紹介報酬 ${updated.rewardsCreated} 件を自動作成しました。`
      );
    } else {
      setSuccessMsg("✅ 契約を更新しました。");
    }

    setContracts(prev =>
      prev.map(c => c.id === contractId ? { ...c, ...updated } : c)
    );
    setEditId(null);
    setEditForm({});
  }

  async function cancelContract(contractId: string) {
    if (!confirm("この契約を解約しますか？この操作は取り消せません。")) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");

    const res = await fetch(`/api/admin/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "canceled", canceledAt: new Date().toISOString() }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("解約処理に失敗しました。");
      return;
    }

    setContracts(prev =>
      prev.map(c =>
        c.id === contractId
          ? { ...c, status: "canceled", canceledAt: new Date().toISOString() }
          : c
      )
    );
    setSuccessMsg("✅ 解約しました。");
  }

  if (contracts.length === 0) {
    return <div className="text-sm text-slate-700">契約はありません。</div>;
  }

  return (
    <div className="space-y-4">
      {error      && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {successMsg && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 font-medium">{successMsg}</p>}

      {contracts.map(contract => (
        <div key={contract.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">

          {editId === contract.id ? (
            /* ========== 編集モード ========== */
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">編集中</p>
              <div className="grid gap-3 sm:grid-cols-2">

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">契約番号</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.contractNumber ?? ""}
                    onChange={e => setEditForm({ ...editForm, contractNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">プラン名</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.planName ?? ""}
                    onChange={e => setEditForm({ ...editForm, planName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">月額料金（円）</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.monthlyFee ?? 0}
                    onChange={e => setEditForm({ ...editForm, monthlyFee: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">ステータス</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.status ?? "active"}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="pending">申込中</option>
                    <option value="active">有効 ← 確定するとポイント報酬を自動作成</option>
                    <option value="canceled">解約</option>
                    <option value="suspended">停止</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">開始日</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.startedAt ?? ""}
                    onChange={e => setEditForm({ ...editForm, startedAt: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">契約確定日</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.confirmedAt ?? ""}
                    onChange={e => setEditForm({ ...editForm, confirmedAt: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">備考</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editForm.note ?? ""}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                  />
                </div>
              </div>

              {/* ステータスが active になる場合の注意書き */}
              {editForm.status === "active" && contract.status !== "active" && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  💡 ステータスを「有効」に変更すると、紹介者への月次報酬（月額の25%）が<strong>自動作成</strong>されます。
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(contract.id)}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>

          ) : (
            /* ========== 表示モード ========== */
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-slate-800 text-sm">{contract.planName}</div>
                    {contract.isCampaign && (
                      <span className="rounded-full bg-orange-100 border border-orange-300 px-2 py-0.5 text-xs font-bold text-orange-700">
                        🎁 特別キャンペーン
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">契約番号: {contract.contractNumber}</div>
                  {contract.createdAt && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      契約日: {new Date(contract.createdAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusLabel(contract.status).cls}`}>
                  {statusLabel(contract.status).label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                <div>月額: <span className="font-semibold text-slate-900">{Number(contract.monthlyFee).toLocaleString()}円</span></div>
                <div>紹介報酬: <span className="font-semibold text-emerald-700">{Math.floor(Number(contract.monthlyFee) * 0.25).toLocaleString()}pt/月</span></div>
                {contract.startedAt   && <div>開始日: {new Date(contract.startedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</div>}
                {contract.confirmedAt && <div>確定日: {new Date(contract.confirmedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</div>}
                {contract.canceledAt  && <div className="text-red-500 col-span-2">解約日: {new Date(contract.canceledAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</div>}
              </div>

              {contract.note && (
                <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">📝 {contract.note}</div>
              )}

              {contract.status !== "canceled" && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startEdit(contract)}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelContract(contract.id)}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    解約する
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
