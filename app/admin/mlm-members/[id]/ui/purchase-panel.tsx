"use client";

import { useState, useEffect, useCallback } from "react";

type Purchase = {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  points: number;
  totalPoints: number;
  purchaseMonth: string;
  purchasedAt: string;
};

const PRODUCT_OPTIONS = [
  { code: "1000", name: "[新規]VIOLA Pure 翠彩-SUMISAI-", defaultPts: 165, defaultPrice: 16500 },
  { code: "2000", name: "VIOLA Pure 翠彩-SUMISAI-", defaultPts: 165, defaultPrice: 16500 },
  { code: "s1000", name: "登録料", defaultPts: 0, defaultPrice: 3300 },
  { code: "4000", name: "出荷事務手数料", defaultPts: 0, defaultPrice: 550 },
  { code: "5000", name: "概要書面1部", defaultPts: 0, defaultPrice: 1100 },
];

export default function PurchasePanel({ memberCode }: { memberCode: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [form, setForm] = useState({
    productCode: "2000",
    productName: "VIOLA Pure 翠彩-SUMISAI-",
    month: currentMonth,
    quantity: 1,
    unitPrice: 16500,
    points: 165,
  });

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/product-purchases?memberCode=${memberCode}`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
      }
    } finally {
      setLoading(false);
    }
  }, [memberCode]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  function onProductChange(code: string) {
    const opt = PRODUCT_OPTIONS.find(o => o.code === code);
    if (opt) {
      setForm(f => ({
        ...f,
        productCode: code,
        productName: opt.name,
        unitPrice: opt.defaultPrice,
        points: opt.defaultPts,
      }));
    } else {
      setForm(f => ({ ...f, productCode: code }));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/admin/product-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode,
          productCode: form.productCode,
          productName: form.productName,
          month: form.month,
          quantity: form.quantity,
          unitPrice: form.unitPrice,
          points: form.points,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "追加に失敗しました");
        return;
      }
      setShowForm(false);
      await fetchPurchases();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この購入データを削除しますか？")) return;
    const res = await fetch(`/api/admin/product-purchases?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchPurchases();
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h2 className="text-xl font-bold text-gray-800">
          <i className="fas fa-shopping-bag mr-2"></i>
          購入履歴
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? "✕ キャンセル" : "＋ 購入履歴追加"}
        </button>
      </div>

      {/* 購入データ追加フォーム */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-blue-50 rounded-lg space-y-3">
          <h3 className="font-semibold text-blue-800 text-sm">購入履歴を追加</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">商品</label>
              <select
                value={form.productCode}
                onChange={e => onProductChange(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              >
                {PRODUCT_OPTIONS.map(o => (
                  <option key={o.code} value={o.code}>{o.code} - {o.name}</option>
                ))}
                <option value="custom">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">対象月</label>
              <input
                type="month"
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">数量</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">単価（円）</label>
              <input
                type="number"
                min={0}
                value={form.unitPrice}
                onChange={e => setForm(f => ({ ...f, unitPrice: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ポイント（PV）</label>
              <input
                type="number"
                min={0}
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                合計: <span className="font-bold text-blue-700">{(form.quantity * form.points).toLocaleString()} pt</span>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "追加中..." : "追加する"}
          </button>
        </form>
      )}

      {/* 購入データ一覧 */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : purchases.length === 0 ? (
        <p className="text-gray-500 text-sm">購入データなし</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">対象月</th>
                <th className="px-3 py-2 text-left">商品コード</th>
                <th className="px-3 py-2 text-left">商品名</th>
                <th className="px-3 py-2 text-right">数量</th>
                <th className="px-3 py-2 text-right">単価</th>
                <th className="px-3 py-2 text-right">ポイント</th>
                <th className="px-3 py-2 text-right">合計pt</th>
                <th className="px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{p.purchaseMonth}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.productCode}</td>
                  <td className="px-3 py-2 text-gray-700">{p.productName}</td>
                  <td className="px-3 py-2 text-right">{p.quantity}</td>
                  <td className="px-3 py-2 text-right">¥{p.unitPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{p.points.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-700">{p.totalPoints.toLocaleString()} pt</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-right font-semibold text-gray-700">合計ポイント:</td>
                <td className="px-3 py-2 text-right font-bold text-blue-700">
                  {purchases.reduce((s, p) => s + p.totalPoints, 0).toLocaleString()} pt
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
