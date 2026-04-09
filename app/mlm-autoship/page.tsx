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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "未決済",    color: "bg-blue-100 text-blue-700" },
  paid:      { label: "決済完了",  color: "bg-emerald-100 text-emerald-700" },
  failed:    { label: "決済失敗",  color: "bg-red-100 text-red-600" },
  canceled:  { label: "キャンセル", color: "bg-slate-100 text-slate-500" },
  delivered: { label: "発送済み",  color: "bg-teal-100 text-teal-700" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start border-b border-slate-100 last:border-0 py-3 gap-3">
      <span className="w-36 shrink-0 text-xs text-slate-500 font-medium pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 break-all flex-1">{value ?? <span className="text-slate-300">—</span>}</span>
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
    <div className="min-h-screen bg-[#e6f2dc]">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-green-600 text-sm font-medium hover:text-green-700">← 戻る</Link>
          <h1 className="text-lg font-bold text-slate-800">🔄 オートシップ確認</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm shadow-sm">{error}</div>}

        {data && (
          <>
            {/* ステータスバナー */}
            <div className={`rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between ${
              data.autoshipEnabled ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-700"
            }`}>
              <div>
                <div className="text-xs opacity-80 mb-0.5">オートシップ</div>
                <div className="text-xl font-black">{data.autoshipEnabled ? "✅ 有効" : "停止中"}</div>
              </div>
              <div className="text-4xl">{data.autoshipEnabled ? "🔄" : "⏸️"}</div>
            </div>

            {/* 設定情報 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span>⚙️</span>
                <h2 className="text-sm font-bold text-slate-700">設定情報</h2>
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
                        <span key={m} className="rounded-full bg-orange-100 text-orange-700 text-xs px-2 py-0.5">{m}</span>
                      ))}
                    </div>
                  } />
                )}
              </div>
            </div>

            {/* 注文履歴 */}
            <div>
              <div className="text-xs text-slate-500 px-1 font-semibold mb-2">注文履歴（{data.orders.length}件）</div>
              {data.orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">注文履歴がありません</div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {data.orders.map((o, i) => {
                    const st = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-slate-100 text-slate-500" };
                    return (
                      <div key={o.id} className={`px-4 py-3.5 ${i < data.orders.length - 1 ? "border-b border-slate-50" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800 font-mono">{o.targetMonth}</span>
                              <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{o.productName}</div>
                            {o.paidAt && (
                              <div className="text-xs text-slate-400 mt-0.5">決済日: {fmtDate(o.paidAt)}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-slate-800">¥{o.totalAmount.toLocaleString()}</div>
                            <div className="text-xs text-violet-500 mt-0.5">{o.points}pt</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* 合計 */}
                  <div className="bg-violet-50 border-t border-violet-100 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-700">合計</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-violet-700">
                        ¥{data.orders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-violet-500 ml-2">
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
