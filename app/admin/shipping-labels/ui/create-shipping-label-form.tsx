"use client";

import { useEffect, useState, FormEvent } from "react";

type OrderOption = {
  id: string;
  orderNumber: string;
  status: string;
  orderedAt: string;
  user: { name: string; memberCode: string };
  hasLabel: boolean;
};

export default function CreateShippingLabelForm() {
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderId, setOrderId] = useState("");
  const [carrier, setCarrier] = useState("yamato");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/orders")
      .then(r => r.json())
      .then(data => {
        // shippingLabel の有無を確認するため別途取得
        fetch("/api/admin/shipping-labels")
          .then(r => r.json())
          .then((labels: { orderId: string }[]) => {
            const labelOrderIds = new Set(labels.map(l => l.orderId));
            setOrders(
              data
                .filter((o: { status: string }) => o.status !== "canceled")
                .map((o: { id: string; orderNumber: string; status: string; orderedAt: string; user: { name: string; memberCode: string } }) => ({
                  id: o.id,
                  orderNumber: o.orderNumber,
                  status: o.status,
                  orderedAt: o.orderedAt,
                  user: o.user,
                  hasLabel: labelOrderIds.has(o.id),
                }))
            );
            setLoadingOrders(false);
          });
      })
      .catch(() => setLoadingOrders(false));
  }, [message]); // message変化時（作成後）に再取得

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!orderId) { setError("注文を選択してください"); return; }

    setSaving(true);
    const res = await fetch("/api/admin/shipping-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, carrier, note: note || undefined }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "作成に失敗しました");
      return;
    }

    const data = await res.json();
    setMessage(`✅ 発送伝票を作成しました（注文番号: ${data.orderNumber}）`);
    setOrderId("");
    setNote("");
  }

  // 伝票未作成の注文だけ表示
  const availableOrders = orders.filter(o => !o.hasLabel);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 注文選択 */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            注文を選択 <span className="text-red-500">*</span>
          </label>
          {loadingOrders ? (
            <div className="text-sm text-slate-400">注文読み込み中...</div>
          ) : (
            <select
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
            >
              <option value="">-- 注文を選択 --</option>
              {availableOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} / {o.user.memberCode} {o.user.name} /
                  {new Date(o.orderedAt).toLocaleDateString("ja-JP")} / {o.status}
                </option>
              ))}
            </select>
          )}
          {!loadingOrders && availableOrders.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">伝票未作成の注文はありません。</p>
          )}
        </div>

        {/* 配送業者 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">配送業者</label>
          <select
            className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={carrier}
            onChange={e => setCarrier(e.target.value)}
          >
            <option value="yamato">🚚 ヤマト運輸</option>
            <option value="sagawa">📦 佐川急便</option>
            <option value="japan_post">📮 日本郵便</option>
          </select>
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">メモ（任意）</label>
        <input
          placeholder="特記事項など"
          className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">⚠️ {error}</div>}
      {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{message}</div>}

      <button
        type="submit"
        disabled={saving || !orderId}
        className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "作成中..." : "📦 発送伝票を作成"}
      </button>
    </form>
  );
}
