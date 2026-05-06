"use client";

import { useState, useEffect, useCallback } from "react";

// ── 定数 ────────────────────────────────────────────────
const TABS = [
  { key: "all",      label: "全件",     icon: "fas fa-list",          color: "#8b7cf8" },
  { key: "mobile",   label: "携帯契約", icon: "fas fa-mobile-alt",    color: "#10b981" },
  { key: "travel",   label: "旅行サブスク", icon: "fas fa-plane",     color: "#3b82f6" },
  { key: "car",      label: "中古車",   icon: "fas fa-car",           color: "#f59e0b" },
  { key: "life",     label: "生命保険", icon: "fas fa-shield-alt",    color: "#ec4899" },
  { key: "non_life", label: "損害保険", icon: "fas fa-umbrella",      color: "#06b6d4" },
] as const;

type TabKey = typeof TABS[number]["key"];

const CATEGORY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  mobile:   { label: "携帯契約",   bg: "#d1fae5", color: "#065f46" },
  travel:   { label: "旅行サブスク", bg: "#dbeafe", color: "#1e40af" },
  car:      { label: "中古車",     bg: "#fef3c7", color: "#92400e" },
  life:     { label: "生命保険",   bg: "#fce7f3", color: "#9d174d" },
  non_life: { label: "損害保険",   bg: "#cffafe", color: "#164e63" },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: "申込中",  bg: "#fef3c7", color: "#92400e" },
  active:     { label: "有効",    bg: "#d1fae5", color: "#065f46" },
  contacted:  { label: "連絡済",  bg: "#ede9fe", color: "#5b21b6" },
  contracted: { label: "契約済",  bg: "#d1fae5", color: "#065f46" },
  canceled:   { label: "解約済",  bg: "#fee2e2", color: "#991b1b" },
  suspended:  { label: "停止中",  bg: "#f1f5f9", color: "#475569" },
};

const AGENCY_LIST = [
  "ANHELO富山店", "ANHELO砺波店", "ANHELO遠野店", "ANHELO仙台店",
  "ANHELO群馬店", "ANHELO名古屋店", "ANHELO営業部",
];

const ALL_STATUSES = [
  { value: "",           label: "全ステータス" },
  { value: "pending",    label: "申込中" },
  { value: "contacted",  label: "連絡済" },
  { value: "contracted", label: "契約済" },
  { value: "active",     label: "有効" },
  { value: "canceled",   label: "解約済" },
  { value: "suspended",  label: "停止中" },
];

interface ContractRow {
  category: string;
  categoryLabel: string;
  id: string;
  memberCode: string;
  userName: string;
  email: string;
  detail: string;
  monthlyFee?: number;
  status: string;
  statusLabel: string;
  referrerOrAgency: string;
  createdAt: string;
  startedAt: string | null;
}

interface Summary {
  mobile: number; travel: number; car: number; life: number; nonLife: number;
}

interface AgencySummary {
  [agency: string]: { life: number; nonLife: number };
}

interface ApiResponse {
  rows: ContractRow[];
  total: number;
  page: number;
  totalPages: number;
  summary?: Summary;
  agencySummary?: AgencySummary;
  searchMode: boolean;
}

