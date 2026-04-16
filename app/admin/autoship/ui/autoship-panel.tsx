"use client";

import { useState, useEffect, useCallback } from "react";

/* ───────────── 型定義 ───────────── */
type PaymentMethod = "credit_card" | "bank_transfer" | "bank_payment" | "cod" | "other";
type RunStatus = "draft" | "exported" | "imported" | "completed" | "canceled";
type OrderStatus = "pending" | "paid" | "failed" | "canceled";

interface AutoShipRun {
  id: string;
  targetMonth: string;
  paymentMethod: PaymentMethod;
  status: RunStatus;
  totalCount: number;
  paidCount: number;
  failedCount: number;
  totalAmount: number;
  exportedAt: string | null;
  importedAt: string | null;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
  orderCount: number;
}

interface AutoShipOrder {
  id: string;
  memberCode: string;
  memberName: string;
  memberNameKana: string | null;
  memberPhone: string | null;
  memberEmail: string | null;
  memberPostal: string | null;
  memberAddress: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  points: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paidAt: string | null;
  failReason: string | null;
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  deliveryNoteId: string | null;
}

interface RunDetail extends AutoShipRun {
  orders: AutoShipOrder[];
}

/* ───────────── 定数 ───────────── */
const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  draft: "下書き",
  exported: "CSV出力済",
  imported: "結果取込済",
  completed: "完了",
  canceled: "キャンセル",
};
const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  exported: "bg-blue-100 text-blue-700",
  imported: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  canceled: "bg-red-100 text-red-700",
};
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "未処理",
  paid: "決済完了",
  failed: "失敗",
  canceled: "キャンセル",
};
const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-gray-200 text-gray-500",
};
const PM_LABELS: Record<string, string> = {
  credit_card:   "💳 クレジットカード",
  bank_transfer: "🏦 口座引き落とし",
  bank_payment:  "🏧 銀行振込",
  cod:           "📦 代引き",
  other:         "📋 その他",
};

