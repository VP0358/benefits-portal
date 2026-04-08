"use client";

import { useState } from "react";

type Tab = "mlm" | "mobile" | "travel" | "export" | "other";

export default function IntegratedDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("mlm");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "mlm", label: "MLM関連", icon: "fas fa-users" },
    { id: "mobile", label: "携帯契約関連", icon: "fas fa-mobile-alt" },
    { id: "travel", label: "旅行サブスク関連", icon: "fas fa-plane" },
    { id: "export", label: "データエクスポート", icon: "fas fa-download" },
    { id: "other", label: "その他", icon: "fas fa-ellipsis-h" },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">統合管理ダッシュボード</h1>
        <p className="mt-2 text-gray-600">機能別にタブで整理された管理画面です。</p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-2 border-b-2 border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-b-4 border-blue-600 text-blue-600 -mb-0.5"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === "mlm" && <MlmContent />}
        {activeTab === "mobile" && <MobileContent />}
        {activeTab === "travel" && <TravelContent />}
        {activeTab === "export" && <ExportContent />}
        {activeTab === "other" && <OtherContent />}
      </div>
    </div>
  );
}

function MlmContent() {
  const items = [
    { href: "/admin/mlm-members", label: "MLM会員管理", icon: "fas fa-users", desc: "会員タイプ・レベル・条件設定" },
    { href: "/admin/bonus-run", label: "MLMボーナス計算", icon: "fas fa-coins", desc: "月次ボーナス自動計算・確定" },
    { href: "/admin/autoship", label: "オートシップ管理", icon: "fas fa-sync", desc: "自動出荷・支払方法設定" },
    { href: "/admin/products", label: "商品管理", icon: "fas fa-box", desc: "MLM商品の登録・編集" },
    { href: "/admin/orders", label: "注文管理", icon: "fas fa-shopping-cart", desc: "注文履歴・ステータス管理" },
    { href: "/admin/shipping-labels", label: "発送伝票管理", icon: "fas fa-truck", desc: "発送伝票作成・印刷" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">MLM関連機能</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <div className="text-2xl text-blue-600">
              <i className={item.icon}></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">{item.label}</div>
              <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
            </div>
            <div className="text-gray-400">›</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function MobileContent() {
  const items = [
    { href: "/admin/vp-phone", label: "VP未来phone申し込み", icon: "fas fa-mobile-alt", desc: "新規申込・審査・ステータス管理" },
    { href: "/admin/contracts", label: "携帯契約一覧", icon: "fas fa-file-contract", desc: "契約状況・プラン管理" },
    { href: "/admin/referral-rewards", label: "紹介者報酬計算", icon: "fas fa-gift", desc: "紹介報酬の計算・確定" },
    { href: "/admin/referral-history", label: "紹介者変更履歴", icon: "fas fa-history", desc: "紹介者変更の履歴確認" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">携帯契約関連機能</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <div className="text-2xl text-green-600">
              <i className={item.icon}></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">{item.label}</div>
              <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
            </div>
            <div className="text-gray-400">›</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function TravelContent() {
  const items = [
    { href: "/admin/travel-subscriptions", label: "旅行サブスク一覧", icon: "fas fa-plane", desc: "サブスクリプション状況管理" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">旅行サブスク関連機能</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <div className="text-2xl text-purple-600">
              <i className={item.icon}></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">{item.label}</div>
              <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
            </div>
            <div className="text-gray-400">›</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ExportContent() {
  const items = [
    { href: "/admin/export", label: "CSV/振込データ出力", icon: "fas fa-download", desc: "MLM、携帯契約、旅行サブスク、Webフリコム振込データ" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">データエクスポート機能</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition"
          >
            <div className="text-2xl text-orange-600">
              <i className={item.icon}></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">{item.label}</div>
              <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
            </div>
            <div className="text-gray-400">›</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function OtherContent() {
  const items = [
    { href: "/admin/dashboard", label: "売上/ポイント", icon: "fas fa-chart-line", desc: "売上・ポイント状況の確認" },
    { href: "/admin/menus", label: "メニュー管理", icon: "fas fa-list", desc: "フロント画面メニュー管理" },
    { href: "/admin/members", label: "会員管理", icon: "fas fa-user", desc: "会員情報・ステータス管理" },
    { href: "/admin/points/monthly", label: "月次ポイント計算", icon: "fas fa-calendar-check", desc: "月次ポイント付与処理" },
    { href: "/admin/points/expire", label: "ポイント失効処理", icon: "fas fa-clock", desc: "期限切れポイント処理" },
    { href: "/admin/monthly-runs", label: "月次実行履歴", icon: "fas fa-calendar-alt", desc: "月次処理の実行履歴" },
    { href: "/admin/audit", label: "監査ログ", icon: "fas fa-search", desc: "管理者操作ログ確認" },
    { href: "/admin/mail-settings", label: "送信メール編集", icon: "fas fa-envelope", desc: "メールテンプレート管理" },
    { href: "/admin/site-settings", label: "サイト設定", icon: "fas fa-cog", desc: "サイト全体の設定変更" },
    { href: "/admin/account", label: "ログイン情報変更", icon: "fas fa-key", desc: "管理者アカウント設定" },
    { href: "/admin/announcements", label: "お知らせ管理", icon: "fas fa-bullhorn", desc: "お知らせ投稿・編集" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">その他の機能</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition"
          >
            <div className="text-2xl text-gray-600">
              <i className={item.icon}></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">{item.label}</div>
              <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
            </div>
            <div className="text-gray-400">›</div>
          </a>
        ))}
      </div>
    </div>
  );
}
