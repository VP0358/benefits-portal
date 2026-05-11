"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { LEVEL_LABELS, MEMBER_TYPE_LABELS } from "@/lib/mlm-bonus";

// ── デザイントークン ────────────────────────────────────────
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

// ── 型定義 ──────────────────────────────────────────────────
type NodeData = {
  id: string;
  name: string;
  companyName: string | null;
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
  depth: number;
  totalDescendants: number;
  contractDate: string | null;
  prefecture: string | null;
  directReferralCount: number;
  lastPointMonth: string | null;
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

type DepthStat = { depth: number; total: number; active: number };

type OrgData = {
  month: string;
  me: MeData;
  matrixDownlines: NodeData[];
  matrixTotalCount: number;
  matrixActiveCount: number;
  matrixDepthStats: DepthStat[];
  uniDownlines: NodeData[];
  uniTotalCount: number;
  uniActiveCount: number;
};

type OrgType = "matrix" | "unilevel";
type ViewMode = "tree" | "list";

// ── レベル色定義 ─────────────────────────────────────────────
const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "#ffffff", text: "#1a1a1a",   border: "#1a1a1a" },
  1: { bg: "#3b82f6", text: "#ffffff",   border: "#2563eb" },
  2: { bg: "#22c55e", text: "#ffffff",   border: "#16a34a" },
  3: { bg: "#eab308", text: "#ffffff",   border: "#ca8a04" },
  4: { bg: "#a855f7", text: "#ffffff",   border: "#9333ea" },
  5: { bg: "#ef4444", text: "#ffffff",   border: "#dc2626" },
};
function getLevelColor(level: number) {
  return LEVEL_COLORS[level] ?? { bg: "#6b7280", text: "#ffffff", border: "#4b5563" };
}

// ── ステータス定義（① 表情・色・枠線） ───────────────────────
type StatusConfig = {
  emoji: string;
  label: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  autoship: {
    emoji: "🤖", label: "オートシップ",
    borderColor: "#6366f1", bgColor: "rgba(99,102,241,0.06)",
    textColor: "#4f46e5",  badgeBg: "rgba(99,102,241,0.12)", badgeText: "#818cf8",
  },
  active: {
    emoji: "😊", label: "活動中",
    borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.05)",
    textColor: "#16a34a",  badgeBg: "rgba(34,197,94,0.12)", badgeText: "#22c55e",
  },
  pending: {
    emoji: "🌱", label: "登録中",
    borderColor: "#84cc16", bgColor: "rgba(132,204,22,0.06)",
    textColor: "#65a30d",  badgeBg: "rgba(132,204,22,0.12)", badgeText: "#a3e635",
  },
  provisional: {
    emoji: "👤", label: "仮登録",
    borderColor: "#94a3b8", bgColor: "rgba(148,163,184,0.06)",
    textColor: "#64748b",  badgeBg: "rgba(148,163,184,0.12)", badgeText: "#94a3b8",
  },
  waiting_payment: {
    emoji: "⏳", label: "入金待ち",
    borderColor: "#f59e0b", bgColor: "rgba(245,158,11,0.06)",
    textColor: "#d97706",  badgeBg: "rgba(245,158,11,0.12)", badgeText: "#fbbf24",
  },
  canceled: {
    emoji: "❌", label: "キャンセル",
    borderColor: "#ef4444", bgColor: "rgba(239,68,68,0.06)",
    textColor: "#dc2626",  badgeBg: "rgba(239,68,68,0.12)", badgeText: "#f87171",
  },
  fan: {
    emoji: "💚", label: "愛用会員",
    borderColor: "#10b981", bgColor: "rgba(16,185,129,0.06)",
    textColor: "#059669",  badgeBg: "rgba(16,185,129,0.12)", badgeText: "#34d399",
  },
  lapsed: {
    emoji: "💀", label: "失効",
    borderColor: "#6b7280", bgColor: "rgba(107,114,128,0.08)",
    textColor: "#4b5563",  badgeBg: "rgba(107,114,128,0.12)", badgeText: "#9ca3af",
  },
  suspended: {
    emoji: "⛔", label: "停止",
    borderColor: "#dc2626", bgColor: "rgba(220,38,38,0.08)",
    textColor: "#b91c1c",  badgeBg: "rgba(220,38,38,0.12)", badgeText: "#fca5a5",
  },
  mid_cancel: {
    emoji: "🚪", label: "中途解約",
    borderColor: "#f97316", bgColor: "rgba(249,115,22,0.06)",
    textColor: "#ea580c",  badgeBg: "rgba(249,115,22,0.12)", badgeText: "#fb923c",
  },
  withdrawn: {
    emoji: "👋", label: "退会",
    borderColor: "#9ca3af", bgColor: "rgba(156,163,175,0.06)",
    textColor: "#6b7280",  badgeBg: "rgba(156,163,175,0.10)", badgeText: "#d1d5db",
  },
  cooling_off: {
    emoji: "🔄", label: "クーリングオフ",
    borderColor: "#0ea5e9", bgColor: "rgba(14,165,233,0.06)",
    textColor: "#0284c7",  badgeBg: "rgba(14,165,233,0.12)", badgeText: "#38bdf8",
  },
};

