"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AutoshipOrder = {
  id: string;
  targetMonth: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  points: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

type AutoshipData = {
  autoshipEnabled: boolean;
  autoshipStartDate: string | null;
  autoshipStopDate: string | null;
  paymentMethod: string;
  suspendMonths: string[];
  orders: AutoshipOrder[];
};

// ── カラー定数 ──
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const PAGE_BG    = "#eee8e0";
const CARD_BG    = "#0d1e38";
const NAVY       = "#0a1628";
const NAVY_CARD2 = "#122444";

type StatusConfig = { label: string; dotColor: string; textColor: string };
const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending:   { label: "未決済",     dotColor: "#60a5fa", textColor: "#93c5fd" },
  paid:      { label: "決済完了",   dotColor: "#34d399", textColor: "#34d399" },
  failed:    { label: "決済失敗",   dotColor: "#f87171", textColor: "#f87171" },
  canceled:  { label: "キャンセル", dotColor: "#9ca3af", textColor: "rgba(255,255,255,0.4)" },
  delivered: { label: "発送済み",   dotColor: "#2dd4bf", textColor: "#2dd4bf" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="w-28 shrink-0 text-xs font-medium pt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span className="text-sm break-all flex-1 font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
        {value ?? <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
      </span>
    </div>
  );
}

export default function MlmAutoshipPage() {
  const [data, setData] = useState<AutoshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-autoship")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: 'rgba(245,240,232,0.96)', backdropFilter: 'blur(20px) saturate(160%)', borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.60)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>オートシップ確認</h1>
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

        {data && (
          <>
            {/* ステータスバナー */}
            <div className="rounded-3xl overflow-hidden"
              style={{
                background: data.autoshipEnabled
                  ? "linear-gradient(150deg, #0d1e45, #162a56)"
                  : "linear-gradient(150deg, #0f1a2e, #1a2540)",
                border: data.autoshipEnabled ? `1px solid ${GOLD}30` : "1px solid rgba(255,255,255,0.1)"
              }}>
              <div className="h-0.5" style={{ background: data.autoshipEnabled ? `linear-gradient(90deg, transparent, ${GOLD}, ${ORANGE}, transparent)` : "transparent" }}></div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs mb-1" style={{ color: `${GOLD}60` }}>オートシップ</p>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: data.autoshipEnabled ? "#34d399" : "rgba(255,255,255,0.2)" }}></span>
                    <p className="text-xl font-bold"
                      style={{ color: data.autoshipEnabled ? "#34d399" : "rgba(255,255,255,0.4)" }}>
                      {data.autoshipEnabled ? "有効" : "停止中"}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: data.autoshipEnabled ? `${GOLD}15` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${data.autoshipEnabled ? `${GOLD}25` : "rgba(255,255,255,0.08)"}`
                  }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: data.autoshipEnabled ? GOLD : "rgba(255,255,255,0.3)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 設定情報 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}15` }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: GOLD }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>設定情報</h2>
              </div>
              <div className="px-5 py-1">
                <Row label="支払方法" value={
                  data.paymentMethod === "credit_card" ? "クレジットカード"
                  : data.paymentMethod === "bank_transfer" ? "口座振替"
                  : data.paymentMethod
                } />
                <Row label="開始日" value={fmtDate(data.autoshipStartDate)} />
                <Row label="停止日" value={fmtDate(data.autoshipStopDate)} />
                {data.suspendMonths.length > 0 && (
                  <Row label="一時停止月" value={
                    <div className="flex flex-wrap gap-1">
                      {data.suspendMonths.map((m) => (
                        <span key={m} className="rounded-full text-xs px-2 py-0.5 border"
                          style={{ background: `${ORANGE}15`, color: ORANGE, borderColor: `${ORANGE}30` }}>{m}</span>
                      ))}
                    </div>
                  } />
                )}
              </div>
            </div>

            {/* 注文履歴 */}
            <div>
              <div className="text-xs font-semibold mb-2 px-1 tracking-wide" style={{ color: `${GOLD}60` }}>
                注文履歴（{data.orders.length}件）
              </div>
              {data.orders.length === 0 ? (
                <div className="rounded-2xl p-10 text-center text-sm" style={{ background: CARD_BG, color: "rgba(255,255,255,0.25)" }}>
                  注文履歴がありません
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
                  {data.orders.map((o, i) => {
                    const st = STATUS_CONFIG[o.status] ?? { label: o.status, dotColor: "#9ca3af", textColor: "rgba(255,255,255,0.5)" };
                    return (
                      <div key={o.id} className="px-5 py-4"
                        style={{ borderBottom: i < data.orders.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold font-mono" style={{ color: "rgba(255,255,255,0.85)" }}>{o.targetMonth}</span>
                              <span className="flex items-center gap-1 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dotColor }}></span>
                                <span style={{ color: st.textColor }}>{st.label}</span>
                              </span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{o.productName}</div>
                            {o.paidAt && (
                              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>決済日: {fmtDate(o.paidAt)}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold" style={{ color: GOLD_LIGHT }}>¥{o.totalAmount.toLocaleString()}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#a5b4fc" }}>{o.points}pt</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* 合計 */}
                  <div className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderTop: `1px solid ${GOLD}12`, background: `${GOLD}08` }}>
                    <span className="text-xs font-bold" style={{ color: GOLD }}>合計</span>
                    <div className="text-right">
                      <span className="text-sm font-black" style={{ color: GOLD_LIGHT }}>
                        ¥{data.orders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "#a5b4fc" }}>
                        {data.orders.reduce((s, o) => s + o.points, 0).toLocaleString()}pt
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
