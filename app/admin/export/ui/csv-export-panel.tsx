"use client";

import { useState } from "react";

type ExportType = "members" | "orders" | "audit" | "mlm" | "mobile" | "travel" | "webfricom" | "credix" | "mufg";

export default function CsvExportPanel() {
  const [activeTab, setActiveTab] = useState<ExportType>("members");
  const [filters, setFilters] = useState({
    memberStatus: "",
    orderFrom: "",
    orderTo: "",
    bonusMonth: "",
    contractStatus: "",
    travelStatus: "",
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
    } else if (type === "mlm") {
      const params = new URLSearchParams();
      if (filters.bonusMonth) params.set("month", filters.bonusMonth);
      url = `/api/admin/export/mlm-bonuses?${params}`;
    } else if (type === "mobile") {
      const params = new URLSearchParams();
      if (filters.contractStatus) params.set("status", filters.contractStatus);
      url = `/api/admin/export/mobile-contracts?${params}`;
    } else if (type === "travel") {
      const params = new URLSearchParams();
      if (filters.travelStatus) params.set("status", filters.travelStatus);
      url = `/api/admin/export/travel-subscriptions?${params}`;
    } else if (type === "webfricom") {
      const params = new URLSearchParams();
      if (filters.bonusMonth) params.set("bonusMonth", filters.bonusMonth); // webfricom APIはbonusMonthパラメータを使用
      url = `/api/admin/export/webfricom?${params}`;
    } else if (type === "credix") {
      const params = new URLSearchParams();
      if (filters.bonusMonth) params.set("month", filters.bonusMonth);
      url = `/api/admin/export/credix-payment?${params}`;
    } else if (type === "mufg") {
      const params = new URLSearchParams();
      if (filters.bonusMonth) params.set("month", filters.bonusMonth);
      url = `/api/admin/export/mufg-payment?${params}`;
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
    { key: "mlm", label: "MLMボーナス", icon: "🌲" },
    { key: "mobile", label: "携帯契約", icon: "📱" },
    { key: "travel", label: "旅行サブスク", icon: "✈️" },
    { key: "webfricom", label: "振込データ", icon: "💰" },
    { key: "credix", label: "クレディックス", icon: "💳" },
    { key: "mufg", label: "三菱UFJ", icon: "🏦" },
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

      {/* MLMボーナス */}
      {activeTab === "mlm" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">MLMボーナス CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              会員コード・氏名・口座情報・ボーナス金額を含むCSVをダウンロードします。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">対象月（YYYY-MM）</label>
              <input
                type="month"
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.bonusMonth}
                onChange={e => setFilters({ ...filters, bonusMonth: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={() => download("mlm")}
            disabled={downloading || !filters.bonusMonth}
            className="rounded-xl bg-green-600 px-6 py-3 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "⬇️ MLMボーナス CSV をダウンロード"}
          </button>
        </div>
      )}

      {/* 携帯契約 */}
      {activeTab === "mobile" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">携帯契約 CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              契約番号・会員情報・プラン・月額料金・紹介者を含むCSVをダウンロードします。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">契約ステータス（任意）</label>
              <select
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.contractStatus}
                onChange={e => setFilters({ ...filters, contractStatus: e.target.value })}
              >
                <option value="">すべて</option>
                <option value="active">有効</option>
                <option value="pending">保留中</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => download("mobile")}
            disabled={downloading}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "⬇️ 携帯契約 CSV をダウンロード"}
          </button>
        </div>
      )}

      {/* 旅行サブスク */}
      {activeTab === "travel" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">旅行サブスク CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              会員情報・プラン名・レベル・月額料金・ステータスを含むCSVをダウンロードします。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">契約ステータス（任意）</label>
              <select
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.travelStatus}
                onChange={e => setFilters({ ...filters, travelStatus: e.target.value })}
              >
                <option value="">すべて</option>
                <option value="active">有効</option>
                <option value="pending">保留中</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => download("travel")}
            disabled={downloading}
            className="rounded-xl bg-purple-600 px-6 py-3 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "⬇️ 旅行サブスク CSV をダウンロード"}
          </button>
        </div>
      )}

      {/* ウェブフリコム振込データ */}
      {activeTab === "webfricom" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">ウェブフリコム振込データ ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              MLMボーナス支払い用の総合振込データ（固定長120文字/行）を出力します。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">対象月（YYYY-MM）</label>
              <input
                type="month"
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.bonusMonth}
                onChange={e => setFilters({ ...filters, bonusMonth: e.target.value })}
              />
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>注意:</strong> ウェブフリコム指定の固定長フォーマット（120文字/行）で出力されます。
              <br/>出力後、ウェブフリコムの総合振込画面からアップロードしてください。
            </div>
          </div>
          <button
            onClick={() => download("webfricom")}
            disabled={downloading || !filters.bonusMonth}
            className="rounded-xl bg-orange-600 px-6 py-3 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "💰 ウェブフリコム振込データ をダウンロード"}
          </button>
        </div>
      )}

      {/* クレディックス決済 */}
      {activeTab === "credix" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">クレディックス決済 CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              オートシップ有効＆クレジットカード支払いの会員データをCSVで出力します。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">対象月（YYYY-MM）</label>
              <input
                type="month"
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.bonusMonth}
                onChange={e => setFilters({ ...filters, bonusMonth: e.target.value })}
              />
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 mt-4">
              <strong>対象条件:</strong> オートシップ有効 AND 支払い方法がクレジットカード AND 休止月ではない会員
            </div>
          </div>
          <button
            onClick={() => download("credix")}
            disabled={downloading || !filters.bonusMonth}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "💳 クレディックス決済 CSV をダウンロード"}
          </button>
        </div>
      )}

      {/* 三菱UFJファクター口座振替 */}
      {activeTab === "mufg" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">三菱UFJファクター口座振替 CSV ダウンロード</h3>
            <p className="text-sm text-slate-700 mb-4">
              オートシップ有効＆口座振替支払いの会員データをCSVで出力します。
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">対象月（YYYY-MM）</label>
              <input
                type="month"
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 w-64"
                value={filters.bonusMonth}
                onChange={e => setFilters({ ...filters, bonusMonth: e.target.value })}
              />
            </div>
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 mt-4">
              <strong>対象条件:</strong> オートシップ有効 AND 支払い方法が口座振替 AND 休止月ではない会員
              <br/><strong>含まれる情報:</strong> 口座情報（銀行名、支店名、口座種別、口座番号、口座名義）
            </div>
          </div>
          <button
            onClick={() => download("mufg")}
            disabled={downloading || !filters.bonusMonth}
            className="rounded-xl bg-green-600 px-6 py-3 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {downloading ? "ダウンロード中..." : "🏦 三菱UFJファクター CSV をダウンロード"}
          </button>
        </div>
      )}
    </div>
  );
}