// フォールバック
const DEFAULT_STATUS_CONFIG: StatusConfig = {
  emoji: "❓", label: "不明",
  borderColor: "#9ca3af", bgColor: "rgba(156,163,175,0.06)",
  textColor: "#6b7280", badgeBg: "rgba(156,163,175,0.10)", badgeText: "#9ca3af",
};

function getStatusConfig(status: string, isActive: boolean): StatusConfig {
  // isActive=trueなら active 扱い優先
  if (isActive && (status === "active" || status === "autoship" || status === "fan")) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG["active"];
  }
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
}

// 警告ラインの色
const ALERT_BORDER: Record<string, string> = {
  none:     "",
  warn_4:   "#fbbf24",
  danger_5: "#f87171",
};

// ── ユーティリティ ───────────────────────────────────────────
function countAll(nodes: NodeData[]): number {
  let c = nodes.length;
  for (const n of nodes) c += countAll(n.children);
  return c;
}
function countActive(nodes: NodeData[]): number {
  let c = 0;
  for (const n of nodes) {
    if (n.isActive) c++;
    c += countActive(n.children);
  }
  return c;
}

// ── ③ 会員詳細ポップアップ ──────────────────────────────────
function NodeDetailModal({
  node,
  orgType,
  onClose,
}: {
  node: NodeData;
  orgType: OrgType;
  onClose: () => void;
}) {
  const sc = getStatusConfig(node.status, node.isActive);
  const lc = getLevelColor(node.currentLevel);

  const rows: { label: string; value: string }[] = [
    { label: "法人名",         value: node.companyName ?? "—" },
    { label: "名前",           value: node.name },
    { label: "会員コード",     value: node.mlmMemberCode },
    { label: "契約締結日",     value: node.contractDate ?? "—" },
    { label: "登録タイプ",     value: MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType },
    { label: "都道府県",       value: node.prefecture ?? "—" },
    { label: "直接紹介数",     value: `${node.directReferralCount}名` },
    { label: "ステータス",     value: `${sc.emoji} ${sc.label}` },
    { label: "レベル",         value: `LV.${node.currentLevel}` + (LEVEL_LABELS[node.currentLevel] ? ` (${LEVEL_LABELS[node.currentLevel]})` : "") },
    { label: "最終ポイント計上日", value: node.lastPointMonth ?? "—" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: `1px solid ${GOLD}40`,
          boxShadow: `0 -12px 60px rgba(10,22,40,0.50)`,
          maxHeight: "85vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ゴールドライン */}
        <div className="h-1" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }} />

        {/* ヘッダー */}
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="flex items-start justify-between gap-3">
            {/* アバター + 名前 */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: sc.bgColor, border: `2px solid ${sc.borderColor}40` }}
              >
                {node.avatarUrl
                  ? <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover rounded-full" />
                  : <span>{sc.emoji}</span>
                }
              </div>
              <div>
                <div className="font-bold text-base text-gray-900 leading-tight">{node.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-mono">{node.mlmMemberCode}</div>
                {/* バッジ行 */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}
                  >
                    LV.{node.currentLevel}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sc.badgeBg, color: sc.badgeText }}
                  >
                    {sc.emoji} {sc.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "#f1f5f9", color: "#94a3b8" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="overflow-y-auto px-5 py-4 space-y-2" style={{ maxHeight: "55vh" }}>
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3 py-1.5"
              style={{ borderBottom: "1px solid #f8fafc" }}>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#94a3b8", minWidth: "110px" }}>{label}</span>
              <span className="text-xs font-bold text-right break-all" style={{ color: "#1e293b" }}>{value}</span>
            </div>
          ))}
          {/* 傘下人数 */}
          <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #f8fafc" }}>
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#94a3b8", minWidth: "110px" }}>傘下人数</span>
            <span className="text-xs font-bold" style={{ color: "#1e293b" }}>{node.totalDescendants}名</span>
          </div>
          {/* 当月ポイント */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#94a3b8", minWidth: "110px" }}>当月G-PT</span>
            <span className="text-xs font-bold" style={{ color: "#7c3aed" }}>{node.selfPoints.toLocaleString()} pt</span>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 pb-5 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition"
            style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "#fff" }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ② カード横長レイアウト（① ステータス別表情・色も適用） ──
