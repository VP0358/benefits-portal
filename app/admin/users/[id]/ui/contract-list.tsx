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
};

function statusLabel(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "申込中", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    active: { label: "有効", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    canceled: { label: "解約済", cls: "bg-red-50 text-red-700 border-red-200" },
    suspended: { label: "停止", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
}

export default function ContractList({ contracts: initial }: { contracts: Contract[] }) {
  const [contracts, setContracts] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contract>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(c: Contract) {
    setEditId(c.id);
    setEditForm({
      planName: c.planName,
      monthlyFee: c.monthlyFee,
      status: c.status,
      startedAt: c.startedAt ? c.startedAt.slice(0, 10) : "",
      confirmedAt: c.confirmedAt ? c.confirmedAt.slice(0, 10) : "",
    });
    setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({});
    setError("");
  }

  async function saveEdit(contractId: string) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planName: editForm.planName,
        monthlyFee: Number(editForm.monthlyFee),
        status: editForm.status,
        startedAt: editForm.startedAt || null,
        confirmedAt: editForm.confirmedAt || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "更新に失敗しました。");
      return;
    }
    const updated = await res.json();
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, ...updated } : c));
    setEditId(null);
    setEditForm({});
  }

  async function cancelContract(contractId: string) {
    if (!confirm("この契約を解約しますか？この操作は取り消せません。")) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/contracts/${contractId}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      setError("解約処理に失敗しました。");
      return;
    }
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: "canceled", canceledAt: new Date().toISOString() } : c));
  }

  if (contracts.length === 0) {
    return <div className="text-sm text-slate-500">契約はありません。</div>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {contracts.map(contract => (
        <div key={contract.id} className="rounded-2xl border p-4 space-y-3">
          {editId === contract.id ? (
            // 編集モード
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">プラン名</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={editForm.planName ?? ""}
                    onChange={e => setEditForm({ ...editForm, planName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">月額料金（円）</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={editForm.monthlyFee ?? 0}
                    onChange={e => setEditForm({ ...editForm, monthlyFee: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">ステータス</label>
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={editForm.status ?? "active"}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="pending">申込中</option>
                    <option value="active">有効</option>
                    <option value="canceled">解約</option>
                    <option value="suspended">停止</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">開始日</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={editForm.startedAt ?? ""}
                    onChange={e => setEditForm({ ...editForm, startedAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">契約確定日</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={editForm.confirmedAt ?? ""}
                    onChange={e => setEditForm({ ...editForm, confirmedAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border px-4 py-2 text-sm text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(contract.id)}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          ) : (
            // 表示モード
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{contract.planName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">契約番号: {contract.contractNumber}</div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusLabel(contract.status).cls}`}>
                  {statusLabel(contract.status).label}
                </span>
              </div>
              <div className="text-sm text-slate-700">月額: {Number(contract.monthlyFee).toLocaleString()}円</div>
              {contract.startedAt && (
                <div className="text-xs text-slate-500">開始日: {new Date(contract.startedAt).toLocaleDateString("ja-JP")}</div>
              )}
              {contract.confirmedAt && (
                <div className="text-xs text-slate-500">確定日: {new Date(contract.confirmedAt).toLocaleDateString("ja-JP")}</div>
              )}
              {contract.canceledAt && (
                <div className="text-xs text-red-500">解約日: {new Date(contract.canceledAt).toLocaleDateString("ja-JP")}</div>
              )}
              {contract.status !== "canceled" && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startEdit(contract)}
                    className="rounded-xl border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelContract(contract.id)}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
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
