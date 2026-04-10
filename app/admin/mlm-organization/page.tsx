"use client";

import { useState } from "react";

type OrgType = "matrix" | "unilevel";

type MemberNode = {
  id: string;
  memberCode: string;
  name: string;
  level: number;
  status: string;
  directDownlines?: MemberNode[];
  lastMonthPoints?: number;
  currentMonthPoints?: number;
};

// ─────────────────────────────────────────────
// ステータス設定
// ─────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active: "活動中",
  autoship: "オートシップ",
  withdrawn: "退会",
  midCancel: "中途解約",
  lapsed: "失効",
  suspended: "停止",
};

const STATUS_BG: Record<string, string> = {
  active: "bg-emerald-500",
  autoship: "bg-blue-500",
  withdrawn: "bg-red-400",
  midCancel: "bg-orange-400",
  lapsed: "bg-gray-400",
  suspended: "bg-yellow-400",
};

const LEVEL_COLOR: Record<number, string> = {
  0: "bg-gray-500",
  1: "bg-blue-600",
  2: "bg-violet-600",
  3: "bg-amber-500",
  4: "bg-rose-500",
  5: "bg-red-700",
};

// ─────────────────────────────────────────────
// ビジュアルツリーノードコンポーネント
// ─────────────────────────────────────────────
function TreeNode({ node, isRoot = false }: { node: MemberNode; isRoot?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.directDownlines && node.directDownlines.length > 0;
  const statusBg = STATUS_BG[node.status] ?? "bg-gray-400";
  const levelBg = LEVEL_COLOR[node.level] ?? "bg-gray-500";

  return (
    <div className="flex flex-col items-center">
      {/* ノードカード */}
      <div className="relative flex flex-col items-center">
        <div
          className={`
            relative rounded-xl shadow-md border-2 px-3 py-2 min-w-[130px] max-w-[160px] text-center cursor-default
            ${isRoot
              ? "border-violet-500 bg-violet-50"
              : "border-slate-200 bg-white hover:border-violet-300 hover:shadow-lg"}
            transition-all
          `}
        >
          {/* レベルバッジ */}
          <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${levelBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}>
            LV.{node.level}
          </span>

          {/* 名前 */}
          <div className="mt-1 font-bold text-slate-800 text-xs leading-tight truncate" title={node.name}>
            {node.name}
          </div>

          {/* 会員コード */}
          <div className="text-[10px] text-slate-500 mt-0.5">{node.memberCode}</div>

          {/* ステータス */}
          <span className={`inline-block mt-1 ${statusBg} text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full`}>
            {STATUS_LABEL[node.status] ?? node.status}
          </span>

          {/* ポイント */}
          {(node.lastMonthPoints !== undefined || node.currentMonthPoints !== undefined) && (
            <div className="mt-1 flex gap-1 justify-center flex-wrap">
              {node.lastMonthPoints !== undefined && node.lastMonthPoints > 0 && (
                <span className="text-[9px] text-purple-600 font-medium">先月:{node.lastMonthPoints.toLocaleString()}pt</span>
              )}
              {node.currentMonthPoints !== undefined && node.currentMonthPoints > 0 && (
                <span className="text-[9px] text-pink-600 font-medium">今月:{node.currentMonthPoints.toLocaleString()}pt</span>
              )}
            </div>
          )}
        </div>

        {/* 折りたたみボタン */}
        {hasChildren && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-1 w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center hover:bg-violet-600 transition z-10 shadow"
          >
            {collapsed ? "+" : "−"}
          </button>
        )}
      </div>

      {/* 子ノード */}
      {hasChildren && !collapsed && (
        <div className="flex flex-col items-center mt-0">
          {/* 縦線（親→分岐点） */}
          <div className="w-px h-4 bg-slate-300" />

          {/* 横線 + 子ノード群 */}
          <div className="flex flex-row items-start gap-4">
            {node.directDownlines!.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* 縦線（分岐点→子） */}
                <div className="w-px h-4 bg-slate-300" />
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 横線で子ノードをつなぐ（CSSでの実装）
function VisualTree({ root }: { root: MemberNode }) {
  return (
    <div className="overflow-auto pb-8">
      <div className="inline-flex flex-col items-center min-w-max px-8 pt-6">
        <TreeNode node={root} isRoot />
      </div>
    </div>
  );
}

// 候補一覧の型
type CandidateMember = {
  id: string;
  memberCode: string;
  name: string;
  status: string;
  level: number;
};

// ─────────────────────────────────────────────
// 候補選択モーダル
// ─────────────────────────────────────────────
function CandidateModal({
  candidates,
  keyword,
  onSelect,
  onClose,
}: {
  candidates: CandidateMember[];
  keyword: string;
  onSelect: (memberCode: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">🔍 検索結果 — 会員を選択</h3>
            <p className="text-xs text-slate-500 mt-0.5">「{keyword}」に一致する会員が {candidates.length} 件見つかりました</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>
        {/* 一覧 */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-100">
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
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "autoship" ? "bg-blue-100 text-blue-700" :
                      c.status === "withdrawn" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => onSelect(c.memberCode)}
                      className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-bold text-white hover:bg-violet-700 transition"
                    >
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

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function MlmOrganizationPage() {
  const [orgType, setOrgType] = useState<OrgType>("matrix");
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [searchCode, setSearchCode] = useState("");
  const [searchType, setSearchType] = useState<"memberCode" | "name" | "email" | "phone">("memberCode");
  const [loading, setLoading] = useState(false);
  const [rootMember, setRootMember] = useState<MemberNode | null>(null);
  const [listData, setListData] = useState<MemberNode[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 候補一覧
  const [candidates, setCandidates] = useState<CandidateMember[]>([]);
  const [candidateKeyword, setCandidateKeyword] = useState("");

  // レポート用
  const [reportSearchCode, setReportSearchCode] = useState("");
  const [reportOrgType, setReportOrgType] = useState<OrgType>("matrix");
  const [purchaseSearchCode, setPurchaseSearchCode] = useState("");
  const [purchaseOrgType, setPurchaseOrgType] = useState<OrgType>("matrix");
  const [purchaseStartMonth, setPurchaseStartMonth] = useState("");
  const [purchaseEndMonth, setPurchaseEndMonth] = useState("");
  const [refStartDate, setRefStartDate] = useState("");
  const [refEndDate, setRefEndDate] = useState("");
  const [refSortType, setRefSortType] = useState("clean");

  // 会員コードを指定してツリーを直接取得（候補選択後などに使う）
  const fetchTreeByMemberCode = async (code: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSearchMessage(null);
    setCandidates([]);
    try {
      const params = new URLSearchParams({ type: orgType, memberCode: code });
      const res = await fetch(`/api/admin/mlm-organization/tree?${params}`);
      const data = await res.json();
      if (res.ok && !data.candidates) {
        setRootMember(data.root ?? null);
        setListData(data.list || []);
        setTotalCount(null);
        setViewMode("tree");
      } else {
        setErrorMsg(data.error ?? "会員が見つかりませんでした");
        setRootMember(null);
        setListData([]);
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSearchMessage(null);
    setCandidates([]);
    try {
      const params = new URLSearchParams({ type: orgType });
      const isSearchEmpty = !searchCode.trim();
      if (!isSearchEmpty) params.set(searchType, searchCode.trim());

      const res = await fetch(`/api/admin/mlm-organization/tree?${params}`);
      const data = await res.json();

      if (res.ok) {
        if (isSearchEmpty) {
          // 全体表示 → フラットリスト
          setRootMember(null);
          setListData(data.list || []);
          setTotalCount(data.totalCount ?? null);
          setSearchMessage(data.message ?? null);
          setViewMode("list");
        } else if (data.candidates) {
          // 複数候補 → 候補モーダルを表示
          setCandidates(data.candidates);
          setCandidateKeyword(searchCode.trim());
          setRootMember(null);
          setListData([]);
        } else {
          // 1件確定 → ツリー表示
          setRootMember(data.root ?? null);
          setListData(data.list || []);
          setTotalCount(null);
        }
      } else {
        setErrorMsg(data.error ?? "会員が見つかりませんでした");
        setRootMember(null);
        setListData([]);
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    }
    setLoading(false);
  };

  const handleDownloadDownlineReport = async () => {
    if (!reportSearchCode) { alert("対象会員コードを入力してください"); return; }
    try {
      const res = await fetch(`/api/admin/mlm-organization/downline-report?memberCode=${reportSearchCode}&type=${reportOrgType}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `downline_${reportSearchCode}_${reportOrgType}.csv`; a.click();
      } else { alert("レポート生成に失敗しました"); }
    } catch { alert("エラーが発生しました"); }
  };

  const handleDownloadPurchaseReport = async () => {
    if (!purchaseSearchCode || !purchaseStartMonth || !purchaseEndMonth) { alert("すべての項目を入力してください"); return; }
    try {
      const res = await fetch(`/api/admin/mlm-organization/purchase-report?memberCode=${purchaseSearchCode}&type=${purchaseOrgType}&startMonth=${purchaseStartMonth}&endMonth=${purchaseEndMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `purchase_${purchaseSearchCode}_${purchaseStartMonth}_${purchaseEndMonth}.csv`; a.click();
      } else { alert("レポート生成に失敗しました"); }
    } catch { alert("エラーが発生しました"); }
  };

  const handleDownloadReferralReport = async () => {
    if (!refStartDate || !refEndDate) { alert("期間を入力してください"); return; }
    try {
      const res = await fetch(`/api/admin/mlm-organization/referral-report?startDate=${refStartDate}&endDate=${refEndDate}&sortType=${refSortType}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `referral_${refStartDate}_${refEndDate}.csv`; a.click();
      } else { alert("レポート生成に失敗しました"); }
    } catch { alert("エラーが発生しました"); }
  };

  const getStatusBadgeColor = (status: string) => {
    const m: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800",
      autoship: "bg-blue-100 text-blue-800",
      withdrawn: "bg-red-100 text-red-800",
      midCancel: "bg-orange-100 text-orange-800",
      lapsed: "bg-gray-100 text-gray-800",
      suspended: "bg-yellow-100 text-yellow-800",
    };
    return m[status] ?? "bg-gray-100 text-gray-800";
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
            fetchTreeByMemberCode(code);
          }}
          onClose={() => setCandidates([])}
        />
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🌐 組織図・リスト</h1>
        <p className="mt-1 text-sm text-slate-500">会員コードを入力してツリーを表示。未入力で全会員リスト表示（最大500件）</p>
      </div>

      {/* 組織図表示エリア */}
      <div className="rounded-3xl bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800">組織図表示</h2>

        {/* 検索コントロール */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">検索タイプ</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
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
                searchType === "name" ? "例: 山田太郎" :
                searchType === "email" ? "例: user@example.com" : "例: 090-1234-5678"
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
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

        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition disabled:opacity-50"
        >
          {loading ? "🔍 検索中..." : "🔍 組織図を表示"}
        </button>

        {/* エラー */}
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* メッセージ */}
        {searchMessage && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            ℹ️ {searchMessage}（全体件数: {totalCount?.toLocaleString()}件）
          </div>
        )}

        {/* ─── ビジュアルツリー表示 ─── */}
        {viewMode === "tree" && rootMember && !loading && (
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">
                {orgType === "matrix" ? "🔷 マトリックス組織図" : "🔶 ユニレベル組織図"} — {rootMember.name}
              </span>
              {/* レベル凡例 */}
              <div className="flex gap-1 flex-wrap">
                {[0,1,2,3,4,5].map(lv => (
                  <span key={lv} className={`${LEVEL_COLOR[lv]} text-white text-[9px] px-1.5 py-0.5 rounded-full`}>LV.{lv}</span>
                ))}
              </div>
            </div>
            {/* スクロール可能なビジュアルツリー */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-auto" style={{ maxHeight: "70vh" }}>
              <VisualTree root={rootMember} />
            </div>
            <p className="text-xs text-slate-400 mt-2">※ ノード左上の −/+ ボタンで折りたたみ可能</p>
          </div>
        )}

        {/* ─── リスト表示 ─── */}
        {(viewMode === "list" || (viewMode === "tree" && !rootMember)) && listData.length > 0 && !loading && (
          <div className="mt-4">
            <div className="mb-3 text-sm font-bold text-slate-700">
              📋 リスト表示（{listData.length}件 / 全 {totalCount ?? listData.length}件）
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm min-w-[500px]">
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
                    <tr key={m.id} className="hover:bg-violet-50 transition">
                      <td className="px-4 py-2.5">
                        <span className={`${LEVEL_COLOR[m.level] ?? "bg-gray-400"} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                          LV.{m.level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{m.memberCode}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{m.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeColor(m.status)}`}>
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
          <div className="mt-6 rounded-2xl bg-slate-50 py-12 text-center text-slate-400 text-sm">
            🔍 会員コードを入力して「組織図を表示」ボタンを押してください
          </div>
        )}
      </div>

      {/* ─── ダウンラインレポート ─── */}
      <div className="rounded-3xl bg-white shadow-sm p-6 space-y-3">
        <h2 className="text-base font-bold text-slate-800">📥 ダウンラインレポート CSV出力</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象会員コード</label>
            <input type="text" value={reportSearchCode} onChange={(e) => setReportSearchCode(e.target.value)}
              placeholder="例: 10234001"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">組織区分</label>
            <div className="flex gap-2">
              <button onClick={() => setReportOrgType("matrix")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${reportOrgType === "matrix" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>マトリックス</button>
              <button onClick={() => setReportOrgType("unilevel")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${reportOrgType === "unilevel" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>ユニレベル</button>
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
      <div className="rounded-3xl bg-white shadow-sm p-6 space-y-3">
        <h2 className="text-base font-bold text-slate-800">🛒 購入レポート CSV出力</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">対象会員コード</label>
            <input type="text" value={purchaseSearchCode} onChange={(e) => setPurchaseSearchCode(e.target.value)}
              placeholder="例: 10234001"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
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
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${purchaseOrgType === "matrix" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>M</button>
              <button onClick={() => setPurchaseOrgType("unilevel")}
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${purchaseOrgType === "unilevel" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>U</button>
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
      <div className="rounded-3xl bg-white shadow-sm p-6 space-y-3">
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
