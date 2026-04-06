"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ViolaLogo from "@/app/components/viola-logo";

/* ─── 型定義 ─── */
type TravelInfo = {
  id: string;
  planName: string;
  level: number;
  pricingTier: string;
  monthlyFee: number;
  status: string;
  forceStatus: string;
  startedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
};

type TreeNode = {
  id: string;
  name: string;
  memberCode: string;
  depth: number;
  travel: TravelInfo | null;
  children: TreeNode[];
  childCount: number;
};

type ApiResponse = {
  root: { id: string; name: string; memberCode: string; isMe: boolean };
  tree: TreeNode;
  stats: { totalMembers: number; active: number; pending: number };
};

/* ─── ステータス設定 ─── */
const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  active:    { label: "有効",     bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  pending:   { label: "審査待ち", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  canceled:  { label: "解約済",   bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400" },
  suspended: { label: "停止中",   bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-400" },
};

const PRICING_TIER_LABEL: Record<string, string> = {
  early:    "早期特別",
  standard: "標準",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function fmtFee(fee: number) {
  return fee.toLocaleString("ja-JP") + "円";
}

/* ─── ステータスバッジ ─── */
function StatusBadge({ status, forceStatus }: { status: string; forceStatus: string }) {
  // 強制ステータスが設定されている場合はそちらを優先表示
  const effectiveStatus =
    forceStatus === "forced_active"   ? "active" :
    forceStatus === "forced_inactive" ? "suspended" :
    status;

  const cfg = STATUS_CONFIG[effectiveStatus] ?? {
    label: effectiveStatus,
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {forceStatus !== "none" && <span className="opacity-60">（強制）</span>}
    </span>
  );
}

/* ─── メンバーカード ─── */
function MemberCard({
  node,
  onDrillDown,
}: {
  node: TreeNode;
  onDrillDown: (node: TreeNode) => void;
}) {
  const travel = node.travel;
  const hasChildren = node.childCount > 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${
        hasChildren ? "cursor-pointer active:bg-gray-50" : ""
      }`}
      onClick={() => hasChildren && onDrillDown(node)}
    >
      {/* ヘッダー：名前 + 子カウント */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-base leading-tight truncate">{node.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{node.memberCode}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasChildren && (
            <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">
              配下 {node.childCount}名
            </span>
          )}
          {hasChildren && (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>

      {/* 旅行サブスク情報 */}
      {travel ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={travel.status} forceStatus={travel.forceStatus} />
            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
              {PRICING_TIER_LABEL[travel.pricingTier] ?? travel.pricingTier}
            </span>
            <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              Lv.{travel.level}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-800">{travel.planName}</p>
          <p className="text-xs text-gray-600">
            <span className="font-medium text-gray-500">月額：</span>
            <span className="font-bold text-teal-700">{fmtFee(travel.monthlyFee)}</span>
          </p>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
            <span>申込：{fmtDate(travel.createdAt)}</span>
            {travel.startedAt && <span>開始：{fmtDate(travel.startedAt)}</span>}
            {travel.confirmedAt && <span>確認：{fmtDate(travel.confirmedAt)}</span>}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">旅行サブスク 申込なし</p>
      )}
    </div>
  );
}

/* ─── パンくずリスト ─── */
function Breadcrumb({
  stack,
  onJump,
}: {
  stack: { id: string; name: string }[];
  onJump: (index: number) => void;
}) {
  if (stack.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap text-sm mb-4">
      {stack.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-400">›</span>}
          <button
            onClick={() => onJump(i)}
            className={`px-2 py-0.5 rounded-lg transition ${
              i === stack.length - 1
                ? "bg-teal-600 text-white font-bold"
                : "text-teal-600 hover:bg-teal-50"
            }`}
          >
            {i === 0 ? "自分" : item.name}
          </button>
        </span>
      ))}
    </div>
  );
}

/* ─── メインコンポーネント ─── */
export default function TravelReferralsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ドリルダウン履歴スタック
  const [nodeStack, setNodeStack] = useState<TreeNode[]>([]);

  const fetchTree = useCallback(async (rootId?: string) => {
    setLoading(true);
    setError("");
    try {
      const url = rootId
        ? `/api/my/travel-tree?rootId=${rootId}`
        : "/api/my/travel-tree";
      const res = await fetch(url);
      if (!res.ok) throw new Error("データ取得に失敗しました");
      const json: ApiResponse = await res.json();
      setData(json);
      setNodeStack([json.tree]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // ドリルダウン
  function drillDown(node: TreeNode) {
    setNodeStack((prev) => [...prev, node]);
  }

  // パンくずジャンプ
  function jumpTo(index: number) {
    setNodeStack((prev) => prev.slice(0, index + 1));
  }

  const currentNode = nodeStack[nodeStack.length - 1] ?? null;
  const breadcrumbStack = nodeStack.map((n) => ({ id: n.id, name: n.name }));

  return (
    <div className="min-h-screen bg-[#f0faf5] pb-28">
      {/* ヘッダー */}
      <header className="bg-[#0d9488] text-white px-4 pt-10 pb-5 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/dashboard" className="text-white/80 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <ViolaLogo className="h-5 w-auto" />
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">旅行サブスク 紹介ツリー</h1>
          <p className="text-xs text-white/70">ユニレベル・段数無制限</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => fetchTree()}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold"
            >
              再試行
            </button>
          </div>
        )}

        {/* データ表示 */}
        {!loading && !error && data && currentNode && (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-teal-600">{data.stats.totalMembers}</p>
                <p className="text-xs text-gray-500 mt-0.5">総紹介人数</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{data.stats.active}</p>
                <p className="text-xs text-gray-500 mt-0.5">有効契約</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-yellow-500">{data.stats.pending}</p>
                <p className="text-xs text-gray-500 mt-0.5">審査中</p>
              </div>
            </div>

            {/* パンくず */}
            <Breadcrumb stack={breadcrumbStack} onJump={jumpTo} />

            {/* 現在の起点情報 */}
            {nodeStack.length > 1 && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-200 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                  {currentNode.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-teal-800 text-sm truncate">{currentNode.name}</p>
                  <p className="text-xs text-teal-500">{currentNode.memberCode}</p>
                </div>
                <span className="text-xs text-teal-600 font-medium flex-shrink-0">
                  配下 {currentNode.childCount}名
                </span>
              </div>
            )}

            {/* 子一覧 */}
            {currentNode.children.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-4xl mb-3">✈️</p>
                <p className="text-gray-500 font-medium">
                  {nodeStack.length === 1
                    ? "まだ紹介した会員がいません"
                    : "この会員の配下はいません"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium px-1">
                  {nodeStack.length === 1 ? "直接紹介した会員" : `${currentNode.name} の紹介会員`}
                  （{currentNode.children.length}名）
                </p>
                {currentNode.children.map((child) => (
                  <MemberCard
                    key={child.id}
                    node={child}
                    onDrillDown={drillDown}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 凡例 */}
      {!loading && !error && (
        <div className="max-w-lg mx-auto px-4 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-bold text-gray-600 mb-2">ステータス凡例</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
