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

  const byMonth: Record<string, Purchase[]> = {};
  purchases.forEach((p) => {
    const m = p.purchaseMonth;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(p);
  });
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0a0f1e" }}>
      <header className="sticky top-0 z-20 border-b border-white/5"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/50 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <h1 className="text-base font-bold text-white ml-1">購入履歴</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3.5 text-center border border-blue-400/20"
                style={{ background: "rgba(59,130,246,0.1)" }}>
                <div className="text-xs text-blue-400/70 mb-1">購入件数</div>
                <div className="text-2xl font-black text-blue-300">{purchases.length}</div>
                <div className="text-[10px] text-blue-400/50 mt-0.5">件</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border border-white/10"
                style={{ background: "#111827" }}>
                <div className="text-xs text-white/40 mb-1">累計金額</div>
                <div className="text-sm font-black text-white/80">
                  ¥{totalAmount.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border border-violet-400/20"
                style={{ background: "rgba(139,92,246,0.1)" }}>
                <div className="text-xs text-violet-400/70 mb-1">累計pt</div>
                <div className="text-sm font-black text-violet-300">
                  {totalPoints.toLocaleString()}<span className="text-[10px] font-normal">pt</span>
                </div>
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
                購入履歴がありません
              </div>
            ) : (
              months.map((month) => {
                const items = byMonth[month];
                const monthTotal = items.reduce((s, p) => s + p.totalAmount, 0);
                const monthPoints = items.reduce((s, p) => s + p.totalPoints, 0);
                return (
                  <div key={month} className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {/* 月ヘッダー */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className="text-sm font-bold text-white/80">{month}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-white/50">¥{monthTotal.toLocaleString()}</span>
                        <span className="text-violet-400">{monthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>

                    {items.map((p, i) => (
                      <div key={p.id} className={`px-4 py-3.5 ${i < items.length - 1 ? "border-b border-white/5" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white/85 leading-snug">{p.productName}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs text-white/30">{fmtDate(p.purchasedAt)}</span>
                              <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${
                                p.purchaseStatus === "autoship"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-400/20"
                                  : "bg-white/5 text-white/40 border border-white/10"
                              }`}>
                                {p.purchaseStatus === "autoship" ? "🔄 自動" : "🛍️ 通常"}
                              </span>
                              <span className="text-xs text-white/30">×{p.quantity}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-white/85">¥{p.totalAmount.toLocaleString()}</div>
                            <div className="text-xs text-violet-400 mt-0.5">{p.totalPoints.toLocaleString()}pt</div>
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
