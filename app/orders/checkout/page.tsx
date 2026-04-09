"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

type Product = { id: string; name: string; description: string | null; price: number; imageUrl: string | null };

export default function OrderCheckoutPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity]   = useState(1);
  const [usePoints, setUsePoints] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [message, setMessage]     = useState("");

  useEffect(() => {
    fetch("/api/member/products")
      .then(r => r.json())
      .then((d: Product[]) => { setProducts(d); if (d.length > 0) setProductId(d[0].id); });
  }, []);

  const selectedProduct = useMemo(() => products.find(p => p.id === productId) || null, [products, productId]);
  const subtotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const total    = Math.max(subtotal - usePoints, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const res = await fetch("/api/member/orders/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ productId, quantity: Number(quantity) }], usePoints: Number(usePoints) }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "注文作成に失敗しました。");
      return;
    }
    const data = await res.json();
    setMessage(`注文完了: ${data.orderNumber} / 支払額 ${Number(data.totalAmount).toLocaleString()}円`);
    setUsePoints(0); setQuantity(1);
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>商品注文</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {/* 商品選択カード */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.22)", boxShadow: "0 4px 20px rgba(10,22,40,0.08)" }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>
            </div>
            <h2 className="text-sm font-bold font-jp" style={{ color: NAVY }}>注文内容</h2>
          </div>

          <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">

            {/* 商品選択 */}
            <div>
              <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                商品を選択 <span style={{ color: "#f87171" }}>*</span>
              </label>
              <select
                className="w-full rounded-xl px-4 py-3 text-sm font-jp focus:outline-none appearance-none"
                style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                value={productId}
                onChange={e => setProductId(e.target.value)}>
                {products.length === 0 && <option>商品を読み込み中...</option>}
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (¥{p.price.toLocaleString()})</option>
                ))}
              </select>
            </div>

            {/* 商品画像 */}
            {selectedProduct?.imageUrl && (
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name}
                className="h-28 w-28 rounded-xl object-cover"
                style={{ border: `1px solid ${GOLD}25` }}/>
            )}

            {/* 商品説明 */}
            {selectedProduct?.description && (
              <p className="text-xs font-jp" style={{ color: `${NAVY}55` }}>{selectedProduct.description}</p>
            )}

            {/* 数量 */}
            <div>
              <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>数量</label>
              <input type="number" min="1"
                className="w-full rounded-xl px-4 py-3 text-base font-bold focus:outline-none"
                style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}/>
            </div>

            {/* ポイント利用 */}
            <div>
              <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                利用ポイント <span className="font-normal" style={{ color: `${NAVY}40` }}>（任意）</span>
              </label>
              <input type="number" min="0"
                className="w-full rounded-xl px-4 py-3 text-base focus:outline-none"
                style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                value={usePoints}
                onChange={e => setUsePoints(Number(e.target.value))}/>
            </div>

            {/* 金額サマリー */}
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: `${NAVY}08`, border: `1px solid rgba(10,22,40,0.10)` }}>
              <div className="flex justify-between text-sm font-jp" style={{ color: `${NAVY}60` }}>
                <span>小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              {usePoints > 0 && (
                <div className="flex justify-between text-sm font-jp" style={{ color: `${NAVY}60` }}>
                  <span>利用ポイント</span>
                  <span style={{ color: "#34d399" }}>－{usePoints.toLocaleString()}pt</span>
                </div>
              )}
              <div className="h-px" style={{ background: `${GOLD}25` }}/>
              <div className="flex justify-between font-jp font-bold text-base" style={{ color: NAVY }}>
                <span>お支払額</span>
                <span style={{ color: NAVY }}>¥{total.toLocaleString()}</span>
              </div>
            </div>

            {/* メッセージ */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-jp font-semibold"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                ⚠ {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl px-4 py-3 text-sm font-jp font-semibold"
                style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
                ✓ {message}
              </div>
            )}

            {/* 送信ボタン */}
            <button type="submit" disabled={loading || !productId}
              className="w-full py-4 rounded-2xl text-white font-bold text-base font-jp disabled:opacity-50 transition"
              style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
              {loading ? "注文処理中..." : "注文を確定する"}
            </button>
          </form>
        </div>

        {/* 戻るリンク */}
        <Link href="/dashboard"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-jp font-semibold transition"
          style={{ background: "rgba(10,22,40,0.06)", border: `1px solid rgba(10,22,40,0.10)`, color: `${NAVY}70` }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          ダッシュボードに戻る
        </Link>

      </main>
    </div>
  );
}
