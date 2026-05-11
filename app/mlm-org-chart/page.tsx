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
  0: { bg: "#ffffff", text: "#1a1a1a",   border: "#cccccc" },
  1: { bg: "#3b82f6", text: "#ffffff",   border: "#2563eb" },
  2: { bg: "#22c55e", text: "#ffffff",   border: "#16a34a" },
  3: { bg: "#eab308", text: "#ffffff",   border: "#ca8a04" },
  4: { bg: "#a855f7", text: "#ffffff",   border: "#9333ea" },
  5: { bg: "#ef4444", text: "#ffffff",   border: "#dc2626" },
};
function getLevelColor(level: number) {
  return LEVEL_COLORS[level] ?? { bg: "#6b7280", text: "#ffffff", border: "#4b5563" };
}

// ── ④ ステータス設定
// DBの MlmMemberStatus enum 値: active / autoship / lapsed / suspended / withdrawn / midCancel
type StatusConfig = {
  emoji: string; label: string; borderColor: string; bgColor: string;
  textColor: string; badgeBg: string; badgeText: string;
};
const STATUS_CONFIG: Record<string, StatusConfig> = {
  active:    { emoji: "😊", label: "活動中",   borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.07)",   textColor: "#16a34a", badgeBg: "rgba(34,197,94,0.14)",   badgeText: "#16a34a" },
  autoship:  { emoji: "🤖", label: "オートシップ", borderColor: "#6366f1", bgColor: "rgba(99,102,241,0.07)",  textColor: "#4f46e5", badgeBg: "rgba(99,102,241,0.14)",  badgeText: "#6366f1" },
  lapsed:    { emoji: "😵", label: "失効",     borderColor: "#ef4444", bgColor: "rgba(239,68,68,0.07)",   textColor: "#b91c1c", badgeBg: "rgba(239,68,68,0.14)",   badgeText: "#b91c1c" },
  suspended: { emoji: "😵", label: "停止",     borderColor: "#dc2626", bgColor: "rgba(220,38,38,0.08)",   textColor: "#991b1b", badgeBg: "rgba(220,38,38,0.14)",   badgeText: "#991b1b" },
  withdrawn: { emoji: "😢", label: "退会",     borderColor: "#9ca3af", bgColor: "rgba(156,163,175,0.07)", textColor: "#6b7280", badgeBg: "rgba(156,163,175,0.12)", badgeText: "#6b7280" },
  midCancel: { emoji: "😢", label: "中途解約", borderColor: "#3b82f6", bgColor: "rgba(59,130,246,0.07)",  textColor: "#1d4ed8", badgeBg: "rgba(59,130,246,0.14)",  badgeText: "#1d4ed8" },
};
const DEFAULT_STATUS: StatusConfig = {
  emoji: "❓", label: "不明", borderColor: "#9ca3af", bgColor: "rgba(156,163,175,0.06)",
  textColor: "#6b7280", badgeBg: "rgba(156,163,175,0.10)", badgeText: "#6b7280",
};
function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS;
}

const ALERT_BORDER: Record<string, string> = {
  none: "", warn_4: "#fbbf24", danger_5: "#f87171",
};

