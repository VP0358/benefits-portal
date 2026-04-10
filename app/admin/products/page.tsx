"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MlmProduct {
  id: string;
  product_code: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  pv: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  product_code: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  pv: string;
  status: string;
}

const INITIAL_FORM: ProductFormData = {
  product_code: "",
  name: "",
  description: "",
  price: "",
  cost: "",
  pv: "",
  status: "active",
};

export default function ProductsManagementPage() {
  const [products, setProducts] = useState<MlmProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // 商品一覧取得
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得エラー");
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 新規追加モーダル表示
  const handleAddNew = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setShowModal(true);
  };

  // 編集モーダル表示
  const handleEdit = (product: MlmProduct) => {
    setEditingId(product.id);
    setFormData({
      product_code: product.product_code,
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "0",
      pv: product.pv.toString(),
      status: product.status,
    });
    setFormError("");
    setShowModal(true);
  };

  // 保存（追加 or 更新）
  const handleSave = async () => {
    setFormError("");

    // バリデーション
    if (!formData.product_code.trim()) {
      setFormError("商品コードを入力してください");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("商品名を入力してください");
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      setFormError("正しい価格を入力してください");
      return;
    }

    setSaving(true);

    try {
      const body = {
        product_code: formData.product_code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        pv: parseInt(formData.pv) || 0,
        status: formData.status,
      };

      let res: Response;
      if (editingId) {
        // 更新
        res = await fetch(`/api/admin/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // 追加
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存エラー");

      // 成功
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 削除
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`商品「${name}」を削除してもよろしいですか？`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "削除エラー");

      alert("削除しました");
      fetchProducts();
    } catch (err: any) {
      alert(`削除エラー: ${err.message}`);
    }
  };

  // 消費税額（10%）
  const taxAmount = (price: number) => Math.floor(price * 0.1);

  // 税込価格計算
  const taxIncludedPrice = (price: number) => Math.floor(price * 1.1);

  // ポイント表示（税抜価格から 1pt = ¥100）
  const calculatePoints = (price: number) => Math.floor(price / 100);

  // ポイント付与対象判定（商品コードが数字のみ && 1000〜2999の範囲）
  const isPointGrantTarget = (productCode: string): boolean => {
    const codeNum = parseInt(productCode, 10)
    if (isNaN(codeNum)) return false
    return codeNum >= 1000 && codeNum <= 2999
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
            Product Management
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">商品マスター管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">商品の登録・編集・価格・PV設定</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #c9a84c, #a88830)", boxShadow: "0 2px 8px rgba(201,168,76,0.35)" }}
        >
          <i className="fas fa-plus text-xs" /> 新規商品追加
        </button>
      </div>

      {/* メインコンテンツ */}
      <main>
        {loading && (
          <div className="text-center py-8 text-gray-600">
            <p className="animate-pulse">読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-medium">❌ {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">商品コード</th>
                    <th className="text-left p-3 font-semibold text-gray-700">商品名</th>
                    <th className="text-right p-3 font-semibold text-gray-700">税抜価格</th>
                    <th className="text-right p-3 font-semibold text-gray-700">消費税（10%）</th>
                    <th className="text-right p-3 font-semibold text-gray-700">税込価格</th>
                    <th className="text-center p-3 font-semibold text-gray-700">ポイント付与</th>
                    <th className="text-right p-3 font-semibold text-gray-700">ポイント数</th>
                    <th className="text-right p-3 font-semibold text-gray-700">原価</th>
                    <th className="text-right p-3 font-semibold text-gray-700">PV</th>
                    <th className="text-left p-3 font-semibold text-gray-700">ステータス</th>
                    <th className="text-left p-3 font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-600">
                        商品が登録されていません
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-800">{p.product_code}</td>
                        <td className="p-3 font-medium text-gray-800">
                          {p.name}
                          {p.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                          )}
                        </td>
                        {/* 税抜価格 */}
                        <td className="p-3 text-right text-gray-800 font-medium">
                          ¥{p.price.toLocaleString()}
                        </td>
                        {/* 消費税（10%） */}
                        <td className="p-3 text-right text-gray-500 text-xs">
                          ¥{taxAmount(p.price).toLocaleString()}
                        </td>
                        {/* 税込価格 */}
                        <td className="p-3 text-right text-gray-700 font-semibold">
                          ¥{taxIncludedPrice(p.price).toLocaleString()}
                        </td>
                        {/* ポイント付与対象 */}
                        <td className="p-3 text-center">
                          {isPointGrantTarget(p.product_code) ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">✓ 対象</span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-500">対象外</span>
                          )}
                        </td>
                        {/* ポイント数（対象のみ表示） */}
                        <td className="p-3 text-right font-semibold text-green-600">
                          {isPointGrantTarget(p.product_code) ? `${calculatePoints(p.price)} pt` : <span className="text-gray-400 text-xs">-</span>}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {p.cost ? `¥${p.cost.toLocaleString()}` : "-"}
                        </td>
                        <td className="p-3 text-right text-gray-700">{p.pv}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              p.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {p.status === "active" ? "有効" : "無効"}
                          </span>
                        </td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                          >
                            ✏️ 編集
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs"
                          >
                            🗑️ 削除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 追加・編集モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "✏️ 商品編集" : "➕ 新規商品追加"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="px-6 py-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-medium">❌ {formError}</p>
                </div>
              )}

              {/* 商品コード */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  商品コード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.product_code}
                  onChange={(e) =>
                    setFormData({ ...formData, product_code: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 1000, 2000, s1000"
                />
                {formData.product_code && (
                  <div className={`mt-1 text-xs font-medium ${isPointGrantTarget(formData.product_code) ? "text-green-600" : "text-gray-500"}`}>
                    {isPointGrantTarget(formData.product_code)
                      ? "✓ ポイント付与対象（商品コード 1000〜2999）"
                      : "✗ ポイント付与対象外（コードが 1000〜2999 の範囲外）"}
                  </div>
                )}
              </div>

              {/* 商品名 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: VIOLA Pure 翠彩-SUMISAI-"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  商品説明（任意）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="商品の詳細説明"
                />
              </div>

              {/* 価格（税抜） */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  税抜価格 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15000"
                  min="0"
                />
                {formData.price && parseFloat(formData.price) > 0 && (
                  <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 space-y-1">
                    <div className="flex justify-between">
                      <span>消費税（10%）</span>
                      <span>¥{taxAmount(parseFloat(formData.price) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>税込価格</span>
                      <span>¥{taxIncludedPrice(parseFloat(formData.price) || 0).toLocaleString()}</span>
                    </div>
                    {isPointGrantTarget(formData.product_code) ? (
                      <div className="flex justify-between text-green-700 font-semibold border-t border-gray-200 pt-1">
                        <span>ポイント付与数（税抜から計算）</span>
                        <span>{calculatePoints(parseFloat(formData.price) || 0)} pt</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-gray-400 border-t border-gray-200 pt-1">
                        <span>ポイント付与</span>
                        <span>対象外</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 原価 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  原価（任意）
                </label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* PV */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  PV（ポイントバリュー）
                </label>
                <input
                  type="number"
                  value={formData.pv}
                  onChange={(e) => setFormData({ ...formData, pv: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="150"
                  min="0"
                />
              </div>

              {/* ステータス */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                </select>
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "保存中..." : editingId ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
