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
  active: "アクティブ",
  inactive: "非アクティブ",
  suspended: "停止中",
  canceled: "解約済",
  pending: "審査中",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  suspended: "bg-orange-100 text-orange-700",
  canceled: "bg-red-100 text-red-600",
  pending: "bg-blue-100 text-blue-700",
};
const TYPE_LABELS: Record<string, string> = {
  business: "ビジネス",
  favorite: "愛用",
};
const TYPE_COLORS: Record<string, string> = {
  business: "bg-blue-100 text-blue-700",
  favorite: "bg-amber-100 text-amber-700",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
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
    <div className="min-h-screen bg-[#e6f2dc]">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-green-600 text-sm font-medium hover:text-green-700">← 戻る</Link>
          <h1 className="text-lg font-bold text-slate-800">👥 紹介者一覧</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm shadow-sm">{error}</div>}

        {data && (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "直紹介数", value: data.totalCount, color: "bg-white border-slate-200", text: "text-slate-800" },
                { label: "Act（アクティブ）", value: data.activeCount, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
                { label: "愛用会員", value: data.favoriteCount, color: "bg-amber-50 border-amber-200", text: "text-amber-700" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-3.5 text-center shadow-sm ${s.color}`}>
                  <div className={`text-2xl font-black ${s.text}`}>{s.value}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {data.members.length > 0 && (
              <>
                {/* 検索・フィルター */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="名前・会員IDで検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-400 shadow-sm"
                  />
                  <div className="flex gap-2">
                    {(["all", "active", "inactive"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          filter === f ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                        }`}>
                        {f === "all" ? "すべて" : f === "active" ? "アクティブのみ" : "非アクティブ"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* メンバーリスト */}
                <div className="text-xs text-slate-500 px-1 font-semibold">{filtered.length}件表示</div>
                {filtered.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-slate-400 shadow-sm">該当する会員がいません</div>
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map((m) => (
                      <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3.5">
                          {/* 上段：名前＋バッジ */}
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800">{m.name}</span>
                                {m.isActive && (
                                  <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 font-bold">ACT</span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-slate-400 mt-0.5">{m.memberCode}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${STATUS_COLORS[m.status] ?? "bg-slate-100 text-slate-500"}`}>
                                {STATUS_LABELS[m.status] ?? m.status}
                              </span>
                              <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${TYPE_COLORS[m.memberType] ?? "bg-slate-100 text-slate-500"}`}>
                                {TYPE_LABELS[m.memberType] ?? m.memberType}
                              </span>
                            </div>
                          </div>

                          {/* 下段：数値情報 */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-violet-50 border border-violet-100 p-2.5">
                              <div className="text-[10px] text-violet-400 font-semibold mb-1">今月購入</div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-violet-700">
                                  {m.currentMonthPoints > 0 ? `${m.currentMonthPoints.toLocaleString()}pt` : "—"}
                                </span>
                                {m.currentMonthAmount > 0 && (
                                  <span className="text-[10px] text-violet-400">¥{m.currentMonthAmount.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                              <div className="text-[10px] text-slate-400 font-semibold mb-1">先月購入</div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">
                                  {m.lastMonthPoints > 0 ? `${m.lastMonthPoints.toLocaleString()}pt` : "—"}
                                </span>
                                {m.lastMonthAmount > 0 && (
                                  <span className="text-[10px] text-slate-400">¥{m.lastMonthAmount.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 契約日 */}
                          <div className="mt-2 text-[10px] text-slate-400">
                            契約日: {fmtDate(m.contractDate ?? m.registeredAt)}
                            {m.currentLevel > 0 && <span className="ml-2">LV.{m.currentLevel}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {data.members.length === 0 && !loading && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <div className="text-3xl mb-3">👥</div>
                <div className="text-slate-500 text-sm">直紹介の会員がいません</div>
                <div className="mt-3">
                  <Link href="/referral" className="text-sm text-green-600 font-semibold hover:underline">
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
