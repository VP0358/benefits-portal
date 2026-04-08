"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Product = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrice = (product: Product) => {
    setEditingId(product.id);
    setEditPrice(product.price);
  };

  const handleSavePrice = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: product.code,
          name: product.name,
          description: product.description,
          price: editPrice,
          imageUrl: null,
          isActive: product.isActive,
        }),
      });

      if (res.ok) {
        await loadProducts();
        setEditingId(null);
        alert("価格を更新しました");
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Failed to update price:", error);
      alert("エラーが発生しました");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice(0);
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="text-center py-8 text-slate-600">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">商品管理</h1>
          <p className="mt-2 text-sm text-slate-600">
            商品コード・商品名・金額を管理します
          </p>
        </div>
        <Link 
          href="/admin/products/new" 
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 transition"
        >
          <i className="fas fa-plus mr-2"></i>
          新規追加
        </Link>
      </div>

      {/* 商品一覧テーブル */}
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[150px_1fr_150px_80px_120px] gap-4 border-b px-6 py-4 font-semibold text-slate-700 text-sm bg-slate-50">
          <div>商品コード</div>
          <div>商品名</div>
          <div>価格</div>
          <div>状態</div>
          <div>操作</div>
        </div>

        {products.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-700 text-sm">
            商品がありません
          </div>
        )}

        {products.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[150px_1fr_150px_80px_120px] gap-4 border-b px-6 py-4 text-sm hover:bg-slate-50 transition"
          >
            {/* 商品コード */}
            <div>
              <div className="font-mono text-slate-600 font-semibold">
                {p.code || "-"}
              </div>
            </div>

            {/* 商品名 */}
            <div>
              <div className="font-semibold text-slate-800">{p.name}</div>
              {p.description && (
                <div className="text-xs text-slate-500 mt-1">{p.description}</div>
              )}
            </div>

            {/* 価格（インライン編集） */}
            <div>
              {editingId === p.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-24 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="text-slate-600">円</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">
                    {p.price.toLocaleString()}円
                  </span>
                  <button
                    onClick={() => handleEditPrice(p)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                    title="価格を編集"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                </div>
              )}
            </div>

            {/* 状態 */}
            <div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  p.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {p.isActive ? "公開" : "非公開"}
              </span>
            </div>

            {/* 操作 */}
            <div className="flex gap-2">
              {editingId === p.id ? (
                <>
                  <button
                    onClick={() => handleSavePrice(p.id)}
                    className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    キャンセル
                  </button>
                </>
              ) : (
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  編集
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
