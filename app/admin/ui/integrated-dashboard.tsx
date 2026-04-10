"use client";

import { useState } from "react";

type Tab = "mlm" | "mobile" | "travel" | "export" | "other";

interface NavItem {
  href: string
  label: string
  icon: string
  desc: string
  badge?: string
}

export default function IntegratedDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("mlm");

  const tabs: { id: Tab; label: string; icon: string; color: string }[] = [
    { id: "mlm", label: "MLM関連", icon: "fas fa-users", color: "blue" },
    { id: "mobile", label: "携帯契約", icon: "fas fa-mobile-alt", color: "green" },
    { id: "travel", label: "旅行サブスク", icon: "fas fa-plane", color: "purple" },
    { id: "export", label: "データ出力", icon: "fas fa-download", color: "orange" },
    { id: "other", label: "システム設定", icon: "fas fa-cog", color: "gray" },
  ];

  const tabColors: Record<string, { active: string; hover: string; card: string; icon: string }> = {
    blue: {
      active: "border-blue-600 text-blue-600 bg-blue-50",
      hover: "hover:text-blue-700 hover:bg-blue-50",
      card: "border-blue-200 hover:border-blue-500 hover:bg-blue-50",
      icon: "text-blue-600"
    },
    green: {
      active: "border-green-600 text-green-700 bg-green-50",
      hover: "hover:text-green-700 hover:bg-green-50",
      card: "border-green-200 hover:border-green-500 hover:bg-green-50",
      icon: "text-green-600"
    },
    purple: {
      active: "border-purple-600 text-purple-700 bg-purple-50",
      hover: "hover:text-purple-700 hover:bg-purple-50",
      card: "border-purple-200 hover:border-purple-500 hover:bg-purple-50",
      icon: "text-purple-600"
    },
    orange: {
      active: "border-orange-600 text-orange-700 bg-orange-50",
      hover: "hover:text-orange-700 hover:bg-orange-50",
      card: "border-orange-200 hover:border-orange-500 hover:bg-orange-50",
      icon: "text-orange-600"
    },
    gray: {
      active: "border-slate-600 text-slate-700 bg-slate-50",
      hover: "hover:text-slate-700 hover:bg-slate-50",
      card: "border-gray-200 hover:border-slate-500 hover:bg-slate-50",
      icon: "text-slate-600"
    }
  };

  const activeColor = tabColors[tabs.find(t => t.id === activeTab)?.color ?? "blue"];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">統合管理ダッシュボード</h1>
          <p className="mt-1 text-gray-500 text-sm">機能別にタブで整理された管理画面です。各機能への素早いアクセスができます。</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/contacts" className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
            <i className="fas fa-comments"></i>相談窓口
          </a>
          <a href="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition">
            <i className="fas fa-chart-line"></i>売上レポート
          </a>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 border-b-2 border-gray-200 overflow-x-auto pb-0">
        {tabs.map((tab) => {
          const colors = tabColors[tab.color];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-4 -mb-0.5 ${
                isActive
                  ? `border-current ${colors.active}`
                  : `border-transparent text-gray-500 ${colors.hover}`
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeTab === "mlm" && <MlmContent cardClass={activeColor.card} iconClass={activeColor.icon} />}
        {activeTab === "mobile" && <MobileContent cardClass={activeColor.card} iconClass={activeColor.icon} />}
        {activeTab === "travel" && <TravelContent cardClass={activeColor.card} iconClass={activeColor.icon} />}
        {activeTab === "export" && <ExportContent cardClass={activeColor.card} iconClass={activeColor.icon} />}
        {activeTab === "other" && <OtherContent cardClass={activeColor.card} iconClass={activeColor.icon} />}
      </div>
    </div>
  );
}

function NavCard({ item, cardClass, iconClass }: { item: NavItem; cardClass: string; iconClass: string }) {
  return (
    <a
      href={item.href}
      className={`flex items-start gap-4 p-4 border-2 rounded-xl transition group ${cardClass}`}
    >
      <div className={`text-2xl mt-0.5 ${iconClass}`}>
        <i className={item.icon}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-gray-800 group-hover:text-gray-900">{item.label}</div>
          {item.badge && (
            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-medium">{item.badge}</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</div>
      </div>
      <div className="text-gray-400 group-hover:text-gray-600 mt-1">›</div>
    </a>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function MlmContent({ cardClass, iconClass }: { cardClass: string; iconClass: string }) {
  const sections: { title: string; subtitle: string; items: NavItem[] }[] = [
    {
      title: "会員管理",
      subtitle: "MLM会員の登録・編集・統計確認",
      items: [
        { href: "/admin/mlm-members", label: "MLM会員管理", icon: "fas fa-users", desc: "会員一覧・詳細・編集・登録完了通知書" },
        { href: "/admin/mlm-members/new", label: "MLM会員新規登録", icon: "fas fa-user-plus", desc: "新規MLM会員の登録フォーム" },
        { href: "/admin/mlm-members/stats", label: "MLM会員統計", icon: "fas fa-chart-bar", desc: "会員数・状況の統計データ" },
        { href: "/admin/mlm-organization", label: "組織図・リスト", icon: "fas fa-sitemap", desc: "組織ツリーとダウンライン一覧" },
      ]
    },
    {
      title: "ボーナス管理",
      subtitle: "月次ボーナスの計算・確認・設定",
      items: [
        { href: "/admin/bonus-calculate", label: "ボーナス計算・処理", icon: "fas fa-calculator", desc: "月次ボーナス計算実行・調整金管理" },
        { href: "/admin/bonus-report-center", label: "ボーナス結果・レポート", icon: "fas fa-file-invoice-dollar", desc: "計算結果・明細・サマリーレポート" },
        { href: "/admin/bonus-utilities", label: "ボーナスユーティリティ", icon: "fas fa-tools", desc: "各種ボーナス補助ツール" },
        { href: "/admin/bonus-settings", label: "ボーナス設定", icon: "fas fa-cog", desc: "ボーナス率・条件の設定管理" },
      ]
    },
    {
      title: "受注・発送管理",
      subtitle: "注文の受付から発送までの管理",
      items: [
        { href: "/admin/orders", label: "注文管理", icon: "fas fa-shopping-cart", desc: "注文履歴・ステータス管理・納品書" },
        { href: "/admin/orders-shipping", label: "受注・発送状況", icon: "fas fa-shipping-fast", desc: "支払い方法・伝票種別での絞り込み検索・編集" },
        { href: "/admin/shipping-labels", label: "発送伝票管理", icon: "fas fa-file-invoice", desc: "発送伝票の作成・印刷" },
        { href: "/admin/autoship", label: "オートシップ管理", icon: "fas fa-sync", desc: "自動出荷スケジュール・支払方法設定" },
      ]
    },
    {
      title: "商品・購入管理",
      subtitle: "MLM商品と購入データの管理",
      items: [
        { href: "/admin/products", label: "商品管理", icon: "fas fa-box", desc: "商品登録・編集（コード1000-2999がポイント対象）" },
        { href: "/admin/product-purchases", label: "商品購入管理", icon: "fas fa-shopping-bag", desc: "購入記録・ステータス管理・CSV出力" },
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <SectionTitle title="MLM関連機能" subtitle="MLM会員・ボーナス・受発注の各種管理機能" />
      {sections.map(section => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-gray-700 text-base">{section.title}</h3>
            <span className="text-xs text-gray-400">{section.subtitle}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {section.items.map(item => (
              <NavCard key={item.href} item={item} cardClass={cardClass} iconClass={iconClass} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileContent({ cardClass, iconClass }: { cardClass: string; iconClass: string }) {
  const items: NavItem[] = [
    { href: "/admin/vp-phone", label: "VP未来phone申し込み", icon: "fas fa-mobile-alt", desc: "新規申込・審査・ステータス管理" },
    { href: "/admin/vp-phone/stats", label: "携帯契約統計", icon: "fas fa-chart-bar", desc: "申込状況・契約率の統計データ" },
    { href: "/admin/contracts", label: "携帯契約一覧", icon: "fas fa-file-contract", desc: "契約状況・プラン・ステータス管理" },
    { href: "/admin/referral-rewards", label: "紹介者報酬計算", icon: "fas fa-gift", desc: "紹介報酬の計算・確定処理" },
    { href: "/admin/referral-history", label: "紹介者変更履歴", icon: "fas fa-history", desc: "紹介者変更の履歴確認" },
  ];

  return (
    <div>
      <SectionTitle title="携帯契約関連機能" subtitle="VP未来phone申し込み管理・契約・紹介報酬" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <NavCard key={item.href} item={item} cardClass={cardClass} iconClass={iconClass} />
        ))}
      </div>
    </div>
  );
}

function TravelContent({ cardClass, iconClass }: { cardClass: string; iconClass: string }) {
  const items: NavItem[] = [
    { href: "/admin/travel-subscriptions", label: "旅行サブスク一覧", icon: "fas fa-plane", desc: "サブスクリプション状況・プラン管理" },
    { href: "/admin/travel-subscriptions/stats", label: "旅行サブスク統計", icon: "fas fa-chart-bar", desc: "加入者数・プラン別の統計データ" },
  ];

  return (
    <div>
      <SectionTitle title="旅行サブスク関連機能" subtitle="旅行サブスクリプション契約の管理" />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(item => (
          <NavCard key={item.href} item={item} cardClass={cardClass} iconClass={iconClass} />
        ))}
      </div>
    </div>
  );
}

function ExportContent({ cardClass, iconClass }: { cardClass: string; iconClass: string }) {
  const items: NavItem[] = [
    { href: "/admin/export", label: "CSV/振込データ出力", icon: "fas fa-download", desc: "MLM・携帯・旅行サブスク・Webフリコム・Credix・MUFG振込データ" },
    { href: "/admin/dashboard", label: "売上/ポイントレポート", icon: "fas fa-chart-line", desc: "売上・注文数・ポイント集計グラフ・商品ランキング" },
    { href: "/admin/audit", label: "監査ログ", icon: "fas fa-search", desc: "管理者操作ログ確認・CSV出力" },
    { href: "/admin/monthly-runs", label: "月次実行履歴", icon: "fas fa-calendar-alt", desc: "月次処理の実行記録確認" },
  ];

  return (
    <div>
      <SectionTitle title="データ出力機能" subtitle="各種CSVエクスポート・レポート出力" />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(item => (
          <NavCard key={item.href} item={item} cardClass={cardClass} iconClass={iconClass} />
        ))}
      </div>
    </div>
  );
}

function OtherContent({ cardClass, iconClass }: { cardClass: string; iconClass: string }) {
  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "会員・ポイント管理",
      items: [
        { href: "/admin/members", label: "会員管理", icon: "fas fa-user", desc: "会員情報・ステータス管理" },
        { href: "/admin/points/monthly", label: "月次ポイント計算", icon: "fas fa-calendar-check", desc: "月次ポイント付与処理" },
        { href: "/admin/points/expire", label: "ポイント失効処理", icon: "fas fa-clock", desc: "期限切れポイントの処理" },
      ]
    },
    {
      title: "サイト設定・コンテンツ",
      items: [
        { href: "/admin/menus", label: "メニュー管理", icon: "fas fa-list", desc: "フロント画面メニュー管理" },
        { href: "/admin/announcements", label: "お知らせ管理", icon: "fas fa-bullhorn", desc: "お知らせ投稿・編集" },
        { href: "/admin/mail-settings", label: "送信メール編集", icon: "fas fa-envelope", desc: "メールテンプレート管理" },
        { href: "/admin/site-settings", label: "サイト設定", icon: "fas fa-cog", desc: "サイト全体の設定変更" },
      ]
    },
    {
      title: "アカウント・ログ",
      items: [
        { href: "/admin/account", label: "ログイン情報変更", icon: "fas fa-key", desc: "管理者アカウント・パスワード設定" },
        { href: "/admin/contacts", label: "相談窓口", icon: "fas fa-comments", desc: "ユーザーからの相談・問い合わせ対応" },
      ]
    },
  ];

  return (
    <div className="space-y-7">
      <SectionTitle title="システム設定" subtitle="会員・ポイント・サイト設定・アカウント管理" />
      {sections.map(section => (
        <div key={section.title}>
          <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide">{section.title}</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map(item => (
              <NavCard key={item.href} item={item} cardClass={cardClass} iconClass={iconClass} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
