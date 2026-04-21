"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type ActiveMarker = "active" | "warning" | "danger" | "none";

type MemberNode = {
  id: string;
  memberCode: string;
  name: string;
  level: number;
  status: string;
  lastMonthPoints?: number;
  currentMonthPoints?: number;
  directDownlines?: MemberNode[];
  activeMarker?: ActiveMarker;
};

const ACTIVE_MARKER_BG: Record<ActiveMarker, string> = {
  active:  "bg-yellow-200 text-yellow-900",
  warning: "bg-blue-200 text-blue-900",
  danger:  "bg-red-200 text-red-900",
  none:    "",
};
const ACTIVE_MARKER_LABEL: Record<ActiveMarker, string> = {
  active:  "★当月アクティブ",
  warning: "⚠5ヶ月未入金",
  danger:  "✖6ヶ月+未入金",
  none:    "",
};

const STATUS_LABELS: Record<string, string> = {
  active: "活動中",
  autoship: "オートシップ",
  withdrawn: "退会",
  midCancel: "クーリングオフ",
  lapsed: "失効",
  suspended: "停止",
};
const STATUS_COLORS: Record<string, string> = {
  active: "text-green-600 font-semibold",
  autoship: "text-blue-600 font-semibold",
  // 退会: 灰色（danger=赤、LV2=紫と区別）
  withdrawn: "text-gray-500",
  midCancel: "text-orange-600",
  lapsed: "text-gray-400",
  suspended: "text-yellow-600",
};

// 退会会員のノード全体に適用する背景・ボーダースタイル（danger=赤、LV2=紫と区別して灰色）
const WITHDRAWN_NODE_STYLE = {
  background: "rgba(209,213,219,0.4)",    // gray-300 薄め
  border: "1px solid rgba(107,114,128,0.5)", // gray-500
};

const LEVEL_COLORS: Record<number, string> = {
  0: "",           // LV0は白背景・黒縁（下記 getLevelStyle 参照）
  1: "bg-blue-500",
  2: "bg-green-500",
  3: "bg-yellow-500",
  4: "bg-purple-500",
  5: "bg-red-500",
};

/** LV0は白背景・黒縁、それ以外はクラス名 */
function getLevelStyle(level: number): { className: string; style?: React.CSSProperties } {
  if (level === 0) {
    return {
      className: "text-gray-800 font-bold",
      style: { background: "#ffffff", border: "2px solid #1a1a1a" },
    };
  }
  return { className: `${LEVEL_COLORS[level] ?? "bg-gray-400"} text-white` };
}

export default function OrganizationChart({ memberCode }: { memberCode: string }) {
  const [orgType, setOrgType] = useState<"matrix" | "unilevel">("matrix");
  const [rootMember, setRootMember] = useState<MemberNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrgChart = useCallback(async (type: "matrix" | "unilevel") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/mlm-organization/tree?memberCode=${encodeURIComponent(memberCode)}&type=${type}`
      );
      if (res.ok) {
        const data = await res.json();
        setRootMember(data.root);
      } else {
        setError("組織図の取得に失敗しました");
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [memberCode]);

  useEffect(() => {
    fetchOrgChart(orgType);
  }, [orgType, fetchOrgChart]);

  const renderTreeNode = (node: MemberNode, depth: number = 0): JSX.Element => {
    const indent = depth * 36;
    const hasChildren = node.directDownlines && node.directDownlines.length > 0;
    const levelLabel = node.level === 0 ? "未設定" : `LV.${node.level}`;
    const ls = getLevelStyle(node.level);
    const isWithdrawn = node.status === "withdrawn";

    return (
      <div key={node.id} className="mb-1">
        <div
          className="flex items-center gap-2 p-2 rounded-lg border hover:shadow-sm transition"
          style={{
            paddingLeft: `${indent + 8}px`,
            ...(isWithdrawn ? WITHDRAWN_NODE_STYLE : { background: "white" }),
          }}
        >
          <div
            className={`w-9 h-9 ${ls.className} rounded-full flex items-center justify-center font-bold text-xs shrink-0`}
            style={ls.style}
          >
            {levelLabel}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 text-sm truncate">
              <Link href={`/admin/mlm-members/${node.id}`}>
                {/* 退会会員にはアクティブマーカー色付けをしない（紫ノード自体で識別） */}
                {(!isWithdrawn && node.activeMarker && node.activeMarker !== "none") ? (
                  <span
                    className={`${ACTIVE_MARKER_BG[node.activeMarker]} rounded px-1 font-bold text-blue-600 hover:text-blue-700`}
                    title={ACTIVE_MARKER_LABEL[node.activeMarker]}
                  >
                    {node.memberCode}
                  </span>
                ) : (
                  <span className={isWithdrawn ? "text-gray-500 hover:text-gray-700" : "text-blue-600 hover:text-blue-700"}>
                    {node.memberCode}
                  </span>
                )}
              </Link>
              {" - "}{node.name}
              {isWithdrawn && <span className="ml-1 text-xs text-gray-400">（退会）</span>}
            </div>
            <div className="text-xs flex items-center gap-2">
              <span className={STATUS_COLORS[node.status] ?? "text-gray-500"}>
                {STATUS_LABELS[node.status] ?? node.status}
              </span>
              {node.lastMonthPoints !== undefined && node.lastMonthPoints > 0 && (
                <span className="text-purple-600">先月:{node.lastMonthPoints}pt</span>
              )}
              {node.currentMonthPoints !== undefined && node.currentMonthPoints > 0 && (
                <span className="text-pink-600">今月:{node.currentMonthPoints}pt</span>
              )}
            </div>
          </div>
          {hasChildren && (
            <div className="text-xs text-gray-500 shrink-0">
              ▼{node.directDownlines!.length}名
            </div>
          )}
        </div>
        {hasChildren && (
          <div className="mt-1">
            {node.directDownlines!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* 切り替えタブ */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrgType("matrix")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            orgType === "matrix" ? "bg-blue-600 text-white" : "border text-gray-700 hover:bg-gray-50"
          }`}
        >
          🏗️ マトリックス（直上者ライン）
        </button>
        <button
          onClick={() => setOrgType("unilevel")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            orgType === "unilevel" ? "bg-green-600 text-white" : "border text-gray-700 hover:bg-gray-50"
          }`}
        >
          🌲 ユニレベル（紹介ライン）
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {orgType === "matrix"
          ? "直上者（uplineId）に基づくマトリックス組織図（最大5段）"
          : "直紹介者（referrerId）に基づくユニレベル組織図（最大5段）"}
      </p>

      {loading ? (
        <div className="py-8 text-center text-gray-400 animate-pulse">読み込み中...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : !rootMember ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-500 text-sm">
          組織データなし
        </div>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto overflow-x-auto border rounded-xl p-3 bg-stone-50">
          {renderTreeNode(rootMember)}
        </div>
      )}
    </div>
  );
}
