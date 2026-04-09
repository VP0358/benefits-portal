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

// ── カラー定数 ──
const GOLD       = "#d4a853";
const GOLD_LIGHT = "#f0c060";
const ORANGE     = "#e8893a";
const PAGE_BG    = "#071228";
const CARD_BG    = "#0f2347";

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
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: `rgba(7,18,40,0.97)`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD}20` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(255,255,255,0.5)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h1 className="text-base font-bold text-white">購入履歴</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}></div>
            <p className="text-sm" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-sm border border-red-500/20 bg-red-500/10 text-red-400">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3.5 text-center"
                style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}25` }}>
                <div className="text-xs mb-1" style={{ color: `${ORANGE}80` }}>購入件数</div>
                <div className="text-2xl font-black" style={{ color: ORANGE }}>{purchases.length}</div>
                <div className="text-[10px] mt-0.5" style={{ color: `${ORANGE}60` }}>件</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center"
                style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                <div className="text-xs mb-1" style={{ color: `${GOLD}70` }}>累計金額</div>
                <div className="text-sm font-black" style={{ color: GOLD_LIGHT }}>
                  ¥{totalAmount.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 text-center"
                style={{ background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(165,180,252,0.7)" }}>累計pt</div>
                <div className="text-sm font-black" style={{ color: "#a5b4fc" }}>
                  {totalPoints.toLocaleString()}<span className="text-[10px] font-normal ml-0.5" style={{ color: "rgba(165,180,252,0.5)" }}>pt</span>
                </div>
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className="rounded-2xl p-10 text-center text-sm" style={{ background: CARD_BG, color: "rgba(255,255,255,0.25)" }}>
                購入履歴がありません
              </div>
            ) : (
              months.map((month) => {
                const items = byMonth[month];
                const monthTotal = items.reduce((s, p) => s + p.totalAmount, 0);
                const monthPoints = items.reduce((s, p) => s + p.totalPoints, 0);
                return (
                  <div key={month} className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
                    {/* 月ヘッダー */}
                    <div className="flex items-center justify-between px-5 py-3.5"
                      style={{ borderBottom: `1px solid ${GOLD}10`, background: `${GOLD}06` }}>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          style={{ color: GOLD }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{month}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span style={{ color: `${GOLD}80` }}>¥{monthTotal.toLocaleString()}</span>
                        <span style={{ color: "#a5b4fc" }}>{monthPoints.toLocaleString()}pt</span>
                      </div>
                    </div>

                    {items.map((p, i) => (
                      <div key={p.id} className="px-5 py-4"
                        style={{ borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{p.productName}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtDate(p.purchasedAt)}</span>
                              <span className="rounded-full text-xs px-2 py-0.5 font-medium border"
                                style={p.purchaseStatus === "autoship"
                                  ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd", borderColor: "rgba(147,197,253,0.2)" }
                                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", borderColor: "rgba(255,255,255,0.08)" }
                                }>
                                {p.purchaseStatus === "autoship" ? "自動" : "通常"}
                              </span>
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>×{p.quantity}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold" style={{ color: GOLD_LIGHT }}>¥{p.totalAmount.toLocaleString()}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#a5b4fc" }}>{p.totalPoints.toLocaleString()}pt</div>
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
