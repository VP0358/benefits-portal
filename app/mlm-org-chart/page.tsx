"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NON_PURCHASE_ALERT_STYLES, LEVEL_LABELS, MEMBER_TYPE_LABELS } from "@/lib/mlm-bonus";

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
};

type OrgData = {
  month: string;
  me: MeData;
  downlines: NodeData[];
};

/* ─── レベルバッジ ─── */
function LevelBadge({ level, type = "current" }: { level: number; type?: "current" | "title" }) {
  if (level === 0) return null;
  const colors =
    type === "title"
      ? "bg-amber-100 text-amber-700 border-amber-300"
      : "bg-violet-100 text-violet-700 border-violet-300";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${colors}`}>
      {type === "title" ? "👑 " : "⭐ "}{LEVEL_LABELS[level] ?? `LV.${level}`}
    </span>
  );
}

/* ─── アバター ─── */
function Avatar({ avatarUrl, name, size = "md" }: {
  avatarUrl: string | null; name: string; size?: "sm" | "md" | "lg" | "xl";
}) {
  const s = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16", xl: "w-20 h-20" }[size];
  const t = { sm: "text-base", md: "text-2xl", lg: "text-3xl", xl: "text-4xl" }[size];
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${s} rounded-full object-cover border-2 border-white shadow`} />;
  }
  return (
    <div className={`${s} rounded-full bg-slate-200 flex items-center justify-center ${t}`}>
      😊
    </div>
  );
}

