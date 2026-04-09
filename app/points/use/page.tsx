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

// ポイント種別の正しい対応:
// auto     = MPIpt（VP未来phone月次紹介ポイント） ← monthly-grant で自動付与
// external = SAVpt（貯金ボーナス）              ← オートシップSAVボーナスで付与
// manual   = 手動pt（管理者手動調整ポイント）    ← 管理者が手動で付与・調整
type Wallet = {
  availablePointsBalance: number;
  autoPointsBalance: number;     // MPIpt: VP未来phone月次紹介ポイント
  manualPointsBalance: number;   // 手動pt: 管理者手動調整ポイント
  externalPointsBalance: number; // SAVpt: 貯金ボーナス（オートシップ）
};

// 選択できるポイント種別
type PointType = "mpi" | "sav" | "manual";

const POINT_TYPES: Record<PointType, { label: string; sublabel: string; color: string; bg: string; border: string; checkColor: string }> = {
  mpi:    { label: "MPIpt",  sublabel: "VP未来phone月次紹介ポイント", color: "#6ee7b7",       bg: "rgba(110,231,183,0.08)", border: "rgba(110,231,183,0.35)",    checkColor: "#6ee7b7" },
  sav:    { label: "SAVpt",  sublabel: "貯金ボーナス（オートシップ）", color: GOLD_LIGHT,      bg: `${GOLD}12`,              border: `${GOLD}45`,                checkColor: GOLD },
  manual: { label: "手動pt", sublabel: "管理者手動調整ポイント",      color: "#c4b5fd",       bg: "rgba(196,181,253,0.08)", border: "rgba(196,181,253,0.32)",   checkColor: "#c4b5fd" },
};

