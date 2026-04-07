"use client";

import { useEffect, useState, useCallback } from "react";

type ShippingLabel = {
  id: string;
  orderId: string;
  orderNumber: string;
  carrier: "yamato" | "sagawa" | "japan_post";
  trackingNumber: string | null;
  status: "pending" | "printed" | "shipped" | "canceled";
  recipientName: string;
  recipientPhone: string;
  recipientPostal: string;
  recipientAddress: string;
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  itemDescription: string;
  itemCount: number;
  printedAt: string | null;
  shippedAt: string | null;
  note: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    orderedAt: string;
    user: { id: string; memberCode: string; name: string; phone: string | null };
    items: { productName: string; quantity: number }[];
  };
};

const CARRIER_LABELS: Record<string, string> = {
  yamato: "🚚 ヤマト運輸",
  sagawa: "📦 佐川急便",
  japan_post: "📮 日本郵便",
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  pending:  { label: "未印刷",  class: "bg-amber-50 text-amber-700 border-amber-200" },
  printed:  { label: "印刷済み", class: "bg-blue-50 text-blue-700 border-blue-200" },
  shipped:  { label: "発送済み", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  canceled: { label: "キャンセル", class: "bg-red-50 text-red-700 border-red-200" },
};

export default function ShippingLabelList() {
  const [labels, setLabels] = useState<ShippingLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [printTarget, setPrintTarget] = useState<ShippingLabel | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCarrier) params.set("carrier", filterCarrier);
    const res = await fetch(`/api/admin/shipping-labels?${params.toString()}`);
    if (!res.ok) { setError("取得に失敗しました"); setLoading(false); return; }
    const data = await res.json();
    setLabels(data);
    setLoading(false);
  }, [filterStatus, filterCarrier]);

  useEffect(() => { void fetchLabels(); }, [fetchLabels]);

  async function updateStatus(id: string, status: string, trackingNumber?: string) {
    setSaving(id);
    const body: Record<string, string> = { status };
    if (trackingNumber !== undefined) body.trackingNumber = trackingNumber;
    const res = await fetch(`/api/admin/shipping-labels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    if (!res.ok) { setMessage("更新に失敗しました"); return; }
    setMessage("更新しました");
    setTimeout(() => setMessage(""), 3000);
    await fetchLabels();
  }

  async function saveTracking(id: string) {
    const tracking = trackingInputs[id] ?? "";
    await updateStatus(id, labels.find(l => l.id === id)?.status ?? "printed", tracking);
  }

  function handlePrint(label: ShippingLabel) {
    setPrintTarget(label);
    // 印刷後にステータスを「印刷済み」に更新
    setTimeout(() => {
      window.print();
      updateStatus(label.id, "printed").catch(console.error);
    }, 300);
  }

  if (loading) return <div className="text-slate-700">読み込み中...</div>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <>
      {/* 印刷プレビュー（非表示） */}
      {printTarget && (
        <div id="print-area" style={{ display: "none" }}>
          <PrintLabel label={printTarget} />
        </div>
      )}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-area { display: block !important; }
        }
      `}</style>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="rounded-xl border px-4 py-2 text-sm text-slate-800"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">全ステータス</option>
          <option value="pending">未印刷</option>
          <option value="printed">印刷済み</option>
          <option value="shipped">発送済み</option>
          <option value="canceled">キャンセル</option>
        </select>
        <select
          className="rounded-xl border px-4 py-2 text-sm text-slate-800"
          value={filterCarrier}
          onChange={e => setFilterCarrier(e.target.value)}
        >
          <option value="">全配送業者</option>
          <option value="yamato">ヤマト運輸</option>
          <option value="sagawa">佐川急便</option>
          <option value="japan_post">日本郵便</option>
        </select>
        <button
          onClick={() => void fetchLabels()}
          className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          🔄 更新
        </button>
        {message && <span className="self-center text-sm text-emerald-600 font-medium">{message}</span>}
      </div>

      {labels.length === 0 ? (
        <div className="text-sm text-slate-500">発送伝票はありません。</div>
      ) : (
        <div className="space-y-4">
          {labels.map(label => {
            const statusInfo = STATUS_LABELS[label.status] ?? STATUS_LABELS.pending;
            return (
              <div key={label.id} className="rounded-2xl border bg-white p-5 space-y-4">
                {/* ヘッダー行 */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-800">{label.orderNumber}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(label.createdAt).toLocaleString("ja-JP")} 作成
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{CARRIER_LABELS[label.carrier]}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* 送り先・差出人 */}
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 p-3 space-y-1">
                    <div className="font-semibold text-blue-800 text-xs">📬 送り先</div>
                    <div className="font-medium text-slate-800">{label.recipientName}</div>
                    <div className="text-slate-600">{label.recipientPhone}</div>
                    <div className="text-slate-600">〒{label.recipientPostal}</div>
                    <div className="text-slate-600">{label.recipientAddress}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                    <div className="font-semibold text-slate-600 text-xs">📤 差出人</div>
                    <div className="font-medium text-slate-800">{label.senderName}</div>
                    <div className="text-slate-600">{label.senderPhone}</div>
                    <div className="text-slate-600">〒{label.senderPostal}</div>
                    <div className="text-slate-600">{label.senderAddress}</div>
                  </div>
                </div>

                {/* 品名 */}
                <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  品名: <span className="font-medium">{label.itemDescription}</span> × {label.itemCount}個
                </div>

                {/* 注文品目 */}
                <div className="text-xs text-slate-500">
                  注文商品: {label.order.items.map(i => `${i.productName}×${i.quantity}`).join("、")}
                </div>

                {/* 追跡番号 */}
                <div className="flex gap-2">
                  <input
                    placeholder="追跡番号を入力"
                    className="flex-1 rounded-xl border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={trackingInputs[label.id] ?? label.trackingNumber ?? ""}
                    onChange={e => setTrackingInputs(prev => ({ ...prev, [label.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => void saveTracking(label.id)}
                    disabled={saving === label.id}
                    className="rounded-xl bg-slate-600 px-4 py-2 text-sm text-white disabled:opacity-50 whitespace-nowrap"
                  >
                    {saving === label.id ? "保存中..." : "番号保存"}
                  </button>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handlePrint(label)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                  >
                    🖨️ 伝票印刷
                  </button>
                  {label.status !== "shipped" && label.status !== "canceled" && (
                    <button
                      onClick={() => void updateStatus(label.id, "shipped")}
                      disabled={saving === label.id}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      ✅ 発送済みにする
                    </button>
                  )}
                  {label.status === "pending" && (
                    <button
                      onClick={() => void updateStatus(label.id, "canceled")}
                      disabled={saving === label.id}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      ✕ キャンセル
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** 印刷用伝票コンポーネント */
function PrintLabel({ label }: { label: ShippingLabel }) {
  const carrierMap: Record<string, string> = {
    yamato: "ヤマト運輸",
    sagawa: "佐川急便",
    japan_post: "日本郵便",
  };

  return (
    <div style={{
      width: "148mm",
      minHeight: "105mm",
      padding: "8mm",
      fontFamily: "'Noto Sans JP', sans-serif",
      fontSize: "11pt",
      border: "2px solid #000",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
    }}>
      {/* 配送業者 */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "14pt", marginBottom: "6mm", borderBottom: "1px solid #000", paddingBottom: "3mm" }}>
        {carrierMap[label.carrier] ?? label.carrier}　配達伝票
      </div>

      {/* 送り先 */}
      <div style={{ marginBottom: "5mm" }}>
        <div style={{ fontSize: "9pt", color: "#555", marginBottom: "1mm" }}>【お届け先】</div>
        <div style={{ fontWeight: "bold", fontSize: "16pt" }}>{label.recipientName} 様</div>
        <div>〒{label.recipientPostal}</div>
        <div>{label.recipientAddress}</div>
        <div>TEL: {label.recipientPhone}</div>
      </div>

      <hr style={{ margin: "4mm 0", borderTop: "1px dashed #000" }} />

      {/* 差出人 */}
      <div style={{ marginBottom: "4mm" }}>
        <div style={{ fontSize: "9pt", color: "#555", marginBottom: "1mm" }}>【差出人】</div>
        <div style={{ fontWeight: "600" }}>{label.senderName}</div>
        <div>〒{label.senderPostal}</div>
        <div>{label.senderAddress}</div>
        <div>TEL: {label.senderPhone}</div>
      </div>

      {/* 品名・注文番号 */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9pt", borderTop: "1px solid #ccc", paddingTop: "3mm", marginTop: "3mm" }}>
        <div>品名: {label.itemDescription} × {label.itemCount}個</div>
        <div>注文番号: {label.orderNumber}</div>
      </div>

      {/* 追跡番号 */}
      {label.trackingNumber && (
        <div style={{ textAlign: "center", marginTop: "3mm", fontSize: "10pt", fontWeight: "bold" }}>
          追跡番号: {label.trackingNumber}
        </div>
      )}
    </div>
  );
}