export default function WelfareContractsClient() {
  const [tab, setTab]             = useState<TabKey>("all");
  const [search, setSearch]       = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [data, setData]           = useState<ApiResponse | null>(null);
  const [loading, setLoading]     = useState(false);

  // ステータス変更用
  const [editRow, setEditRow]     = useState<ContractRow | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote]   = useState("");
  const [saving, setSaving]       = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        tab,
        search,
        agency: agencyFilter,
        status: statusFilter,
        page: String(page),
      });
      const res = await fetch(`/api/admin/welfare-contracts?${p}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [tab, search, agencyFilter, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleTabChange(key: TabKey) {
    setTab(key);
    setPage(1);
    setSearch("");
    setSearchInput("");
    setAgencyFilter("");
    setStatusFilter("");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  async function handleSaveStatus() {
    if (!editRow) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/welfare-contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editRow.category,
          id: editRow.id,
          status: editStatus,
          adminNote: editNote,
        }),
      });
      if (res.ok) {
        setEditRow(null);
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  }

  const summary = data?.summary;
  const agencySummary = data?.agencySummary;
  const showAgencyPanel = tab === "life" || tab === "non_life" || tab === "all";

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── ヘッダー ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#0a1628" }}>
            福利厚生 契約履歴一覧
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            携帯・旅行・中古車・生命保険・損害保険の全契約履歴を横断管理できます
          </p>
        </div>

        {/* ── サマリーカード ── */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: "携帯契約",     value: summary.mobile,   color: "#10b981", icon: "fas fa-mobile-alt", key: "mobile" },
              { label: "旅行サブスク", value: summary.travel,   color: "#3b82f6", icon: "fas fa-plane",       key: "travel" },
              { label: "中古車",       value: summary.car,      color: "#f59e0b", icon: "fas fa-car",         key: "car" },
              { label: "生命保険",     value: summary.life,     color: "#ec4899", icon: "fas fa-shield-alt",  key: "life" },
              { label: "損害保険",     value: summary.nonLife,  color: "#06b6d4", icon: "fas fa-umbrella",    key: "non_life" },
            ].map(c => (
              <button
                key={c.key}
                onClick={() => handleTabChange(c.key as TabKey)}
                className="rounded-xl p-4 text-left transition-all hover:scale-105"
                style={{
                  background: "#fff",
                  border: `2px solid ${tab === c.key ? c.color : "transparent"}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <i className={`${c.icon} text-sm`} style={{ color: c.color }} />
                  <span className="text-xs font-medium" style={{ color: "#6b7280" }}>{c.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: "#0a1628" }}>{c.value.toLocaleString()}</div>
                <div className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>件</div>
              </button>
            ))}
          </div>
        )}

        {/* ── 代理店別パネル（保険タブ時） ── */}
        {showAgencyPanel && agencySummary && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
            <div className="flex items-center gap-2 mb-3">
              <i className="fas fa-building text-sm" style={{ color: "#ec4899" }} />
              <span className="font-bold text-sm" style={{ color: "#0a1628" }}>代理店別 保険申込数</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {AGENCY_LIST.map(ag => {
                const stat = agencySummary[ag] ?? { life: 0, nonLife: 0 };
                const total = stat.life + stat.nonLife;
                return (
                  <button
                    key={ag}
                    onClick={() => {
                      setAgencyFilter(agencyFilter === ag ? "" : ag);
                      setPage(1);
                      if (tab !== "life" && tab !== "non_life") handleTabChange("life");
                    }}
                    className="rounded-lg p-3 text-left transition-all"
                    style={{
                      background: agencyFilter === ag ? "#fce7f3" : "#f9fafb",
                      border: `1px solid ${agencyFilter === ag ? "#ec4899" : "#e5e7eb"}`,
                    }}
                  >
                    <div className="text-xs font-semibold mb-1 truncate" style={{ color: "#374151" }}>{ag}</div>
                    <div className="flex gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#fce7f3", color: "#9d174d" }}>
                        生命 {stat.life}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#cffafe", color: "#164e63" }}>
                        損害 {stat.nonLife}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="text-sm font-bold mt-1" style={{ color: "#0a1628" }}>計{total}件</div>
                    )}
                  </button>
                );
              })}
            </div>
            {agencyFilter && (
              <button
                onClick={() => { setAgencyFilter(""); setPage(1); }}
                className="mt-2 text-xs px-3 py-1 rounded-full"
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                絞り込み解除: {agencyFilter}
              </button>
            )}
          </div>
        )}

        {/* ── タブ ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === t.key ? "#0a1628" : "#fff",
                color: tab === t.key ? t.color : "#6b7280",
                border: `1px solid ${tab === t.key ? "#0a1628" : "#e5e7eb"}`,
                boxShadow: tab === t.key ? "0 2px 8px rgba(10,22,40,0.2)" : "none",
              }}
            >
              <i className={`${t.icon} text-xs`} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 検索・フィルター ── */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
          <div className="flex flex-wrap gap-3">
            {/* 個人検索 */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-1" style={{ minWidth: 240 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="会員ID・名前・メールで検索（全カテゴリ横断）"
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #d1d5db", outline: "none" }}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#0a1628", color: "#c9a84c" }}
              >
                <i className="fas fa-search mr-1" />検索
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  クリア
                </button>
              )}
            </form>

            {/* ステータスフィルター */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ border: "1px solid #d1d5db", outline: "none", background: "#fff" }}
            >
              {ALL_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* 検索モード表示 */}
          {data?.searchMode && (
            <div className="mt-2 flex items-center gap-2">
              <i className="fas fa-info-circle text-xs" style={{ color: "#3b82f6" }} />
              <span className="text-xs" style={{ color: "#374151" }}>
                「{search}」の全カテゴリ横断検索結果 — {data.total}件
              </span>
            </div>
          )}
        </div>

        {/* ── テーブル ── */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
          {/* テーブルヘッダー */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <span className="text-sm font-semibold" style={{ color: "#374151" }}>
              {loading ? "読み込み中..." : `${(data?.total ?? 0).toLocaleString()} 件`}
              {!data?.searchMode && data && data.totalPages > 1 && (
                <span className="ml-2 text-xs font-normal" style={{ color: "#9ca3af" }}>
                  ({page} / {data.totalPages} ページ)
                </span>
              )}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>種別</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>会員ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>氏名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold hidden md:table-cell" style={{ color: "#6b7280" }}>内容</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>紹介者 / 代理店</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold hidden lg:table-cell" style={{ color: "#6b7280" }}>申込日</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {!loading && data?.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
                      データがありません
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
                      <i className="fas fa-spinner fa-spin mr-2" />読み込み中...
                    </td>
                  </tr>
                )}
                {!loading && data?.rows.map((row, i) => {
                  const catBadge = CATEGORY_BADGE[row.category] ?? { label: row.categoryLabel, bg: "#f3f4f6", color: "#374151" };
                  const stBadge  = STATUS_BADGE[row.status] ?? { label: row.statusLabel, bg: "#f3f4f6", color: "#374151" };
                  const isInsurance = row.category === "life" || row.category === "non_life";
                  return (
                    <tr
                      key={`${row.category}-${row.id}`}
                      style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                    >
                      {/* 種別 */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: catBadge.bg, color: catBadge.color }}>
                          {catBadge.label}
                        </span>
                      </td>
                      {/* 会員ID */}
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "#374151" }}>
                        {row.memberCode}
                      </td>
                      {/* 氏名・メール */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm" style={{ color: "#0a1628" }}>{row.userName}</div>
                        <div className="text-xs" style={{ color: "#9ca3af" }}>{row.email}</div>
                      </td>
                      {/* 内容 */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs" style={{ color: "#374151" }}>{row.detail}</span>
                      </td>
                      {/* 紹介者 / 代理店 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <i
                            className={isInsurance ? "fas fa-building" : "fas fa-user"}
                            style={{ color: isInsurance ? "#ec4899" : "#10b981", fontSize: 10 }}
                          />
                          <span className="text-xs" style={{ color: "#374151" }}>{row.referrerOrAgency}</span>
                        </div>
                      </td>
                      {/* ステータス */}
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: stBadge.bg, color: stBadge.color }}>
                          {stBadge.label}
                        </span>
                      </td>
                      {/* 申込日 */}
                      <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: "#6b7280" }}>
                        {new Date(row.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      {/* 操作 */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setEditRow(row);
                            setEditStatus(row.status);
                            setEditNote("");
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "#f1f5f9", color: "#374151", border: "1px solid #e5e7eb" }}
                        >
                          <i className="fas fa-edit mr-1" />編集
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {!data?.searchMode && data && data.totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f1f5f9" }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: page <= 1 ? "#f1f5f9" : "#0a1628",
                  color: page <= 1 ? "#9ca3af" : "#c9a84c",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                <i className="fas fa-chevron-left mr-1" />前へ
              </button>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {page} / {data.totalPages} ページ
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: page >= data.totalPages ? "#f1f5f9" : "#0a1628",
                  color: page >= data.totalPages ? "#9ca3af" : "#c9a84c",
                  cursor: page >= data.totalPages ? "not-allowed" : "pointer",
                }}
              >
                次へ<i className="fas fa-chevron-right ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ステータス編集モーダル ── */}
      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditRow(null); }}
        >
          <div className="rounded-2xl w-full max-w-md p-6" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: "#0a1628" }}>ステータス変更</h3>
            <p className="text-sm mb-4" style={{ color: "#6b7280" }}>
              {editRow.userName}（{editRow.memberCode}）— {editRow.categoryLabel}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>ステータス</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #d1d5db", outline: "none" }}
              >
                {ALL_STATUSES.filter(s => s.value).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>管理メモ（任意）</label>
              <textarea
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                rows={3}
                placeholder="連絡内容・対応状況などを記入"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid #d1d5db", outline: "none", resize: "none" }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditRow(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#f1f5f9", color: "#374151" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveStatus}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: saving ? "#9ca3af" : "#0a1628",
                  color: saving ? "#fff" : "#c9a84c",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
