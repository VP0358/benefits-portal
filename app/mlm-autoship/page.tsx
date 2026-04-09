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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  pending:   { label: "未決済",     dot: "bg-blue-400",    text: "text-blue-300" },
  paid:      { label: "決済完了",   dot: "bg-emerald-400", text: "text-emerald-300" },
  failed:    { label: "決済失敗",   dot: "bg-red-400",     text: "text-red-300" },
  canceled:  { label: "キャンセル", dot: "bg-slate-400",   text: "text-white/40" },
  delivered: { label: "発送済み",   dot: "bg-teal-400",    text: "text-teal-300" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-white/5 last:border-0">
      <span className="w-32 shrink-0 text-xs text-white/40 font-medium pt-0.5">{label}</span>
      <span className="text-sm text-white/80 break-all flex-1 font-medium">
        {value ?? <span className="text-white/20">—</span>}
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
          <h1 className="text-base font-bold text-white ml-1">オートシップ確認</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {data && (
          <>
            {/* ステータスバナー */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{
                background: data.autoshipEnabled
                  ? "linear-gradient(135deg, #0d2b1f, #064e3b)"
                  : "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
                border: data.autoshipEnabled ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.1)"
              }}>
              <div>
                <p className="text-xs text-white/50 mb-1">オートシップ</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${data.autoshipEnabled ? "bg-emerald-400" : "bg-slate-500"}`}></span>
                  <p className={`text-xl font-bold ${data.autoshipEnabled ? "text-emerald-300" : "text-white/40"}`}>
                    {data.autoshipEnabled ? "有効" : "停止中"}
                  </p>
                </div>
              </div>
              <div className="text-4xl opacity-60">{data.autoshipEnabled ? "🔄" : "⏸️"}</div>
            </div>

            {/* 設定情報 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <span>⚙️</span>
                <h2 className="text-sm font-bold text-white/80">設定情報</h2>
              </div>
              <div className="px-4 py-1">
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
                        <span key={m} className="rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/20 text-xs px-2 py-0.5">{m}</span>
                      ))}
                    </div>
                  } />
                )}
              </div>
            </div>

            {/* 注文履歴 */}
            <div>
              <div className="text-xs text-white/30 px-1 font-semibold mb-2 tracking-wide">注文履歴（{data.orders.length}件）</div>
              {data.orders.length === 0 ? (
                <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
                  注文履歴がありません
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {data.orders.map((o, i) => {
                    const st = STATUS_CONFIG[o.status] ?? { label: o.status, dot: "bg-slate-400", text: "text-white/50" };
                    return (
                      <div key={o.id} className={`px-4 py-4 ${i < data.orders.length - 1 ? "border-b border-white/5" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white/85 font-mono">{o.targetMonth}</span>
                              <span className={`flex items-center gap-1 text-xs font-medium ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                                {st.label}
                              </span>
                            </div>
                            <div className="text-xs text-white/40 mt-1">{o.productName}</div>
                            {o.paidAt && (
                              <div className="text-xs text-white/30 mt-0.5">決済日: {fmtDate(o.paidAt)}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-white/85">¥{o.totalAmount.toLocaleString()}</div>
                            <div className="text-xs text-violet-400 mt-0.5">{o.points}pt</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* 合計 */}
                  <div className="px-4 py-3.5 flex items-center justify-between border-t border-white/5"
                    style={{ background: "rgba(139,92,246,0.08)" }}>
                    <span className="text-xs font-bold text-violet-300">合計</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-violet-300">
                        ¥{data.orders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-violet-400 ml-2">
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