function MemberCard({
  node, isRoot = false, depth, onClick,
}: {
  node: NodeData; isRoot?: boolean; depth: number; onClick?: () => void;
}) {
  const lc = getLevelColor(node.currentLevel);
  const sc = getStatusConfig(node.status, node.isActive);
  const alertBorder = ALERT_BORDER[node.nonPurchaseAlert] || "";

  // 枠線: alertBorder > root > ステータス別
  const cardBorder = alertBorder
    ? `2px solid ${alertBorder}`
    : isRoot
      ? `2px solid ${GOLD}60`
      : `1.5px solid ${sc.borderColor}55`;

  const cardBg = isRoot
    ? `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`
    : sc.bgColor;

  const nameColor  = isRoot ? "rgba(255,255,255,0.95)" : "#1e293b";
  const codeColor  = isRoot ? `${GOLD}80` : "#94a3b8";
  const ptColor    = isRoot ? GOLD_LIGHT : "#7c3aed";

  return (
    <div
      className="relative rounded-xl overflow-visible flex-shrink-0 cursor-pointer"
      style={{
        width: "190px",
        background: cardBg,
        border: cardBorder,
        boxShadow: isRoot
          ? `0 4px 20px rgba(10,22,40,0.30), 0 0 0 1px ${GOLD}15 inset`
          : "0 2px 8px rgba(0,0,0,0.08)",
      }}
      onClick={onClick}
    >
      {/* 上ライン（アラート） */}
      {node.nonPurchaseAlert !== "none" && (
        <div className="h-0.5 rounded-t-xl" style={{
          background: node.nonPurchaseAlert === "danger_5"
            ? "linear-gradient(90deg,transparent,#f87171,transparent)"
            : "linear-gradient(90deg,transparent,#fbbf24,transparent)",
        }} />
      )}

      {/* Lvバッジ（左上） */}
      <div
        className="absolute -top-2.5 -left-2 z-10 rounded-full flex items-center justify-center text-[9px] font-black"
        style={{
          width: "26px", height: "20px",
          background: lc.bg, color: lc.text, border: `1.5px solid ${lc.border}`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.20)",
        }}
      >
        LV.{node.currentLevel}
      </div>

      {/* 深さバッジ（右上） */}
      <div
        className="absolute -top-2.5 -right-2 z-10 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{
          width: "22px", height: "18px",
          background: isRoot ? GOLD : NAVY_CARD3,
          color: isRoot ? "#fff" : `${GOLD}90`,
          border: isRoot ? `1px solid ${GOLD_DARK}` : `1px solid ${GOLD}30`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
        }}
      >
        {isRoot ? "YOU" : `M${depth}`}
      </div>

      {/* ② 横長レイアウト本体: 左アバター + 右情報 */}
      <div className="flex items-center gap-2 px-2.5 py-2 pt-3.5">
        {/* 左: アバター（表情） */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl overflow-hidden flex-shrink-0"
          style={{
            background: isRoot ? NAVY_CARD3 : `${sc.borderColor}15`,
            border: isRoot ? `2px solid ${GOLD}40` : `2px solid ${sc.borderColor}40`,
          }}
        >
          {node.avatarUrl
            ? <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover" />
            : <span>{sc.emoji}</span>
          }
        </div>

        {/* 右: 情報列 */}
        <div className="flex-1 min-w-0">
          {/* 会員コード */}
          <div
            className="text-[8px] font-mono font-bold px-1 py-0 rounded mb-0.5 inline-block"
            style={{ background: isRoot ? `${GOLD}15` : "rgba(0,0,0,0.04)", color: codeColor }}
          >
            {node.mlmMemberCode}
          </div>
          {/* 名前 */}
          <div
            className="text-[11px] font-bold leading-tight truncate"
            style={{ color: nameColor, maxWidth: "120px" }}
          >
            {node.name.length > 9 ? node.name.slice(0, 8) + "…" : node.name}
          </div>
          {/* ステータスバッジ */}
          <div className="mt-0.5">
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-block"
              style={{ background: sc.badgeBg, color: sc.badgeText }}
            >
              {sc.emoji} {sc.label}
            </span>
          </div>
          {/* ポイント + 傘下 */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black" style={{ color: ptColor }}>
              {node.selfPoints.toLocaleString()}pt
            </span>
            {node.totalDescendants > 0 && (
              <span className="text-[8px]" style={{ color: isRoot ? "rgba(255,255,255,0.35)" : "#cbd5e1" }}>
                傘下{node.totalDescendants}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* アラートバナー */}
      {node.nonPurchaseAlert !== "none" && (
        <div
          className="text-center text-[8px] font-bold px-1 py-0.5"
          style={{
            background: node.nonPurchaseAlert === "danger_5" ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.12)",
            color: node.nonPurchaseAlert === "danger_5" ? "#f87171" : "#fbbf24",
            borderTop: `1px solid ${node.nonPurchaseAlert === "danger_5" ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.20)"}`,
          }}
        >
          {node.nonPurchaseAlert === "danger_5" ? "⚠ 失効リスク" : "⚠ 要注意"}
        </div>
      )}
    </div>
  );
}

