"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductImageUpload from "../../ui/product-image-upload";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<{ name: string; description: string; price: number; imageUrl: string; isActive: boolean } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products`)
      .then(r => r.json())
      .then((list: { id: string; name: string; description: string | null; price: number; imageUrl: string | null; isActive: boolean }[]) => {
        const p = list.find(x => x.id.toString() === params.id);
        if (p) setData({ name: p.name, description: p.description || "", price: p.price, imageUrl: p.imageUrl || "", isActive: p.isActive });
      });
  }, [params.id]);

  async function save() {
    if (!data) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/products/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, description: data.description || null, imageUrl: data.imageUrl || null }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error || "更新に失敗しました。"); return; }
    router.push("/admin/products");
    router.refresh();
  }

  if (!data) return <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-700">読み込み中...</div>;

  return (
    <main className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">商品編集</h1>
      <div>
        <label className="mb-1 block text-sm font-medium">商品名</label>
        <input className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">説明</label>
        <textarea className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" rows={3} value={data.description} onChange={e => setData({ ...data, description: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">価格（円）</label>
        <input type="number" min="0" className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={data.price} onChange={e => setData({ ...data, price: Number(e.target.value) })} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">画像</label>
        <ProductImageUpload value={data.imageUrl} onChange={url => setData({ ...data, imageUrl: url })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.isActive} onChange={e => setData({ ...data, isActive: e.target.checked })} />公開する
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={() => router.push("/admin/products")} className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-800">戻る</button>
        <button onClick={save} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? "更新中..." : "更新する"}</button>
      </div>
    </main>
  );
}
