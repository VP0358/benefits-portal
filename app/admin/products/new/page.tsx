"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "../ui/product-image-upload";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", price: 0, imageUrl: "", isActive: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, description: form.description || null, imageUrl: form.imageUrl || null }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(()=>null); setError(d?.error || "保存に失敗しました。"); return; }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <main className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">商品新規追加</h1>
      <div>
        <label className="mb-1 block text-sm font-medium">商品名 <span className="text-red-500">*</span></label>
        <input required className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">説明</label>
        <textarea className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">価格（円）</label>
        <input type="number" min="0" className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">画像</label>
        <ImageUpload value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />公開する
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={() => router.push("/admin/products")} className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-800">戻る</button>
        <button onClick={submit} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? "保存中..." : "保存する"}</button>
      </div>
    </main>
  );
}
