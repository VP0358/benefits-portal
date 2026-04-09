"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Purchase = {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  points: number;
  totalPoints: number;
  purchaseStatus: string;
  purchaseMonth: string;
  purchasedAt: string;
  totalAmount: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function MlmPurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-purchases")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then((d) => setPurchases(d.purchases ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalAmount = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalPoints = purchases.reduce((s, p) => s + p.totalPoints, 0);

  // 月ごとにグループ化
  const byMonth: Record<string, Purchase[]> = {};
  purchases.forEach((p) => {
    const m = p.purchaseMonth;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(p);
  });
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-[#e6f2dc]">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-green-600 text-sm font-medium hover:text-green-700">← 戻る</Link>
          <h1 className="text-lg font-bold text-slate-800">📦 購入履歴</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm shadow-sm">{error}</div>}

        {!loading && !error && (
          <>
            {/* サマリー */}
            <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                <div className="text-xs text-blue-500 mb-1">購入件数</div>
                <div className="text-xl font-black text-blue-700">{purchases.length}</div>
                <div className="text-[10px] text-blue-400 mt-0.5">件</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">累計金額</div>
                <div className="text-sm font-black text-slate-700">
                  ¥{totalAmount.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-center">
                <div className="text-xs text-violet-500 mb-1">累計pt</div>
                <div className="text-sm font-black text-violet-700">
                  {totalPoints.toLocaleString()}<span className="text-[10px] font-normal">pt</span>
                </div>
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">購入履歴がありません</div>
            ) : (
              months.map((month) => {
                const items = byMonth[month];
                const monthTotal = items.reduce((s, p) => s + p.totalAmount, 0);
                const monthPoints = items.reduce((s, p) => s + p.totalPoints, 0);
                return (
                  <div key={month} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* 月ヘッダー */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-700">{month}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>¥{monthTotal.toLocaleString()}</span>
                        <span>{monthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>

                    {/* 購入リスト */}
                    {items.map((p, i) => (
                      <div key={p.id} className={`px-4 py-3 ${i < items.length - 1 ? "border-b border-slate-50" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800 leading-tight">{p.productName}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-slate-400">{fmtDate(p.purchasedAt)}</span>
                              <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${
                                p.purchaseStatus === "autoship" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                              }`}>
                                {p.purchaseStatus === "autoship" ? "🔄 自動" : "🛍️ 通常"}
                              </span>
                              <span className="text-xs text-slate-400">×{p.quantity}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-slate-800">¥{p.totalAmount.toLocaleString()}</div>
                            <div className="text-xs text-violet-500 mt-0.5">{p.totalPoints.toLocaleString()}pt</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </>
        )}
      </main>
    </div>
  );
}
