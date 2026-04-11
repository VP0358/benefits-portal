"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { NON_PURCHASE_ALERT_STYLES, LEVEL_LABELS, MEMBER_TYPE_LABELS } from "@/lib/mlm-bonus";

// ── デザイントークン ─────────────────────────────────────────
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

/* ─── 型定義 ─── */
type NodeData = {
  id: string;
  name: string;
  memberCode: string;
  avatarUrl: string | null;
  mlmMemberCode: string;
  memberType: string;
  status: string;
  currentLevel: number;
  titleLevel: number;
  isActive: boolean;
  selfPoints: number;
  consecutiveNonPurchase: number;
  nonPurchaseAlert: "none" | "warn_4" | "danger_5";
  children: NodeData[];
};

type MeData = {
  id: string;
  name: string;
  memberCode: string;
  avatarUrl: string | null;
  mlmMemberCode: string;
  memberType: string;
  currentLevel: number;
  titleLevel: number;
  isActive: boolean;
  selfPoints: number;
  upline: { name: string; memberCode: string } | null;
  referrer: { name: string; memberCode: string } | null;
};

type OrgData = {
  month: string;
  me: MeData;
  matrixDownlines: NodeData[];
  uniDownlines: NodeData[];
};

type OrgType = "matrix" | "unilevel";
type ViewMode = "tree" | "list";

/* ─── レベルバッジ ─── */
function LevelBadge({ level, type = "current" }: { level: number; type?: "current" | "title" }) {
  if (level === 0) return null;
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={
        type === "title"
          ? { background: `${GOLD}20`, color: GOLD_LIGHT, border: `1px solid ${GOLD}40` }
          : { background: "rgba(196,181,253,0.15)", color: "#c4b5fd", border: "1px solid rgba(196,181,253,0.30)" }
      }
    >
      {type === "title" ? "👑 " : "⭐ "}{LEVEL_LABELS[level] ?? `LV.${level}`}
    </span>
  );
}

/* ─── アバター ─── */
function Avatar({
  avatarUrl, name, size = "md",
}: {
  avatarUrl: string | null; name: string; size?: "sm" | "md" | "lg" | "xl";
}) {
  const s = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14", xl: "w-20 h-20" }[size];
  const t = { sm: "text-base", md: "text-lg", lg: "text-2xl", xl: "text-4xl" }[size];
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className={`${s} rounded-full object-cover`}
        style={{ border: `2px solid ${GOLD}30` }} />
    );
  }
  return (
    <div className={`${s} rounded-full flex items-center justify-center ${t}`}
      style={{ background: NAVY_CARD3, border: `2px solid ${GOLD}20` }}>😊</div>
  );
}

