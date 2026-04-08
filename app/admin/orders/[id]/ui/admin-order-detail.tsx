"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderDetail = {
  id: string; orderNumber: string; status: string; subtotalAmount: number; usedPoints: number; totalAmount: number; orderedAt: string;
  user: { memberCode: string; name: string; email: string };
  items: Array<{ id: string; productName: string; unitPrice: number; quantity: number; lineAmount: number }>;
};

export default function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [hasLabel, setHasLabel] = useState<boolean | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function fetchOrder() {
    const res = await fetch(`/api/admin/orders/${orderId}`);
    setLoading(false);
    if (!res.ok) { setError("注文詳細の取得に失敗しました。"); return; }
    const result = await res.json();
    setData(result);
    setStatus(result.status);
    // 発送伝票の有無を確認
    fetch(`/api/admin/shipping-labels?orderId=${orderId}`)
      .then(r => r.ok ? r.json() : [])
      .then((labels: { orderId: string }[]) => {
        setHasLabel(labels.some(l => l.orderId === orderId));
      })
      .catch(() => setHasLabel(false));
  }

  useEffect(() => { void fetchOrder(); }, [orderId]);

  async function createShippingLabel() {
    if (!data) return;
    setCreatingLabel(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/shipping-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setCreatingLabel(false);
    if (!res.ok) {
      const r = await res.json().catch(() => null);
      setError(r?.error || "発送伝票の作成に失敗しました");
      return;
    }
    setMessage("発送伝票を作成しました。「発送伝票管理」ページで確認・印刷できます。");
    setHasLabel(true);
  }

  async function saveStatus() {
    setSaving(true); setError(""); setMessage("");
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSaving(false);
    if (!res.ok) { setError("状態更新に失敗しました。"); return; }
    setMessage("注文状態を更新しました。");
    await fetchOrder();
  }

  async function cancelOrder() {
    if (!confirm("この注文を管理者キャンセルしますか？利用ポイントは会員へ返却されます。")) return;
    setCanceling(true); setError(""); setMessage("");
    const res = await fetch(`/api/admin/orders/${orderId}/cancel`, { method: "POST" });
    setCanceling(false);
    if (!res.ok) { const r = await res.json().catch(()=>null); setError(r?.error || "キャンセルに失敗しました。"); return; }
    const result = await res.json();
    setMessage(`注文をキャンセルしました。返却ポイント: ${Number(result.returnedPoints).toLocaleString()}pt`);
    await fetchOrder();
  }

  if (loading) return <div className="text-slate-700">読み込み中...</div>;
  if (error && !data) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          <div>注文番号: <span className="font-medium">{data.orderNumber}</span></div>
          <div>日時: {new Date(data.orderedAt).toLocaleString("ja-JP")}</div>
          <div>会員: {data.user.memberCode} / {data.user.name}</div>
          <div>現在状態: <span className="font-medium">{data.status}</span></div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          <div>小計: {data.subtotalAmount.toLocaleString()}円</div>
          <div>利用ポイント: {data.usedPoints.toLocaleString()}pt</div>
          <div className="font-semibold text-slate-800">支払額: {data.totalAmount.toLocaleString()}円</div>
        </div>
      </div>
      <div className="space-y-2">
        {data.items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium text-slate-800">
            <span>{item.productName} × {item.quantity}</span>
            <span>{item.lineAmount.toLocaleString()}円</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border p-4 space-y-3">
        <label className="block text-sm font-medium">注文状態を変更</label>
        <div className="flex flex-col gap-3 md:flex-row">
          <select className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={status} onChange={e => setStatus(e.target.value)}>
            {["created","paid","shipped","completed","canceled"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={saveStatus} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50 whitespace-nowrap">{saving ? "保存中..." : "状態を保存"}</button>
          {data.status !== "canceled" && (
            <button type="button" onClick={cancelOrder} disabled={canceling} className="rounded-xl border border-red-200 px-5 py-3 text-sm text-red-600 disabled:opacity-50 whitespace-nowrap">{canceling ? "処理中..." : "キャンセル / 返金"}</button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
      </div>

      {/* 発送伝票セクション */}
      <div className="rounded-2xl border p-4 space-y-3">
        <label className="block text-sm font-medium">発送伝票</label>
        {hasLabel === null ? (
          <div className="text-sm text-slate-400">確認中...</div>
        ) : hasLabel ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-600 font-medium">✅ 発送伝票が作成済みです</span>
            <Link
              href="/admin/shipping-labels"
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 transition-colors"
            >
              伝票管理ページへ →
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void createShippingLabel()}
              disabled={creatingLabel || data?.status === "canceled"}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm text-white hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
            >
              {creatingLabel ? "作成中..." : "📦 発送伝票を作成"}
            </button>
            <span className="text-xs text-slate-400">注文者の住所・氏名が自動でセットされます</span>
          </div>
        )}
      </div>

      {/* 納品書PDFダウンロード */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">納品書PDF</label>
        <a
          href={`/api/admin/pdf/invoice?orderId=${orderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-500 px-5 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
        >
          <i className="fas fa-file-pdf"></i>
          納品書をダウンロード
        </a>
      </div>
    </div>
  );
}
