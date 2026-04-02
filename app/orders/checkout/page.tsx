"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; description: string | null; price: number; imageUrl: string | null };

export default function OrderCheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [usePoints, setUsePoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/member/products").then(r => r.json()).then((d: Product[]) => { setProducts(d); if (d.length > 0) setProductId(d[0].id); });
  }, []);

  const selectedProduct = useMemo(() => products.find(p => p.id === productId) || null, [products, productId]);
  const subtotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const total = Math.max(subtotal - usePoints, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/member/orders/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ productId, quantity: Number(quantity) }], usePoints: Number(usePoints) }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(()=>null); setError(d?.error || "注文作成に失敗しました。"); return; }
    const data = await res.json();
    setMessage(`注文完了: ${data.orderNumber} / 支払額 ${Number(data.totalAmount).toLocaleString()}円`);
    setUsePoints(0); setQuantity(1);
  }

  return (
    <main className="min-h-screen bg-[#e6f2dc] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm space-y-5">
        <h1 className="text-2xl font-bold text-slate-800">商品注文</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">商品</label>
            <select className="w-full rounded-xl border px-4 py-3 text-sm" value={productId} onChange={e => setProductId(e.target.value)}>
              {products.length === 0 && <option>商品を読み込み中...</option>}
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString()}円)</option>)}
            </select>
          </div>
          {selectedProduct?.imageUrl && <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-28 w-28 rounded-xl object-cover" />}
          <div>
            <label className="mb-1 block text-sm font-medium">数量</label>
            <input type="number" min="1" className="w-full rounded-xl border px-4 py-3" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">利用ポイント</label>
            <input type="number" min="0" className="w-full rounded-xl border px-4 py-3" value={usePoints} onChange={e => setUsePoints(Number(e.target.value))} />
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
            <div>小計: {subtotal.toLocaleString()}円</div>
            <div>利用ポイント: {usePoints.toLocaleString()}pt</div>
            <div className="font-semibold text-slate-800">支払額: {total.toLocaleString()}円</div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-900 py-3 text-white disabled:opacity-50">{loading ? "注文中..." : "注文を確定する"}</button>
        </form>
        <a href="/dashboard" className="block text-center text-sm text-slate-500">← ダッシュボードに戻る</a>
      </div>
    </main>
  );
}