/* ─── ツリーノードカード ─── */
function TreeNode({ node, depth, orgType }: { node: NodeData; depth: number; orgType: OrgType }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const alertStyle = NON_PURCHASE_ALERT_STYLES[node.nonPurchaseAlert];

  const borderColor =
    node.nonPurchaseAlert === "danger_5" ? "rgba(248,113,113,0.45)" :
    node.nonPurchaseAlert === "warn_4"   ? "rgba(251,191,36,0.35)"  :
    node.isActive ? "rgba(52,211,153,0.30)" : `${GOLD}18`;

  const depthColors = [
    { bg: NAVY_CARD, border: `${GOLD}30` },
    { bg: "#0e2040", border: "rgba(99,179,237,0.25)" },
    { bg: "#0f2245", border: "rgba(167,139,250,0.25)" },
    { bg: "#10234a", border: "rgba(52,211,153,0.20)" },
    { bg: "#11254f", border: `${GOLD}18` },
  ];
  const depthStyle = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div className="flex flex-col items-start w-full">
      <div
        className="rounded-xl overflow-hidden w-full transition-all"
        style={{
          background: `linear-gradient(150deg,${depthStyle.bg} 0%,${NAVY_CARD2} 100%)`,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 2px 10px rgba(10,22,40,0.15)",
        }}
      >
        {/* 警告ライン */}
        {node.nonPurchaseAlert !== "none" && (
          <div className="h-0.5" style={{
            background: node.nonPurchaseAlert === "danger_5"
              ? "linear-gradient(90deg,transparent,rgba(248,113,113,0.9) 50%,transparent)"
              : "linear-gradient(90deg,transparent,rgba(251,191,36,0.7) 50%,transparent)"
          }} />
        )}

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
          onClick={() => node.children.length > 0 && setExpanded(!expanded)}
        >
          <div className="relative flex-shrink-0">
            <Avatar avatarUrl={node.avatarUrl} name={node.name} size="sm" />
            <span className="absolute -bottom-0.5 -right-0.5 text-[9px] leading-none">
              {node.isActive ? "✅" : "❌"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="font-semibold truncate text-sm"
              style={{
                color: node.nonPurchaseAlert === "danger_5" ? "#fca5a5"
                  : node.nonPurchaseAlert === "warn_4" ? "#fde68a"
                  : "rgba(255,255,255,0.90)"
              }}
            >
              {node.name}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {node.mlmMemberCode}
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-[10px]" style={{ color: `${GOLD}70` }}>
                {MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType}
              </span>
              <LevelBadge level={node.currentLevel} type="current" />
              {node.titleLevel > node.currentLevel && <LevelBadge level={node.titleLevel} type="title" />}
            </div>
          </div>

          <div className="flex-shrink-0 text-right space-y-0.5">
            <div className="text-xs font-semibold" style={{ color: GOLD_LIGHT }}>
              {node.selfPoints}pt
            </div>
            <div className="text-[10px]" style={{ color: `${GOLD}45` }}>
              {orgType === "matrix" ? "M" : "U"}{depth}段
            </div>
            {node.children.length > 0 && (
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>
                {expanded ? "▲" : `▼${node.children.length}`}
              </div>
            )}
          </div>
        </button>

        {/* 警告バナー */}
        {node.nonPurchaseAlert !== "none" && (
          <div
            className="px-3 py-1 text-[10px] font-bold text-center"
            style={
              node.nonPurchaseAlert === "danger_5"
                ? { background: "rgba(239,68,68,0.20)", color: "#fca5a5", borderTop: "1px solid rgba(248,113,113,0.20)" }
                : { background: "rgba(251,191,36,0.08)", color: "#fde68a", borderTop: "1px solid rgba(251,191,36,0.18)" }
            }
          >
            ⚠️ {alertStyle.label}（{node.consecutiveNonPurchase}ヶ月連続未購入）
          </div>
        )}
      </div>

      {/* 子ノード */}
      {expanded && node.children.length > 0 && (
        <div
          className="mt-1.5 ml-4 pl-3 space-y-1.5 w-full"
          style={{ borderLeft: `1px dashed ${GOLD}20` }}
        >
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} orgType={orgType} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── リスト行 ─── */
function ListRow({ node, depth, orgType }: { node: NodeData; depth: number; orgType: OrgType }) {
  const rows: React.ReactNode[] = [];

  const alertColor =
    node.nonPurchaseAlert === "danger_5" ? "#fca5a5" :
    node.nonPurchaseAlert === "warn_4"   ? "#fde68a"  :
    node.isActive ? "#34d399" : "rgba(255,255,255,0.3)";

  rows.push(
    <div
      key={node.id}
      className="flex items-center gap-3 px-3 py-2 border-b"
      style={{
        borderColor: "rgba(255,255,255,0.05)",
        paddingLeft: `${12 + depth * 16}px`,
      }}
    >
      {/* 段インジケーター */}
      <span
        className="text-[9px] font-bold w-6 text-center rounded-full py-0.5 flex-shrink-0"
        style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
      >
        {orgType === "matrix" ? "M" : "U"}{depth}
      </span>

      <Avatar avatarUrl={node.avatarUrl} name={node.name} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: alertColor }}>
          {node.name}
        </div>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          {node.mlmMemberCode}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px]" style={{ color: `${GOLD}70` }}>
          {MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType}
        </span>
        {node.currentLevel > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: "rgba(196,181,253,0.15)", color: "#c4b5fd" }}
          >
            ⭐LV.{node.currentLevel}
          </span>
        )}
        <span className="text-xs font-bold" style={{ color: GOLD_LIGHT }}>
          {node.selfPoints}pt
        </span>
        <span
          className="text-[10px] w-10 text-center rounded-full py-0.5"
          style={{
            background: node.isActive ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
            color: node.isActive ? "#34d399" : "rgba(255,255,255,0.3)",
          }}
        >
          {node.isActive ? "ACT" : "—"}
        </span>
      </div>
    </div>
  );

  if (node.children.length > 0) {
    node.children.forEach((child) => {
      rows.push(...(
        [<ListRow key={`${child.id}-list`} node={child} depth={depth + 1} orgType={orgType} />]
      ));
    });
  }

  return <>{rows}</>;
}

/* ─── フラットリスト再帰展開 ─── */
function flattenNodes(nodes: NodeData[], depth: number, orgType: OrgType): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  for (const n of nodes) {
    result.push(<ListRow key={n.id} node={n} depth={depth} orgType={orgType} />);
    if (n.children.length > 0) {
      result.push(...flattenNodes(n.children, depth + 1, orgType));
    }
  }
  return result;
}