// ── 会員詳細モーダル ─────────────────────────────────────────
function NodeDetailModal({ node, onClose }: { node: NodeData; onClose: () => void }) {
  const sc = getStatusConfig(node.status);
  const lc = getLevelColor(node.currentLevel);
  const rows: { label: string; value: string }[] = [
    { label: "法人名",             value: node.companyName ?? "—" },
    { label: "名前",               value: node.name },
    { label: "会員コード",         value: node.mlmMemberCode },
    { label: "契約締結日",         value: node.contractDate ?? "—" },
    { label: "登録タイプ",         value: MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType },
    { label: "都道府県",           value: node.prefecture ?? "—" },
    { label: "直接紹介数",         value: `${node.directReferralCount}名` },
    { label: "ステータス",         value: `${sc.emoji} ${sc.label}` },
    { label: "レベル",             value: `LV.${node.currentLevel}` + (LEVEL_LABELS[node.currentLevel] ? ` (${LEVEL_LABELS[node.currentLevel]})` : "") },
    { label: "最終ポイント計上日", value: node.lastPointMonth ?? "—" },
    { label: "傘下人数",           value: `${node.totalDescendants}名` },
    { label: "当月G-PT",           value: `${node.selfPoints.toLocaleString()} pt` },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#ffffff", border: `1px solid ${GOLD}40`, boxShadow: `0 -12px 60px rgba(10,22,40,0.50)`, maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }} />
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: sc.bgColor, border: `2px solid ${sc.borderColor}60`, fontSize: "32px" }}>
                {node.avatarUrl
                  ? <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover rounded-full" />
                  : <span style={{ lineHeight: 1 }}>{sc.emoji}</span>}
              </div>
              <div>
                <div className="font-bold text-base text-gray-900 leading-tight">{node.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-mono">{node.mlmMemberCode}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>LV.{node.currentLevel}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sc.badgeBg, color: sc.badgeText }}>{sc.emoji} {sc.label}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "#f1f5f9", color: "#94a3b8" }}>✕</button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-3" style={{ maxHeight: "55vh" }}>
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#94a3b8", minWidth: "120px" }}>{label}</span>
              <span className="text-xs font-bold text-right break-all" style={{ color: "#1e293b" }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "#fff" }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ── MemberCard ───────────────────────────────────────────────
function MemberCard({ node, depth, onClick }: {
  node: NodeData; depth: number; onClick?: () => void;
}) {
  const lc = getLevelColor(node.currentLevel);
  const sc = getStatusConfig(node.status);
  const alertBorder = ALERT_BORDER[node.nonPurchaseAlert] || "";
  const cardBorder = alertBorder ? `2px solid ${alertBorder}` : `1.5px solid ${sc.borderColor}60`;
  return (
    <div className="relative rounded-xl overflow-visible flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ width: "200px", background: sc.bgColor, border: cardBorder,
        boxShadow: "0 2px 10px rgba(0,0,0,0.10)" }}
      onClick={onClick}>
      {node.nonPurchaseAlert !== "none" && (
        <div className="h-1 rounded-t-xl" style={{ background: node.nonPurchaseAlert === "danger_5"
          ? "linear-gradient(90deg,transparent,#f87171,transparent)"
          : "linear-gradient(90deg,transparent,#fbbf24,transparent)" }} />
      )}
      {/* LVバッジ */}
      <div className="absolute -top-3 -left-2 z-10 rounded-full flex items-center justify-center font-black"
        style={{ width: "30px", height: "20px", fontSize: "9px", background: lc.bg, color: lc.text,
          border: `1.5px solid ${lc.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
        LV.{node.currentLevel}
      </div>
      {/* 段バッジ */}
      <div className="absolute -top-3 -right-2 z-10 rounded-full flex items-center justify-center font-bold"
        style={{ width: "26px", height: "20px", fontSize: "9px",
          background: NAVY_CARD3, color: GOLD_LIGHT,
          border: `1px solid ${GOLD}40`, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}>
        {depth}段
      </div>
      <div className="flex items-stretch gap-0 px-2.5 pt-4 pb-2.5">
        {/* アバター */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center mr-2.5">
          <div className="rounded-full flex items-center justify-center overflow-hidden"
            style={{ width: "42px", height: "42px", fontSize: "24px",
              background: `${sc.borderColor}18`, border: `2px solid ${sc.borderColor}50`, lineHeight: 1 }}>
            {node.avatarUrl
              ? <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover" />
              : <span style={{ lineHeight: 1 }}>{sc.emoji}</span>}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="font-mono font-bold leading-none" style={{ fontSize: "11px", color: sc.textColor, letterSpacing: "0.02em" }}>
            {node.mlmMemberCode}
          </div>
          <div className="font-bold leading-tight truncate" style={{ fontSize: "13px", color: "#1e293b", maxWidth: "130px" }}>
            {node.name.length > 10 ? node.name.slice(0, 9) + "…" : node.name}
          </div>
          <div>
            <span className="inline-flex items-center gap-1 font-bold rounded-full px-1.5 py-0.5 leading-none"
              style={{ fontSize: "10px", background: sc.badgeBg, color: sc.badgeText, border: `1px solid ${sc.borderColor}30` }}>
              {sc.emoji} {sc.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-black leading-none" style={{ fontSize: "12px", color: "#7c3aed" }}>{node.selfPoints.toLocaleString()}pt</span>
            {node.totalDescendants > 0 && (
              <span className="font-bold leading-none" style={{ fontSize: "11px", color: "#64748b" }}>傘下{node.totalDescendants}名</span>
            )}
          </div>
        </div>
      </div>
      {node.nonPurchaseAlert !== "none" && (
        <div className="text-center font-bold px-1 py-0.5"
          style={{ fontSize: "9px",
            background: node.nonPurchaseAlert === "danger_5" ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.12)",
            color: node.nonPurchaseAlert === "danger_5" ? "#dc2626" : "#b45309",
            borderTop: `1px solid ${node.nonPurchaseAlert === "danger_5" ? "rgba(220,38,38,0.25)" : "rgba(245,158,11,0.25)"}` }}>
          {node.nonPurchaseAlert === "danger_5" ? "⚠ 失効リスク" : "⚠ 要注意"}
        </div>
      )}
    </div>
  );
}

// ── 自分カード（ルート） ──────────────────────────────────────
function MeCard({ me, orgType }: { me: MeData; orgType: OrgType }) {
  const lc = getLevelColor(me.currentLevel);
  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-2xl overflow-visible"
        style={{ width: "220px", background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
          border: `2px solid ${GOLD}60`, boxShadow: `0 8px 32px rgba(10,22,40,0.30),0 0 0 1px ${GOLD}15 inset` }}>
        <div className="h-1 rounded-t" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }} />
        <div className="absolute -top-3 -left-2 z-10 rounded-full flex items-center justify-center font-black"
          style={{ width: "32px", height: "22px", fontSize: "9px", background: lc.bg, color: lc.text,
            border: `1.5px solid ${lc.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
          LV.{me.currentLevel}
        </div>
        <div className="absolute -top-3 -right-2 z-10 rounded-full flex items-center justify-center font-black"
          style={{ width: "32px", height: "22px", fontSize: "9px",
            background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
          YOU
        </div>
        <div className="flex items-center gap-3 px-3 pt-5 pb-3">
          <div className="rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
            style={{ width: "48px", height: "48px", background: NAVY_CARD3,
              border: `2px solid ${GOLD}50`, boxShadow: `0 0 12px ${GOLD}20` }}>
            {me.avatarUrl ? <img src={me.avatarUrl} alt={me.name} className="w-full h-full object-cover" /> : "😊"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono font-bold" style={{ fontSize: "11px", color: GOLD_LIGHT }}>{me.mlmMemberCode}</div>
            <div className="font-black leading-tight truncate" style={{ fontSize: "14px", color: "rgba(255,255,255,0.95)" }}>
              {me.name.length > 10 ? me.name.slice(0, 9) + "…" : me.name}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold rounded-full px-1.5 py-0.5"
                style={{ fontSize: "10px",
                  background: me.isActive ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.12)",
                  color: me.isActive ? "#22c55e" : "#f87171" }}>
                {me.isActive ? "✅ ACT" : "❌ 非ACT"}
              </span>
              <span className="font-black" style={{ fontSize: "12px", color: GOLD_LIGHT }}>{me.selfPoints.toLocaleString()}pt</span>
            </div>
            {orgType === "matrix" && me.upline && (
              <div className="mt-1" style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>直上: {me.upline.name}</div>
            )}
            {orgType === "unilevel" && me.referrer && (
              <div className="mt-1" style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>紹介: {me.referrer.name}</div>
            )}
          </div>
        </div>
      </div>
      <div className="w-px" style={{ height: "16px", background: `linear-gradient(180deg,${GOLD}60,${GOLD}20)` }} />
    </div>
  );
}

// ── ③ 凡例パネル ────────────────────────────────────────────
function LegendPanel() {
  return (
    <div className="mx-4 rounded-2xl px-4 py-4" style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.20)" }}>
      <p className="font-black mb-2" style={{ fontSize: "13px", color: NAVY }}>凡例 — ステータス</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
          <span key={key} className="inline-flex items-center gap-1.5 font-bold rounded-lg px-2.5 py-1.5"
            style={{ fontSize: "12px", background: sc.badgeBg, color: sc.badgeText,
              border: `1.5px solid ${sc.borderColor}70`, lineHeight: 1.4 }}>
            <span style={{ fontSize: "15px", lineHeight: 1 }}>{sc.emoji}</span>
            {sc.label}
          </span>
        ))}
      </div>
      <p className="font-black mt-4 mb-2" style={{ fontSize: "13px", color: NAVY }}>レベル</p>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map(lv => {
          const lc = getLevelColor(lv);
          return (
            <span key={lv} className="font-black rounded-lg px-3 py-1.5"
              style={{ fontSize: "12px", background: lc.bg, color: lc.text,
                border: `1.5px solid ${lc.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
              LV.{lv}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-1.5" style={{ fontSize: "11px" }}>
        <span style={{ fontSize: "14px" }}>⚠️</span>
        <span className="font-bold" style={{ color: "#b45309" }}>要注意（4ヶ月）/ 失効（5ヶ月）</span>
        <span style={{ color: `${NAVY}55` }}>— 連続未購入</span>
      </div>
    </div>
  );
}

// ── ② VisualTreeNode ─────────────────────────────────────────
// ・expanded の初期値は depth <= 5（最初の5段を自動展開）
// ・▼▲ボタンは全段で同一動作（1段目も10段目も同じ）
// ・maxDepth prop は使わない → ページングなし → 自由に開閉可能
function VisualTreeNode({ node, depth, onNodeClick }: {
  node: NodeData;
  depth: number;
  onNodeClick: (n: NodeData) => void;
}) {
  // 初期値: 5段まで自動展開。それ以降は折りたたみ。
  // ただしこれは初期値のみ。以降は▼▲で自由に変更可能（全段共通）
  const [expanded, setExpanded] = useState(() => depth <= 5);
  const children = node.children;
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
      <MemberCard node={node} depth={depth} onClick={() => onNodeClick(node)} />

      {hasChildren && (
        // ▼▲ボタン: depth に関係なく全段で同じ動作
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex flex-col items-center"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "2px" }}>
          {/* カードとボタン間の縦線 */}
          <div style={{ width: LINE_V_W, height: "12px", background: LINE_COLOR }} />
          <div className="rounded-full px-2 py-0.5 font-bold transition-all"
            style={{
              fontSize: "11px",
              background: expanded ? `${GOLD}22` : "rgba(255,255,255,0.90)",
              color: expanded ? GOLD_DARK : NAVY,
              border: `1px solid ${expanded ? GOLD + "60" : "#e2e8f0"}`,
              minWidth: "36px", textAlign: "center",
            }}>
            {expanded ? "▲" : `▼ ${children.length}`}
          </div>
          {/* ボタンとChildrenRow間の縦線 */}
          <div style={{ width: LINE_V_W, height: "8px", background: LINE_COLOR }} />
        </button>
      )}

      {!hasChildren && <div style={{ height: "12px" }} />}

      {expanded && hasChildren && (
        <ChildrenRow depth={depth} onNodeClick={onNodeClick}>
          {children}
        </ChildrenRow>
      )}
    </div>
  );
}

// 子ノードを横並びに表示するコンポーネント
// ② 接続線: 横2px・縦2px・色を濃く（GOLD 100% → opacity 0.7）
const LINE_COLOR = `${GOLD}b3`;   // #c9a84c + b3 ≒ opacity 70%
const LINE_H     = "2px";         // 横線の太さ
const LINE_V_W   = "2px";         // 縦線の幅
const LINE_V_H   = "10px";        // 縦線の長さ

function ChildrenRow({ children, depth, onNodeClick }: {
  children: NodeData[];
  depth: number;
  onNodeClick: (n: NodeData) => void;
}) {
  const isOnly = children.length === 1;
  return (
    <div className="flex flex-row items-start" style={{ gap: "12px" }}>
      {children.map((child, idx) => (
        <div key={child.id} className="flex flex-col items-center" style={{ flexShrink: 0, position: "relative" }}>
          {/* 水平接続線（子が1人なら中央縦線のみ） */}
          <div style={{
            width: "100%",
            height: LINE_H,
            background: isOnly
              ? "transparent"
              : idx === 0
              ? `linear-gradient(to right, transparent 50%, ${LINE_COLOR} 50%)`
              : idx === children.length - 1
              ? `linear-gradient(to right, ${LINE_COLOR} 50%, transparent 50%)`
              : LINE_COLOR,
            flexShrink: 0,
          }} />
          {/* 縦接続線 */}
          <div style={{ width: LINE_V_W, height: LINE_V_H, background: LINE_COLOR }} />
          <VisualTreeNode node={child} depth={depth + 1} onNodeClick={onNodeClick} />
        </div>
      ))}
    </div>
  );
}

// ── リスト行 ─────────────────────────────────────────────────
function ListRow({ node, depth, orgType, onNodeClick }: {
  node: NodeData; depth: number; orgType: OrgType; onNodeClick: (n: NodeData) => void;
}) {
  const lc = getLevelColor(node.currentLevel);
  const sc = getStatusConfig(node.status);
  const nameColor = node.nonPurchaseAlert === "danger_5" ? "#f87171"
    : node.nonPurchaseAlert === "warn_4" ? "#b45309" : sc.textColor;
  const rows: React.ReactNode[] = [];
  rows.push(
    <div key={node.id} className="flex items-center gap-2 py-2 border-b cursor-pointer transition hover:opacity-80"
      style={{ borderColor: "rgba(255,255,255,0.05)", paddingLeft: `${8 + depth * 14}px` }}
      onClick={() => onNodeClick(node)}>
      <span className="font-black rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ width: "26px", height: "20px", fontSize: "9px", background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>
        {orgType === "matrix" ? "M" : "U"}{depth}
      </span>
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-base"
        style={{ background: NAVY_CARD3, border: `1.5px solid ${GOLD}20`, fontSize: "16px" }}>
        {node.avatarUrl
          ? <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover" />
          : <span style={{ lineHeight: 1 }}>{sc.emoji}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate" style={{ fontSize: "13px", color: nameColor }}>{node.name}</div>
        <div className="font-mono" style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{node.mlmMemberCode}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span style={{ fontSize: "10px", color: `${GOLD}80` }}>{MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType}</span>
        <span className="font-bold" style={{ fontSize: "11px", color: GOLD_LIGHT }}>{node.selfPoints.toLocaleString()}pt</span>
        <span style={{ fontSize: "16px" }}>{sc.emoji}</span>
      </div>
    </div>
  );
  // リストは全段表示
  for (const child of node.children) {
    rows.push(<ListRow key={`${child.id}-r`} node={child} depth={depth + 1} orgType={orgType} onNodeClick={onNodeClick} />);
  }
  return <>{rows}</>;
}

// ── 段別アクティブ内訳モーダル ───────────────────────────────
function DepthStatsModal({ depthStats, totalCount, activeCount, onClose }: {
  depthStats: DepthStat[]; totalCount: number; activeCount: number; onClose: () => void;
}) {
  const upTo7   = depthStats.filter(s => s.depth <= 7);
  const beyond8 = depthStats.filter(s => s.depth >= 8);
  const beyond8Total  = beyond8.reduce((s, d) => s + d.total, 0);
  const beyond8Active = beyond8.reduce((s, d) => s + d.active, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: `linear-gradient(160deg,${NAVY} 0%,${NAVY_CARD} 30%,${NAVY_CARD2} 100%)`,
          border: `1px solid ${GOLD}40`, maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}>
        <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD_LIGHT} 50%,transparent)` }} />
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
          <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.22em", fontWeight: 700, color: `${GOLD}60` }}>ACTIVE BREAKDOWN</p>
            <h2 className="font-bold text-white text-sm mt-0.5">段別アクティブ内訳</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }}>✕</button>
        </div>
        <div className="px-5 py-3 grid grid-cols-2 gap-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          {[{ label: "配下合計", value: totalCount, color: GOLD_LIGHT },
            { label: "アクティブ計", value: activeCount, color: "#22c55e" }].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-2xl font-black" style={{ color: item.color }}>{item.value.toLocaleString()}</div>
              <div style={{ fontSize: "10px", marginTop: "2px", color: "rgba(255,255,255,0.40)" }}>{item.label}</div>
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
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)" }}>/ {stat.total}名</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full"
                    style={{ width: stat.total > 0 ? `${Math.round(stat.active / stat.total * 100)}%` : "0%",
                      background: "linear-gradient(90deg,#22c55e,#4ade80)" }} />
                </div>
              </div>
              <div className="w-10 text-right">
                <span className="text-xs font-bold" style={{ color: "#4ade80" }}>
                  {stat.total > 0 ? Math.round(stat.active / stat.total * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
          {beyond8.length > 0 && (
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}18` }}>
              <div className="w-10 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0"
                style={{ fontSize: "10px", background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                8段+
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{beyond8Active}名 アクティブ</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)" }}>/ {beyond8Total}名</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full"
                    style={{ width: beyond8Total > 0 ? `${Math.round(beyond8Active / beyond8Total * 100)}%` : "0%",
                      background: `linear-gradient(90deg,${GOLD},${GOLD_LIGHT})` }} />
                </div>
              </div>
              <div className="w-10 text-right">
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

// ── ① ツリービューポート ─────────────────────────────────────
// 管理ページと同じ方式:
//   - 外側コンテナ: overflow:auto + 固定高さ → ドラッグパン＋スクロールで全域にアクセス可能
//   - 内側コンテナ: transform:translate(pan) scale(zoom) + inline-flex + minWidth:max-content
//   - ドラッグ（マウス/タッチ）でパン、ボタンでズーム
function TreeViewport({ zoom, children }: { zoom: number; children: React.ReactNode }) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef   = useRef<HTMLDivElement>(null);
  const innerRef       = useRef<HTMLDivElement>(null);
  const isDragging     = useRef(false);
  const dragStart      = useRef({ x: 0, y: 0 });
  const panStart       = useRef({ x: 0, y: 0 });

  // ① 初期表示: コンテンツ横幅の中央にスクロール位置を合わせる
  useEffect(() => {
    const container = containerRef.current;
    const inner     = innerRef.current;
    if (!container || !inner) return;
    // DOM が描画された直後に実行
    const timer = setTimeout(() => {
      const contentW  = inner.scrollWidth;
      const containerW = container.clientWidth;
      if (contentW > containerW) {
        container.scrollLeft = (contentW - containerW) / 2;
      }
    }, 0);
    return () => clearTimeout(timer);
  // children(ツリーデータ)が変わるたびに再センタリング
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  // マウスドラッグ
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    isDragging.current = true;
    dragStart.current  = { x: e.clientX, y: e.clientY };
    panStart.current   = { ...pan };
    e.preventDefault();
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setPan({
      x: panStart.current.x + e.clientX - dragStart.current.x,
      y: panStart.current.y + e.clientY - dragStart.current.y,
    });
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // タッチ: passive:false のネイティブリスナーで preventDefault を確実に呼ぶ
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        dragStart.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStart.current   = { x: pan.x, y: pan.y };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      e.preventDefault();
      setPan({
        x: panStart.current.x + e.touches[0].clientX - dragStart.current.x,
        y: panStart.current.y + e.touches[0].clientY - dragStart.current.y,
      });
    };

    const handleTouchEnd = () => { isDragging.current = false; };

    el.addEventListener("touchstart",  handleTouchStart, { passive: true });
    el.addEventListener("touchmove",   handleTouchMove,  { passive: false });
    el.addEventListener("touchend",    handleTouchEnd,   { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener("touchstart",  handleTouchStart);
      el.removeEventListener("touchmove",   handleTouchMove);
      el.removeEventListener("touchend",    handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [pan]);

  // zoom 変化時にパンをリセット＆再センタリング
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    const container = containerRef.current;
    const inner     = innerRef.current;
    if (!container || !inner) return;
    const timer = setTimeout(() => {
      const contentW   = inner.scrollWidth;
      const containerW = container.clientWidth;
      if (contentW > containerW) {
        container.scrollLeft = (contentW - containerW) / 2;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [zoom]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "70vh",
        overflow: "auto",
        cursor: isDragging.current ? "grabbing" : "grab",
        position: "relative",
        background: "linear-gradient(180deg, rgba(245,240,232,0.5) 0%, rgba(245,240,232,0.95) 100%)",
        borderRadius: "1rem",
        border: `1px solid ${GOLD}20`,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div
        ref={innerRef}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top center",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 48px 48px",
          minWidth: "max-content",
          willChange: "transform",
        }}>
        {children}
      </div>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function MlmOrgChartPage() {
  const [data,           setData]           = useState<OrgData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [orgType,        setOrgType]        = useState<OrgType>("matrix");
  const [viewMode,       setViewMode]       = useState<ViewMode>("tree");
  const [showDepthModal, setShowDepthModal] = useState(false);
  const [selectedNode,   setSelectedNode]   = useState<NodeData | null>(null);
  const [zoom,           setZoom]           = useState(1.0);

  const fetchData = useCallback(() => {
    setLoading(true); setError("");
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

  const isMatrix     = orgType === "matrix";
  const totalCount   = isMatrix ? (data?.matrixTotalCount ?? 0)  : (data?.uniTotalCount ?? 0);
  const activeCount  = isMatrix ? (data?.matrixActiveCount ?? 0) : (data?.uniActiveCount ?? 0);
  const currentNodes = isMatrix ? (data?.matrixDownlines ?? [])  : (data?.uniDownlines ?? []);
  const depthStats   = data?.matrixDepthStats ?? [];

  return (
    <div className="min-h-screen pb-20" style={{ background: PAGE_BG }}>
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }} />
      </div>

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08)" }}>
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
          {data && <span style={{ fontSize: "11px", color: `${GOLD}55` }}>📅 {data.month}</span>}
        </div>
        {/* タブ行 */}
        <div className="max-w-full mx-auto px-4 pb-2 flex items-center justify-between gap-3">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
            {([{ key: "matrix", label: "🔷 マトリックス" }, { key: "unilevel", label: "🔶 ユニレベル" }] as { key: OrgType; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setOrgType(key)}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{ background: orgType === key ? `linear-gradient(135deg,${GOLD},${ORANGE})` : "rgba(10,22,40,0.04)",
                  color: orgType === key ? "#fff" : `${NAVY}70` }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
            {([{ key: "tree", label: "🌲 ツリー" }, { key: "list", label: "📋 リスト" }] as { key: ViewMode; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setViewMode(key)}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{ background: viewMode === key ? "linear-gradient(135deg,#334155,#1e293b)" : "rgba(10,22,40,0.04)",
                  color: viewMode === key ? "#e2e8f0" : `${NAVY}70` }}>
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
            <p style={{ fontSize: "13px", color: `${GOLD}60` }}>組織図を読み込み中...</p>
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
            {/* サマリー */}
            <div className="px-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 text-center"
                style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}28`, boxShadow: "0 4px 12px rgba(10,22,40,0.10)" }}>
                <div className="text-3xl font-black mb-0.5" style={{ color: GOLD_LIGHT }}>{totalCount.toLocaleString()}</div>
                <div className="font-bold" style={{ fontSize: "11px", color: `${GOLD}70` }}>
                  👥 {isMatrix ? "配下合計" : "紹介合計"}
                </div>
                <div style={{ fontSize: "9px", marginTop: "2px", color: "rgba(10,22,40,0.40)" }}>自分起点・全段</div>
              </div>
              <button onClick={() => isMatrix && setShowDepthModal(true)}
                className="rounded-2xl p-4 text-center transition-all active:scale-95"
                style={{ background: "rgba(34,197,94,0.10)", border: `1px solid rgba(34,197,94,0.28)`,
                  boxShadow: "0 4px 12px rgba(10,22,40,0.10)", cursor: isMatrix ? "pointer" : "default" }}>
                <div className="text-3xl font-black mb-0.5" style={{ color: "#22c55e" }}>{activeCount.toLocaleString()}</div>
                <div className="font-bold" style={{ fontSize: "11px", color: "rgba(34,197,94,0.80)" }}>✅ アクティブ</div>
                <div style={{ fontSize: "9px", marginTop: "2px", color: "rgba(10,22,40,0.40)" }}>
                  {isMatrix ? "▶ タップで段別内訳" : "自分起点・全段"}
                </div>
              </button>
            </div>

            {/* ③ 凡例 */}
            <LegendPanel />

            {/* ② 操作説明（ページングボタン廃止 → 説明のみ） */}
            <div className="px-4">
              <div className="rounded-xl px-4 py-2.5 flex items-center gap-2"
                style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20`, fontSize: "12px", color: `${NAVY}80` }}>
                <span style={{ fontSize: "16px" }}>💡</span>
                <span>最初の5段を自動展開。<strong>▼▲ボタン</strong>で任意の段を開閉できます（段数制限なし）</span>
              </div>
            </div>

            {/* ① ズームコントロール */}
            {viewMode === "tree" && (
              <div className="px-4 flex items-center justify-between gap-2">
                <span className="font-bold" style={{ fontSize: "12px", color: `${GOLD}70` }}>
                  📌 ドラッグでスクロール / ボタンで拡大縮小
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ fontSize: "11px", color: `${GOLD}60` }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: `${GOLD}25` }}>
                    <button
                      onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
                      className="px-2.5 py-1.5 text-sm font-black transition"
                      style={{ background: "rgba(10,22,40,0.04)", color: NAVY }}>−</button>
                    <button
                      onClick={() => setZoom(1.0)}
                      className="px-2.5 py-1 font-bold transition border-x"
                      style={{ fontSize: "10px", background: "rgba(10,22,40,0.02)", color: `${NAVY}70`, borderColor: `${GOLD}20` }}>
                      FIT
                    </button>
                    <button
                      onClick={() => setZoom(z => Math.min(2.5, parseFloat((z + 0.1).toFixed(1))))}
                      className="px-2.5 py-1.5 text-sm font-black transition"
                      style={{ background: "rgba(10,22,40,0.04)", color: NAVY }}>＋</button>
                  </div>
                </div>
              </div>
            )}

            {currentNodes.length === 0 ? (
              <div className="mx-4 rounded-2xl p-10 text-center"
                style={{ background: `${NAVY_CARD}80`, border: `2px dashed ${GOLD}15` }}>
                <div className="text-3xl mb-2">🌱</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                  {isMatrix ? "配下メンバーがいません" : "紹介した会員がいません"}
                </div>
              </div>
            ) : viewMode === "tree" ? (
              /* ① ツリービュー: ドラッグパン + transform:scale */
              <div className="mx-4">
                <TreeViewport zoom={zoom}>
                  <MeCard me={data.me} orgType={orgType} />
                  {/* ルートの子ノード群 */}
                  {currentNodes.length > 0 && (
                    <div className="flex flex-row items-start" style={{ gap: "12px" }}>
                      {currentNodes.map((node, idx) => (
                        <div key={node.id} className="flex flex-col items-center" style={{ flexShrink: 0, position: "relative" }}>
                          {/* 水平接続線（ルート直下） */}
                          <div style={{
                            width: "100%", height: LINE_H,
                            background:
                              currentNodes.length === 1 ? "transparent"
                              : idx === 0 ? `linear-gradient(to right, transparent 50%, ${LINE_COLOR} 50%)`
                              : idx === currentNodes.length - 1 ? `linear-gradient(to right, ${LINE_COLOR} 50%, transparent 50%)`
                              : LINE_COLOR,
                          }} />
                          {/* 縦接続線 */}
                          <div style={{ width: LINE_V_W, height: LINE_V_H, background: LINE_COLOR }} />
                          {/* ② VisualTreeNode: maxDepth prop なし → 全段で▼▲が同一動作 */}
                          <VisualTreeNode node={node} depth={1} onNodeClick={setSelectedNode} />
                        </div>
                      ))}
                    </div>
                  )}
                </TreeViewport>
              </div>
            ) : (
              /* リストビュー */
              <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: NAVY_CARD, border: `1px solid ${GOLD}18` }}>
                <div className="flex items-center gap-2 px-3 py-2 font-bold"
                  style={{ fontSize: "10px", background: `${GOLD}12`, color: `${GOLD}80`, borderBottom: `1px solid ${GOLD}18` }}>
                  <span className="w-6 text-center">段</span>
                  <span className="w-8">—</span>
                  <span className="flex-1">氏名 / 会員コード</span>
                  <span className="ml-auto">pt / ST</span>
                </div>
                {currentNodes.map(node => (
                  <ListRow key={node.id} node={node} depth={1} orgType={orgType} onNodeClick={setSelectedNode} />
                ))}
              </div>
            )}

            {/* ボーナス履歴リンク */}
            <Link href="/mlm-bonus-history"
              className="mx-4 flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-95"
              style={{ background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}22`, boxShadow: "0 4px 16px rgba(10,22,40,0.14)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>💎</div>
                <span className="font-semibold text-sm text-white">ボーナス履歴を見る</span>
              </div>
              <span style={{ color: `${GOLD}55` }}>›</span>
            </Link>
          </>
        )}
      </main>

      {/* モーダル */}
      {selectedNode && <NodeDetailModal node={selectedNode} onClose={() => setSelectedNode(null)} />}
      {showDepthModal && data && (
        <DepthStatsModal
          depthStats={depthStats}
          totalCount={totalCount}
          activeCount={activeCount}
          onClose={() => setShowDepthModal(false)} />
      )}
    </div>
  );
}
