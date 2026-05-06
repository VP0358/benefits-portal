"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

function NavyCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl ${className}`}
      style={{ background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}22`, boxShadow: `0 8px 32px rgba(10,22,40,0.20)` }}>
      {children}
    </div>
  );
}

function LinenCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl ${className}`}
      style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.20)", boxShadow: "0 4px 20px rgba(10,22,40,0.07)" }}>
      {children}
    </div>
  );
}

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState("");
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);
  const [shareMode,    setShareMode]    = useState<"line" | "email" | null>(null);

  const baseUrl      = typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl  = referralCode ? `${baseUrl}/mlm-register?ref=${referralCode}` : "";

  useEffect(() => {
    fetch("/api/member/referral")
      .then(r => r.json())
      .then(d => { setReferralCode(d.referralCode ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lineHref  = `https://line.me/R/msg/text/?${encodeURIComponent(`VP会員紹介URLをお送りします。\n以下のURLから登録してください。\n\n${referralUrl}`)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent("VP会員紹介URL")}&body=${encodeURIComponent(`VP会員紹介URLをお送りします。\n以下のURLから登録してください。\n\n${referralUrl}`)}`;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle,${ORANGE}66,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>お友達紹介</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {/* ── VP会員紹介URLカード ── */}
        <NavyCard>
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
          <div className="px-5 pt-5 pb-5 space-y-4">

            {/* タイトル */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}>🤝</div>
              <div>
                <p className="font-jp font-semibold text-white text-sm">VP会員紹介URL</p>
                <p className="text-xs mt-0.5" style={{ color: `${GOLD}80` }}>登録者はあなたの直紹介として自動で紐づけられます</p>
              </div>
            </div>

            {/* 注意書き */}
            <div className="rounded-2xl px-4 py-3 text-xs font-jp leading-relaxed"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", color: "rgba(251,191,36,0.85)" }}>
              ⚠️ MLM（連鎖販売取引）の勧誘は特定商取引法の規制を受けます。概要書面を必ず事前に交付し、クーリング・オフ制度の説明を含む適切な説明を行った上でご案内ください。
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
                <span className="text-sm font-jp" style={{ color: `${GOLD}60` }}>読み込み中...</span>
              </div>
            ) : (
              <div className="space-y-4">

                {/* 紹介コード表示 */}
                <div className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20` }}>
                  <p className="text-[9px] font-label tracking-[0.20em] mb-1" style={{ color: `${GOLD}55` }}>YOUR REFERRAL CODE</p>
                  <p className="text-2xl font-bold font-label tracking-widest" style={{ color: GOLD_LIGHT }}>
                    {referralCode || "—"}
                  </p>
                </div>

                {/* URL表示＋コピー */}
                <div>
                  <p className="text-xs font-semibold font-jp mb-1.5" style={{ color: `${GOLD}70` }}>紹介URL</p>
                  <div className="flex gap-2">
                    <input readOnly value={referralUrl}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      className="flex-1 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}18`, color: "rgba(255,255,255,0.55)" }}/>
                    <button onClick={() => copyToClipboard(referralUrl)}
                      className="rounded-xl px-4 py-2.5 text-xs font-semibold font-jp transition whitespace-nowrap"
                      style={copied
                        ? { background: "rgba(52,211,153,0.20)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399" }
                        : { background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "white" }}>
                      {copied ? "✓ コピー済" : "コピー"}
                    </button>
                  </div>
                </div>

                {/* 送信方法選択 */}
                <div>
                  <p className="text-xs font-semibold font-jp mb-2" style={{ color: `${GOLD}70` }}>送信方法を選択</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setShareMode(shareMode === "line" ? null : "line")}
                      className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition"
                      style={shareMode === "line"
                        ? { background: "#059244", border: "2px solid #34d399" }
                        : { background: "#06C755" }}>
                      <span>💬</span> LINEで送る
                    </button>
                    <button
                      onClick={() => setShareMode(shareMode === "email" ? null : "email")}
                      className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition"
                      style={shareMode === "email"
                        ? { background: `rgba(255,255,255,0.22)`, border: `2px solid ${GOLD}` }
                        : { background: "rgba(255,255,255,0.12)", border: `1px solid ${GOLD}20` }}>
                      <span>✉️</span> メールで送る
                    </button>
                  </div>
                </div>

                {/* LINE送信エリア */}
                {shareMode === "line" && (
                  <div className="rounded-2xl p-4 space-y-3"
                    style={{ background: "rgba(6,199,85,0.08)", border: "1px solid rgba(6,199,85,0.25)" }}>
                    <p className="text-xs font-jp text-white/70">以下のボタンをタップするとLINEが開きます</p>
                    <a href={lineHref}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold text-white"
                      style={{ background: "#06C755" }}>
                      💬 LINEアプリで開く
                    </a>
                    <p className="text-[10px] text-white/40 leading-relaxed">
                      ※ LINEアプリがインストールされている必要があります
                    </p>
                  </div>
                )}

                {/* メール送信エリア */}
                {shareMode === "email" && (
                  <div className="rounded-2xl p-4 space-y-3"
                    style={{ background: `rgba(201,168,76,0.07)`, border: `1px solid ${GOLD}25` }}>
                    <p className="text-xs font-jp text-white/70">以下のボタンをタップするとメールアプリが開きます</p>
                    <a href={emailHref}
                      className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
                      ✉️ メールアプリで開く
                    </a>
                    <p className="text-[10px] text-white/40 leading-relaxed">
                      ※ 端末のメールアプリが起動します
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>
        </NavyCard>

        {/* ── 紹介の仕組み ── */}
        <LinenCard className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold font-jp" style={{ color: NAVY }}>紹介の仕組み</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { step: "1", label: "紹介URLをコピーまたはLINE・メールで共有" },
              { step: "2", label: "相手がURLから会員登録を完了" },
              { step: "3", label: "登録完了後、あなたの直紹介者として自動で紐づけ" },
              { step: "4", label: "紹介した方の活動に応じてボーナスを獲得" },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
                  {item.step}
                </div>
                <div className="text-sm font-jp" style={{ color: NAVY }}>{item.label}</div>
              </div>
            ))}
          </div>
        </LinenCard>

      </main>
    </div>
  );
}