/* ─── 会員ノードカード ─── */
function MemberNode({
  node,
  depth,
  isLast,
}: {
  node: NodeData;
  depth: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const alertStyle = NON_PURCHASE_ALERT_STYLES[node.nonPurchaseAlert];

  const borderColor = node.isActive
    ? "border-emerald-300"
    : "border-slate-200";
  const bgColor = alertStyle.bg;

  return (
    <div className="flex flex-col items-start">
      {/* カード */}
      <div
        className={`rounded-2xl border-2 ${borderColor} ${bgColor} shadow-sm overflow-hidden w-full max-w-xs transition-all`}
      >
        {/* メインヘッダー */}
        <button
          className="w-full flex items-center gap-3 p-3 text-left"
          onClick={() => node.children.length > 0 && setExpanded(!expanded)}
        >
          <div className="relative flex-shrink-0">
            <Avatar avatarUrl={node.avatarUrl} name={node.name} size="md" />
            <span className="absolute -bottom-1 -right-1 text-sm leading-none">
              {node.isActive ? "✅" : "❌"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className={`font-semibold truncate ${alertStyle.text}`}>
              {node.name}
            </div>
            <div className="text-xs text-slate-500">{node.mlmMemberCode}</div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-600">
                {MEMBER_TYPE_LABELS[node.memberType] ?? node.memberType}
              </span>
              <LevelBadge level={node.currentLevel} type="current" />
              {node.titleLevel > node.currentLevel && (
                <LevelBadge level={node.titleLevel} type="title" />
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-right space-y-1">
            <div className="text-xs font-semibold text-slate-700">
              {node.selfPoints}pt
            </div>
            {node.children.length > 0 && (
              <div className="text-xs text-slate-400">
                {expanded ? "▲" : `▼${node.children.length}`}
              </div>
            )}
          </div>
        </button>

        {/* 警告バナー（連続非購入） */}
        {node.nonPurchaseAlert !== "none" && (
          <div
            className={`px-3 py-1.5 text-xs font-bold text-center ${
              node.nonPurchaseAlert === "danger_5"
                ? "bg-red-500 text-white"
                : "bg-blue-50 text-blue-700 border-t border-blue-200"
            }`}
          >
            ⚠️ {alertStyle.label}（スミサイ {node.consecutiveNonPurchase}ヶ月連続未購入）
          </div>
        )}
      </div>

      {/* 子ノード */}
      {expanded && node.children.length > 0 && (
        <div className="mt-2 ml-6 pl-4 border-l-2 border-slate-200 space-y-3 w-full">
          {node.children.map((child, i) => (
            <MemberNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── メインページ ─── */
export default function MlmOrgChartPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-org-chart")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = data?.downlines.filter((d) => d.isActive).length ?? 0;
  const warnCount = data?.downlines.filter((d) => d.nonPurchaseAlert !== "none").length ?? 0;
  const totalCount = data?.downlines.length ?? 0;

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-6 px-4">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
            ← ダッシュボード
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🌲 マトリックス組織図</h1>
          <p className="text-xs text-slate-500 mt-1">
            直下最大6名のマトリックス組織。連続スミサイ未購入者はアラート表示されます。
          </p>
          {data && (
            <p className="text-sm text-slate-500 mt-2">
              📅 対象月: {data.month}
            </p>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow-sm">
            読み込み中...
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-red-50 border border-red-200 p-6 text-center shadow-sm">
            <div className="text-red-600 text-sm font-semibold">{error}</div>
            {error.includes("MLM会員情報") && (
              <p className="mt-2 text-xs text-slate-500">
                管理者にMLM会員登録を依頼してください。
              </p>
            )}
          </div>
        )}

        {data && !loading && (
          <>
            {/* サマリー */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-3">
                {data.month} 直下ダウンライン状況
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <div className="text-xl mb-1">✅</div>
                  <div className="text-xs text-emerald-700 font-semibold">アクティブ</div>
                  <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <div className="text-xl mb-1">👥</div>
                  <div className="text-xs text-slate-500 font-semibold">直下合計</div>
                  <div className="text-2xl font-bold text-slate-700">{totalCount}</div>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
                  <div className="text-xl mb-1">⚠️</div>
                  <div className="text-xs text-amber-700 font-semibold">失効アラート</div>
                  <div className="text-2xl font-bold text-amber-700">{warnCount}</div>
                </div>
              </div>
            </div>

            {/* 組織図本体 */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              {/* 自分（頂点） */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center border-4 border-violet-300 shadow-md overflow-hidden">
                    {data.me.avatarUrl ? (
                      <img src={data.me.avatarUrl} alt={data.me.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">😊</span>
                    )}
                  </div>
                  <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    YOU
                  </span>
                  {data.me.isActive && (
                    <span className="absolute -bottom-1 -left-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="font-bold text-slate-800">{data.me.name}</div>
                  <div className="text-xs text-slate-500">{data.me.mlmMemberCode}</div>
                  <div className="flex justify-center gap-1 mt-1">
                    <LevelBadge level={data.me.currentLevel} type="current" />
                    {data.me.titleLevel > data.me.currentLevel && (
                      <LevelBadge level={data.me.titleLevel} type="title" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    自己購入: {data.me.selfPoints}pt
                  </div>
                </div>
              </div>

              {/* 接続ライン */}
              {data.downlines.length > 0 && (
                <div className="flex justify-center mb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-slate-300" />
                    <div className="text-slate-400 text-sm">▼</div>
                    <div className="text-xs text-slate-400">直下メンバー（最大6名）</div>
                  </div>
                </div>
              )}

              {/* ダウンライン */}
              {data.downlines.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <div className="text-3xl mb-2">🌱</div>
                  <div className="text-sm text-slate-500">まだダウンラインがいません</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.downlines.map((node, i) => (
                    <MemberNode
                      key={node.id}
                      node={node}
                      depth={0}
                      isLast={i === data.downlines.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 凡例 */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-3">凡例</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span className="text-emerald-700 font-semibold">アクティブ</span>
                  <span className="text-slate-500">（当月150pt以上＋スミサイ購入あり）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>❌</span>
                  <span className="text-slate-500">非アクティブ（ユニレベル計算で圧縮対象）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="text-blue-700 font-semibold">失効予定（5ヶ月目）</span>
                  <span className="text-slate-500">スミサイ4ヶ月連続未購入</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔴</span>
                  <span className="text-red-700 font-semibold">失効予定（6ヶ月目）</span>
                  <span className="text-slate-500">スミサイ5ヶ月連続未購入</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <span>⭐</span>
                  <span className="text-violet-700 font-semibold">当月実績レベル</span>
                  <span className="mx-1">|</span>
                  <span>👑</span>
                  <span className="text-amber-700 font-semibold">称号レベル（過去最高）</span>
                </div>
              </div>
            </div>

            {/* ボーナス履歴へのリンク */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <Link
                href="/mlm-bonus"
                className="flex items-center justify-between px-2 py-1 text-slate-700 hover:text-violet-700 transition"
              >
                <span className="font-semibold">💎 ボーナス履歴を見る</span>
                <span className="text-slate-400">›</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
