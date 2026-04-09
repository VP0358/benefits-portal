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
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

/* ─── 型定義 ─── */
type ContractInfo = {
  id: string;
  planName: string;
  monthlyFee: number;
  startedAt: string | null;
  confirmedAt: string | null;
  status: string;
  isPaidThisMonth: boolean;
};

type MemberNode = {
  id: string;
  name: string;
  memberCode: string;
  avatarUrl: string | null;
  contracts: ContractInfo[];
  hasActiveContract: boolean;
  hasPaidThisMonth: boolean;
};

type OrgChartData = {
  year: number;
  month: number;
  me: {
    id: string;
    name: string;
    memberCode: string;
    avatarUrl: string | null;
  };
  members: MemberNode[];
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function AvatarIcon({ avatarUrl, name, size = "md" }: { avatarUrl: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-16 h-16 text-3xl" : size === "sm" ? "w-8 h-8 text-base" : "w-12 h-12 text-2xl";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} rounded-full object-cover`}
      style={{ border: `2px solid ${GOLD}40` }} />;
  }
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center`}
      style={{ background: `linear-gradient(135deg,${NAVY_CARD},${NAVY_CARD2})`, border: `2px solid ${GOLD}30` }}>
      <span>😊</span>
    </div>
  );
}

function MemberCard({ member, month, year }: { member: MemberNode; month: number; year: number }) {
  const [expanded, setExpanded] = useState(false);

  const payStatus = member.hasPaidThisMonth
    ? { dot: "#34d399", label: "当月支払済", accent: "#34d399" }
    : member.hasActiveContract
    ? { dot: GOLD, label: "当月未払い", accent: GOLD }
    : { dot: "rgba(255,255,255,0.2)", label: "契約なし", accent: "rgba(255,255,255,0.35)" };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18`, boxShadow: `0 4px 16px rgba(10,22,40,0.15)` }}>
      <button className="w-full flex items-center gap-3 p-4 text-left transition"
        style={{ background: expanded ? `${GOLD}06` : "transparent" }}
        onClick={() => setExpanded(!expanded)}>
        <div className="relative flex-shrink-0">
          <AvatarIcon avatarUrl={member.avatarUrl} name={member.name} size="md" />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
            style={{ backgroundColor: payStatus.dot, borderColor: NAVY_CARD }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold font-jp text-sm" style={{ color: "rgba(255,255,255,0.88)" }}>{member.name}</p>
          <p className="text-xs font-label mt-0.5" style={{ color: `${GOLD}50` }}># {member.memberCode}</p>
          {member.contracts[0] && (
            <p className="text-xs font-jp mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.40)" }}>
              📱 {member.contracts[0].planName}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="inline-block text-xs px-2.5 py-0.5 rounded-full font-jp font-semibold"
            style={{ background: `${payStatus.dot}18`, color: payStatus.accent, border: `1px solid ${payStatus.dot}35` }}>
            {payStatus.label}
          </span>
          <p className="text-[10px] mt-1.5 font-label" style={{ color: `${GOLD}40` }}>
            {expanded ? "▲ 閉じる" : "▼ 詳細"}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${GOLD}10` }}>
          {member.contracts.length === 0 ? (
            <p className="text-xs font-jp py-3 text-center" style={{ color: "rgba(255,255,255,0.28)" }}>
              有効な契約はありません
            </p>
          ) : (
            <div className="space-y-2 pt-3">
              {member.contracts.map((c) => (
                <div key={c.id} className="rounded-xl p-3"
                  style={{ background: c.isPaidThisMonth ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${c.isPaidThisMonth ? "rgba(52,211,153,0.25)" : `${GOLD}12`}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold font-jp" style={{ color: "rgba(255,255,255,0.82)" }}>{c.planName}</p>
                      <p className="text-xs mt-0.5 font-jp" style={{ color: "rgba(255,255,255,0.30)" }}>
                        契約日: {fmtDate(c.startedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.80)" }}>
                        ¥{c.monthlyFee.toLocaleString()}<span className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.30)" }}>/月</span>
                      </p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: c.isPaidThisMonth ? "#34d399" : GOLD }}>
                        {c.isPaidThisMonth ? `✓ ${year}/${month}月 済` : `⚠ ${year}/${month}月 未払`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [data, setData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/org-chart")
      .then((r) => { if (!r.ok) throw new Error("取得に失敗しました"); return r.json(); })
      .then(setData)
      .catch(() => setError("データを読み込めませんでした"))
      .finally(() => setLoading(false));
  }, []);

  const paidCount      = data?.members.filter((m) => m.hasPaidThisMonth).length ?? 0;
  const unpaidCount    = data?.members.filter((m) => !m.hasPaidThisMonth && m.hasActiveContract).length ?? 0;
  const noContractCount = data?.members.filter((m) => !m.hasActiveContract).length ?? 0;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.15]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle,${NAVY}33,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>直紹介 組織図</h1>
          </div>
          {data && (
            <p className="text-xs font-jp ml-auto" style={{ color: "rgba(10,22,40,0.40)" }}>
              {data.year}年{data.month}月 · {data.members.length}名
            </p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18` }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
            <p className="text-sm font-jp" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* 当月サマリー */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "支払済", count: paidCount,       dot: "#34d399", accent: "#34d399" },
                { label: "未払い", count: unpaidCount,     dot: GOLD,      accent: GOLD },
                { label: "契約なし",count: noContractCount, dot: "rgba(255,255,255,0.2)", accent: "rgba(255,255,255,0.45)" },
              ].map(item => (
                <div key={item.label} className="rounded-2xl p-3.5 text-center"
                  style={{ background: NAVY_CARD, border: `1px solid ${item.dot}25`, boxShadow: `0 4px 12px rgba(10,22,40,0.12)` }}>
                  <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ backgroundColor: item.dot }}/>
                  <div className="text-2xl font-black" style={{ color: item.accent }}>{item.count}</div>
                  <div className="text-[10px] font-jp mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* 自分（頂点）カード */}
            <div className="rounded-3xl overflow-hidden"
              style={{ background: `linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`, border: `1px solid ${GOLD}35`, boxShadow: `0 16px 48px rgba(10,22,40,0.28)` }}>
              <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
              <div className="p-5 flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-3xl"
                    style={{ background: `linear-gradient(135deg,${GOLD}22,${ORANGE}12)`, border: `2px solid ${GOLD}45` }}>
                    {data.me.avatarUrl
                      ? <img src={data.me.avatarUrl} alt={data.me.name} className="w-full h-full object-cover"/>
                      : <span>😊</span>
                    }
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "white" }}>YOU</span>
                </div>
                <div>
                  <p className="font-label text-[9px] tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}70` }}>ORGANIZER</p>
                  <p className="font-jp font-bold text-white text-lg leading-tight">{data.me.name}</p>
                  <p className="text-xs font-label mt-0.5" style={{ color: `${GOLD}50` }}># {data.me.memberCode}</p>
                </div>
              </div>
            </div>

            {/* 接続ライン */}
            {data.members.length > 0 && (
              <div className="flex justify-center -my-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-6" style={{ background: `linear-gradient(180deg,${GOLD}60,${GOLD}20)` }}/>
                  <p className="text-[10px] font-label tracking-widest" style={{ color: `${GOLD}50` }}>DIRECT</p>
                  <div className="w-px h-4" style={{ background: `linear-gradient(180deg,${GOLD}20,transparent)` }}/>
                </div>
              </div>
            )}

            {/* メンバー一覧 */}
            {data.members.length === 0 ? (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: NAVY_CARD, border: `2px dashed ${GOLD}18` }}>
                <div className="text-3xl mb-3">🌱</div>
                <p className="text-sm font-jp mb-4" style={{ color: "rgba(255,255,255,0.40)" }}>まだ直紹介したメンバーがいません</p>
                <Link href="/referral"
                  className="inline-block px-4 py-2 rounded-xl text-sm font-semibold font-jp transition"
                  style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "white" }}>
                  友達を紹介する →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.members.map((member) => (
                  <MemberCard key={member.id} member={member} month={data.month} year={data.year} />
                ))}
              </div>
            )}

            {/* 凡例 */}
            <div className="rounded-2xl p-4"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.18)" }}>
              <p className="text-[9px] font-label tracking-widest mb-3" style={{ color: GOLD_DARK }}>LEGEND</p>
              <div className="space-y-2">
                {[
                  { dot: "#34d399",                  label: "当月の携帯料金 支払い完了" },
                  { dot: GOLD,                       label: "当月の携帯料金 未払い（有効契約あり）" },
                  { dot: "rgba(10,22,40,0.20)",      label: "有効な携帯契約なし" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }}/>
                    <span className="text-xs font-jp" style={{ color: "rgba(10,22,40,0.60)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