// ── ④ ビジュアルツリーノード（maxDepth修正済み） ───────────
function VisualTreeNode({
  node,
  depth,
  minDepth,
  maxDepth,
  orgType,
  onNodeClick,
}: {
  node: NodeData;
  depth: number;
  minDepth: number;  // 表示開始段
  maxDepth: number;  // 表示終了段（この段まで表示）
  orgType: OrgType;
  onNodeClick: (n: NodeData) => void;
}) {
  const [expanded, setExpanded] = useState(depth <= 2);
  const children = node.children;
  const hasChildren = children.length > 0;

  // minDepth〜maxDepth の範囲外のノードは表示しない
  if (depth < minDepth) {
    // minDepthより浅い段：子だけ再帰（自分は非表示）
    if (!hasChildren) return null;
    return (
      <>
        {children.map(child => (
          <VisualTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            minDepth={minDepth}
            maxDepth={maxDepth}
            orgType={orgType}
            onNodeClick={onNodeClick}
          />
        ))}
      </>
    );
  }

  // maxDepthを超えたら「+N名」ボタン表示
  if (depth > maxDepth) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-px h-4" style={{ background: `${GOLD}30` }} />
        <div
          className="text-[9px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}35` }}
        >
          +{node.totalDescendants + 1}名
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center" style={{ minWidth: "200px" }}>
      {/* カード */}
      <MemberCard node={node} depth={depth} onClick={() => onNodeClick(node)} />

      {/* 展開ボタン or 縦線 */}
      {hasChildren && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex flex-col items-center gap-0 group"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="w-px h-3" style={{ background: `${GOLD}40` }} />
          <div
            className="text-[9px] rounded-full px-1.5 py-0.5 font-bold transition-all"
            style={{
              background: expanded ? `${GOLD}22` : "rgba(255,255,255,0.90)",
              color: expanded ? GOLD : NAVY,
              border: `1px solid ${expanded ? GOLD : "#e2e8f0"}40`,
            }}
          >
            {expanded ? `▲` : `▼${children.length}`}
          </div>
          <div className="w-px h-2" style={{ background: `${GOLD}40` }} />
        </button>
      )}
      {!hasChildren && <div className="h-2" />}

      {/* 子ノード横展開 */}
      {expanded && hasChildren && (
        <div className="flex flex-row items-start gap-0" style={{ position: "relative" }}>
          {/* 水平接続線 */}
          {children.length > 1 && (
            <div
              className="absolute"
              style={{
                top: 0,
                left: `${100 / children.length / 2}%`,
                right: `${100 / children.length / 2}%`,
                height: "1px",
                background: `${GOLD}30`,
                zIndex: 0,
              }}
            />
          )}
          {children.map((child) => (
            <div key={child.id} className="flex flex-col items-center" style={{ padding: "0 6px", position: "relative" }}>
              <div style={{ width: "1px", height: "8px", background: `${GOLD}30` }} />
              <VisualTreeNode
                node={child}
                depth={depth + 1}
                minDepth={minDepth}
                maxDepth={maxDepth}
                orgType={orgType}
                onNodeClick={onNodeClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── リスト行 ─────────────────────────────────────────────────
function ListRow({
  node, depth, orgType, maxDepth, onNodeClick,
}: {
  node: NodeData; depth: number; orgType: OrgType; maxDepth: number;
  onNodeClick: (n: NodeData) => void;
}) {
  const lc = getLevelColor(node.currentLevel);
  const sc = getStatusConfig(node.status, node.isActive);
  const alertColor =
    node.nonPurchaseAlert === "danger_5" ? "#f87171" :
    node.nonPurchaseAlert === "warn_4"   ? "#fbbf24" :
    sc.textColor;

  const rows: React.ReactNode[] = [];
  rows.push(
    <div
      key={node.id}
      className="flex items-center gap-2 py-2 border-b cursor-pointer transition hover:opacity-80"
      style={{ borderColor: "rgba(255,255,255,0.05)", paddingLeft: `${8 + depth * 14}px` }}
      onClick={() => onNodeClick(node)}
    >
      {/* 段バッジ */}
      <span className="text-[9px] font-black rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ width: "24px", height: "18px", background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>
        {orgType === "matrix" ? "M" : "U"}{depth}
      </span>
      {/* アバター */}
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm"
        style={{ background: NAVY_CARD3, border: `1.5px solid ${GOLD}20` }}>
        {node.avatarUrl
          ? <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover" />
          : <span>{sc.emoji}</span>}
      </div>
      {/* 名前・コード */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: alertColor }}>{node.name}</div>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{node.mlmMemberCode}</div>
      </div>
      {/* 右側情報 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[9px]" style={{ color: `${GOLD}70` }}>{MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType}</span>
        <span className="text-xs font-bold" style={{ color: GOLD_LIGHT }}>{node.selfPoints}pt</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: sc.badgeBg, color: sc.badgeText }}>
          {sc.emoji}
        </span>
      </div>
    </div>
  );

  if (depth < maxDepth && node.children.length > 0) {
    for (const child of node.children) {
      rows.push(
        <ListRow
          key={`${child.id}-r`}
          node={child}
          depth={depth + 1}
          orgType={orgType}
          maxDepth={maxDepth}
          onNodeClick={onNodeClick}
        />
      );
    }
  } else if (depth >= maxDepth && node.children.length > 0) {
    rows.push(
      <div key={`${node.id}-more`} className="py-1 text-center text-[9px]"
        style={{ paddingLeft: `${8 + (depth + 1) * 14}px`, color: `${GOLD}50` }}>
        ＋{node.totalDescendants}名（段数制限）
      </div>
    );
  }
  return <>{rows}</>;
}

// ── 段別アクティブ内訳モーダル ───────────────────────────────
function DepthStatsModal({
  depthStats, totalCount, activeCount, onClose,
}: {
  depthStats: DepthStat[];
  totalCount: number;
  activeCount: number;
  onClose: () => void;
}) {
  const upTo7 = depthStats.filter(s => s.depth <= 7);
  const beyond8 = depthStats.filter(s => s.depth >= 8);
  const beyond8Total  = beyond8.reduce((s, d) => s + d.total, 0);
  const beyond8Active = beyond8.reduce((s, d) => s + d.active, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(160deg,${NAVY} 0%,${NAVY_CARD} 30%,${NAVY_CARD2} 100%)`,
          border: `1px solid ${GOLD}40`,
          boxShadow: `0 -12px 60px rgba(10,22,40,0.50)`,
          maxHeight: "85vh",
        }}
        onClick={e => e.stopPropagation()}>
        <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }} />
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
          <div>
            <p className="text-[9px] tracking-[0.22em] font-bold" style={{ color: `${GOLD}60` }}>ACTIVE BREAKDOWN</p>
            <h2 className="font-bold text-white text-sm mt-0.5">段別アクティブ内訳</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }}>
            ✕
          </button>
        </div>
        <div className="px-5 py-3 grid grid-cols-2 gap-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          {[
            { label: "配下合計", value: totalCount, color: GOLD_LIGHT },
            { label: "アクティブ計", value: activeCount, color: "#22c55e" },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-2xl font-black" style={{ color: item.color }}>{item.value.toLocaleString()}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-2" style={{ maxHeight: "50vh" }}>
          {upTo7.length === 0 && beyond8.length === 0 && (
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>配下がいません</p>
          )}
          {upTo7.map(stat => (
            <div key={stat.depth} className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-10 h-8 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                style={{ background: `${GOLD}18`, color: GOLD_LIGHT, border: `1px solid ${GOLD}35` }}>
                M{stat.depth}段
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{stat.active}名 アクティブ</span>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>/ {stat.total}名</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: stat.total > 0 ? `${Math.round(stat.active / stat.total * 100)}%` : "0%",
                      background: "linear-gradient(90deg,#22c55e,#4ade80)",
                    }} />
                </div>
              </div>
              <div className="w-10 text-right flex-shrink-0">
                <span className="text-xs font-bold" style={{ color: "#4ade80" }}>
                  {stat.total > 0 ? Math.round(stat.active / stat.total * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
          {beyond8.length > 0 && (
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}18` }}>
              <div className="w-10 h-8 rounded-lg flex items-center justify-center font-black text-[10px] flex-shrink-0"
                style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                8段+
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{beyond8Active}名 アクティブ</span>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>/ {beyond8Total}名</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full"
                    style={{
                      width: beyond8Total > 0 ? `${Math.round(beyond8Active / beyond8Total * 100)}%` : "0%",
                      background: `linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`,
                    }} />
                </div>
              </div>
              <div className="w-10 text-right flex-shrink-0">
                <span className="text-xs font-bold" style={{ color: GOLD_LIGHT }}>
                  {beyond8Total > 0 ? Math.round(beyond8Active / beyond8Total * 100) : 0}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 自分カード（大きめ・ルート） ─────────────────────────────
function MeCard({ me, orgType }: { me: MeData; orgType: OrgType }) {
  const lc = getLevelColor(me.currentLevel);
  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-2xl overflow-visible"
        style={{
          width: "200px",
          background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
          border: `2px solid ${GOLD}60`,
          boxShadow: `0 8px 32px rgba(10,22,40,0.30), 0 0 0 1px ${GOLD}15 inset`,
        }}>
        <div className="h-0.5 rounded-t" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }} />

        {/* Lvバッジ */}
        <div className="absolute -top-3 -left-2 z-10 rounded-full flex items-center justify-center text-[9px] font-black"
          style={{ width: "28px", height: "21px", background: lc.bg, color: lc.text, border: `1.5px solid ${lc.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
          LV.{me.currentLevel}
        </div>
        {/* YOUバッジ */}
        <div className="absolute -top-3 -right-2 z-10 rounded-full flex items-center justify-center text-[9px] font-black"
          style={{ width: "28px", height: "21px", background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
          YOU
        </div>

        {/* ② 横長レイアウト */}
        <div className="flex items-center gap-3 px-3 pt-5 pb-3">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: NAVY_CARD3, border: `2px solid ${GOLD}50`, boxShadow: `0 0 12px ${GOLD}20` }}>
            {me.avatarUrl
              ? <img src={me.avatarUrl} alt={me.name} className="w-full h-full object-cover" />
              : "😊"}
          </div>
          {/* 右側情報 */}
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-mono font-bold px-1 py-0 rounded mb-0.5 inline-block"
              style={{ background: `${GOLD}15`, color: `${GOLD}80` }}>
              {me.mlmMemberCode}
            </div>
            <div className="text-[13px] font-black leading-tight truncate" style={{ color: "rgba(255,255,255,0.95)" }}>
              {me.name.length > 10 ? me.name.slice(0, 9) + "…" : me.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: me.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.10)",
                  color: me.isActive ? "#22c55e" : "#f87171",
                }}>
                {me.isActive ? "✅ ACT" : "❌ 非ACT"}
              </span>
              <span className="text-[9px] font-black" style={{ color: GOLD_LIGHT }}>
                {me.selfPoints.toLocaleString()}pt
              </span>
            </div>
            {orgType === "matrix" && me.upline && (
              <div className="mt-1 text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                直上: {me.upline.name}
              </div>
            )}
            {orgType === "unilevel" && me.referrer && (
              <div className="mt-1 text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                紹介: {me.referrer.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 縦コネクター */}
      <div className="w-px" style={{ height: "16px", background: `linear-gradient(180deg,${GOLD}50,${GOLD}20)` }} />
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function MlmOrgChartPage() {
  const [data,      setData]      = useState<OrgData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [orgType,   setOrgType]   = useState<OrgType>("matrix");
  const [viewMode,  setViewMode]  = useState<ViewMode>("tree");
  const [showDepthModal, setShowDepthModal] = useState(false);
  // ④ 5段ずつページング: minDepth〜maxDepth の範囲で表示
  const [depthPage, setDepthPage] = useState(0); // 0 → 1〜5段, 1 → 6〜10段, ...
  // ③ 詳細モーダル
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  // ⑤ ズーム
  const [zoom, setZoom] = useState(1.0);
  const treeRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/my/mlm-org-chart")
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isMatrix = orgType === "matrix";
  const totalCount  = isMatrix ? (data?.matrixTotalCount ?? 0)  : (data?.uniTotalCount ?? 0);
  const activeCount = isMatrix ? (data?.matrixActiveCount ?? 0) : (data?.uniActiveCount ?? 0);
  const currentNodes = isMatrix ? (data?.matrixDownlines ?? []) : (data?.uniDownlines ?? []);
  const depthStats  = data?.matrixDepthStats ?? [];

  // ④ ページング計算
  // minDepth: depthPage * 5 + 1 (1始まり)
  // maxDepth: depthPage * 5 + 5
  const STEP = 5;
  const minDepth = depthPage * STEP + 1;
  const maxDepth = isMatrix ? depthPage * STEP + STEP : 7;

  // ユニレベルは固定7段
  const uniMaxDepth = 7;
  const effectiveMaxDepth = isMatrix ? maxDepth : uniMaxDepth;

  // 最大段数（depthStats から取得）
  const maxAvailableDepth = depthStats.length > 0 ? Math.max(...depthStats.map(s => s.depth)) : STEP;

  return (
    <div className="min-h-screen pb-20" style={{ background: PAGE_BG }}>
      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }} />
      </div>

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20"
        style={{
          background: "rgba(245,240,232,0.96)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`,
          boxShadow: "0 2px 16px rgba(10,22,40,0.08)",
        }}>
        <div className="max-w-full mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h1 className="text-base font-semibold" style={{ color: NAVY }}>組織図</h1>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-40"
            style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
          {data && <span className="text-xs" style={{ color: `${GOLD}55` }}>📅 {data.month}</span>}
        </div>

        {/* タブ行 */}
        <div className="max-w-full mx-auto px-4 pb-2 flex items-center justify-between gap-3">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
            {([
              { key: "matrix",   label: "🔷 マトリックス" },
              { key: "unilevel", label: "🔶 ユニレベル" },
            ] as { key: OrgType; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => { setOrgType(key); setDepthPage(0); }}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{
                  background: orgType === key ? `linear-gradient(135deg,${GOLD},${ORANGE})` : "rgba(10,22,40,0.04)",
                  color: orgType === key ? "#fff" : `${NAVY}70`,
                }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
            {([
              { key: "tree", label: "🌲 ツリー" },
              { key: "list", label: "📋 リスト" },
            ] as { key: ViewMode; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setViewMode(key)}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{
                  background: viewMode === key ? "linear-gradient(135deg,#334155,#1e293b)" : "rgba(10,22,40,0.04)",
                  color: viewMode === key ? "#e2e8f0" : `${NAVY}70`,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="py-4 space-y-4 relative">

        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }} />
            <p className="text-sm" style={{ color: `${GOLD}60` }}>組織図を読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {error && !loading && (
          <div className="mx-4 rounded-2xl p-6 text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <p className="text-sm font-semibold" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── サマリー統計カード ── */}
            <div className="px-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 text-center"
                style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}28`, boxShadow: "0 4px 12px rgba(10,22,40,0.10)" }}>
                <div className="text-3xl font-black mb-0.5" style={{ color: GOLD_LIGHT }}>{totalCount.toLocaleString()}</div>
                <div className="text-[11px] font-bold" style={{ color: `${GOLD}70` }}>👥 {isMatrix ? "配下合計" : "紹介合計"}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(10,22,40,0.40)" }}>自分起点・全段</div>
              </div>
              <button
                onClick={() => isMatrix && setShowDepthModal(true)}
                className="rounded-2xl p-4 text-center transition-all active:scale-95"
                style={{
                  background: "rgba(34,197,94,0.10)",
                  border: `1px solid rgba(34,197,94,0.28)`,
                  boxShadow: "0 4px 12px rgba(10,22,40,0.10)",
                  cursor: isMatrix ? "pointer" : "default",
                }}>
                <div className="text-3xl font-black mb-0.5" style={{ color: "#22c55e" }}>{activeCount.toLocaleString()}</div>
                <div className="text-[11px] font-bold" style={{ color: "rgba(34,197,94,0.80)" }}>✅ アクティブ</div>
                <div className="text-[9px] mt-0.5" style={{ color: "rgba(10,22,40,0.40)" }}>
                  {isMatrix ? "▶ タップで段別内訳" : "自分起点・全段"}
                </div>
              </button>
            </div>

            {/* ── ④ マトリックス: 5段ずつページング ── */}
            {isMatrix && (
              <div className="px-4 flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: `${GOLD}70` }}>
                  表示: {minDepth}〜{maxDepth}段
                </span>
                <div className="flex gap-2">
                  {depthPage > 0 && (
                    <button
                      onClick={() => setDepthPage(p => Math.max(0, p - 1))}
                      className="text-xs px-3 py-1 rounded-lg font-bold transition"
                      style={{ background: "rgba(255,255,255,0.70)", color: NAVY, border: `1px solid ${GOLD}25` }}>
                      ▲ 前の5段
                    </button>
                  )}
                  {maxDepth < maxAvailableDepth && (
                    <button
                      onClick={() => setDepthPage(p => p + 1)}
                      className="text-xs px-3 py-1 rounded-lg font-bold transition"
                      style={{ background: `${GOLD}20`, color: GOLD_DARK, border: `1px solid ${GOLD}35` }}>
                      ▼ 次の5段
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ユニレベル: 7段表示の注意書き */}
            {!isMatrix && (
              <div className="px-4 text-xs rounded-xl py-2 mx-4 text-center"
                style={{ background: `rgba(212,112,58,0.08)`, border: `1px solid ${ORANGE}20`, color: `${ORANGE}80` }}>
                🔶 ユニレベル表示: 7段まで
              </div>
            )}

            {/* ── ⑤ ズームコントロール（ツリービューのみ） ── */}
            {viewMode === "tree" && (
              <div className="px-4 flex items-center justify-end gap-2">
                <span className="text-xs font-bold" style={{ color: `${GOLD}60` }}>
                  倍率: {Math.round(zoom * 100)}%
                </span>
                <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
                  <button
                    onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
                    className="px-2.5 py-1.5 text-sm font-black transition"
                    style={{ background: "rgba(10,22,40,0.04)", color: NAVY }}>
                    −
                  </button>
                  <button
                    onClick={() => setZoom(1.0)}
                    className="px-2.5 py-1 text-[10px] font-bold transition border-x"
                    style={{ background: "rgba(10,22,40,0.02)", color: `${NAVY}70`, borderColor: `${GOLD}20` }}>
                    FIT
                  </button>
                  <button
                    onClick={() => setZoom(z => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))))}
                    className="px-2.5 py-1.5 text-sm font-black transition"
                    style={{ background: "rgba(10,22,40,0.04)", color: NAVY }}>
                    ＋
                  </button>
                </div>
              </div>
            )}

            {/* ── ノードなし ── */}
            {currentNodes.length === 0 ? (
              <div className="mx-4 rounded-2xl p-10 text-center"
                style={{ background: `${NAVY_CARD}80`, border: `2px dashed ${GOLD}15` }}>
                <div className="text-3xl mb-2">🌱</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                  {isMatrix ? "配下メンバーがいません" : "紹介した会員がいません"}
                </div>
              </div>
            ) : viewMode === "tree" ? (
              /* ─── ⑤⑥ ツリービュー（横スクロール + ズーム） ─── */
              <div
                ref={treeRef}
                className="overflow-x-auto overflow-y-visible pb-6"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {/* ⑥ 上部パディング確保（自分カードのバッジ切れ防止） */}
                <div
                  className="flex flex-col items-center"
                  style={{
                    minWidth: "max-content",
                    padding: "32px 24px 16px",
                    transformOrigin: "top center",
                    transform: `scale(${zoom})`,
                  }}
                >
                  {/* 自分カード */}
                  <MeCard me={data.me} orgType={orgType} />

                  {/* ④ 配下ツリー（minDepth〜maxDepth の範囲で表示） */}
                  <div className="flex flex-row items-start gap-0" style={{ position: "relative" }}>
                    {currentNodes.length > 1 && (
                      <div className="absolute" style={{
                        top: 0,
                        left: `calc(${100 / currentNodes.length / 2}%)`,
                        right: `calc(${100 / currentNodes.length / 2}%)`,
                        height: "1px",
                        background: `${GOLD}30`,
                        zIndex: 0,
                      }} />
                    )}
                    {currentNodes.map((node) => (
                      <div key={node.id} className="flex flex-col items-center" style={{ padding: "0 8px", position: "relative" }}>
                        <div style={{ width: "1px", height: "8px", background: `${GOLD}30` }} />
                        <VisualTreeNode
                          node={node}
                          depth={1}
                          minDepth={minDepth}
                          maxDepth={effectiveMaxDepth}
                          orgType={orgType}
                          onNodeClick={setSelectedNode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ─── リストビュー ─── */
              <div className="mx-4 rounded-2xl overflow-hidden"
                style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18` }}>
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold"
                  style={{ background: `${GOLD}12`, color: `${GOLD}80`, borderBottom: `1px solid ${GOLD}18` }}>
                  <span className="w-6 text-center">段</span>
                  <span className="w-8">—</span>
                  <span className="flex-1">氏名 / 会員コード</span>
                  <span className="ml-auto">pt / ST</span>
                </div>
                {currentNodes.map(node => (
                  <ListRow
                    key={node.id}
                    node={node}
                    depth={1}
                    orgType={orgType}
                    maxDepth={effectiveMaxDepth}
                    onNodeClick={setSelectedNode}
                  />
                ))}
              </div>
            )}

            {/* ── 凡例 ── */}
            <div className="mx-4 rounded-2xl px-4 py-3"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.18)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: `${NAVY}60` }}>凡例 — ステータス</p>
              {/* ステータス凡例 */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
                  <span key={key} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sc.badgeBg, color: sc.badgeText, border: `1px solid ${sc.borderColor}30` }}>
                    {sc.emoji} {sc.label}
                  </span>
                ))}
              </div>
              {/* Lv色凡例 */}
              <p className="text-xs font-semibold mb-1.5 mt-2" style={{ color: `${NAVY}60` }}>レベル</p>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5].map(lv => {
                  const lc = getLevelColor(lv);
                  return (
                    <span key={lv} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
                      LV.{lv}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span className="font-semibold" style={{ color: "#fbbf24" }}>要注意（4ヶ月）/ 失効（5ヶ月）</span>
                  <span style={{ color: `${NAVY}40` }}>スミサイ連続未購入</span>
                </div>
              </div>
            </div>

            {/* ボーナス履歴リンク */}
            <Link href="/mlm-bonus-history"
              className="mx-4 flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-95"
              style={{
                background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}22`,
                boxShadow: "0 4px 16px rgba(10,22,40,0.14)",
              }}>
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

      {/* ③ 会員詳細ポップアップ */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          orgType={orgType}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* 段別アクティブ内訳モーダル */}
      {showDepthModal && data && (
        <DepthStatsModal
          depthStats={depthStats}
          totalCount={totalCount}
          activeCount={activeCount}
          onClose={() => setShowDepthModal(false)}
        />
      )}
    </div>
  );
}
