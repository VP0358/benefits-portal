"use client";

import { useState } from "react";

type Tab = "mlm" | "welfare" | "settings";

interface NavItem {
  href: string
  label: string
  icon: string
  desc: string
  badge?: string
}

const TAB_CONFIG: { id: Tab; label: string; icon: string; accent: string }[] = [
  { id: "mlm",      label: "MLM管理",   icon: "fas fa-users",    accent: "#8b7cf8" },
  { id: "welfare",  label: "福利厚生",  icon: "fas fa-heart",    accent: "#f472b6" },
  { id: "settings", label: "設定・管理", icon: "fas fa-cog",      accent: "#94a3b8" },
];

export default function IntegratedDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("mlm");
  const tab = TAB_CONFIG.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "#c9a84c", fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif", letterSpacing: "0.15em" }}
          >
            Admin Portal
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0a1628" }}>管理ダッシュボード</h1>
          <p className="text-sm mt-0.5" style={{ color: "#78716c" }}>各機能へのクイックアクセス</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/contacts"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}>
            <i className="fas fa-comments text-xs" /> 相談窓口
          </a>
          <a href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #0a1628, #162c50)", color: "#e8c96a", border: "1px solid rgba(201,168,76,0.25)", boxShadow: "0 2px 8px rgba(10,22,40,0.25)" }}>
            <i className="fas fa-chart-line text-xs" /> 売上レポート
          </a>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div
        className="flex gap-1 overflow-x-auto"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
      >
        {TAB_CONFIG.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-150 border-b-2 -mb-px"
            style={activeTab === t.id
              ? { borderColor: t.accent, color: t.accent, background: `${t.accent}0c` }
              : { borderColor: "transparent", color: "#78716c" }
            }
            onMouseEnter={e => { if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.color = "#0a1628"; }}
            onMouseLeave={e => { if (activeTab !== t.id) (e.currentTarget as HTMLElement).style.color = "#78716c"; }}
          >
            <i className={t.icon} style={{ fontSize: "13px" }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div
        className="rounded-2xl bg-white p-6"
        style={{ border: "1px solid rgba(201,168,76,0.12)", boxShadow: "0 4px 20px rgba(10,22,40,0.06), 0 1px 4px rgba(10,22,40,0.04)" }}
      >
        {activeTab === "mlm"      && <MlmContent      accent={tab.accent} />}
        {activeTab === "welfare"  && <WelfareContent  accent={tab.accent} />}
        {activeTab === "settings" && <SettingsContent accent={tab.accent} />}
      </div>
    </div>
  );
}

