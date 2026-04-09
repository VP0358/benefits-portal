"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

export default function UsePointsPage() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [wallet, setWallet] = useState<{
    availablePointsBalance: number;
    autoPointsBalance: number;
    manualPointsBalance: number;
    externalPointsBalance: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/member/wallet").then(r => r.json()).then(d => setWallet(d)).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pts = parseInt(amount);
    if (!pts || pts <= 0) { setMessage("利用ポイントを入力してください"); return; }
    if (wallet && pts > wallet.availablePointsBalance) { setMessage("利用可能ポイントを超えています"); return; }
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/member/points/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pts, description: description || "ポイント利用" }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setMessage(`${pts.toLocaleString()}pt を利用しました`);
        setAmount(""); setDescription("");
        if (wallet) setWallet({ ...wallet, availablePointsBalance: wallet.availablePointsBalance - pts });
      } else {
        setIsSuccess(false);
        setMessage(data.error ?? "エラーが発生しました");
      }
    } catch { setIsSuccess(false); setMessage("通信エラーが発生しました"); }
    setLoading(false);
  }

  const availablePts = wallet?.availablePointsBalance ?? 0;
  const inputAmt = parseInt(amount) || 0;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>ポイントを使う</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {/* ポイント残高カード */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`,
            border: `1px solid ${GOLD}35`,
            boxShadow: `0 16px 48px rgba(10,22,40,0.28),0 0 0 1px ${GOLD}12 inset`,
          }}>
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
          <div className="px-5 pt-5 pb-5">
            <p className="font-label text-[9px] tracking-[0.22em] mb-1" style={{ color: `${GOLD}70` }}>AVAILABLE POINTS</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="font-display text-5xl font-bold" style={{ color: "white" }}>
                {wallet === null ? "—" : availablePts.toLocaleString()}
              </span>
              <span className="font-label text-sm mb-2" style={{ color: `${GOLD}80` }}>pt</span>
            </div>
            {wallet && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "自動", value: wallet.autoPointsBalance, color: GOLD },
                  { label: "手動", value: wallet.manualPointsBalance, color: "#6ee7b7" },
                  { label: "外部", value: wallet.externalPointsBalance, color: "#a5b4fc" },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-label text-[8px] tracking-widest mb-0.5" style={{ color: `${item.color}70` }}>{item.label}</p>
                    <p className="text-sm font-bold text-white">{item.value.toLocaleString()}<span className="text-[9px] ml-0.5" style={{ color: `${item.color}60` }}>pt</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 利用フォームカード */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.22)", boxShadow: `0 4px 20px rgba(10,22,40,0.08)` }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
              </svg>
            </div>
            <h2 className="text-sm font-bold font-jp" style={{ color: NAVY }}>ポイントを利用する</h2>
          </div>
          <div className="px-5 py-4">
            {message && (
              <div className="rounded-xl px-4 py-3 text-sm font-jp font-semibold mb-4"
                style={isSuccess
                  ? { background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }
                  : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                {isSuccess ? "✓ " : "⚠ "}{message}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                  利用ポイント数 <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="number" min={1} max={availablePts} value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none"
                  style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                  placeholder="0"
                />
                {inputAmt > 0 && wallet && inputAmt <= availablePts && (
                  <p className="text-xs mt-1.5 font-jp" style={{ color: `${NAVY}50` }}>
                    利用後残高: <span className="font-bold" style={{ color: NAVY }}>{(availablePts - inputAmt).toLocaleString()}pt</span>
                  </p>
                )}
                {inputAmt > availablePts && availablePts > 0 && (
                  <p className="text-xs mt-1.5 font-jp" style={{ color: "#f87171" }}>利用可能ポイントを超えています</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                  利用内容 <span className="font-normal" style={{ color: `${NAVY}40` }}>（任意）</span>
                </label>
                <input
                  type="text" value={description} onChange={e => setDescription(e.target.value)} maxLength={255}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none font-jp"
                  style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                  placeholder="例: 福利厚生サービス決済"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !amount || inputAmt <= 0}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition"
                style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
                {loading ? "処理中..." : `${inputAmt > 0 ? inputAmt.toLocaleString() + "pt を" : ""}利用する`}
              </button>
            </form>
          </div>
        </div>

        {/* 履歴リンク */}
        <Link href="/points/history"
          className="flex items-center justify-between rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-95"
          style={{
            background: `linear-gradient(145deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
            border: `1px solid ${GOLD}22`,
            boxShadow: `0 4px 16px rgba(10,22,40,0.15)`,
          }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <p className="text-sm font-jp font-medium text-white/80">ポイント履歴を見る</p>
          </div>
          <span style={{ color: `${GOLD}60` }}>›</span>
        </Link>
      </main>
    </div>
  );
}