export default function UsePointsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // 選択中ポイント種別
  const [selectedType, setSelectedType] = useState<PointType>("mpi");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch("/api/member/wallet").then(r => r.json()).then(d => setWallet(d)).catch(() => {});
  }, []);

  const mpiPt    = wallet?.autoPointsBalance     ?? 0;  // VP未来phone月次紹介
  const savPt    = wallet?.externalPointsBalance  ?? 0;  // 貯金ボーナス
  const manualPt = wallet?.manualPointsBalance    ?? 0;  // 管理者手動調整
  const totalPt  = wallet?.availablePointsBalance ?? 0;

  const balanceMap: Record<PointType, number> = { mpi: mpiPt, sav: savPt, manual: manualPt };

  const currentBalance = balanceMap[selectedType];
  const inputAmt = parseInt(amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputAmt || inputAmt <= 0) { setMessage("利用ポイントを入力してください"); return; }
    if (inputAmt > currentBalance) { setMessage("選択したポイントの残高を超えています"); return; }
    setLoading(true); setMessage("");
    const defaultDesc = {
      mpi:    "VP未来phone月次紹介ポイント利用",
      sav:    "貯金ボーナスポイント利用",
      manual: "手動調整ポイント利用",
    }[selectedType];
    try {
      const res = await fetch("/api/member/points/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: inputAmt,
          description: description || defaultDesc,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setMessage(`${inputAmt.toLocaleString()}pt を利用しました`);
        setAmount(""); setDescription("");
        // 残高をローカル更新
        if (wallet) {
          setWallet({
            ...wallet,
            autoPointsBalance:     selectedType === "mpi"    ? Math.max(0, wallet.autoPointsBalance     - inputAmt) : wallet.autoPointsBalance,
            externalPointsBalance: selectedType === "sav"    ? Math.max(0, wallet.externalPointsBalance - inputAmt) : wallet.externalPointsBalance,
            manualPointsBalance:   selectedType === "manual" ? Math.max(0, wallet.manualPointsBalance   - inputAmt) : wallet.manualPointsBalance,
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
          style={{ background: `radial-gradient(circle,#6ee7b7,transparent 70%)` }}/>
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
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>ポイントを使う</h1>
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
            <p className="font-label text-[9px] tracking-[0.22em] mb-1" style={{ color: `${GOLD}70` }}>TOTAL AVAILABLE POINTS</p>
            <div className="flex items-end gap-2 mb-5">
              <span className="font-display text-5xl font-bold text-white">
                {wallet === null ? "—" : totalPt.toLocaleString()}
              </span>
              <span className="font-label text-sm mb-2" style={{ color: `${GOLD}80` }}>pt</span>
            </div>

            {/* MPIpt / SAVpt / 手動pt の3枠 */}
            <div className="grid grid-cols-3 gap-2">
              {/* MPIpt: VP未来phone月次紹介ポイント */}
              <div className="rounded-2xl p-3 relative overflow-hidden"
                style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.22)" }}>
                <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-[0.05]"
                  style={{ background: "#6ee7b7", transform: "translate(25%,-25%)" }}/>
                <p className="font-label text-[7px] tracking-[0.18em] font-bold mb-0.5" style={{ color: "rgba(110,231,183,0.65)" }}>MPIpt</p>
                <p className="font-jp text-[8px] mb-1.5 leading-tight" style={{ color: "rgba(110,231,183,0.60)" }}>携帯紹介</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-lg font-black text-white">{wallet === null ? "—" : mpiPt.toLocaleString()}</span>
                  <span className="text-[9px] mb-0.5 font-label" style={{ color: "rgba(110,231,183,0.55)" }}>pt</span>
                </div>
              </div>

              {/* SAVpt: 貯金ボーナス（オートシップ） */}
              <div className="rounded-2xl p-3 relative overflow-hidden"
                style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-[0.05]"
                  style={{ background: GOLD, transform: "translate(25%,-25%)" }}/>
                <p className="font-label text-[7px] tracking-[0.18em] font-bold mb-0.5" style={{ color: `${GOLD}65` }}>SAVpt</p>
                <p className="font-jp text-[8px] mb-1.5 leading-tight" style={{ color: `${GOLD}60` }}>貯金ボーナス</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-lg font-black text-white">{wallet === null ? "—" : savPt.toLocaleString()}</span>
                  <span className="text-[9px] mb-0.5 font-label" style={{ color: `${GOLD}55` }}>pt</span>
                </div>
              </div>

              {/* 手動pt: 管理者手動調整 */}
              <div className="rounded-2xl p-3 relative overflow-hidden"
                style={{ background: "rgba(196,181,253,0.07)", border: "1px solid rgba(196,181,253,0.20)" }}>
                <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-[0.04]"
                  style={{ background: "#c4b5fd", transform: "translate(25%,-25%)" }}/>
                <p className="font-label text-[7px] tracking-[0.18em] font-bold mb-0.5" style={{ color: "rgba(196,181,253,0.60)" }}>手動pt</p>
                <p className="font-jp text-[8px] mb-1.5 leading-tight" style={{ color: "rgba(196,181,253,0.55)" }}>手動調整</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-lg font-black text-white">{wallet === null ? "—" : manualPt.toLocaleString()}</span>
                  <span className="text-[9px] mb-0.5 font-label" style={{ color: "rgba(196,181,253,0.50)" }}>pt</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ポイント種別タブ選択 ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: `linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}20` }}>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}60,transparent)` }}/>
          <div className="p-4">
            <p className="text-[9px] font-label tracking-[0.22em] mb-3" style={{ color: `${GOLD}60` }}>USE POINT TYPE — 利用するポイントを選択</p>
            <div className="grid grid-cols-3 gap-2">
              {(["mpi", "sav", "manual"] as PointType[]).map(type => {
                const cfg = POINT_TYPES[type];
                const bal = balanceMap[type];
                const isSel = selectedType === type;
                return (
                  <button key={type} type="button"
                    onClick={() => { setSelectedType(type); setAmount(""); setMessage(""); }}
                    className="rounded-xl p-2.5 text-left transition-all"
                    style={isSel
                      ? { background: cfg.bg, border: `1.5px solid ${cfg.border}` }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label text-[10px] font-bold" style={{ color: isSel ? cfg.color : "rgba(255,255,255,0.40)" }}>{cfg.label}</span>
                      {isSel && (
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white" style={{ background: cfg.checkColor }}>✓</span>
                      )}
                    </div>
                    <p className="text-[8px] font-jp leading-tight mb-1.5" style={{ color: isSel ? cfg.color : "rgba(255,255,255,0.28)" }}>{cfg.sublabel}</p>
                    <p className="text-sm font-black text-white">{bal.toLocaleString()}<span className="text-[8px] ml-0.5" style={{ color: isSel ? cfg.color : "rgba(255,255,255,0.30)" }}>pt</span></p>
                  </button>
                );
              })}
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
              <h2 className="text-sm font-bold font-jp" style={{ color: NAVY }}>
                {POINT_TYPES[selectedType].label}（{POINT_TYPES[selectedType].sublabel}）を利用する
              </h2>
              <p className="text-[10px] font-jp mt-0.5" style={{ color: `${NAVY}50` }}>
                残高: <span className="font-bold" style={{ color: NAVY }}>{currentBalance.toLocaleString()}pt</span>
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
                <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}80` }}>
                  利用ポイント数 <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="number" min={1} max={currentBalance} value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none"
                  style={{ background: "rgba(10,22,40,0.05)", border: `1px solid rgba(10,22,40,0.12)`, color: NAVY }}
                  placeholder="0"
                />
                {inputAmt > 0 && inputAmt <= currentBalance && (
                  <p className="text-xs mt-1.5 font-jp" style={{ color: `${NAVY}50` }}>
                    利用後残高: <span className="font-bold" style={{ color: NAVY }}>{(currentBalance - inputAmt).toLocaleString()}pt</span>
                  </p>
                )}
                {inputAmt > currentBalance && currentBalance > 0 && (
                  <p className="text-xs mt-1.5 font-jp" style={{ color: "#f87171" }}>残高を超えています</p>
                )}
                {currentBalance === 0 && (
                  <p className="text-xs mt-1.5 font-jp" style={{ color: "#f87171" }}>
                    {POINT_TYPES[selectedType].label}の残高がありません
                  </p>
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
                  placeholder={
                    selectedType === "mpi" ? "例: 携帯紹介ポイント利用" :
                    selectedType === "sav" ? "例: 貯金ボーナスポイント利用" :
                    "例: ポイント利用"
                  }
                />
              </div>
              <button
                type="submit"
                disabled={loading || !amount || inputAmt <= 0 || inputAmt > currentBalance || currentBalance === 0}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95 disabled:hover:scale-100"
                style={{ background:
                  selectedType === "mpi" ? `linear-gradient(135deg,#059669,#6ee7b7)` :
                  selectedType === "sav" ? `linear-gradient(135deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT})` :
                  `linear-gradient(135deg,#6d28d9,#c4b5fd)` }}>
                {loading ? "処理中..." : `${inputAmt > 0 ? inputAmt.toLocaleString() + "pt を" : ""}利用する`}
              </button>
            </form>
          </div>
        </div>

        {/* ── ポイント説明 ── */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: `linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}18` }}>
          <p className="text-[9px] font-label tracking-[0.22em]" style={{ color: `${GOLD}60` }}>POINT GUIDE</p>
          <div className="space-y-2.5">
            {/* MPIpt */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg px-2 py-1 flex-shrink-0" style={{ background: "rgba(110,231,183,0.10)", border: "1px solid rgba(110,231,183,0.25)" }}>
                <span className="font-label text-[9px] font-bold" style={{ color: "#6ee7b7" }}>MPIpt</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white font-jp">VP未来phone 月次紹介ポイント</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>VP未来phone を紹介した方に毎月自動付与されるポイント</p>
              </div>
            </div>
            {/* SAVpt */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg px-2 py-1 flex-shrink-0" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
                <span className="font-label text-[9px] font-bold" style={{ color: GOLD_LIGHT }}>SAVpt</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white font-jp">貯金ボーナス（オートシップ）</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>オートシップ決済時に自動付与される貯金ボーナスポイント</p>
              </div>
            </div>
            {/* 手動pt */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg px-2 py-1 flex-shrink-0" style={{ background: "rgba(196,181,253,0.10)", border: "1px solid rgba(196,181,253,0.25)" }}>
                <span className="font-label text-[9px] font-bold" style={{ color: "#c4b5fd" }}>手動pt</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white font-jp">管理者手動調整ポイント</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>管理者が手動で付与・調整したポイント</p>
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
