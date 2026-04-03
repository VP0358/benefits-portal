"use client";

import { FormEvent, useState } from "react";

export default function ContractForm({ userId }: { userId: string }) {
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    contractNumber: "",
    planName: "",
    monthlyFee: 0,
    status: "active",
    startedAt: "",
    confirmedAt: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        ...form,
        monthlyFee: Number(form.monthlyFee),
        startedAt:  form.startedAt   || null,
        confirmedAt: form.confirmedAt || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "契約登録に失敗しました。");
      return;
    }
    setSuccess("✅ 契約を登録しました。");
    setForm({ contractNumber: "", planName: "", monthlyFee: 0, status: "active", startedAt: "", confirmedAt: "" });
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className={labelClass}>契約番号</label>
          <input
            required
            className={inputClass}
            placeholder="例: C-20260401"
            value={form.contractNumber}
            onChange={e => setForm({ ...form, contractNumber: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>プラン名</label>
          <input
            required
            className={inputClass}
            placeholder="例: スタンダード"
            value={form.planName}
            onChange={e => setForm({ ...form, planName: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>月額料金（円）</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={form.monthlyFee}
            onChange={e => setForm({ ...form, monthlyFee: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelClass}>状態</label>
          <select
            className={inputClass}
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            <option value="pending">申込中</option>
            <option value="active">有効</option>
            <option value="canceled">解約</option>
            <option value="suspended">停止</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>開始日</label>
          <input
            type="date"
            className={inputClass}
            value={form.startedAt}
            onChange={e => setForm({ ...form, startedAt: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>契約確定日</label>
          <input
            type="date"
            className={inputClass}
            value={form.confirmedAt}
            onChange={e => setForm({ ...form, confirmedAt: e.target.value })}
          />
        </div>
      </div>

      {error   && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{success}</p>}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {saving ? "登録中..." : "契約を登録"}
        </button>
      </div>
    </form>
  );
}