/* ─── NavCard ─── */
function NavCard({ item, accent }: { item: NavItem; accent: string }) {
  return (
    <a
      href={item.href}
      className="group flex items-start gap-3 p-4 rounded-xl transition-all duration-150"
      style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(255,252,248,1)" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}60`;
        (e.currentTarget as HTMLElement).style.background = `${accent}06`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${accent}18`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.1)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,252,248,1)";
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 mt-0.5"
        style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}
      >
        <i className={item.icon} style={{ color: accent, fontSize: "14px" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm leading-snug" style={{ color: "#0a1628" }}>{item.label}</span>
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-md font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>{item.badge}</span>
          )}
        </div>
        <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: "#78716c" }}>{item.desc}</p>
      </div>
      <i className="fas fa-chevron-right text-[10px] mt-1 group-hover:translate-x-0.5 transition-transform" style={{ color: "rgba(201,168,76,0.35)" }} />
    </a>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold" style={{ color: "#0a1628" }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: "#78716c" }}>{subtitle}</p>}
    </div>
  );
}

function GroupSection({ title, subtitle, items, accent }: { title: string; subtitle?: string; items: NavItem[]; accent: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)", paddingBottom: "8px" }}>
        <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: accent }} />
        <h3 className="text-sm font-bold" style={{ color: "#0a1628" }}>{title}</h3>
        {subtitle && <span className="text-xs" style={{ color: "#78716c" }}>{subtitle}</span>}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
        {items.map(item => <NavCard key={item.href} item={item} accent={accent} />)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ① MLM管理タブ
───────────────────────────────────────── */
function MlmContent({ accent }: { accent: string }) {
  return (
    <div className="space-y-7">
      <SectionTitle title="MLM管理機能" subtitle="会員・ボーナス・受発注の管理" />

      <GroupSection title="会員管理" subtitle="MLM会員の登録・編集・統計" accent={accent} items={[
        { href: "/admin/mlm-members",       label: "MLM会員管理",    icon: "fas fa-users",         desc: "会員一覧・詳細・編集・登録完了通知書" },
        { href: "/admin/mlm-members/new",   label: "新規会員登録",   icon: "fas fa-user-plus",     desc: "新規MLM会員の登録フォーム" },
        { href: "/admin/mlm-stats",         label: "MLM月次統計",    icon: "fas fa-chart-pie",     desc: "年齢・性別・地域・オートシップ継続率の月次レポート", badge: "NEW" },
        { href: "/admin/mlm-members/stats", label: "会員統計",       icon: "fas fa-chart-bar",     desc: "会員数・状況の統計データ" },
        { href: "/admin/mlm-organization",  label: "組織図・リスト", icon: "fas fa-sitemap",       desc: "組織ツリーとダウンライン一覧" },
      ]} />

      <GroupSection title="ボーナス管理" subtitle="月次ボーナスの計算・確認・設定" accent={accent} items={[
        { href: "/admin/bonus-calculate",     label: "ボーナス計算・処理",     icon: "fas fa-calculator",         desc: "月次ボーナス計算実行・調整金管理" },
        { href: "/admin/bonus-report-center", label: "ボーナス結果・レポート", icon: "fas fa-file-invoice-dollar", desc: "計算結果・明細・サマリーレポート" },
        { href: "/admin/bonus-utilities",     label: "ボーナスユーティリティ", icon: "fas fa-tools",              desc: "各種ボーナス補助ツール" },
        { href: "/admin/bonus-settings",      label: "ボーナス設定",           icon: "fas fa-sliders-h",          desc: "ボーナス率・条件の設定管理" },
      ]} />

      <GroupSection title="受注・発送管理" subtitle="注文の受付から発送まで" accent={accent} items={[
        { href: "/admin/orders",           label: "注文管理",       icon: "fas fa-shopping-cart", desc: "注文履歴・ステータス管理・納品書" },
        { href: "/admin/orders-shipping",  label: "受注・発送状況", icon: "fas fa-shipping-fast", desc: "支払い方法・伝票種別での絞り込み" },
        { href: "/admin/shipping-labels",  label: "発送伝票管理",   icon: "fas fa-file-invoice",  desc: "発送伝票の作成・印刷" },
        { href: "/admin/autoship",         label: "継続購入管理",   icon: "fas fa-sync",          desc: "自動出荷スケジュール・支払設定" },
      ]} />

      <GroupSection title="商品・購入管理" accent={accent} items={[
        { href: "/admin/products",          label: "商品管理",     icon: "fas fa-box",          desc: "商品登録・編集（コード1000-2999がポイント対象）" },
        { href: "/admin/product-purchases", label: "商品購入管理", icon: "fas fa-shopping-bag", desc: "購入記録・ステータス管理・CSV出力" },
      ]} />
    </div>
  );
}

/* ─────────────────────────────────────────
   ② 福利厚生タブ
───────────────────────────────────────── */
function WelfareContent({ accent }: { accent: string }) {
  return (
    <div className="space-y-7">
      <SectionTitle title="福利厚生管理" subtitle="携帯契約・格安旅行・メニュー管理" />

      {/* メニュー管理（最上部に配置） */}
      <GroupSection
        title="福利厚生メニュー管理"
        subtitle="会員マイページの福利厚生メニューを追加・編集・並び替え"
        accent={accent}
        items={[
          { href: "/admin/menus",     label: "メニュー管理",  icon: "fas fa-list",  desc: "福利厚生メニューの追加・編集・削除・並び替え" },
          { href: "/admin/menus/new", label: "メニュー新規追加", icon: "fas fa-plus-circle", desc: "新しい福利厚生メニューを追加する" },
        ]}
      />

      {/* 携帯契約 */}
      <GroupSection
        title="携帯契約"
        subtitle="VP未来phone申し込み・契約・紹介報酬"
        accent={accent}
        items={[
          { href: "/admin/vp-phone",         label: "VP未来phone申し込み", icon: "fas fa-mobile-alt",   desc: "新規申込・審査・ステータス管理" },
          { href: "/admin/vp-phone/stats",   label: "携帯契約統計",       icon: "fas fa-chart-bar",     desc: "申込状況・契約率の統計データ" },
          { href: "/admin/contracts",        label: "携帯契約一覧",       icon: "fas fa-file-contract", desc: "契約状況・プラン・ステータス管理" },
          { href: "/admin/referral-rewards", label: "紹介者報酬計算",     icon: "fas fa-gift",          desc: "紹介報酬の計算・確定処理" },
        ]}
      />

      {/* 格安旅行 */}
      <GroupSection
        title="格安旅行"
        subtitle="旅行サブスクリプション契約の管理"
        accent={accent}
        items={[
          { href: "/admin/travel-subscriptions",       label: "旅行サブスク一覧", icon: "fas fa-plane",     desc: "サブスクリプション状況・プラン管理" },
          { href: "/admin/travel-subscriptions/stats", label: "旅行サブスク統計", icon: "fas fa-chart-bar", desc: "加入者数・プラン別の統計データ" },
        ]}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   ③ 設定・管理タブ
───────────────────────────────────────── */
function SettingsContent({ accent }: { accent: string }) {
  return (
    <div className="space-y-7">
      <SectionTitle title="設定・管理" subtitle="会員・ポイント・サイト設定・アカウント管理" />

      <GroupSection title="会員・ポイント管理" accent={accent} items={[
        { href: "/admin/members",        label: "会員管理",        icon: "fas fa-user",            desc: "会員情報・ステータス管理" },
        { href: "/admin/points/monthly", label: "月次ポイント計算", icon: "fas fa-calendar-check",  desc: "月次ポイント付与処理" },
        { href: "/admin/points/expire",  label: "ポイント失効処理", icon: "fas fa-clock",           desc: "期限切れポイントの処理" },
      ]} />

      <GroupSection title="データ出力・レポート" accent={accent} items={[
        { href: "/admin/export",       label: "CSV/振込データ出力",   icon: "fas fa-download",    desc: "MLM・携帯・旅行サブスク・Credix・MUFG振込データ" },
        { href: "/admin/dashboard",    label: "売上/ポイントレポート", icon: "fas fa-chart-line",  desc: "売上・注文数・ポイント集計グラフ・商品ランキング" },
        { href: "/admin/audit",        label: "監査ログ",             icon: "fas fa-search",       desc: "管理者操作ログ確認・CSV出力" },
        { href: "/admin/monthly-runs", label: "月次実行履歴",         icon: "fas fa-calendar-alt", desc: "月次処理の実行記録確認" },
      ]} />

      <GroupSection title="サイト設定・コンテンツ" accent={accent} items={[
        { href: "/admin/announcements", label: "お知らせ管理",   icon: "fas fa-bullhorn",  desc: "お知らせ投稿・編集" },
        { href: "/admin/mail-settings", label: "送信メール編集", icon: "fas fa-envelope",  desc: "メールテンプレート管理" },
        { href: "/admin/site-settings", label: "サイト設定",     icon: "fas fa-cog",       desc: "サイト全体の設定変更" },
      ]} />

      <GroupSection title="アカウント・ログ" accent={accent} items={[
        { href: "/admin/account",        label: "ログイン情報変更", icon: "fas fa-key",       desc: "管理者アカウント・パスワード設定" },
        { href: "/admin/password-reset", label: "会員PW初期化",     icon: "fas fa-lock-open", desc: "会員のマイページPWを「0000」にリセット" },
        { href: "/admin/contacts",       label: "相談窓口",         icon: "fas fa-comments",  desc: "ユーザーからの相談・問い合わせ対応" },
      ]} />
    </div>
  );
}
