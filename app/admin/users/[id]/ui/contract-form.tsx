"use client";

import { FormEvent, useState } from "react";

export default function ContractForm({ userId }: { userId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ contractNumber: "", planName: "", monthlyFee: 0, status: "active", startedAt: "", confirmedAt: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...form, monthlyFee: Number(form.monthlyFee), startedAt: form.startedAt || null, confirmedAt: form.confirmedAt || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "契約登録に失敗しました。");
      return;
    }
    setSuccess("契約を登録しました。ページを再読み込みすると一覧に反映されます。");
    setForm({ contractNumber: "", planName: "", monthlyFee: 0, status: "active", startedAt: "", confirmedAt: "" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">契約番号</label>
          <input required className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.contractNumber} onChange={e => setForm({ ...form, contractNumber: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">プラン名</label>
          <input required className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.planName} onChange={e => setForm({ ...form, planName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">月額料金</label>
          <input type="number" min="0" className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.monthlyFee} onChange={e => setForm({ ...form, monthlyFee: Number(e.target.value) })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">状態</label>
          <select className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="pending">申込中</option>
            <option value="active">有効</option>
            <option value="canceled">解約</option>
            <option value="suspended">停止</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">開始日</label>
          <input type="date" className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">契約確定日</label>
          <input type="date" className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.confirmedAt} onChange={e => setForm({ ...form, confirmedAt: e.target.value })} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? "登録中..." : "契約を登録"}</button>
      </div>
    </form>
  );
}