/* ─── メインページ ─── */
export default function MlmOrgChartPage() {
  const [data,    setData]    = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [orgType, setOrgType] = useState<OrgType>("matrix");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/my/mlm-org-chart")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentNodes = orgType === "matrix"
    ? (data?.matrixDownlines ?? [])
    : (data?.uniDownlines ?? []);

  const activeCount = countActive(currentNodes);
  const totalCount  = countTotal(currentNodes);
  const warnCount   = countWarn(currentNodes);

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.10]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }} />
      </div>

      {/* ヘッダー */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: "rgba(245,240,232,0.96)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`,
          boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 transition"
            style={{ color: "rgba(10,22,40,0.55)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>

          <div className="flex items-center gap-2 ml-1 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h1 className="text-base font-semibold" style={{ color: NAVY }}>組織図</h1>
          </div>

          {/* 更新ボタン */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-40"
            style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>

          {data && (
            <span className="text-xs" style={{ color: `${GOLD}55` }}>📅 {data.month}</span>
          )}
        </div>

        {/* タブ：組織種別 × 表示形式 */}
        <div className="max-w-2xl mx-auto px-4 pb-2 flex items-center justify-between gap-3">
          {/* 組織種別 */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
            {([
              { key: "matrix",   label: "🔷 マトリックス" },
              { key: "unilevel", label: "🔶 ユニレベル" },
            ] as { key: OrgType; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setOrgType(key)}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{
                  background: orgType === key
                    ? `linear-gradient(135deg,${GOLD},${ORANGE})`
                    : "rgba(10,22,40,0.04)",
                  color: orgType === key ? "#fff" : `${NAVY}70`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 表示形式 */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
            {([
              { key: "tree", label: "🌲 ツリー" },
              { key: "list", label: "📋 リスト" },
            ] as { key: ViewMode; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{
                  background: viewMode === key
                    ? `linear-gradient(135deg,#334155,#1e293b)`
                    : "rgba(10,22,40,0.04)",
                  color: viewMode === key ? "#e2e8f0" : `${NAVY}70`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 relative">

        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
            <p className="text-sm" style={{ color: `${GOLD}60` }}>読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <p className="text-sm font-semibold" style={{ color: "#f87171" }}>{error}</p>
            {error.includes("MLM会員情報") && (
              <p className="mt-2 text-xs" style={{ color: "rgba(10,22,40,0.45)" }}>
                管理者にMLM会員登録を依頼してください。
              </p>
            )}
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── 組織説明テキスト ── */}
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}>
              {orgType === "matrix" ? (
                <p style={{ color: `${NAVY}70` }}>
                  <span className="font-bold" style={{ color: GOLD }}>🔷 マトリックス組織図</span>
                  &nbsp;— 直上者（upline）を起点とした配下ツリーです。最大5段まで表示します。
                </p>
              ) : (
                <p style={{ color: `${NAVY}70` }}>
                  <span className="font-bold" style={{ color: ORANGE }}>🔶 ユニレベル組織図</span>
                  &nbsp;— あなたが紹介した会員を起点とした紹介ラインのツリーです。最大5段まで表示します。
                </p>
              )}
            </div>

            {/* ── サマリー統計 ── */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "アクティブ", value: activeCount, color: "#34d399", icon: "✅", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.25)" },
                { label: orgType === "matrix" ? "配下合計" : "紹介合計", value: totalCount, color: GOLD_LIGHT, icon: "👥", bg: `${GOLD}10`, border: `${GOLD}25` },
                { label: "失効アラート", value: warnCount, color: "#fde68a", icon: "⚠️", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-3 text-center"
                  style={{ background: item.bg, border: `1px solid ${item.border}`, boxShadow: "0 4px 12px rgba(10,22,40,0.10)" }}>
                  <div className="text-lg mb-0.5">{item.icon}</div>
                  <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "rgba(10,22,40,0.45)" }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* ── 自分カード ── */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}30`,
                boxShadow: `0 8px 32px rgba(10,22,40,0.20)`,
              }}
            >
              <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }} />
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden"
                    style={{ border: `3px solid ${GOLD}50`, boxShadow: `0 0 16px ${GOLD}25` }}>
                    {data.me.avatarUrl
                      ? <img src={data.me.avatarUrl} alt={data.me.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: NAVY_CARD3 }}>😊</div>}
                  </div>
                  <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white"
                    style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>YOU</span>
                  {data.me.isActive && (
                    <span className="absolute -bottom-1 -left-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(52,211,153,0.20)", border: "1px solid rgba(52,211,153,0.40)", color: "#34d399" }}>ACT</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{data.me.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: `${GOLD}60` }}>{data.me.mlmMemberCode}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <LevelBadge level={data.me.currentLevel} type="current" />
                    {data.me.titleLevel > data.me.currentLevel && <LevelBadge level={data.me.titleLevel} type="title" />}
                  </div>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.30)" }}>
                    自己購入: {data.me.selfPoints}pt
                  </p>
                </div>
                <div className="flex-shrink-0 text-right space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {orgType === "matrix" && data.me.upline && (
                    <div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>直上者</div>
                      <div style={{ color: "rgba(255,255,255,0.60)" }}>{data.me.upline.name}</div>
                    </div>
                  )}
                  {orgType === "unilevel" && data.me.referrer && (
                    <div>
                      <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>紹介者</div>
                      <div style={{ color: "rgba(255,255,255,0.60)" }}>{data.me.referrer.name}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 接続矢印 */}
            {currentNodes.length > 0 && (
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-4" style={{ background: `${GOLD}30` }} />
                  <p className="text-[10px]" style={{ color: `${GOLD}45` }}>
                    {orgType === "matrix" ? "配下メンバー（マトリックス直下）" : "紹介ライン（ユニレベル直下）"}
                  </p>
                  <div className="w-px h-3" style={{ background: `${GOLD}30` }} />
                </div>
              </div>
            )}

            {/* ── ノードなし ── */}
            {currentNodes.length === 0 ? (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: `${NAVY_CARD}80`, border: `2px dashed ${GOLD}15` }}>
                <div className="text-3xl mb-2">🌱</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                  {orgType === "matrix" ? "配下メンバーがいません" : "紹介した会員がいません"}
                </div>
              </div>
            ) : viewMode === "tree" ? (
              /* ─── ツリービュー ─── */
              <div className="space-y-2">
                {currentNodes.map((node) => (
                  <TreeNode key={node.id} node={node} depth={1} orgType={orgType} />
                ))}
              </div>
            ) : (
              /* ─── リストビュー ─── */
              <div className="rounded-2xl overflow-hidden"
                style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18` }}>
                {/* リストヘッダー */}
                <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-bold"
                  style={{ background: `${GOLD}12`, color: `${GOLD}80`, borderBottom: `1px solid ${GOLD}18` }}>
                  <span className="w-6 text-center">段</span>
                  <span className="w-10">—</span>
                  <span className="flex-1">氏名 / 会員コード</span>
                  <span>種別</span>
                  <span className="ml-auto">pt / ACT</span>
                </div>
                {flattenNodes(currentNodes, 1, orgType)}
              </div>
            )}

            {/* ── 凡例 ── */}
            <div className="rounded-2xl px-4 py-3"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.18)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: `${NAVY}60` }}>凡例</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { icon: "✅", text: "アクティブ", sub: "（当月150pt以上＋スミサイ購入あり）", color: "#34d399" },
                  { icon: "❌", text: "非アクティブ", sub: "（ユニレベル計算で圧縮対象）", color: `${NAVY}55` },
                  { icon: "⚠️", text: "失効予定（5ヶ月目）", sub: "スミサイ4ヶ月連続未購入", color: "#fde68a" },
                  { icon: "🔴", text: "失効（6ヶ月目）", sub: "スミサイ5ヶ月連続未購入", color: "#f87171" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span className="font-semibold" style={{ color: item.color }}>{item.text}</span>
                    <span style={{ color: `${NAVY}40` }}>{item.sub}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: "1px solid rgba(10,22,40,0.08)" }}>
                  <span>⭐</span>
                  <span className="font-semibold" style={{ color: "#c4b5fd" }}>当月実績レベル</span>
                  <span style={{ color: `${NAVY}35` }}>|</span>
                  <span>👑</span>
                  <span className="font-semibold" style={{ color: GOLD_LIGHT }}>称号レベル（過去最高）</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: "1px solid rgba(10,22,40,0.08)" }}>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${GOLD}15`, color: GOLD }}>M1</span>
                  <span style={{ color: `${NAVY}50` }}>= マトリックス1段目</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-2" style={{ background: `${ORANGE}15`, color: ORANGE }}>U1</span>
                  <span style={{ color: `${NAVY}50` }}>= ユニレベル1段目</span>
                </div>
              </div>
            </div>

            {/* ボーナス履歴リンク */}
            <Link
              href="/mlm-bonus-history"
              className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-95"
              style={{
                background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}22`,
                boxShadow: "0 4px 16px rgba(10,22,40,0.14)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <span>💎</span>
                </div>
                <span className="font-semibold text-sm text-white">ボーナス履歴を見る</span>
              </div>
              <span style={{ color: `${GOLD}55` }}>›</span>
            </Link>
          </>
        )}
      </main>
    </div>
  );
}

/* ─── ユーティリティ関数 ─── */
function countActive(nodes: NodeData[]): number {
  let c = 0;
  for (const n of nodes) {
    if (n.isActive) c++;
    c += countActive(n.children);
  }
  return c;
}
function countTotal(nodes: NodeData[]): number {
  let c = nodes.length;
  for (const n of nodes) c += countTotal(n.children);
  return c;
}
function countWarn(nodes: NodeData[]): number {
  let c = 0;
  for (const n of nodes) {
    if (n.nonPurchaseAlert !== "none") c++;
    c += countWarn(n.children);
  }
  return c;
}
