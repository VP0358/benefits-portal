"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

// ── 型定義 ────────────────────────────────────────────────────────
type ForceRow = {
  id: string;
  memberCode: string;
  memberType: "business" | "preferred";
  status: string;
  currentLevel: number;
  titleLevel: number;
  forceActive: boolean;
  forceLevel: number | null;
  contractDate: string | null;
  companyName: string | null;
  prefecture: string | null;
  userName: string;
  userEmail: string;
  uplineMemberCode: string | null;
  uplineName: string | null;
};

type Filter = "all" | "forceActive" | "forceLevel" | "both";

// ── 定数 ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  active:     "活動中",
  autoship:   "オートシップ",
  lapsed:     "失効",
  suspended:  "停止",
  withdrawn:  "退会",
  midCancel:  "中途解約",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  autoship:  "bg-blue-100 text-blue-700",
  lapsed:    "bg-red-100 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
  withdrawn: "bg-gray-100 text-gray-500",
  midCancel: "bg-yellow-100 text-yellow-700",
};

const FILTER_LABELS: Record<Filter, string> = {
  all:         "全て",
  forceActive: "強制アクティブのみ",
  forceLevel:  "強制タイトルのみ",
  both:        "両方設定",
};

// ── メインコンポーネント ──────────────────────────────────────────
export default function ForceMemberListPage() {
  const [rows, setRows] = useState<ForceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mlm-members/force-list?filter=${f}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { rows: ForceRow[]; total: number };
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filter); }, [filter, load]);

  // 検索フィルター（クライアント側）
  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.memberCode.toLowerCase().includes(q) ||
      r.userName.toLowerCase().includes(q) ||
      (r.companyName ?? "").toLowerCase().includes(q) ||
      (r.userEmail ?? "").toLowerCase().includes(q)
    );
  });

  // CSV エクスポート
  const handleCSV = () => {
    const headers = [
      "会員コード", "氏名", "法人名", "都道府県", "メール",
      "ステータス", "会員種別", "現在レベル", "称号レベル",
      "強制アクティブ", "強制タイトル", "契約日", "直上者コード", "直上者名",
    ];
    const csvRows = filtered.map((r) => [
      r.memberCode,
      r.userName,
      r.companyName ?? "",
      r.prefecture ?? "",
      r.userEmail,
      STATUS_LABELS[r.status] ?? r.status,
      r.memberType === "business" ? "ビジネス会員" : "愛用会員",
      LEVEL_LABELS[r.currentLevel] ?? `LV.${r.currentLevel}`,
      LEVEL_LABELS[r.titleLevel] ?? `LV.${r.titleLevel}`,
      r.forceActive ? "有効" : "—",
      r.forceLevel !== null ? (LEVEL_LABELS[r.forceLevel] ?? `LV.${r.forceLevel}`) : "—",
      r.contractDate ?? "",
      r.uplineMemberCode ?? "",
      r.uplineName ?? "",
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `強制設定会員一覧_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f0e8", fontFamily: "'Noto Sans JP', sans-serif" }}>
      {/* ── ヘッダー ── */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)", padding: "28px 32px 24px" }}>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/mlm-members" className="text-blue-300 hover:text-white text-sm transition">
            ← MLM会員管理
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <i className="fas fa-shield-alt text-yellow-400"></i>
          強制設定会員 一覧
        </h1>
        <p className="text-blue-200 text-sm mt-1">
          強制アクティブ・強制タイトルが設定されている会員を管理します
        </p>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto">

        {/* ── サマリーカード ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(["all", "forceActive", "forceLevel", "both"] as Filter[]).map((f) => {
            const count = f === "all"
              ? rows.length
              : f === "forceActive"
              ? rows.filter((r) => r.forceActive).length
              : f === "forceLevel"
              ? rows.filter((r) => r.forceLevel !== null).length
              : rows.filter((r) => r.forceActive && r.forceLevel !== null).length;

            const colors: Record<Filter, { bg: string; text: string; icon: string; iconColor: string }> = {
              all:         { bg: "#fff",           text: "#1e3a5f", icon: "fas fa-users",         iconColor: "#6366f1" },
              forceActive: { bg: "#fff7ed",        text: "#9a3412", icon: "fas fa-fire",           iconColor: "#ea580c" },
              forceLevel:  { bg: "#f5f3ff",        text: "#5b21b6", icon: "fas fa-medal",          iconColor: "#7c3aed" },
              both:        { bg: "#fdf2f8",        text: "#9d174d", icon: "fas fa-star",           iconColor: "#db2777" },
            };
            const c = colors[f];

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-xl p-4 text-left transition shadow-sm hover:shadow-md"
                style={{
                  background: c.bg,
                  border: filter === f ? `2px solid ${c.iconColor}` : "2px solid transparent",
                  boxShadow: filter === f ? `0 0 0 3px ${c.iconColor}22` : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <i className={`${c.icon} text-sm`} style={{ color: c.iconColor }}></i>
                  <span className="text-xs font-medium" style={{ color: c.iconColor }}>
                    {FILTER_LABELS[f]}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: c.text }}>{count}</div>
                <div className="text-xs text-gray-400 mt-0.5">件</div>
              </button>
            );
          })}
        </div>

        {/* ── 操作バー ── */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {/* フィルタータブ */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(["all", "forceActive", "forceLevel", "both"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition"
                  style={{
                    background: filter === f ? "#1e3a5f" : "transparent",
                    color: filter === f ? "#fff" : "#6b7280",
                  }}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
            {/* 検索 */}
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="会員コード・氏名・法人名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filtered.length} 件表示 / 全 {total} 件
            </span>
            <button
              onClick={handleCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
              style={{ background: "#1e3a5f", color: "#e8c96a" }}
            >
              <i className="fas fa-download"></i>
              CSV出力
            </button>
          </div>
        </div>

        {/* ── テーブル ── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <i className="fas fa-spinner fa-spin text-2xl mr-3"></i>
              読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p className="text-sm">該当する会員がいません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#1e3a5f" }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200 whitespace-nowrap">会員コード</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200 whitespace-nowrap">氏名 / 法人名</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200 whitespace-nowrap">ステータス</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-blue-200 whitespace-nowrap">現在レベル</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-blue-200 whitespace-nowrap">称号レベル</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-orange-300 whitespace-nowrap">
                      🔥 強制アクティブ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-violet-300 whitespace-nowrap">
                      🏅 強制タイトル
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200 whitespace-nowrap">直上者</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-200 whitespace-nowrap">契約日</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-blue-200 whitespace-nowrap">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="hover:bg-amber-50 transition"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#fafaf9" }}
                    >
                      {/* 会員コード */}
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {r.memberCode}
                      </td>

                      {/* 氏名 */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">{r.userName}</div>
                        {r.companyName && (
                          <div className="text-xs text-gray-400">{r.companyName}</div>
                        )}
                        {r.prefecture && (
                          <div className="text-xs text-gray-400">{r.prefecture}</div>
                        )}
                      </td>

                      {/* ステータス */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>

                      {/* 現在レベル */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-600">
                          {LEVEL_LABELS[r.currentLevel] ?? `LV.${r.currentLevel}`}
                        </span>
                      </td>

                      {/* 称号レベル */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-600">
                          {LEVEL_LABELS[r.titleLevel] ?? `LV.${r.titleLevel}`}
                        </span>
                      </td>

                      {/* 強制アクティブ */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {r.forceActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                            🔥 有効
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* 強制タイトル */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {r.forceLevel !== null ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
                            🏅 {LEVEL_LABELS[r.forceLevel] ?? `LV.${r.forceLevel}`}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* 直上者 */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.uplineMemberCode ? (
                          <div>
                            <div className="text-xs font-mono text-gray-500">{r.uplineMemberCode}</div>
                            <div className="text-xs text-gray-400">{r.uplineName}</div>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* 契約日 */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {r.contractDate ?? "—"}
                      </td>

                      {/* 詳細リンク */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Link
                          href={`/admin/mlm-members/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                          style={{ background: "#1e3a5f", color: "#e8c96a" }}
                        >
                          <i className="fas fa-external-link-alt text-[10px]"></i>
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 凡例 ── */}
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-600 mb-3">
            <i className="fas fa-info-circle mr-1 text-blue-400"></i>
            設定内容の説明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap shrink-0">
                🔥 強制アクティブ
              </span>
              <p>購入条件に関わらず、アクティブ会員として扱います。ボーナス計算の対象になります。</p>
            </div>
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap shrink-0">
                🏅 強制タイトル
              </span>
              <p>指定したレベルの達成条件を満たしたと見なして、称号・ボーナス計算を行います。</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
