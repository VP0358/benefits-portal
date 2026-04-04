"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineAmount: number;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  subtotalAmount: number;
  usedPoints: number;
  totalAmount: number;
  orderedAt: string;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  created:   "受付中",
  pending:   "処理中",
  completed: "完了",
  canceled:  "キャンセル",
};
const STATUS_COLOR: Record<string, string> = {
  created:   "bg-blue-50 text-blue-700",
  pending:   "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  canceled:  "bg-red-50 text-red-600",
};

export default function OrderHistoryList() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/member/orders");
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  async function cancelOrder(orderId: string) {
    if (!confirm("この注文をキャンセルしますか？ポイント利用分は返却されます。")) return;
    const res = await fetch(`/api/member/orders/${orderId}/cancel`, { method: "POST" });
    if (!res.ok) { alert("キャンセルに失敗しました。"); return; }
    alert("キャンセルしました。");
    await fetchOrders();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-green-700 font-bold animate-pulse">読み込み中...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📦</div>
        <p className="text-gray-500 text-sm">使用履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ヘッダー行（テーブル風） */}
      <div className="hidden md:grid grid-cols-[1fr_140px_100px_80px] gap-2 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-200">
        <span>使用科目（商品）</span>
        <span>使用日時</span>
        <span className="text-right">支払金額</span>
        <span className="text-center">状態</span>
      </div>

      {rows.map(row => {
        const isExpanded = expandedId === row.id;
        const statusLabel = STATUS_LABEL[row.status] ?? row.status;
        const statusColor = STATUS_COLOR[row.status] ?? "bg-gray-50 text-gray-600";

        return (
          <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* メイン行 */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : row.id)}
              className="w-full text-left px-4 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                {/* 左: 使用科目 + 日時 */}
                <div className="flex-1 min-w-0">
                  {/* 使用科目（商品名一覧） */}
                  <div className="space-y-0.5">
                    {row.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800 truncate">
                          {item.productName}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-gray-500 flex-shrink-0">× {item.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* 使用日時 */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-gray-500">
                      🕐 {new Date(row.orderedAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[10px] text-gray-400">{row.orderNumber}</span>
                  </div>
                </div>

                {/* 右: 金額 + ステータス */}
                <div className="flex-shrink-0 text-right space-y-1">
                  <div className="text-base font-black text-gray-800">
                    {row.totalAmount.toLocaleString()}
                    <span className="text-xs font-semibold ml-0.5">円</span>
                  </div>
                  {row.usedPoints > 0 && (
                    <div className="text-[10px] text-red-500 font-semibold">
                      -{row.usedPoints.toLocaleString()}pt使用
                    </div>
                  )}
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* 展開インジケーター */}
              <div className="flex justify-center mt-2">
                <span className="text-gray-300 text-xs">{isExpanded ? "▲ 閉じる" : "▼ 詳細"}</span>
              </div>
            </button>

            {/* 展開: 詳細 */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                {/* 商品詳細 */}
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2">使用科目の内訳</p>
                  <div className="space-y-1.5">
                    {row.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-100 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.productName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.unitPrice.toLocaleString()}円 × {item.quantity}個
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{item.lineAmount.toLocaleString()}円</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 金額サマリー */}
                <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>小計</span>
                    <span>{row.subtotalAmount.toLocaleString()}円</span>
                  </div>
                  {row.usedPoints > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>ポイント利用</span>
                      <span>-{row.usedPoints.toLocaleString()}pt</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-100 pt-1.5">
                    <span>お支払い合計</span>
                    <span>{row.totalAmount.toLocaleString()}円</span>
                  </div>
                </div>

                {/* キャンセルボタン */}
                {row.status !== "canceled" && row.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => cancelOrder(row.id)}
                    className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                  >
                    この使用をキャンセルする
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
