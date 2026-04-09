"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── デザイントークン
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
type VpInfo = {
  id: string; nameKanji: string; contractType: string | null;
  desiredPlan: string | null; status: string; contractedAt: string | null; createdAt: string;
};

type TreeNode = {
  id: string; name: string; memberCode: string; depth: number;
  vp: VpInfo | null; children: TreeNode[]; childCount: number;
};

type ApiResponse = {
  root: { id: string; name: string; memberCode: string; isMe: boolean };
  tree: TreeNode;
  stats: { totalMembers: number; contracted: number; pending: number };
};

/* ─── ステータス設定 ─── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pending:    { label: "審査待ち", bg: `${GOLD}12`,              text: GOLD_LIGHT, border: `${GOLD}28`,            dot: GOLD },
  reviewing:  { label: "審査中",   bg: "rgba(147,197,253,0.12)", text: "#93c5fd",  border: "rgba(147,197,253,0.28)",dot: "#93c5fd" },
  contracted: { label: "契約済",   bg: "rgba(52,211,153,0.12)",  text: "#34d399",  border: "rgba(52,211,153,0.28)", dot: "#34d399" },
  rejected:   { label: "否認",     bg: "rgba(248,113,113,0.10)", text: "#f87171",  border: "rgba(248,113,113,0.25)",dot: "#f87171" },
  canceled:   { label: "キャンセル",bg: "rgba(107,114,128,0.10)",text: "#9ca3af",  border: "rgba(107,114,128,0.22)",dot: "#9ca3af" },
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  voice: "音声回線", data: "大容量データ",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

/* ─── ステータスバッジ ─── */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "rgba(156,163,175,0.12)", text: "#9ca3af", border: "rgba(156,163,175,0.25)", dot: "#9ca3af" };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-jp"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }}/>
      {cfg.label}
    </span>
  );
}

/* ─── メンバーカード ─── */
function MemberCard({ node, onDrillDown }: { node: TreeNode; onDrillDown: (node: TreeNode) => void }) {
  const vp = node.vp;
  const hasChildren = node.childCount > 0;

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
        border: `1px solid ${GOLD}20`,
        boxShadow: "0 4px 16px rgba(10,22,40,0.16)",
        cursor: hasChildren ? "pointer" : "default",
      }}
      onClick={() => hasChildren && onDrillDown(node)}>

      <div className="p-4">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold font-jp text-white text-sm leading-tight truncate">{node.name}</p>
            <p className="text-[10px] font-label mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{node.memberCode}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasChildren && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full font-label"
                style={{ background: "rgba(196,181,253,0.15)", color: "#c4b5fd", border: "1px solid rgba(196,181,253,0.25)" }}>
                配下 {node.childCount}名
              </span>
            )}
            {hasChildren && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: `${GOLD}55` }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            )}
          </div>
        </div>

        {/* VP申込情報 */}
        {vp ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={vp.status}/>
              {vp.contractType && (
                <span className="text-xs px-2 py-0.5 rounded-full font-label"
                  style={{ background: "rgba(196,181,253,0.12)", color: "#c4b5fd", border: "1px solid rgba(196,181,253,0.22)" }}>
                  {CONTRACT_TYPE_LABEL[vp.contractType] ?? vp.contractType}
                </span>
              )}
            </div>
            {vp.desiredPlan && (
              <p className="text-xs font-jp">
                <span style={{ color: "rgba(255,255,255,0.35)" }}>プラン：</span>
                <span style={{ color: "rgba(255,255,255,0.75)" }}>{vp.desiredPlan}</span>
              </p>
            )}
            <div className="flex gap-3 text-[10px] font-label flex-wrap" style={{ color: "rgba(255,255,255,0.30)" }}>
              <span>申込：{fmtDate(vp.createdAt)}</span>
              {vp.contractedAt && <span>契約：{fmtDate(vp.contractedAt)}</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs font-jp italic" style={{ color: "rgba(255,255,255,0.25)" }}>VP未来phone 申込なし</p>
        )}
      </div>
    </div>
  );
}

/* ─── パンくずリスト ─── */
function Breadcrumb({ stack, onJump }: { stack: { id: string; name: string }[]; onJump: (index: number) => void }) {
  if (stack.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap text-sm mb-4">
      {stack.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1">
          {i > 0 && <span style={{ color: `${GOLD}40` }}>›</span>}
          <button onClick={() => onJump(i)}
            className="px-2.5 py-1 rounded-lg transition text-xs font-jp font-semibold"
            style={i === stack.length - 1
              ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white" }
              : { color: "#c4b5fd", background: "rgba(196,181,253,0.08)", border: "1px solid rgba(196,181,253,0.18)" }}>
            {i === 0 ? "自分" : item.name}
          </button>
        </span>
      ))}
    </div>
  );
}

