"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReferralMember = {
  id: string;
  memberCode: string;
  name: string;
  memberType: string;
  status: string;
  currentLevel: number;
  titleLevel: number;
  contractDate: string | null;
  registeredAt: string;
  currentMonthAmount: number;
  currentMonthPoints: number;
  lastMonthAmount: number;
  lastMonthPoints: number;
  isActive: boolean;
};

type ReferrerListData = {
  totalCount: number;
  activeCount: number;
  favoriteCount: number;
  members: ReferralMember[];
};

// ── カラー定数 ──
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const PAGE_BG    = "#eee8e0";
const CARD_BG    = "#0d1e38";
const NAVY       = "#0a1628";
const NAVY_CARD2 = "#122444";

const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ", inactive: "非アクティブ", suspended: "停止中",
  canceled: "解約済", pending: "審査中",
};
type StatusTheme = { dotColor: string; textColor: string };
const STATUS_THEME: Record<string, StatusTheme> = {
  active:    { dotColor: "#34d399", textColor: "#34d399" },
  inactive:  { dotColor: "#9ca3af", textColor: "#d1d5db" },
  suspended: { dotColor: "#f97316", textColor: "#fb923c" },
  canceled:  { dotColor: "#f87171", textColor: "#fca5a5" },
  pending:   { dotColor: GOLD, textColor: GOLD_LIGHT },
};
const TYPE_LABELS: Record<string, string> = {
  business: "ビジネス", favorite: "愛用",
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function MlmReferrerListPage() {
  const [data, setData] = useState<ReferrerListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-referrer-list")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data?.members.filter((m) => {
    const matchFilter =
      filter === "all" ? true
      : filter === "active" ? m.isActive
      : !m.isActive;
    const matchSearch = search === "" || m.name.includes(search) || m.memberCode.includes(search);
    return matchFilter && matchSearch;
  }) ?? [];

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>紹介者一覧</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}></div>
            <p className="text-sm" style={{ color: `${GOLD}90` }}>読み込み中...</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-sm border border-red-500/20 bg-red-500/10 text-red-400">{error}</div>
        )}

        {data && (
          <>
            {/* ── サマリーカード（数字・ラベルを大きく・濃く） */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "直紹介数",   value: data.totalCount,    color: GOLD_LIGHT,  bg: `${GOLD}18`,   border: `${GOLD}40` },
                { label: "ACT",        value: data.activeCount,   color: "#4ade80",   bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.30)" },
                { label: "愛用会員",   value: data.favoriteCount, color: "#fb923c",   bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.30)" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-4 text-center"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="font-black leading-none" style={{ fontSize: "32px", color: s.color }}>{s.value}</div>
                  <div className="font-bold mt-1.5" style={{ fontSize: "13px", color: "rgba(255,255,255,0.80)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {data.members.length > 0 && (
              <>
                {/* 検索・フィルター */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: `${GOLD}70` }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="名前・会員IDで検索..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 outline-none transition font-jp"
                      style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    {(["all", "active", "inactive"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className="rounded-full px-4 py-1.5 text-sm font-bold transition"
                        style={filter === f
                          ? { background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})`, color: "white" }
                          : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)", border: `1px solid ${GOLD}30` }
                        }>
                        {f === "all" ? "すべて" : f === "active" ? "ACTのみ" : "非アクティブ"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 件数表示 */}
                <div className="text-sm font-bold tracking-wide px-1" style={{ color: GOLD_LIGHT }}>{filtered.length}件表示</div>

                {filtered.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center text-sm" style={{ background: CARD_BG, color: "rgba(255,255,255,0.40)" }}>
                    該当する会員がいません
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((m) => {
                      const st = STATUS_THEME[m.status] ?? STATUS_THEME.inactive;
                      return (
                        <div key={m.id} className="rounded-2xl overflow-hidden"
                          style={{ background: CARD_BG, border: `1px solid ${GOLD}25` }}>
                          <div className="px-5 py-4">
                            {/* 上段：名前＋バッジ */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-jp font-bold text-lg text-white">{m.name}</span>
                                  {m.isActive && (
                                    <span className="rounded-full text-xs px-2.5 py-0.5 font-black border"
                                      style={{ background: "rgba(52,211,153,0.18)", color: "#4ade80", borderColor: "rgba(74,222,128,0.40)" }}>
                                      ACT
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{m.memberCode}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span className="flex items-center gap-1.5 text-sm font-bold">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.dotColor }}></span>
                                  <span style={{ color: st.textColor }}>{STATUS_LABELS[m.status] ?? m.status}</span>
                                </span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                                  style={m.memberType === "business"
                                    ? { background: "rgba(96,165,250,0.18)", color: "#93c5fd", borderColor: "rgba(147,197,253,0.35)" }
                                    : { background: `${GOLD}18`, color: GOLD_LIGHT, borderColor: `${GOLD}40` }
                                  }>
                                  {TYPE_LABELS[m.memberType] ?? m.memberType}
                                </span>
                              </div>
                            </div>

                            {/* 購入情報 */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-xl p-3 border"
                                style={{ background: "rgba(251,146,60,0.12)", borderColor: "rgba(251,146,60,0.30)" }}>
                                <div className="text-xs font-bold mb-1.5" style={{ color: "#fb923c" }}>今月購入</div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black" style={{ color: "#fed7aa" }}>
                                    {m.currentMonthPoints > 0 ? `${m.currentMonthPoints.toLocaleString()}pt` : "—"}
                                  </span>
                                  {m.currentMonthAmount > 0 && (
                                    <span className="text-xs font-bold" style={{ color: "#fb923c" }}>¥{m.currentMonthAmount.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                              <div className="rounded-xl p-3 border"
                                style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}>
                                <div className="text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.60)" }}>先月購入</div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black" style={{ color: "rgba(255,255,255,0.85)" }}>
                                    {m.lastMonthPoints > 0 ? `${m.lastMonthPoints.toLocaleString()}pt` : "—"}
                                  </span>
                                  {m.lastMonthAmount > 0 && (
                                    <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.50)" }}>¥{m.lastMonthAmount.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 契約日・レベル */}
                            <div className="mt-2.5 flex items-center gap-3" style={{ fontSize: "12px" }}>
                              {fmtDate(m.contractDate ?? m.registeredAt) && (
                                <span style={{ color: "rgba(255,255,255,0.50)" }}>契約: {fmtDate(m.contractDate ?? m.registeredAt)}</span>
                              )}
                              {m.currentLevel > 0 && (
                                <span className="rounded-full px-2 py-0.5 font-bold"
                                  style={{ background: `${GOLD}18`, color: GOLD_LIGHT, fontSize: "12px" }}>LV.{m.currentLevel}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {data.members.length === 0 && !loading && (
              <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: `${GOLD}70` }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>直紹介の会員がいません</div>
                <Link href="/referral"
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white transition"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}>
                  友達を紹介する
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