/* ───────────── ヘルパー ───────────── */
function fmtYen(n: number) {
  return n.toLocaleString("ja-JP") + "円";
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════════════════════════════════════════════════
   メインコンポーネント
═══════════════════════════════════════════════════════════ */
export default function AutoShipPanel() {
  const [runs, setRuns] = useState<AutoShipRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* 新規作成フォーム */
  const [creating, setCreating] = useState(false);
  const [newMonth, setNewMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [newPm, setNewPm] = useState<string>("credit_card");
  const [createLoading, setCreateLoading] = useState(false);

  /* 詳細モーダル */
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* 納品書印刷モーダル */
  const [printNotes, setPrintNotes] = useState<{ noteNumber: string; recipientName: string; recipientPostal: string | null; recipientAddress: string | null; productName: string; quantity: number; unitPrice: number; totalAmount: number }[]>([]);
  const [showPrint, setShowPrint] = useState(false);

  /* ファイルインポート */
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ paidCount: number; failedCount: number } | null>(null);

  /* 操作メッセージ */
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* ── 有効会員一覧表示 ── */
  const [memberListMonth, setMemberListMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [memberListPm, setMemberListPm] = useState<string>("credit_card");
  const [memberListData, setMemberListData] = useState<{
    id: string; memberCode: string; memberName: string; memberPhone: string | null; memberEmail: string | null; paymentMethod: string; autoshipStartDate: string | null; autoshipStopDate: string | null;
  }[]>([]);
  const [memberListLoading, setMemberListLoading] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);

  /* ── CSV直接インポート（外部ファイルから即アクティブ反映） ── */
  const [csvImportFile, setCsvImportFile] = useState<File | null>(null);
  const [csvImportMonth, setCsvImportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [csvImportPm, setCsvImportPm] = useState<string>("credit_card");
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{ paidCount: number; failedCount: number; newRunId?: string } | null>(null);

  /* ─── 一覧取得 ─── */
  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/autoship");
      if (!res.ok) throw new Error("取得失敗");
      setRuns(await res.json());
    } catch {
      setError("オートシップ一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  /* ─── 新規作成 ─── */
  async function handleCreate() {
    setCreateLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/autoship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMonth: newMonth, paymentMethod: newPm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成失敗");
      setMsg({ type: "success", text: `${newMonth} の伝票を ${data.totalCount} 件作成しました` });
      setCreating(false);
      loadRuns();
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "作成失敗" });
    } finally {
      setCreateLoading(false);
    }
  }

  /* ─── 詳細取得 ─── */
  async function openDetail(runId: string) {
    setDetailLoading(true);
    setDetail(null);
    setImportResult(null);
    setImportFile(null);
    try {
      const res = await fetch(`/api/admin/autoship/${runId}`);
      if (!res.ok) throw new Error("詳細取得失敗");
      setDetail(await res.json());
    } catch {
      setMsg({ type: "error", text: "詳細の取得に失敗しました" });
    } finally {
      setDetailLoading(false);
    }
  }

  /* ─── CSV出力（決済会社向け） ─── */
  function handleExportCsv(runId: string) {
    window.open(`/api/admin/autoship/${runId}/export-csv`, "_blank");
    // ページリロードで exportedAt 反映
    setTimeout(() => {
      if (detail?.id === runId) openDetail(runId);
      loadRuns();
    }, 1500);
  }

  /* ─── 結果CSVインポート ─── */
  async function handleImport(runId: string) {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch(`/api/admin/autoship/${runId}/import-result`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取込失敗");
      setImportResult({ paidCount: data.paidCount, failedCount: data.failedCount });
      setMsg({ type: "success", text: `取込完了: 成功 ${data.paidCount} 件 / 失敗 ${data.failedCount} 件` });
      openDetail(runId);
      loadRuns();
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "取込失敗" });
    } finally {
      setImportLoading(false);
    }
  }

  /* ─── 納品書自動生成 ─── */
  async function handleGenDeliveryNotes(runId: string) {
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/autoship/${runId}/delivery-notes`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失敗");
      setMsg({ type: "success", text: `納品書 ${data.count} 件を生成しました` });
      openDetail(runId);
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "納品書生成失敗" });
    }
  }

  /* ─── 納品書一覧取得して印刷モーダル表示 ─── */
  async function handlePrintNotes(runId: string) {
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/autoship/${runId}/delivery-notes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得失敗");
      setPrintNotes(data);
      setShowPrint(true);
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "納品書取得失敗" });
    }
  }

  /* ─── ヤマトCSV出力 ─── */
  function handleYamatoCsv(runId: string) {
    window.open(`/api/admin/autoship/${runId}/yamato-csv`, "_blank");
  }

  /* ─── 有効会員一覧取得 ─── */
  async function handleLoadMemberList() {
    setMemberListLoading(true);
    setMemberListData([]);
    setMsg(null);
    try {
      const params = new URLSearchParams({ targetMonth: memberListMonth });
      if (memberListPm) params.set("paymentMethod", memberListPm);
      const res = await fetch(`/api/admin/autoship/members?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得失敗");
      setMemberListData(data.members ?? []);
      setShowMemberList(true);
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "取得失敗" });
    } finally {
      setMemberListLoading(false);
    }
  }

  /* ─── CSV直接インポート（伝票作成 + 結果取込 を一括処理） ─── */
  async function handleDirectCsvImport() {
    if (!csvImportFile) return;
    setCsvImportLoading(true);
    setCsvImportResult(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", csvImportFile);
      fd.append("targetMonth", csvImportMonth);
      fd.append("paymentMethod", csvImportPm);
      const res = await fetch("/api/admin/autoship/import-direct", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "インポート失敗");
      setCsvImportResult({ paidCount: data.paidCount, failedCount: data.failedCount, newRunId: data.runId });
      setMsg({
        type: "success",
        text: `CSVインポート完了: 決済成功 ${data.paidCount} 件 / 失敗 ${data.failedCount} 件。当月アクティブ反映済み。`,
      });
      loadRuns();
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "インポート失敗" });
    } finally {
      setCsvImportLoading(false);
    }
  }

  /* ─── DB自動取込（ファイルなし：オートシップ有効会員を全員取込） ─── */
  async function handleAutoImportFromDb() {
    setCsvImportLoading(true);
    setCsvImportResult(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("targetMonth", csvImportMonth);
      fd.append("paymentMethod", csvImportPm);
      fd.append("noFile", "true");
      const res = await fetch("/api/admin/autoship/import-direct", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取込失敗");
      setCsvImportResult({ paidCount: data.paidCount, failedCount: data.failedCount, newRunId: data.runId });
      setMsg({
        type: "success",
        text: `DB自動取込完了: 対象月 ${csvImportMonth} のオートシップ有効会員 ${data.paidCount} 件を当月アクティブに反映しました。`,
      });
      loadRuns();
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "取込失敗" });
    } finally {
      setCsvImportLoading(false);
    }
  }

  /* ═══ レンダー ═══ */
  return (
    <div className="space-y-6">
      {/* ──── ヘッダー ──── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔄 オートシップ管理</h1>
          <p className="text-sm text-gray-500 mt-1">月次自動出荷の伝票作成・決済CSV出力・結果取込・納品書生成</p>
        </div>
        <button
          onClick={() => { setCreating(true); setMsg(null); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow transition"
        >
          ＋ 新規月次伝票作成
        </button>
      </div>

      {/* ──── ② 有効会員一覧 ──── */}
      <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-3">📋 オートシップ有効会員一覧（対象月・支払方法で絞り込み）</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">対象月</label>
            <input
              type="month"
              value={memberListMonth}
              onChange={e => setMemberListMonth(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">支払い方法</label>
            <select
              value={memberListPm}
              onChange={e => setMemberListPm(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">すべて</option>
              <option value="credit_card">💳 クレジットカード</option>
              <option value="bank_transfer">🏦 口座引き落とし</option>
              <option value="bank_payment">🏧 銀行振込</option>
              <option value="cod">📦 代引き</option>
              <option value="other">📋 その他</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLoadMemberList}
              disabled={memberListLoading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {memberListLoading ? "取得中…" : "🔍 会員一覧を表示"}
            </button>
          </div>
        </div>
        {showMemberList && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">
                対象: <strong>{memberListMonth}</strong> / {memberListPm ? PM_LABELS[memberListPm] ?? memberListPm : "すべての支払い方法"} — <strong>{memberListData.length}件</strong>
              </p>
              <button onClick={() => setShowMemberList(false)} className="text-xs text-gray-400 hover:text-gray-600">✕ 閉じる</button>
            </div>
            {memberListData.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase">
                      <th className="px-3 py-2 text-left">会員コード</th>
                      <th className="px-3 py-2 text-left">氏名</th>
                      <th className="px-3 py-2 text-left">電話</th>
                      <th className="px-3 py-2 text-left">メール</th>
                      <th className="px-3 py-2 text-left">支払い方法</th>
                      <th className="px-3 py-2 text-left">開始日</th>
                      <th className="px-3 py-2 text-left">停止日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memberListData.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono">{m.memberCode}</td>
                        <td className="px-3 py-2">{m.memberName}</td>
                        <td className="px-3 py-2 text-gray-500">{m.memberPhone ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{m.memberEmail ?? "—"}</td>
                        <td className="px-3 py-2">{PM_LABELS[m.paymentMethod] ?? m.paymentMethod}</td>
                        <td className="px-3 py-2 text-gray-500">{m.autoshipStartDate ? new Date(m.autoshipStartDate).toLocaleDateString("ja-JP") : "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{m.autoshipStopDate ? new Date(m.autoshipStopDate).toLocaleDateString("ja-JP") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">対象会員がいません</p>
            )}
          </div>
        )}
      </div>

      {/* ──── CSV直接インポート ──── */}
      <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-1">📂 CSVデータ取り込み（クレディックス / 三菱UFJファクター）</h2>
        <p className="text-xs text-gray-500 mb-3">
          決済会社から出力されたCSVをここで直接インポートできます。インポート後、決済成功会員を当月アクティブとして自動反映します。
          伝票が未作成の場合は自動作成されます。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">対象月</label>
            <input
              type="month"
              value={csvImportMonth}
              onChange={e => setCsvImportMonth(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">決済会社（支払い方法）</label>
            <select
              value={csvImportPm}
              onChange={e => setCsvImportPm(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="credit_card">💳 クレジットカード</option>
              <option value="bank_transfer">🏦 口座引き落とし</option>
              <option value="bank_payment">🏧 銀行振込</option>
              <option value="cod">📦 代引き</option>
              <option value="other">📋 その他</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CSVファイル選択</label>
            <input
              type="file"
              accept=".csv,.txt,text/plain,text/csv"
              onChange={e => setCsvImportFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:border-0 file:bg-green-50 file:text-green-700 file:rounded file:text-xs file:cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-0.5">CSV・TXTファイルに対応。クレディックスCSV（ID(sendid)列を含む）自動判定。</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200 mb-3">
          ⚠️ <strong>対応フォーマット</strong>:<br />
          <span className="font-semibold">① クレディックスCSV（自動判定）</span>: ヘッダーに「ID(sendid)」列を含む形式。ファイル内全行を決済成功として処理します。<br />
          <span className="font-semibold">② 汎用フォーマット</span>: ヘッダーに「会員コード（code）」「決済結果（result/status）」列が必要。
          結果コード: <code className="bg-yellow-100 px-1 rounded">OK</code>/<code className="bg-yellow-100 px-1 rounded">1</code> = 成功。
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDirectCsvImport}
            disabled={!csvImportFile || csvImportLoading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
          >
            {csvImportLoading ? "取り込み中…" : "📤 CSVをインポートして当月アクティブ反映"}
          </button>
          <button
            onClick={handleAutoImportFromDb}
            disabled={csvImportLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
            title="CSVファイルなし：DBのオートシップ有効会員を対象月・支払方法でフィルタして全員アクティブ反映"
          >
            {csvImportLoading ? "取り込み中…" : "🗄️ DB会員から当月アクティブ反映（CSVなし）"}
          </button>
        </div>
        {csvImportResult && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm border border-green-200">
            <p className="font-semibold text-green-800">✅ インポート完了</p>
            <p className="text-green-700">決済成功: <strong>{csvImportResult.paidCount}件</strong> / 失敗: <strong>{csvImportResult.failedCount}件</strong></p>
            {csvImportResult.newRunId && (
              <button
                onClick={() => openDetail(csvImportResult.newRunId!)}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                → 作成された伝票を確認
              </button>
            )}
          </div>
        )}
      </div>

      {/* ──── メッセージ ──── */}
      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.type === "success" ? "✅ " : "❌ "}{msg.text}
        </div>
      )}

      {/* ──── 新規作成パネル ──── */}
      {creating && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">新規月次オートシップ伝票作成</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">対象月</label>
              <input
                type="month"
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">支払い方法</label>
              <select
                value={newPm}
                onChange={e => setNewPm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="credit_card">💳 クレジットカード</option>
                <option value="bank_transfer">🏦 口座引き落とし</option>
                <option value="bank_payment">🏧 銀行振込</option>
                <option value="cod">📦 代引き</option>
                <option value="other">📋 その他</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200">
            ⚠️ オートシップ有効・当月停止・解約済みを除いた対象会員を自動抽出して伝票を作成します。
            支払い方法は「口座情報登録あり → 口座振替 / なし → クレジットカード」で自動振り分けされます。
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={createLoading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {createLoading ? "作成中…" : "伝票を作成する"}
            </button>
            <button onClick={() => setCreating(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ──── 一覧 ──── */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">読み込み中…</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-10 text-gray-400">オートシップ実行履歴がありません</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left">対象月</th>
                <th className="px-4 py-3 text-left">支払い方法</th>
                <th className="px-4 py-3 text-center">ステータス</th>
                <th className="px-4 py-3 text-right">件数</th>
                <th className="px-4 py-3 text-right">合計金額</th>
                <th className="px-4 py-3 text-left">CSV出力日時</th>
                <th className="px-4 py-3 text-left">取込日時</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.targetMonth}</td>
                  <td className="px-4 py-3 text-gray-600">{PM_LABELS[r.paymentMethod] ?? r.paymentMethod}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${RUN_STATUS_COLORS[r.status]}`}>
                      {RUN_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-700">{r.totalCount} 件</span>
                    {r.paidCount > 0 && <span className="ml-1 text-green-600 text-xs">({r.paidCount}成功)</span>}
                    {r.failedCount > 0 && <span className="ml-1 text-red-600 text-xs">({r.failedCount}失敗)</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtYen(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.exportedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.importedAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDetail(r.id)}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition"
                    >
                      詳細・操作
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ 詳細モーダル ══════════════ */}
      {(detail !== null || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {detail ? `${detail.targetMonth} / ${PM_LABELS[detail.paymentMethod] ?? detail.paymentMethod}` : "読み込み中…"}
              </h2>
              <button onClick={() => { setDetail(null); setImportFile(null); setImportResult(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {detailLoading && <div className="p-10 text-center text-gray-400">読み込み中…</div>}

            {detail && (
              <div className="p-6 space-y-6">
                {/* ステータスカード */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "ステータス", value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RUN_STATUS_COLORS[detail.status]}`}>{RUN_STATUS_LABELS[detail.status]}</span> },
                    { label: "対象件数", value: `${detail.totalCount} 件` },
                    { label: "合計金額", value: fmtYen(detail.totalAmount) },
                    { label: "成功/失敗", value: `${detail.paidCount} / ${detail.failedCount}` },
                  ].map(c => (
                    <div key={c.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                      <div className="text-sm font-semibold text-gray-800">{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* ─── ステップフロー ─── */}
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <h3 className="text-sm font-semibold text-indigo-800 mb-3">📋 処理ステップ</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {/* STEP1: CSV出力 */}
                    <div className={`flex-1 min-w-[120px] p-3 rounded-lg border ${detail.status === "draft" ? "bg-white border-indigo-300 shadow" : "bg-gray-50 border-gray-200"}`}>
                      <div className="font-semibold mb-1">
                        {detail.paymentMethod === "credit_card" ? "① Credix CSV出力" : "① 三菱UFJ CSV出力"}
                      </div>
                      <div className="text-gray-500 mb-2">決済会社に提出するCSVをダウンロード</div>
                      <button
                        onClick={() => handleExportCsv(detail.id)}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-xs font-medium"
                      >
                        📥 CSVダウンロード
                      </button>
                      {detail.exportedAt && <div className="mt-1 text-green-600">✓ {fmtDate(detail.exportedAt)}</div>}
                    </div>

                    <div className="self-center text-gray-400 text-lg">→</div>

                    {/* STEP2: 結果取込 */}
                    <div className={`flex-1 min-w-[160px] p-3 rounded-lg border ${detail.status === "exported" ? "bg-white border-indigo-300 shadow" : "bg-gray-50 border-gray-200"}`}>
                      <div className="font-semibold mb-1">② 決済結果取込</div>
                      <div className="text-gray-500 mb-2">決済会社から受け取った結果CSVをアップロード</div>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={e => setImportFile(e.target.files?.[0] ?? null)}
                        className="w-full text-xs mb-2 file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-gray-100 file:rounded file:text-xs"
                      />
                      <button
                        onClick={() => handleImport(detail.id)}
                        disabled={!importFile || importLoading}
                        className="w-full py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded transition text-xs font-medium"
                      >
                        {importLoading ? "取込中…" : "📤 結果を取込む"}
                      </button>
                      {importResult && (
                        <div className="mt-1 text-xs">
                          <span className="text-green-600">✓ 成功: {importResult.paidCount}</span>
                          {importResult.failedCount > 0 && <span className="ml-2 text-red-500">✗ 失敗: {importResult.failedCount}</span>}
                        </div>
                      )}
                      {detail.importedAt && <div className="mt-1 text-green-600 text-xs">✓ {fmtDate(detail.importedAt)}</div>}
                    </div>

                    <div className="self-center text-gray-400 text-lg">→</div>

                    {/* STEP3: 納品書生成 */}
                    <div className={`flex-1 min-w-[140px] p-3 rounded-lg border ${detail.status === "imported" ? "bg-white border-indigo-300 shadow" : "bg-gray-50 border-gray-200"}`}>
                      <div className="font-semibold mb-1">③ 納品書生成</div>
                      <div className="text-gray-500 mb-2">決済成功会員の納品書を自動作成</div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleGenDeliveryNotes(detail.id)}
                          className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded transition text-xs font-medium"
                        >
                          📄 納品書を生成
                        </button>
                        <button
                          onClick={() => handlePrintNotes(detail.id)}
                          className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded transition text-xs font-medium"
                        >
                          🖨️ 印刷プレビュー
                        </button>
                      </div>
                    </div>

                    <div className="self-center text-gray-400 text-lg">→</div>

                    {/* STEP4: ヤマトCSV */}
                    <div className={`flex-1 min-w-[120px] p-3 rounded-lg border bg-gray-50 border-gray-200`}>
                      <div className="font-semibold mb-1">④ ヤマトCSV出力</div>
                      <div className="text-gray-500 mb-2">B2クラウド取込用発送CSVをダウンロード</div>
                      <button
                        onClick={() => handleYamatoCsv(detail.id)}
                        className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded transition text-xs font-medium"
                      >
                        🚚 ヤマトCSV
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── 注文一覧 ─── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">注文明細 ({detail.orders.length}件)</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                          <th className="px-3 py-2 text-left">会員コード</th>
                          <th className="px-3 py-2 text-left">氏名</th>
                          <th className="px-3 py-2 text-left">電話</th>
                          <th className="px-3 py-2 text-right">金額</th>
                          <th className="px-3 py-2 text-center">ステータス</th>
                          <th className="px-3 py-2 text-left">決済日</th>
                          <th className="px-3 py-2 text-left">失敗理由</th>
                          <th className="px-3 py-2 text-center">納品書</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-gray-700">{o.memberCode}</td>
                            <td className="px-3 py-2 text-gray-800">
                              {o.memberName}
                              {o.memberNameKana && <div className="text-gray-400">{o.memberNameKana}</div>}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{o.memberPhone ?? "—"}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-800">{fmtYen(o.totalAmount)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                                {ORDER_STATUS_LABELS[o.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500">{o.paidAt ? fmtDate(o.paidAt) : "—"}</td>
                            <td className="px-3 py-2 text-red-500">{o.failReason ?? ""}</td>
                            <td className="px-3 py-2 text-center">
                              {o.deliveryNoteId ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ 納品書印刷モーダル ══════════════ */}
      {showPrint && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">📄 納品書印刷プレビュー ({printNotes.length}件)</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition"
                >
                  🖨️ 印刷
                </button>
                <button onClick={() => setShowPrint(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>
            </div>
            <div className="p-6 space-y-8 print:space-y-0" id="print-area">
              {printNotes.map((note, i) => (
                <div key={note.noteNumber} className="border rounded-xl p-6 print:break-after-page print:border-0">
                  <div className="text-right text-xs text-gray-500 mb-4">
                    納品書番号: <strong>{note.noteNumber}</strong>
                  </div>
                  <div className="text-center text-2xl font-bold mb-6 text-gray-800">納　品　書</div>
                  <div className="flex justify-between mb-6">
                    <div>
                      <div className="text-lg font-bold text-gray-800 border-b-2 border-gray-800 pb-1 mb-2">
                        〒{note.recipientPostal} {note.recipientAddress}
                      </div>
                      <div className="text-xl font-bold">{note.recipientName} 様</div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div className="font-bold text-base text-gray-800">CLAIRホールディングス株式会社</div>
                      <div>〒020-0026</div>
                      <div>岩手県盛岡市開運橋通5-6</div>
                      <div>第五菱和ビル5F</div>
                      <div>TEL: 019-681-3667</div>
                    </div>
                  </div>
                  <table className="w-full border-collapse text-sm mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left">品名</th>
                        <th className="border px-3 py-2 text-center">数量</th>
                        <th className="border px-3 py-2 text-right">単価</th>
                        <th className="border px-3 py-2 text-right">金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border px-3 py-2">{note.productName}</td>
                        <td className="border px-3 py-2 text-center">{note.quantity}</td>
                        <td className="border px-3 py-2 text-right">{fmtYen(note.unitPrice)}</td>
                        <td className="border px-3 py-2 text-right font-bold">{fmtYen(note.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-right text-lg font-bold text-gray-800">
                    合計金額: {fmtYen(note.totalAmount)} (税込)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
