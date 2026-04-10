"use client";

import { useState, useCallback, useRef } from "react";

type OrgType = "matrix" | "unilevel";

// ─── 型定義 ───────────────────────────────────────────
type MemberNode = {
  id: string;
  memberCode: string;
  name: string;            // 表示名（法人名 or ユーザー名）
  companyName: string | null;  // 法人名
  email: string;
  phone: string | null;
  nickname: string | null;
  level: number;
  status: string;
  parentId: string | null;
  uplineId: string | null;
  referrerId: string | null;
  uplineName: string | null;
  uplineCode: string | null;
  referrerName: string | null;
  referrerCode: string | null;
  contractDate: string | null;
  createdAt: string;
  depth: number;
  totalDescendants: number;
  hasMore: boolean;
  directDownlines: MemberNode[];
};

type CandidateMember = {
  id: string;
  memberCode: string;
  name: string;
  status: string;
  level: number;
};

// ─── 定数 ─────────────────────────────────────────────
const STEP = 5;

const STATUS_LABEL: Record<string, string> = {
  active: "活動中", autoship: "オートシップ",
  withdrawn: "退会", midCancel: "中途解約",
  lapsed: "失効", suspended: "停止",
};
const STATUS_BG: Record<string, { card: string; badge: string }> = {
  active:    { card: "border-emerald-400 bg-emerald-50",  badge: "bg-emerald-500 text-white" },
  autoship:  { card: "border-blue-400   bg-blue-50",      badge: "bg-blue-500   text-white" },
  withdrawn: { card: "border-red-300    bg-red-50",       badge: "bg-red-400    text-white" },
  midCancel: { card: "border-orange-300 bg-orange-50",    badge: "bg-orange-400 text-white" },
  lapsed:    { card: "border-gray-300   bg-gray-50",      badge: "bg-gray-400   text-white" },
  suspended: { card: "border-yellow-300 bg-yellow-50",    badge: "bg-yellow-400 text-white" },
};
const LEVEL_COLOR: Record<number, string> = {
  0: "bg-gray-500", 1: "bg-blue-600", 2: "bg-violet-600",
  3: "bg-amber-500", 4: "bg-rose-500", 5: "bg-red-700",
};
const defaultStyle = { card: "border-slate-200 bg-white", badge: "bg-slate-400 text-white" };

