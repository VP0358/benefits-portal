"use client";

import { useState } from "react";

type ExportType = "members" | "orders" | "audit";

export default function CsvExportPanel() {
  const [activeTab, setActiveTab] = useState<ExportType>("members");
  const [filters, setFilters] = useState({
    memberStatus: "",
    orderFrom: "",
    orderTo: "",
  });
  const [downloading, setDownloading] = useState(false);

  async function download(type: ExportType) {
    setDownloading(true);
    let url = "";
    if (type === "members") {
      const params = new URLSearchParams();
      if (filters.memberStatus) params.set("status", filters.memberStatus);
      url = `/api/admin/export/members?${params}`;
    } else if (type === "orders") {
      const params = new URLSearchParams();
      if (filters.orderFrom) params.set("from", filters.orderFrom);
      if (filters.orderTo) params.set("to", filters.orderTo);
      url = `/api/admin/export/orders?${params}`;
    } else if (type === "audit") {
      url = `/api/admin/export/audit`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ?? `${type}.csv`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("ダウンロードに失敗しました。");
    } finally {
      setDownloading(false);
    }
  }

  const tabs: { key: ExportType; label: string; icon: string }[] = [
    { key: "members", label: "会員一覧", icon: "👥" },
    { key: "orders", label: "注文一覧", icon: "🛒" },
    { key: "audit", label: "監査ログ", icon: "📋" },
  ];

  return (
    <div className="space-y-6">
      {/* タブ */}
      <div className="flex gap-2 border-b pb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-slate-900 text-white"
                : "border text-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 会員一覧 */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">会員一覧 CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              会員番号・氏名・メール・ステータス・ポイント残高・紹介者・有効契約を含むCSVをダウンロードします。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ステータスで絞り込み（任意）</label>
              <select
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.memberStatus}
                onChange={e => setFilters({ ...filters, memberStatus: e.target.value })}
              >
                <option value="">すべて</option>
                <option value="active">有効</option>
                <option value="suspended">停止</option>
                <option value="invited">招待中</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => download("members")}
            disabled={downloading}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "⬇️ 会員一覧 CSV をダウンロード"}
          </button>
        </div>
      )}

      {/* 注文一覧 */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">注文一覧 CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              注文番号・ステータス・会員情報・金額・利用ポイントを含むCSVをダウンロードします。
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">注文日（開始）</label>
                <input
                  type="date"
                  className="w-full rounded-xl border px-4 py-2 text-sm font-medium text-slate-800"
                  value={filters.orderFrom}
                  onChange={e => setFilters({ ...filters, orderFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">注文日（終了）</label>
                <input
                  type="date"
                  className="w-full rounded-xl border px-4 py-2 text-sm font-medium text-slate-800"
                  value={filters.orderTo}
                  onChange={e => setFilters({ ...filters, orderTo: e.target.value })}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => download("orders")}
            disabled={downloading}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "⬇️ 注文一覧 CSV をダウンロード"}
          </button>
        </div>
      )}

      {/* 監査ログ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">監査ログ CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              管理者の操作ログ（最新5,000件）をCSVでダウンロードします。
            </p>
          </div>
          <button
            onClick={() => download("audit")}
            disabled={downloading}
            className="rounded-xl bg-slate-700 px-6 py-3 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "⬇️ 監査ログ CSV をダウンロード"}
          </button>
        </div>
      )}
    </div>
  );
}