/* ─── メインコンポーネント ─── */
export default function VpPhoneReferralsPage() {
  const [data,      setData]      = useState<ApiResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [nodeStack, setNodeStack] = useState<TreeNode[]>([]);

  const fetchTree = useCallback(async (rootId?: string) => {
    setLoading(true); setError("");
    try {
      const url = rootId ? `/api/my/vp-phone-tree?rootId=${rootId}` : "/api/my/vp-phone-tree";
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

  useEffect(() => { fetchTree(); }, [fetchTree]);

  function drillDown(node: TreeNode) { setNodeStack(prev => [...prev, node]); }
  function jumpTo(index: number)     { setNodeStack(prev => prev.slice(0, index + 1)); }

  const currentNode     = nodeStack[nodeStack.length - 1] ?? null;
  const breadcrumbStack = nodeStack.map(n => ({ id: n.id, name: n.name }));

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.13]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle,#c4b5fd,transparent 70%)" }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#c4b5fd" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>VP未来phone 紹介ツリー</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(90deg,rgba(196,181,253,0.35),transparent)" }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {/* ローディング */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: "rgba(196,181,253,0.25)", borderTopColor: "#c4b5fd" }}/>
            <p className="text-sm font-jp" style={{ color: "rgba(196,181,253,0.60)" }}>読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {!loading && error && (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <p className="font-medium font-jp text-sm" style={{ color: "#f87171" }}>{error}</p>
            <button onClick={() => fetchTree()}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "rgba(239,68,68,0.40)", border: "1px solid rgba(248,113,113,0.35)" }}>
              再試行
            </button>
          </div>
        )}

        {/* データ表示 */}
        {!loading && !error && data && currentNode && (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "総紹介人数", value: data.stats.totalMembers, color: GOLD_LIGHT,  bg: `${GOLD}10`,          border: `${GOLD}22` },
                { label: "契約済",     value: data.stats.contracted,   color: "#34d399",   bg: "rgba(52,211,153,0.08)",border: "rgba(52,211,153,0.22)" },
                { label: "審査中",     value: data.stats.pending,      color: "#c4b5fd",   bg: "rgba(196,181,253,0.08)",border: "rgba(196,181,253,0.22)" },
              ].map(item => (
                <div key={item.label} className="rounded-2xl p-3 text-center"
                  style={{ background: item.bg, border: `1px solid ${item.border}`, boxShadow: "0 4px 12px rgba(10,22,40,0.12)" }}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] font-jp mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{item.label}</p>
                </div>
              ))}
            </div>

            {/* パンくず */}
            <Breadcrumb stack={breadcrumbStack} onJump={jumpTo}/>

            {/* 現在の起点情報 */}
            {nodeStack.length > 1 && (
              <div className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "rgba(196,181,253,0.07)", border: "1px solid rgba(196,181,253,0.20)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: "rgba(196,181,253,0.18)", color: "#c4b5fd" }}>
                  {currentNode.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-jp text-sm truncate" style={{ color: "#c4b5fd" }}>{currentNode.name}</p>
                  <p className="text-[10px] font-label" style={{ color: "rgba(196,181,253,0.55)" }}>{currentNode.memberCode}</p>
                </div>
                <span className="text-xs font-jp font-medium flex-shrink-0" style={{ color: "rgba(196,181,253,0.70)" }}>
                  配下 {currentNode.childCount}名
                </span>
              </div>
            )}

            {/* 子一覧 */}
            {currentNode.children.length === 0 ? (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: `${NAVY_CARD}80`, border: `2px dashed ${GOLD}15` }}>
                <p className="text-4xl mb-3">👥</p>
                <p className="text-sm font-jp" style={{ color: "rgba(255,255,255,0.30)" }}>
                  {nodeStack.length === 1 ? "まだ紹介した会員がいません" : "この会員の配下はいません"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-jp px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {nodeStack.length === 1 ? "直接紹介した会員" : `${currentNode.name} の紹介会員`}
                  （{currentNode.children.length}名）
                </p>
                {currentNode.children.map(child => (
                  <MemberCard key={child.id} node={child} onDrillDown={drillDown}/>
                ))}
              </div>
            )}

            {/* ステータス凡例 */}
            <div className="rounded-2xl px-4 py-3"
              style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.18)" }}>
              <p className="text-xs font-semibold font-jp mb-2" style={{ color: `${NAVY}60` }}>ステータス凡例</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <span key={key} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-jp"
                    style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }}/>
                    {cfg.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
