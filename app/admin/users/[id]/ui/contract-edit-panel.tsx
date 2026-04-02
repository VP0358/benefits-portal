"use client";

import { useState } from "react";

type Contract = {
  id: string;
  contractNumber: string;
  planName: string;
  monthlyFee: number;
  status: string;
  startedAt: string | null;
  canceledAt: string | null;
};

export default function ContractEditPanel({ contracts, onUpdate }: {
  contracts: Contract[];
  onUpdate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Contract>>({});
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  function startEdit(c: Contract) {
    setEditingId(c.id);
    setForm({ planName: c.planName, monthlyFee: c.monthlyFee, status: c.status });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/admin/contracts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditingId(null);
    onUpdate();
  }

  async function cancelContract(id: string) {
    if (!confirm("この契約を解約しますか？")) return;
    setCancelingId(id);
    await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
    setCancelingId(null);
    onUpdate();
  }

  const statusLabel: Record<string, string> = {
    pending: "申込中", active: "有効", canceled: "解約済", suspended: "停止中",
  };
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    active: "bg-emerald-50 text-emerald-700",
    canceled: "bg-red-50 text-red-600",
    suspended: "bg-slate-100 text-slate-700",
  };

  if (contracts.length === 0) {
    return <div className="text-sm text-slate-700">契約はありません。</div>;
  }

  return (
    <div className="space-y-3">
      {contracts.map(c => (
        <div key={c.id} className="rounded-2xl border p-4">
          {editingId === c.id ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-700">プラン名</label>
                <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-800"
                  value={form.planName || ""}
                  onChange={e => setForm({ ...form, planName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-700">月額（円）</label>
                <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-800"
                  value={form.monthlyFee || 0}
                  onChange={e => setForm({ ...form, monthlyFee: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-slate-700">ステータス</label>
                <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-800"
                  value={form.status || ""}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">申込中</option>
                  <option value="active">有効</option>
                  <option value="suspended">停止中</option>
                  <option value="canceled">解約済</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveEdit(c.id)} disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs text-white disabled:opacity-50">
                  {saving ? "保存中..." : "保存"}
                </button>
                <button onClick={() => setEditingId(null)}
                  className="rounded-xl border px-4 py-2 text-xs text-slate-800">キャンセル</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">{c.planName}</div>
                  <div className="text-xs text-slate-700 mt-0.5">契約番号: {c.contractNumber}</div>
                  <div className="text-sm text-slate-700 mt-1">月額: {c.monthlyFee.toLocaleString()}円</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${statusColor[c.status] || "bg-slate-100 text-slate-700"}`}>
                  {statusLabel[c.status] || c.status}
                </span>
              </div>
              {c.status !== "canceled" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => startEdit(c)}
                    className="rounded-xl border px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50">
                    編集
                  </button>
                  <button onClick={() => cancelContract(c.id)} disabled={cancelingId === c.id}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                    {cancelingId === c.id ? "処理中..." : "解約する"}
                  </button>
                </div>
              )}
              {c.canceledAt && (
                <div className="mt-2 text-xs text-slate-700">
                  解約日: {new Date(c.canceledAt).toLocaleDateString("ja-JP")}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
