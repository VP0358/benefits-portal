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

const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ", inactive: "非アクティブ", suspended: "停止中",
  canceled: "解約済", pending: "審査中",
};
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400", inactive: "bg-slate-500", suspended: "bg-orange-400",
  canceled: "bg-red-400", pending: "bg-blue-400",
};
const STATUS_TEXT: Record<string, string> = {
  active: "text-emerald-300", inactive: "text-slate-400", suspended: "text-orange-300",
  canceled: "text-red-300", pending: "text-blue-300",
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
          <h1 className="text-base font-bold text-white ml-1">紹介者一覧</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {data && (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "直紹介数",    value: data.totalCount,   accent: "border-white/10 bg-white/5",         text: "text-white" },
                { label: "Act（ACT）",  value: data.activeCount,  accent: "border-emerald-400/20 bg-emerald-500/08", text: "text-emerald-300" },
                { label: "愛用会員",    value: data.favoriteCount,accent: "border-amber-400/20 bg-amber-500/08", text: "text-amber-300" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-3.5 text-center ${s.accent}`}>
                  <div className={`text-2xl font-black ${s.text}`}>{s.value}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {data.members.length > 0 && (
              <>
                {/* 検索・フィルター */}
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="名前・会員IDで検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-400/50 transition"
                    style={{ background: "#111827" }}
                  />
                  <div className="flex gap-2">
                    {(["all", "active", "inactive"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          filter === f
                            ? "bg-indigo-600 text-white"
                            : "border border-white/10 text-white/50 hover:text-white hover:border-white/20"
                        }`}
                        style={{ background: filter === f ? undefined : "rgba(255,255,255,0.04)" }}>
                        {f === "all" ? "すべて" : f === "active" ? "ACTのみ" : "非アクティブ"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 件数表示 */}
                <div className="text-xs text-white/30 px-1 font-semibold tracking-wide">{filtered.length}件表示</div>

                {filtered.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
                    該当する会員がいません
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((m) => (
                      <div key={m.id} className="rounded-2xl overflow-hidden"
                        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="px-4 py-4">
                          {/* 上段：名前＋バッジ */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white/90 text-base">{m.name}</span>
                                {m.isActive && (
                                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 text-xs px-2 py-0.5 font-bold">
                                    ACT
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-white/30 mt-0.5">{m.memberCode}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_TEXT[m.status] ?? "text-white/40"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[m.status] ?? "bg-slate-500"}`}></span>
                                {STATUS_LABELS[m.status] ?? m.status}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                m.memberType === "business"
                                  ? "bg-blue-500/15 text-blue-300 border border-blue-400/20"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-400/20"
                              }`}>
                                {TYPE_LABELS[m.memberType] ?? m.memberType}
                              </span>
                            </div>
                          </div>

                          {/* 購入情報 */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl p-2.5 border border-violet-400/15"
                              style={{ background: "rgba(139,92,246,0.07)" }}>
                              <div className="text-[10px] text-violet-400/70 font-semibold mb-1">今月購入</div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-violet-300">
                                  {m.currentMonthPoints > 0 ? `${m.currentMonthPoints.toLocaleString()}pt` : "—"}
                                </span>
                                {m.currentMonthAmount > 0 && (
                                  <span className="text-[10px] text-violet-400/60">¥{m.currentMonthAmount.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="rounded-xl p-2.5 border border-white/8"
                              style={{ background: "rgba(255,255,255,0.04)" }}>
                              <div className="text-[10px] text-white/30 font-semibold mb-1">先月購入</div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white/50">
                                  {m.lastMonthPoints > 0 ? `${m.lastMonthPoints.toLocaleString()}pt` : "—"}
                                </span>
                                {m.lastMonthAmount > 0 && (
                                  <span className="text-[10px] text-white/30">¥{m.lastMonthAmount.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 契約日・レベル */}
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-white/25">
                            {fmtDate(m.contractDate ?? m.registeredAt) && (
                              <span>契約: {fmtDate(m.contractDate ?? m.registeredAt)}</span>
                            )}
                            {m.currentLevel > 0 && <span>LV.{m.currentLevel}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {data.members.length === 0 && !loading && (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#111827" }}>
                <div className="text-4xl mb-3 opacity-40">👥</div>
                <div className="text-white/30 text-sm">直紹介の会員がいません</div>
                <div className="mt-4">
                  <Link href="/referral" className="text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition">
                    → 友達を紹介する
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
