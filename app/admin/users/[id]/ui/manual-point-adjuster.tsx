"use client";

import { FormEvent, useState } from "react";

export default function ManualPointAdjuster({ userId }: { userId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ pointSourceType: "manual", mode: "add", points: 0, description: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/points/manual-adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...form, points: Number(form.points) }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "ポイント調整に失敗しました。");
      return;
    }
    setSuccess("ポイントを更新しました。ページを再読み込みすると残高に反映されます。");
    setForm({ pointSourceType: "manual", mode: "add", points: 0, description: "" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">ポイント区分</label>
          <select className="w-full rounded-xl border px-4 py-3 text-sm" value={form.pointSourceType} onChange={e => setForm({ ...form, pointSourceType: e.target.value })}>
            <option value="manual">手動ポイント</option>
            <option value="external">外部ポイント</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">操作種別</label>
          <select className="w-full rounded-xl border px-4 py-3 text-sm" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
            <option value="add">加算</option>
            <option value="subtract">減算</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">ポイント数</label>
          <input type="number" min="1" required className="w-full rounded-xl border px-4 py-3 text-sm" value={form.points} onChange={e => setForm({ ...form, points: Number(e.target.value) })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">理由</label>
          <input required placeholder="例: 外部ポイント反映" className="w-full rounded-xl border px-4 py-3 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? "更新中..." : "ポイントを更新"}</button>
      </div>
    </form>
  );
}
