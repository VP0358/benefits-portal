"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

// ── ポイント種別の定義 ──────────────────────────────────────────────
//
//  SAVpt = external + manual … 貯金ボーナス
//            external: オートシップ決済時に自動付与
//            manual  : 管理者が手動で付与・調整
//          → この2つを合算して「SAVpt」として表示・利用
//
// 利用時の消費順序: externalPointsBalance を先に消費、
//                  足りなければ manualPointsBalance から補充
//
type Wallet = {
  availablePointsBalance: number;
  autoPointsBalance:     number;
  manualPointsBalance:   number; // SAVpt の一部（手動付与分）
  externalPointsBalance: number; // SAVpt の一部（オートシップ自動付与分）
};

export default function UsePointsPage() {
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState("");
  const [isSuccess, setIsSuccess]     = useState(false);
  const [wallet, setWallet]           = useState<Wallet | null>(null);
  const [amount, setAmount]           = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch("/api/member/wallet").then(r => r.json()).then(d => setWallet(d)).catch(() => {});
  }, []);

  // SAVpt = external + manual の合算
  const savPt   = (wallet?.externalPointsBalance ?? 0) + (wallet?.manualPointsBalance ?? 0);
  const totalPt = wallet?.availablePointsBalance ?? 0;
  const inputAmt = parseInt(amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputAmt || inputAmt <= 0) { setMessage("利用SAV数を入力してください"); return; }
    if (inputAmt > savPt)           { setMessage("SAVptの残高を超えています"); return; }
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/member/points/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: inputAmt,
          pointType: "sav",
          description: description || "SAVptポイント利用",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setMessage(`${inputAmt.toLocaleString()}pt を利用しました`);
        setAmount(""); setDescription("");
        // 残高をローカル更新（external から先に消費、不足分は manual から）
        if (wallet) {
          const extUse = Math.min(wallet.externalPointsBalance, inputAmt);
          const manUse = inputAmt - extUse;
          setWallet({
            ...wallet,
            externalPointsBalance:  Math.max(0, wallet.externalPointsBalance - extUse),
            manualPointsBalance:    Math.max(0, wallet.manualPointsBalance   - manUse),
            availablePointsBalance: Math.max(0, wallet.availablePointsBalance - inputAmt),
          });
        }
      } else {
        setIsSuccess(false);
        setMessage(data.error ?? "エラーが発生しました");
      }
    } catch { setIsSuccess(false); setMessage("通信エラーが発生しました"); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle,${GOLD}40,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5" style={{ color: "rgba(10,22,40,0.70)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-base font-semibold font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: NAVY }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1 className="text-lg font-bold font-jp" style={{ color: NAVY }}>ポイントを使う</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {/* ── 合計残高カード ── */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`,
            border: `1px solid ${GOLD}35`,
            boxShadow: `0 16px 48px rgba(10,22,40,0.28),0 0 0 1px ${GOLD}12 inset`,
          }}>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
          <div className="px-5 pt-5 pb-5">
            <p className="font-label text-xs tracking-[0.22em] mb-1" style={{ color: `${GOLD}80` }}>TOTAL AVAILABLE POINTS</p>
            <div className="flex items-end gap-2 mb-5">
              <span className="font-display text-5xl font-bold text-white">
                {wallet === null ? "—" : totalPt.toLocaleString()}
              </span>
              <span className="font-label text-sm mb-2" style={{ color: `${GOLD}80` }}>pt</span>
            </div>

            {/* SAVpt のみ表示 */}
            <div className="rounded-2xl p-3.5 relative overflow-hidden"
              style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}28` }}>
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.05]"
                style={{ background: GOLD, transform: "translate(30%,-30%)" }}/>
              <p className="font-label text-[8px] tracking-[0.20em] font-bold mb-0.5" style={{ color: `${GOLD}75` }}>SAVpt</p>
              <p className="font-jp text-xs mb-2 leading-tight font-semibold" style={{ color: `${GOLD}65` }}>貯金ボーナス</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-white">{wallet === null ? "—" : savPt.toLocaleString()}</span>
                <span className="text-xs mb-0.5 font-label" style={{ color: `${GOLD}65` }}>pt</span>
              </div>
              {/* 内訳（自動+手動） */}
              {wallet !== null && (
                <div className="mt-2 pt-2 flex gap-4" style={{ borderTop: `1px solid ${GOLD}20` }}>
                  <p className="text-xs font-jp" style={{ color: `${GOLD}60` }}>
                    自動: <span className="font-bold" style={{ color: `${GOLD}90` }}>{wallet.externalPointsBalance.toLocaleString()}pt</span>
                  </p>
                  <p className="text-xs font-jp" style={{ color: `${GOLD}60` }}>
                    手動: <span className="font-bold" style={{ color: `${GOLD}90` }}>{wallet.manualPointsBalance.toLocaleString()}pt</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 利用フォームカード ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.22)", boxShadow: `0 4px 20px rgba(10,22,40,0.08)` }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold font-jp" style={{ color: NAVY }}>
                SAVpt（貯金ボーナス）を利用する
              </h2>
              <p className="text-xs font-jp mt-0.5" style={{ color: `${NAVY}60` }}>
                残高: <span className="font-bold" style={{ color: NAVY }}>{savPt.toLocaleString()}pt</span>
              </p>
            </div>
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
                <label className="block text-sm font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                  利用SAV数 <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="number" min={1} max={savPt} value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none"
                  style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                  placeholder="0"
                />
                {inputAmt > 0 && inputAmt <= savPt && (
                  <p className="text-sm mt-1.5 font-jp" style={{ color: `${NAVY}55` }}>
                    利用後残高: <span className="font-bold" style={{ color: NAVY }}>{(savPt - inputAmt).toLocaleString()}pt</span>
                  </p>
                )}
                {inputAmt > savPt && savPt > 0 && (
                  <p className="text-sm mt-1.5 font-jp" style={{ color: "#f87171" }}>残高を超えています</p>
                )}
                {savPt === 0 && (
                  <p className="text-sm mt-1.5 font-jp" style={{ color: "#f87171" }}>
                    SAVptの残高がありません
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                  利用内容 <span className="font-normal" style={{ color: `${NAVY}40` }}>（任意）</span>
                </label>
                <input
                  type="text" value={description} onChange={e => setDescription(e.target.value)} maxLength={255}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none font-jp"
                  style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                  placeholder="例: SAVptポイント利用"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !amount || inputAmt <= 0 || inputAmt > savPt || savPt === 0}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95 disabled:hover:scale-100"
                style={{ background: `linear-gradient(135deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT})` }}>
                {loading ? "処理中..." : `${inputAmt > 0 ? inputAmt.toLocaleString() + "pt を" : ""}SAVptポイント利用`}
              </button>
            </form>
          </div>
        </div>

        {/* ── ポイントガイド ── */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: `linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}18` }}>
          <p className="text-xs font-label tracking-[0.22em] font-bold" style={{ color: `${GOLD}80` }}>POINT GUIDE</p>

          {/* SAVpt */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg px-2 py-1 flex-shrink-0" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
              <span className="font-label text-xs font-bold" style={{ color: GOLD_LIGHT }}>SAVpt</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white font-jp">貯金ボーナス</p>
              <p className="text-xs mt-0.5 mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                オートシップ時の自動付与 ＋ 管理者による手動調整の合計
              </p>
              {/* 内訳バッジ */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg px-2 py-0.5 text-xs font-jp font-medium"
                  style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20`, color: `${GOLD}90` }}>
                  自動反映（オートシップ）
                </span>
                <span className="rounded-lg px-2 py-0.5 text-xs font-jp font-medium"
                  style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20`, color: `${GOLD}90` }}>
                  管理者手動調整
                </span>
              </div>
            </div>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <p className="text-base font-semibold font-jp" style={{ color: "rgba(255,255,255,0.90)" }}>ポイント履歴を見る</p>
          </div>
          <span style={{ color: `${GOLD}70` }}>›</span>
        </Link>
      </main>
    </div>
  );
}