// ─── 候補選択モーダル ──────────────────────────────────
function CandidateModal({ candidates, keyword, onSelect, onClose }: {
  candidates: CandidateMember[];
  keyword: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">🔍 検索結果 — 会員を選択</h3>
            <p className="text-xs text-slate-500 mt-0.5">「{keyword}」に一致する会員が {candidates.length} 件見つかりました</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">氏名</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">会員コード</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">LV</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">ステータス</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-violet-50 transition">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.memberCode}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`${LEVEL_COLOR[c.level] ?? "bg-gray-400"} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                      LV.{c.level}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(STATUS_BG[c.status] ?? defaultStyle).badge}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => onSelect(c.memberCode)}
                      className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-bold text-white hover:bg-violet-700 transition">
                      表示
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 会員詳細モーダル ──────────────────────────────────
function MemberDetailModal({ node, orgType, onClose, onZoom }: {
  node: MemberNode;
  orgType: OrgType;
  onClose: () => void;
  onZoom: (memberCode: string) => void;
}) {
  const st = STATUS_BG[node.status] ?? defaultStyle;
  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("ja-JP") : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-2 pb-2 sm:px-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={`px-5 py-4 border-b-2 ${st.card}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`${LEVEL_COLOR[node.level] ?? "bg-gray-400"} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                  LV.{node.level}
                </span>
                <span className={`${st.badge} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                  {STATUS_LABEL[node.status] ?? node.status}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-800">{node.name}</div>
              {node.companyName && node.companyName !== node.name && (
                <div className="text-xs text-slate-500 mt-0.5">法人: {node.companyName}</div>
              )}
              {node.nickname && <div className="text-xs text-violet-600 mt-0.5">ニックネーム: 「{node.nickname}」</div>}
              <div className="text-xs text-slate-500 font-mono mt-0.5">{node.memberCode}</div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold ml-3 mt-1">✕</button>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="px-5 py-4 space-y-3 text-sm">
          {/* 連絡先 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">メールアドレス</div>
              <div className="text-xs text-slate-700 break-all">{node.email || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">電話番号</div>
              <div className="text-xs text-slate-700">{node.phone || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">契約日</div>
              <div className="text-xs text-slate-700">{fmt(node.contractDate)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">登録日</div>
              <div className="text-xs text-slate-700">{fmt(node.createdAt)}</div>
            </div>
          </div>

          {/* 直上者・紹介者 */}
          <div className="rounded-2xl bg-slate-50 px-3 py-3 space-y-2">
            <div className="text-xs font-bold text-slate-600 mb-1">📌 上位関係</div>
            <div className="flex items-start gap-2">
              <span className="w-14 shrink-0 text-[10px] font-semibold text-slate-400 pt-0.5">直上者</span>
              {node.uplineCode ? (
                <div>
                  <span className="text-xs font-bold text-slate-800">{node.uplineName ?? "—"}</span>
                  <span className="ml-1.5 text-[10px] text-slate-400 font-mono">({node.uplineCode})</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">なし（トップ）</span>
              )}
            </div>
            {orgType === "unilevel" && (
              <div className="flex items-start gap-2">
                <span className="w-14 shrink-0 text-[10px] font-semibold text-slate-400 pt-0.5">紹介者</span>
                {node.referrerCode ? (
                  <div>
                    <span className="text-xs font-bold text-slate-800">{node.referrerName ?? "—"}</span>
                    <span className="ml-1.5 text-[10px] text-slate-400 font-mono">({node.referrerCode})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">なし</span>
                )}
              </div>
            )}
            {orgType === "matrix" && node.referrerCode && node.referrerCode !== node.uplineCode && (
              <div className="flex items-start gap-2">
                <span className="w-14 shrink-0 text-[10px] font-semibold text-slate-400 pt-0.5">紹介者</span>
                <div>
                  <span className="text-xs font-bold text-slate-800">{node.referrerName ?? "—"}</span>
                  <span className="ml-1.5 text-[10px] text-slate-400 font-mono">({node.referrerCode})</span>
                </div>
              </div>
            )}
          </div>

          {/* 傘下数 */}
          <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-3 py-2.5">
            <span className="text-xs font-semibold text-violet-700">傘下会員数（全体）</span>
            <span className="text-sm font-bold text-violet-900">{node.totalDescendants} 名</span>
          </div>
        </div>

        {/* アクション */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={() => { onZoom(node.memberCode); onClose(); }}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition"
          >
            🌲 この会員を起点に表示
          </button>
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ノードカード ──────────────────────────────────────
function NodeCard({
  node,
  isRoot,
  onClickNode,
}: {
  node: MemberNode;
  isRoot?: boolean;
  onClickNode: (n: MemberNode) => void;
}) {
  const st = STATUS_BG[node.status] ?? defaultStyle;
  return (
    <div
      className={`
        relative border-2 rounded-xl shadow-sm cursor-pointer select-none
        hover:shadow-md hover:scale-105 transition-all
        ${st.card}
        ${isRoot ? "px-4 py-3 min-w-[148px] max-w-[172px]" : "px-3 py-2 min-w-[120px] max-w-[148px]"}
        text-center
      `}
      onClick={(e) => { e.stopPropagation(); onClickNode(node); }}
      title={`${node.name}（${node.memberCode}）をタップで詳細`}
    >
      {/* LVバッジ */}
      <span className={`
        absolute -top-2.5 left-1/2 -translate-x-1/2
        ${LEVEL_COLOR[node.level] ?? "bg-gray-400"}
        text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap z-10
      `}>
        LV.{node.level}
      </span>

      {/* 名前 */}
      <div className={`mt-1 font-bold text-slate-800 leading-tight truncate ${isRoot ? "text-sm" : "text-xs"}`}
        title={node.companyName ? `法人: ${node.companyName}` : node.name}>
        {node.companyName ? (
          <span>🏢 {node.name}</span>
        ) : node.name}
      </div>
      {/* 会員コード */}
      <div className="text-[9px] text-slate-500 mt-0.5 font-mono truncate">{node.memberCode}</div>
      {/* ステータス */}
      <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${st.badge}`}>
        {STATUS_LABEL[node.status] ?? node.status}
      </span>
      {/* 傘下数 */}
      {node.totalDescendants > 0 && (
        <div className="mt-0.5 text-[9px] text-slate-400">傘下{node.totalDescendants}名</div>
      )}
      {/* タップヒント */}
      <div className="absolute top-1 right-1 text-[8px] text-slate-300 select-none">ℹ</div>
    </div>
  );
}

// ─── ツリーの縦線・横線 ───────────────────────────────
function VLine({ className = "" }: { className?: string }) {
  return <div className={`w-px bg-slate-300 ${className}`} style={{ minHeight: "16px", height: "16px" }} />;
}

// ─── ツリーノード（再帰レンダリング） ─────────────────
function TreeNodeRow({
  node,
  depth,
  isRoot,
  onClickNode,
  onLoadMore,
}: {
  node: MemberNode;
  depth: number;
  isRoot?: boolean;
  onClickNode: (n: MemberNode) => void;
  onLoadMore: (nodeId: string, nodeCode: string, currentDepth: number) => void;
}) {
  const hasChildren = node.directDownlines && node.directDownlines.length > 0;

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      {/* ノードカード */}
      <NodeCard node={node} isRoot={isRoot} onClickNode={onClickNode} />

      {/* 子ノードがある or hasMore */}
      {(hasChildren || node.hasMore) && (
        <div className="flex flex-col items-center">
          {/* カードから下への縦線 */}
          <VLine />

          {hasChildren && (
            <div className="relative flex flex-row items-start gap-2">
              {/* 兄弟を繋ぐ横線（2人以上の場合） */}
              {node.directDownlines.length > 1 && (
                <div
                  className="absolute top-0 h-px bg-slate-300 z-0"
                  style={{
                    left: "calc(50% - (50% - 8px))",
                    right: "calc(50% - (50% - 8px))",
                    width: "calc(100% - 16px)",
                    marginLeft: "8px",
                  }}
                />
              )}

              {node.directDownlines.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center flex-shrink-0">
                  {/* 横線→縦線で各子に接続 */}
                  {node.directDownlines.length > 1 ? (
                    <VLine />
                  ) : null}
                  {node.directDownlines.length === 1 && idx === 0 ? null : null}
                  <TreeNodeRow
                    node={child}
                    depth={depth + 1}
                    onClickNode={onClickNode}
                    onLoadMore={onLoadMore}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 「次の5段を表示」ボタン */}
          {node.hasMore && (
            <div className="flex flex-col items-center">
              <VLine />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadMore(node.id, node.memberCode, depth);
                }}
                className="flex items-center gap-1 rounded-xl bg-violet-100 border border-violet-300 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-200 active:bg-violet-300 transition whitespace-nowrap"
              >
                <span>▼</span>
                <span>次の {STEP} 段を表示</span>
                {node.totalDescendants > 0 && (
                  <span className="text-violet-400 text-[10px]">
                    ({node.totalDescendants}名格納中)
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 兄弟横線を修正したラッパー ───────────────────────
function ChildrenRow({
  children: childNodes,
  onClickNode,
  onLoadMore,
  depth,
}: {
  children: MemberNode[];
  onClickNode: (n: MemberNode) => void;
  onLoadMore: (nodeId: string, nodeCode: string, currentDepth: number) => void;
  depth: number;
}) {
  if (childNodes.length === 0) return null;
  if (childNodes.length === 1) {
    return (
      <TreeNodeRow
        node={childNodes[0]}
        depth={depth}
        onClickNode={onClickNode}
        onLoadMore={onLoadMore}
      />
    );
  }

  return (
    <div className="relative flex flex-row items-start gap-3">
      {/* 横線（最初の子の中央から最後の子の中央まで） */}
      <div
        className="absolute top-0 h-px bg-slate-300"
        style={{ left: "calc(60px + 1.5px)", right: "calc(60px + 1.5px)" }}
      />
      {childNodes.map((child) => (
        <div key={child.id} className="flex flex-col items-center flex-shrink-0">
          <VLine />
          <TreeNodeRow
            node={child}
            depth={depth}
            onClickNode={onClickNode}
            onLoadMore={onLoadMore}
          />
        </div>
      ))}
    </div>
  );
}

// ─── メインの TreeNodeRow を ChildrenRow を使うように修正 ─
function TreeNode({
  node,
  depth,
  isRoot,
  onClickNode,
  onLoadMore,
}: {
  node: MemberNode;
  depth: number;
  isRoot?: boolean;
  onClickNode: (n: MemberNode) => void;
  onLoadMore: (nodeId: string, nodeCode: string, currentDepth: number) => void;
}) {
  const hasChildren = node.directDownlines && node.directDownlines.length > 0;

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <NodeCard node={node} isRoot={isRoot} onClickNode={onClickNode} />

      {(hasChildren || node.hasMore) && (
        <div className="flex flex-col items-center">
          <VLine />

          {hasChildren && (
            <ChildrenRow
              children={node.directDownlines}
              onClickNode={onClickNode}
              onLoadMore={onLoadMore}
              depth={depth + 1}
            />
          )}

          {node.hasMore && (
            <div className="flex flex-col items-center">
              {hasChildren && <VLine />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadMore(node.id, node.memberCode, depth);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-violet-100 border border-violet-300 px-4 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-200 active:bg-violet-300 transition whitespace-nowrap mt-1"
              >
                <span>▼</span>
                <span>次の {STEP} 段を表示</span>
                {node.totalDescendants > 0 && (
                  <span className="text-violet-400 text-[10px]">
                    ({node.totalDescendants}名格納中)
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── メインページ ──────────────────────────────────────
export default function MlmOrganizationPage() {
  const [orgType, setOrgType]       = useState<OrgType>("matrix");
  const [viewMode, setViewMode]     = useState<"tree" | "list">("tree");
  const [searchCode, setSearchCode] = useState("");
  const [searchType, setSearchType] = useState<"memberCode" | "name" | "email" | "phone">("memberCode");
  const [loading, setLoading]       = useState(false);
  const [rootMember, setRootMember] = useState<MemberNode | null>(null);
  const [listData, setListData]     = useState<MemberNode[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [depthLimit, setDepthLimit] = useState(STEP);
  const [selectedNode, setSelectedNode] = useState<MemberNode | null>(null);
  const [candidates, setCandidates] = useState<CandidateMember[]>([]);
  const [candidateKeyword, setCandidateKeyword] = useState("");
  const [currentRootCode, setCurrentRootCode] = useState<string>("");

  // レポート用
  const [reportSearchCode, setReportSearchCode]     = useState("");
  const [reportOrgType, setReportOrgType]           = useState<OrgType>("matrix");
  const [purchaseSearchCode, setPurchaseSearchCode] = useState("");
  const [purchaseOrgType, setPurchaseOrgType]       = useState<OrgType>("matrix");
  const [purchaseStartMonth, setPurchaseStartMonth] = useState("");
  const [purchaseEndMonth, setPurchaseEndMonth]     = useState("");
  const [refStartDate, setRefStartDate]             = useState("");
  const [refEndDate, setRefEndDate]                 = useState("");
  const [refSortType, setRefSortType]               = useState("clean");

  const treeScrollRef = useRef<HTMLDivElement>(null);

  // ─── ツリー取得（内部共通） ───
  const fetchTree = useCallback(async (code: string, limit: number, currentOrgType: OrgType) => {
    setLoading(true);
    setErrorMsg(null);
    setCandidates([]);
    try {
      const params = new URLSearchParams({
        memberCode: code,
        type: currentOrgType,
        depthLimit: limit.toString(),
      });
      const res  = await fetch(`/api/admin/mlm-organization/tree?${params}`);
      const data = await res.json();
      if (res.ok && !data.candidates) {
        setRootMember(data.root ?? null);
        setListData(data.list || []);
        setDepthLimit(limit);
        setCurrentRootCode(code);
        setViewMode("tree");
      } else if (data.candidates) {
        setCandidates(data.candidates);
        setCandidateKeyword(code);
      } else {
        setErrorMsg(data.error ?? "会員が見つかりませんでした");
        setRootMember(null);
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    }
    setLoading(false);
  }, []);

  // ─── 検索ボタン ───
  const handleSearch = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSearchMessage(null);
    setCandidates([]);
    const keyword = searchCode.trim();

    if (!keyword) {
      try {
        const res  = await fetch(`/api/admin/mlm-organization/tree?type=${orgType}`);
        const data = await res.json();
        if (res.ok) {
          setRootMember(null);
          setListData(data.list || []);
          setTotalCount(data.totalCount ?? null);
          setSearchMessage(data.message ?? null);
          setViewMode("list");
        }
      } catch { setErrorMsg("通信エラーが発生しました"); }
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ type: orgType, depthLimit: STEP.toString() });
      params.set(searchType, keyword);
      const res  = await fetch(`/api/admin/mlm-organization/tree?${params}`);
      const data = await res.json();
      if (res.ok) {
        if (data.candidates) {
          setCandidates(data.candidates);
          setCandidateKeyword(keyword);
          setRootMember(null);
        } else {
          setRootMember(data.root ?? null);
          setListData(data.list || []);
          setDepthLimit(STEP);
          if (data.root) {
            setCurrentRootCode(data.root.memberCode);
          }
          setViewMode("tree");
        }
      } else {
        setErrorMsg(data.error ?? "会員が見つかりませんでした");
        setRootMember(null);
      }
    } catch { setErrorMsg("通信エラーが発生しました"); }
    setLoading(false);
  };

  // ─── 「次の5段を表示」ボタン ───
  // 現在の rootCode で depthLimit を増やして再取得
  const handleLoadMore = useCallback(async (
    _nodeId: string,
    _nodeCode: string,
    _currentDepth: number
  ) => {
    if (!currentRootCode) return;
    const newLimit = depthLimit + STEP;
    await fetchTree(currentRootCode, newLimit, orgType);
  }, [currentRootCode, depthLimit, orgType, fetchTree]);

  // ─── 起点変更 ───
  const handleZoom = useCallback(async (code: string) => {
    setSelectedNode(null);
    setSearchCode(code);
    setSearchType("memberCode");
    await fetchTree(code, STEP, orgType);
  }, [orgType, fetchTree]);

  // ─── レポートダウンロード ───
  const handleDownloadDownlineReport = async () => {
    if (!reportSearchCode) { alert("対象会員コードを入力してください"); return; }
    try {
      const res = await fetch(`/api/admin/mlm-organization/downline-report?memberCode=${reportSearchCode}&type=${reportOrgType}`);
      if (res.ok) { const b = await res.blob(); const u = URL.createObjectURL(b); Object.assign(document.createElement("a"), { href: u, download: `downline_${reportSearchCode}.csv` }).click(); }
      else alert("レポート生成に失敗しました");
    } catch { alert("エラーが発生しました"); }
  };
  const handleDownloadPurchaseReport = async () => {
    if (!purchaseSearchCode || !purchaseStartMonth || !purchaseEndMonth) { alert("すべての項目を入力してください"); return; }
    try {
      const res = await fetch(`/api/admin/mlm-organization/purchase-report?memberCode=${purchaseSearchCode}&type=${purchaseOrgType}&startMonth=${purchaseStartMonth}&endMonth=${purchaseEndMonth}`);
      if (res.ok) { const b = await res.blob(); const u = URL.createObjectURL(b); Object.assign(document.createElement("a"), { href: u, download: `purchase_${purchaseSearchCode}.csv` }).click(); }
      else alert("レポート生成に失敗しました");
    } catch { alert("エラーが発生しました"); }
  };
  const handleDownloadReferralReport = async () => {
    if (!refStartDate || !refEndDate) { alert("期間を入力してください"); return; }
    try {
      const res = await fetch(`/api/admin/mlm-organization/referral-report?startDate=${refStartDate}&endDate=${refEndDate}&sortType=${refSortType}`);
      if (res.ok) { const b = await res.blob(); const u = URL.createObjectURL(b); Object.assign(document.createElement("a"), { href: u, download: `referral_${refStartDate}_${refEndDate}.csv` }).click(); }
      else alert("エラーが発生しました");
    } catch { alert("エラーが発生しました"); }
  };

  const getStatusBadge = (s: string) => {
    const m: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800", autoship: "bg-blue-100 text-blue-800",
      withdrawn: "bg-red-100 text-red-800", midCancel: "bg-orange-100 text-orange-800",
      lapsed: "bg-gray-100 text-gray-800", suspended: "bg-yellow-100 text-yellow-800",
    };
    return m[s] ?? "bg-gray-100 text-gray-800";
  };

  return (
    <main className="space-y-6">
      {/* 候補選択モーダル */}
      {candidates.length > 0 && (
        <CandidateModal
          candidates={candidates}
          keyword={candidateKeyword}
          onSelect={(code) => {
            setSearchCode(code);
            setSearchType("memberCode");
            setCandidates([]);
            fetchTree(code, STEP, orgType);
          }}
          onClose={() => setCandidates([])}
        />
      )}

      {/* 会員詳細モーダル */}
      {selectedNode && (
        <MemberDetailModal
          node={selectedNode}
          orgType={orgType}
          onClose={() => setSelectedNode(null)}
          onZoom={handleZoom}
        />
      )}

      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Organization Chart
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">組織図・リスト</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          会員コード / 氏名などで検索してツリーを表示。ノードをタップで詳細確認。
        </p>
      </div>

      {/* 組織図表示エリア */}
      <div className="rounded-2xl bg-white border border-stone-100 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-800">組織図表示</h2>

        {/* 検索コントロール */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">検索タイプ</label>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="memberCode">会員コード</option>
              <option value="name">氏名</option>
              <option value="email">メールアドレス</option>
              <option value="phone">電話番号</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">検索キーワード</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={
                searchType === "memberCode" ? "例: 10234001" :
                searchType === "name"       ? "例: 山田 or 山田太郎" :
                searchType === "email"      ? "例: user@example.com" : "例: 090-1234-5678"
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">組織区分</label>
            <div className="flex gap-2">
              <button onClick={() => setOrgType("matrix")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${orgType === "matrix" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                マトリックス
              </button>
              <button onClick={() => setOrgType("unilevel")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${orgType === "unilevel" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                ユニレベル
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">表示形式</label>
            <div className="flex gap-2">
              <button onClick={() => setViewMode("tree")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${viewMode === "tree" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                🌲 ツリー
              </button>
              <button onClick={() => setViewMode("list")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${viewMode === "list" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                📋 リスト
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? "🔍 検索中..." : "🔍 組織図を表示"}
          </button>
          {rootMember && (
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span>
                現在: <span className="font-bold text-slate-700">{rootMember.name}</span>
                <span className="ml-1 font-mono text-slate-400">({rootMember.memberCode})</span>
              </span>
              <span className="text-slate-300">|</span>
              <span>傘下 <span className="font-bold text-violet-700">{rootMember.totalDescendants}</span> 名</span>
              <span className="text-slate-300">|</span>
              <span>表示 <span className="font-bold">{depthLimit}</span> 段まで</span>
              <button
                onClick={() => fetchTree(currentRootCode, depthLimit + STEP, orgType)}
                disabled={loading}
                className="rounded-lg bg-violet-100 border border-violet-300 px-3 py-1 text-xs font-bold text-violet-700 hover:bg-violet-200 transition disabled:opacity-50"
              >
                ▼ 全体を {STEP} 段追加表示
              </button>
            </div>
          )}
        </div>

        {/* エラー */}
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            ⚠️ {errorMsg}
          </div>
        )}
        {searchMessage && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            ℹ️ {searchMessage}（全体: {totalCount?.toLocaleString()} 件）
          </div>
        )}

        {/* ─── ビジュアルツリー ─── */}
        {viewMode === "tree" && rootMember && !loading && (
          <div className="mt-2">
            {/* 凡例 */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {[0, 1, 2, 3, 4, 5].map(lv => (
                <span key={lv} className={`${LEVEL_COLOR[lv] ?? "bg-gray-400"} text-white text-[9px] px-2 py-0.5 rounded-full`}>
                  LV.{lv}
                </span>
              ))}
              <span className="text-[9px] text-slate-400 ml-1">各カードをタップで詳細・紹介者を確認できます</span>
            </div>

            {/* スクロールエリア（縦横両方） */}
            <div
              ref={treeScrollRef}
              className="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white"
              style={{ maxHeight: "70vh", overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch" }}
            >
              <div className="inline-flex flex-col items-center px-8 pt-6 pb-10" style={{ minWidth: "max-content", width: "max-content" }}>
                <TreeNode
                  node={rootMember}
                  depth={0}
                  isRoot
                  onClickNode={setSelectedNode}
                  onLoadMore={handleLoadMore}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              ※ 縦横スクロール対応。「▼ 次の {STEP} 段を表示」ボタンで段数を展開。カードタップで詳細・紹介者確認。
            </p>
          </div>
        )}

        {/* ─── リスト ─── */}
        {(viewMode === "list" || (viewMode === "tree" && !rootMember)) && listData.length > 0 && !loading && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-bold text-slate-700">
              📋 一覧（{listData.length}件 / 全 {totalCount ?? listData.length}件）
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold">LV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">会員コード</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">氏名</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listData.map((m) => (
                    <tr key={m.id} className="hover:bg-violet-50 transition cursor-pointer"
                      onClick={() => setSelectedNode(m as unknown as MemberNode)}>
                      <td className="px-4 py-2.5">
                        <span className={`${LEVEL_COLOR[m.level] ?? "bg-gray-400"} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                          LV.{m.level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700 font-mono">{m.memberCode}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{m.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(m.status)}`}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 初期状態 */}
        {!loading && !rootMember && listData.length === 0 && !errorMsg && (
          <div className="mt-6 rounded-2xl bg-slate-50 py-10 text-center text-slate-400 text-sm">
            🔍 会員コードまたは氏名を入力して「組織図を表示」を押してください
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="mt-6 rounded-2xl bg-slate-50 py-10 text-center text-slate-500 text-sm">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              読み込み中...
            </div>
          </div>
        )}
      </div>

      {/* ─── ダウンラインレポート ─── */}
      <div className="rounded-2xl bg-white border border-stone-100 p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-800">📥 ダウンラインレポート CSV出力</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象会員コード</label>
            <input type="text" value={reportSearchCode} onChange={(e) => setReportSearchCode(e.target.value)}
              placeholder="例: 10234001" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">組織区分</label>
            <div className="flex gap-2">
              <button onClick={() => setReportOrgType("matrix")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${reportOrgType === "matrix" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                マトリックス
              </button>
              <button onClick={() => setReportOrgType("unilevel")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${reportOrgType === "unilevel" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                ユニレベル
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={handleDownloadDownlineReport}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition">
              📥 CSV出力
            </button>
          </div>
        </div>
      </div>

      {/* ─── 購入レポート ─── */}
      <div className="rounded-2xl bg-white border border-stone-100 p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-800">🛒 購入レポート CSV出力</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象会員コード</label>
            <input type="text" value={purchaseSearchCode} onChange={(e) => setPurchaseSearchCode(e.target.value)}
              placeholder="例: 10234001" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">開始月</label>
            <input type="month" value={purchaseStartMonth} onChange={(e) => setPurchaseStartMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">終了月</label>
            <input type="month" value={purchaseEndMonth} onChange={(e) => setPurchaseEndMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">組織区分</label>
            <div className="flex gap-1">
              <button onClick={() => setPurchaseOrgType("matrix")}
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${purchaseOrgType === "matrix" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                M
              </button>
              <button onClick={() => setPurchaseOrgType("unilevel")}
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${purchaseOrgType === "unilevel" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                U
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={handleDownloadPurchaseReport}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition">
              📥 CSV出力
            </button>
          </div>
        </div>
      </div>

      {/* ─── 紹介実績レポート ─── */}
      <div className="rounded-2xl bg-white border border-stone-100 p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-800">👥 紹介実績積算ダウンロード</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象期間開始</label>
            <input type="date" value={refStartDate} onChange={(e) => setRefStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象期間終了</label>
            <input type="date" value={refEndDate} onChange={(e) => setRefEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ソートタイプ</label>
            <select value={refSortType} onChange={(e) => setRefSortType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="clean">クリーンタイプ</option>
              <option value="standard">スタンダード</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleDownloadReferralReport}
              className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition">
              📥 ダウンロード
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
