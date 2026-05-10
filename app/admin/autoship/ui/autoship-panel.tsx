"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/** ブラウザ側 JST 今日の日付 "YYYY-MM-DD" */
function todayJST() {
  return new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
}
/** ブラウザ側 JST 今月の "YYYY-MM" */
function currentMonthJST() {
  const s = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m] = s.split("/");
  return `${y}-${m}`;
}

/* ───────────── 型定義 ───────────── */
type PaymentMethod = "credit_card" | "bank_transfer" | "bank_payment" | "cod" | "other";
type RunStatus = "draft" | "exported" | "importing" | "completed" | "canceled";
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
  importing: "結果取込済",
  completed: "完了",
  canceled: "キャンセル",
};
const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  exported: "bg-blue-100 text-blue-700",
  importing: "bg-yellow-100 text-yellow-700",
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

/* ───────────── 伝票作成用型定義 ───────────── */
type SlipItem = {
  productId: string;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  points: number;
  taxRate: number;
};

const SLIP_PAYMENT_METHODS = [
  { value: "", label: "未選択" },
  { value: "postal_transfer", label: "振替（郵便）" },
  { value: "bank_transfer", label: "振替（銀行）" },
  { value: "bank_payment", label: "振込み" },
  { value: "cod", label: "代引き" },
  { value: "card", label: "カード" },
  { value: "cash", label: "現金" },
  { value: "convenience", label: "コンビニ" },
  { value: "other", label: "その他" },
];

// 会員一覧検索時の支払方法（PaymentMethod enum）→ 伝票の支払方法（SLIP_PAYMENT_METHODS の value）への変換マップ
const MEMBER_PM_TO_SLIP_PM: Record<string, string> = {
  credit_card:   "card",
  bank_transfer: "bank_transfer",
  bank_payment:  "bank_payment",
  cod:           "cod",
  other:         "other",
};

const SLIP_TYPES_LIST = [
  { value: "autoship", label: "オートシップ" },
  { value: "normal", label: "通常" },
  { value: "new_member", label: "新規" },
  { value: "one_time", label: "都度購入" },
  { value: "additional", label: "追加" },
  { value: "subscription", label: "定期購入" },
];

function makeSlipForm(memberCode: string, memberName: string, memberPhone: string, memberPostal: string, memberAddress: string, today: string) {
  return {
    orderedAt: today,
    shippedAt: "",
    paidAt: "",
    slipType: "autoship",
    paymentMethod: "bank_transfer",
    deliveryDate: "",
    deliveryTime: "",
    bundleTargetId: memberCode,
    autoshipNo: "",
    deliverySlipNo: "",
    taxMethod: "external",
    paymentHolder: "",
    ordererMemberId: memberCode,
    ordererCompany: "",
    ordererName: memberName,
    ordererPostal: memberPostal.replace(/-/g, ""),
    ordererPrefecture: "",
    ordererCity: memberAddress,
    ordererBuilding: "",
    ordererPhone: memberPhone,
    ordererNote: "",
    ordererNoteSlip: "",
    detailName: "delivery",
    recipientCompany: "",
    recipientName: memberName,
    recipientPostal: memberPostal.replace(/-/g, ""),
    recipientPrefecture: "",
    recipientCity: memberAddress,
    recipientBuilding: "",
    recipientPhone: memberPhone,
    deliveryCenter: "",
    afterCreateOutbox: 0,
  };
}

/* ───────────── ヘルパー ───────────── */
function fmtYen(n: number) {
  return n.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) + "円";
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo",  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ─── 日本語日付セレクト ─── */
function SlipDatePicker({ value, onChange, allowEmpty = false }: {
  value: string; onChange: (v: string) => void; allowEmpty?: boolean;
}) {
  const jstParts = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).split("/");
  const curYear  = parseInt(jstParts[0]);
  const curMonth = parseInt(jstParts[1]);
  const curDay   = parseInt(jstParts[2]);
  const parts = value ? value.split("-") : [];
  const selYear  = parts[0] ? parseInt(parts[0]) : (allowEmpty ? 0 : curYear);
  const selMonth = parts[1] ? parseInt(parts[1]) : (allowEmpty ? 0 : curMonth);
  const selDay   = parts[2] ? parseInt(parts[2]) : (allowEmpty ? 0 : curDay);
  const daysInMonth = useMemo(() => {
    if (!selYear || !selMonth) return 31;
    return new Date(selYear, selMonth, 0).getDate();
  }, [selYear, selMonth]);
  const years  = Array.from({ length: 11 }, (_, i) => curYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const sc = "border border-gray-300 rounded px-1 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";
  function update(y: number, m: number, d: number) {
    if (allowEmpty && (!y || !m || !d)) { onChange(""); return; }
    const safeD = Math.min(d, new Date(y, m, 0).getDate());
    onChange(`${y}-${String(m).padStart(2,"0")}-${String(safeD).padStart(2,"0")}`);
  }
  return (
    <div className="flex items-center gap-0.5">
      <select value={selYear} onChange={e => update(Number(e.target.value), selMonth, selDay)} className={`${sc} w-16`}>
        {allowEmpty && <option value={0}>未設定</option>}
        {years.map(y => <option key={y} value={y}>{y}年</option>)}
      </select>
      <select value={selMonth} onChange={e => update(selYear, Number(e.target.value), selDay)} className={`${sc} w-12`}>
        {allowEmpty && <option value={0}>月</option>}
        {months.map(m => <option key={m} value={m}>{m}月</option>)}
      </select>
      <select value={selDay} onChange={e => update(selYear, selMonth, Number(e.target.value))} className={`${sc} w-12`}>
        {allowEmpty && <option value={0}>日</option>}
        {days.map(d => <option key={d} value={d}>{d}日</option>)}
      </select>
    </div>
  );
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
  const [newMonth, setNewMonth] = useState(() => currentMonthJST());
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
  const [memberListMonth, setMemberListMonth] = useState(() => currentMonthJST());
  const [memberListPm, setMemberListPm] = useState<string>("credit_card");
  const [memberListData, setMemberListData] = useState<{
    id: string; memberCode: string; memberName: string; memberPhone: string | null; memberEmail: string | null;
    memberPostal: string | null; memberAddress: string | null; companyName: string | null;
    paymentMethod: string; autoshipStartDate: string | null; autoshipStopDate: string | null;
  }[]>([]);
  const [memberListLoading, setMemberListLoading] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);

  /* ── 伝票作成モーダル（個別） ── */
  const [slipModalMember, setSlipModalMember] = useState<{
    memberCode: string; memberName: string; memberPhone: string | null;
    memberPostal: string | null; memberAddress: string | null;
  } | null>(null);
  const [slipProducts, setSlipProducts] = useState<{ id: string; product_code: string; name: string; price: number; pv: number }[]>([]);
  const [slipForm, setSlipForm] = useState<ReturnType<typeof makeSlipForm> | null>(null);
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [slipSubmitting, setSlipSubmitting] = useState(false);

  /* ── 一括選択・一括伝票作成 ── */
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [bulkSlipProducts, setBulkSlipProducts] = useState<{ id: string; product_code: string; name: string; price: number; pv: number }[]>([]);
  const [showBulkSlipModal, setShowBulkSlipModal] = useState(false);
  const [bulkSlipItems, setBulkSlipItems] = useState<SlipItem[]>([
    { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 },
  ]);
  const [bulkSlipType, setBulkSlipType] = useState("autoship");
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState("bank_transfer");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  /* ── CSV直接インポート（外部ファイルから即アクティブ反映） ── */
  const [csvImportFile, setCsvImportFile] = useState<File | null>(null);
  const [csvImportMonth, setCsvImportMonth] = useState(() => currentMonthJST());
  const [csvImportPm, setCsvImportPm] = useState<string>("credit_card");
  const [csvImportPmAutoDetected, setCsvImportPmAutoDetected] = useState(false);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{
    paidCount: number;
    failedCount: number;
    matchedCount?: number;
    unmatchedCount?: number;
    newRunId?: string;
    effectivePaymentMethod?: string;
    debug?: Record<string, unknown>;
    warnings?: string[];
    // 要件②⑦: 成功者・失敗者の詳細一覧（会員ID・氏名付き）
    successMembers?: { memberCode: string; memberName: string; paidDate: string | null; amount: number; resultText: string }[];
    failedMembers?:  { memberCode: string; memberName: string; creditIds: string[]; normCreditIds?: string[] }[];
    // CSV内で会員DBに照合できなかった決済ID一覧（DB未登録）
    unmatchedCsvIds?: { rawId: string; normId: string }[];
  } | null>(null);

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
      // 三菱UFJファクターTXTの場合はAPIサーバー側でbank_transferに自動修正されるが
      // フロントでも送信値を合わせる（ファイル名自動判定済みのcsvImportPmを使用）
      fd.append("paymentMethod", csvImportPm);
      const res = await fetch("/api/admin/autoship/import-direct", {
        method: "POST",
        body: fd,
      });
      // 空ボディ・HTML エラーページでも JSON.parse がクラッシュしないよう安全に解析
      const rawText = await res.text();
      let data: Record<string, unknown> = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch { /* ignore */ }
      if (!res.ok) throw new Error((data.error as string) ?? `サーバーエラー (${res.status})`);
      setCsvImportResult({
        paidCount:              data.paidCount as number,
        failedCount:            data.failedCount as number,
        matchedCount:           data.matchedCount as number | undefined,
        unmatchedCount:         data.unmatchedCount as number | undefined,
        newRunId:               data.runId as string | undefined,
        effectivePaymentMethod: data.effectivePaymentMethod as string | undefined,
        debug:                  data._debug as Record<string, unknown> | undefined,
        warnings:               data.warnings as string[] | undefined,
        successMembers:         data.successMembers as { memberCode: string; memberName: string; paidDate: string | null; amount: number; resultText: string }[] | undefined,
        failedMembers:          data.failedMembers  as { memberCode: string; memberName: string; creditIds: string[]; normCreditIds?: string[] }[] | undefined,
        unmatchedCsvIds:        data.unmatchedCsvIds as { rawId: string; normId: string }[] | undefined,
      });
      const pmLabel = data.effectivePaymentMethod === "bank_transfer" ? "口座引き落とし" :
                      data.effectivePaymentMethod === "credit_card"   ? "クレジットカード" :
                      (data.effectivePaymentMethod as string | undefined) ?? csvImportPm;
      const failedMemberCount = (data.failedMembers as unknown[] | undefined)?.length ?? (data.failedCount as number ?? 0);
      setMsg({
        type: "success",
        text: `CSVインポート完了: 決済成功 ${data.paidCount} 件 / 決済失敗 ${failedMemberCount} 件。支払い方法: ${pmLabel}。`,
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
      const rawText2 = await res.text();
      let data2: Record<string, unknown> = {};
      try { data2 = rawText2 ? JSON.parse(rawText2) : {}; } catch { /* ignore */ }
      if (!res.ok) throw new Error((data2.error as string) ?? `サーバーエラー (${res.status})`);
      setCsvImportResult({ paidCount: data2.paidCount as number, failedCount: data2.failedCount as number, newRunId: data2.runId as string | undefined });
      setMsg({
        type: "success",
        text: `DB自動取込完了: 対象月 ${csvImportMonth} のオートシップ有効会員 ${data2.paidCount} 件を当月アクティブに反映しました。`,
      });
      loadRuns();
    } catch (e: unknown) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "取込失敗" });
    } finally {
      setCsvImportLoading(false);
    }
  }

  /* ─── 商品マスター取得（伝票作成用） ─── */
  async function loadProducts(): Promise<{ id: string; product_code: string; name: string; price: number; pv: number }[]> {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.products ?? []).filter((p: { status: string }) => p.status === "active");
    } catch { return []; }
  }

  /* ─── 個別伝票作成モーダルを開く ─── */
  async function openSlipModal(m: { memberCode: string; memberName: string; memberPhone: string | null; memberPostal: string | null; memberAddress: string | null }) {
    const prods = await loadProducts();
    setSlipProducts(prods);
    setSlipModalMember(m);
    const today = todayJST();
    const form = makeSlipForm(m.memberCode, m.memberName, m.memberPhone || "", m.memberPostal || "", m.memberAddress || "", today);
    // 会員一覧の検索条件（memberListPm）から伝票の支払方法を自動セット
    const slipPm = MEMBER_PM_TO_SLIP_PM[memberListPm] ?? "bank_transfer";
    form.paymentMethod = slipPm;
    setSlipForm(form);
    setSlipItems([{ productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 }]);
  }

  /* ─── 個別伝票作成送信 ─── */
  async function handleSlipSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slipModalMember || !slipForm) return;
    const validItems = slipItems.filter(i => i.productId);
    if (validItems.length === 0) { alert("商品を1つ以上選択してください"); return; }
    setSlipSubmitting(true);
    try {
      const res = await fetch("/api/admin/mlm-members/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...slipForm, memberCode: slipModalMember.memberCode, items: validItems }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "伝票作成に失敗しました"); return; }
      alert(`伝票を作成しました\n注文番号: ${data.orderNumber}\n合計金額: ¥${data.totalAmount?.toLocaleString()}`);
      setSlipModalMember(null);
      setSlipForm(null);
    } finally {
      setSlipSubmitting(false);
    }
  }

  /* ─── チェックボックス操作 ─── */
  function toggleMember(id: string) {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAllMembers() {
    if (selectedMemberIds.size === memberListData.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(memberListData.map(m => m.id)));
    }
  }

  /* ─── 一括伝票作成モーダルを開く ─── */
  async function openBulkSlipModal() {
    if (selectedMemberIds.size === 0) { alert("会員を1人以上選択してください"); return; }
    const prods = await loadProducts();
    setBulkSlipProducts(prods);
    setBulkSlipItems([{ productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 }]);
    // 会員一覧の検索条件（memberListPm）から一括伝票の支払方法を自動セット
    const slipPm = MEMBER_PM_TO_SLIP_PM[memberListPm] ?? "bank_transfer";
    setBulkPaymentMethod(slipPm);
    setBulkResult(null);
    setShowBulkSlipModal(true);
  }

  /* ─── 一括伝票作成実行 ─── */
  async function handleBulkSlipCreate(e: React.FormEvent) {
    e.preventDefault();
    const validItems = bulkSlipItems.filter(i => i.productId);
    if (validItems.length === 0) { alert("商品を1つ以上選択してください"); return; }
    const targets = memberListData.filter(m => selectedMemberIds.has(m.id));
    if (targets.length === 0) return;
    setBulkSubmitting(true);
    setBulkResult(null);
    const today = todayJST();
    let success = 0, failed = 0;
    const errors: string[] = [];
    for (const m of targets) {
      try {
        const form = makeSlipForm(m.memberCode, m.memberName, m.memberPhone || "", m.memberPostal || "", m.memberAddress || "", today);
        form.slipType = bulkSlipType;
        form.paymentMethod = bulkPaymentMethod;
        const res = await fetch("/api/admin/mlm-members/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, memberCode: m.memberCode, items: validItems }),
        });
        const data = await res.json();
        if (!res.ok) { failed++; errors.push(`${m.memberName}(${m.memberCode}): ${data.error ?? "失敗"}`); }
        else success++;
      } catch (err) {
        failed++;
        errors.push(`${m.memberName}(${m.memberCode}): エラー`);
      }
    }
    setBulkResult({ success, failed, errors });
    setBulkSubmitting(false);
    if (success > 0) setMsg({ type: "success", text: `一括伝票作成完了: 成功 ${success}件 / 失敗 ${failed}件` });
  }

  /* ─── 商品選択ヘルパー ─── */
  function onSlipProductSelect(idx: number, productId: string, items: SlipItem[], setItems: React.Dispatch<React.SetStateAction<SlipItem[]>>, prods: typeof slipProducts) {
    const product = prods.find(p => p.id === productId);
    setItems(prev => prev.map((item, i) =>
      i === idx ? {
        ...item,
        productId: product?.id || "",
        productCode: product?.product_code || "",
        productName: product?.name || "",
        unitPrice: product?.price || 0,
        points: product?.pv || 0,
        taxRate: 10,
      } : item
    ));
  }

  function calcTotals(items: SlipItem[]) {
    const tax8total  = items.filter(i => i.taxRate === 8).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const tax10total = items.filter(i => i.taxRate === 10).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const tax8  = Math.floor(tax8total  * 0.08);
    const tax10 = Math.floor(tax10total * 0.10);
    return {
      tax8total, tax10total, tax8, tax10,
      totalAmount: tax8total + tax10total + tax8 + tax10,
      totalPoints: items.reduce((s, i) => s + i.points * i.quantity, 0),
    };
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
        <h2 className="text-base font-semibold text-gray-800 mb-1">📋 オートシップ有効会員一覧</h2>
        <p className="text-xs text-gray-500 mb-3">対象月を選択すると、支払方法ごとにグループ分けして継続購入が有効な会員を表示します。</p>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">支払い方法で絞り込み（任意）</label>
            <select
              value={memberListPm}
              onChange={e => setMemberListPm(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">すべて（支払方法別グループ表示）</option>
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
          <div className="mt-3 space-y-4">
            {/* ヘッダー行 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600">
                対象月: <strong>{memberListMonth}</strong>
                {memberListPm
                  ? <> ／ {PM_LABELS[memberListPm] ?? memberListPm}</>
                  : <span className="text-gray-400"> ／ すべての支払い方法</span>
                }
                　<strong className="text-blue-700">{memberListData.length}件</strong>
                {selectedMemberIds.size > 0 && (
                  <span className="ml-2 text-violet-700 font-semibold">（{selectedMemberIds.size}件選択中）</span>
                )}
              </p>
              <div className="flex gap-2">
                {selectedMemberIds.size > 0 && (
                  <button
                    onClick={openBulkSlipModal}
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    📋 選択した{selectedMemberIds.size}件の伝票を一括作成
                  </button>
                )}
                <button onClick={() => { setShowMemberList(false); setSelectedMemberIds(new Set()); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 border border-gray-200 rounded-lg">✕ 閉じる</button>
              </div>
            </div>

            {memberListData.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-lg border">対象会員がいません</p>
            ) : memberListPm ? (
              /* ── 支払方法指定：1テーブル表示 ── */
              <MemberTable
                members={memberListData}
                selectedIds={selectedMemberIds}
                onToggle={toggleMember}
                onToggleAll={toggleAllMembers}
                onSlip={openSlipModal}
                pmLabels={PM_LABELS}
                showPmCol={false}
              />
            ) : (
              /* ── 支払方法「すべて」：グループ別表示 ── */
              (() => {
                const PM_ORDER = ["credit_card", "bank_transfer", "bank_payment", "cod", "other"];
                const groups: Record<string, typeof memberListData> = {};
                memberListData.forEach(m => {
                  if (!groups[m.paymentMethod]) groups[m.paymentMethod] = [];
                  groups[m.paymentMethod].push(m);
                });
                const groupKeys = PM_ORDER.filter(k => groups[k]?.length > 0);
                return (
                  <div className="space-y-4">
                    {groupKeys.map(pm => {
                      const groupMembers = groups[pm];
                      const allSelected = groupMembers.every(m => selectedMemberIds.has(m.id));
                      const someSelected = groupMembers.some(m => selectedMemberIds.has(m.id));
                      function toggleGroup() {
                        setSelectedMemberIds(prev => {
                          const next = new Set(prev);
                          if (allSelected) groupMembers.forEach(m => next.delete(m.id));
                          else groupMembers.forEach(m => next.add(m.id));
                          return next;
                        });
                      }
                      return (
                        <div key={pm} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* グループヘッダー */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                onChange={toggleGroup}
                                className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                                title="グループ全選択/解除"
                              />
                              <span className="text-sm font-semibold text-gray-700">{PM_LABELS[pm] ?? pm}</span>
                              <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">{groupMembers.length}件</span>
                              {someSelected && (
                                <span className="text-xs text-violet-600 font-semibold">
                                  {groupMembers.filter(m => selectedMemberIds.has(m.id)).length}件選択中
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                // このグループの支払方法を検索条件にセットして伝票一括作成
                                setMemberListPm(pm);
                                setSelectedMemberIds(new Set(groupMembers.map(m => m.id)));
                              }}
                              className="text-xs text-violet-600 hover:text-violet-800 hover:underline"
                            >
                              このグループを全選択して一括伝票作成 →
                            </button>
                          </div>
                          {/* テーブル */}
                          <MemberTable
                            members={groupMembers}
                            selectedIds={selectedMemberIds}
                            onToggle={toggleMember}
                            onToggleAll={toggleGroup}
                            onSlip={openSlipModal}
                            pmLabels={PM_LABELS}
                            showPmCol={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* ──── CSV直接インポート ──── */}
      <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "'BIZ UDGothic', 'Noto Sans JP', sans-serif" }}>
          📂 クレディックスCSV取り込み（決済成功者・失敗者 判定）
        </h2>
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800 leading-relaxed">
          <p className="font-bold mb-1">📋 取り込みの仕組み</p>
          <p>管理側で決済IDを設定 → クレディックスに決済依頼 → <strong>決済成功者のみ</strong>がCSVに記載されて返送される</p>
          <p className="mt-1">→ このCSVを取り込み、<span className="text-green-700 font-bold">決済成功者</span>と<span className="text-red-600 font-bold">決済失敗者（CSVに記載なし ＝ 会員DBで検出）</span>を自動判定・一覧表示します</p>
          <div className="mt-2 p-2 bg-white rounded border border-blue-200 space-y-0.5">
            <p className="font-semibold text-blue-700">🔑 照合ルール（先頭0埋め違い廃止）</p>
            <p>• 照合キー: <strong>K列（ID(sendid)）</strong> のみ使用</p>
            <p>• 正規化: WCプレフィックス除去 → <strong className="text-green-700">先頭ゼロを全て除去（両方向）</strong>して比較</p>
            <p className="pl-3 text-[11px] text-gray-500" style={{ fontFamily: "'Courier New', monospace" }}>
              WC01485760 → 1485760　／　01485760 → 1485760　／　1485760 → 1485760　→ すべて一致✅
            </p>
            <p>• CSVとDB登録値で先頭ゼロの桁数が違っていても<strong>必ず一致</strong>します</p>
            <p>• 1会員に決済ID①②③が複数ある場合、<strong>いずれか1つでも</strong>CSVに存在すれば決済成功</p>
            <p>• <strong className="text-red-600">決済失敗者</strong>: 決済ID①②③が登録済みだがCSVに1件も一致しない会員（DB検出）</p>
          </div>
        </div>
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
              onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setCsvImportFile(f);
                // ファイル名から支払い方法を自動判定
                if (f) {
                  const name = f.name.toUpperCase();
                  // 三菱UFJファクター固定長TXT自動判定
                  // 実ファイル例: SIRRRDRFDL03_20260507223824.txt
                  //              SIRRDRDFDL03_20260507223224.txt
                  // パターン: SIR で始まり英字が続き DL を含む .txt ファイル
                  const isMufgFile = /^SIR[A-Z]{3,12}\d/.test(name) && name.endsWith(".TXT");
                  if (isMufgFile) {
                    setCsvImportPm("bank_transfer");
                    setCsvImportPmAutoDetected(true);
                  } else {
                    setCsvImportPmAutoDetected(false);
                  }
                } else {
                  setCsvImportPmAutoDetected(false);
                }
              }}
              className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:border-0 file:bg-green-50 file:text-green-700 file:rounded file:text-xs file:cursor-pointer"
            />
            {csvImportPmAutoDetected && (
              <p className="text-xs text-blue-600 mt-0.5 font-medium">
                🏦 三菱UFJファクターTXTを検出 → 支払い方法を「口座引き落とし」に自動切り替えました
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">CSV・TXTファイルに対応。三菱UFJファクターTXT（SIRR*.txt / SIRD*.txt 等）・クレディックスCSV自動判定。</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200 mb-3">
          ⚠️ <strong>対応フォーマット</strong>:<br />
          <span className="font-semibold">① 三菱UFJファクター固定長TXT（自動判定）</span>: ファイル名が <code className="bg-yellow-100 px-1 rounded">SIRR*.txt</code> / <code className="bg-yellow-100 px-1 rounded">SIRD*.txt</code> 等の形式。支払い方法は「口座引き落とし」に自動切り替えされます。<br />
          <span className="font-semibold">② クレディックスCSV - 社内送信用（自動判定）</span>: システムが出力した <code className="bg-yellow-100 px-1 rounded">顧客ID,会員コード,氏名,...</code> 形式のCSV。会員コードで直接照合し全件成功として処理します。<br />
          <span className="font-semibold">③ クレディックスCSV - 結果返送用（自動判定）</span>: クレディックスから届く <code className="bg-yellow-100 px-1 rounded">IPコード,オーダーNo,電話番号,決済日時,結果,...,ID(sendid),...</code> 形式。<strong>照合条件：MLM会員詳細の「クレジット①②③（クレディックス）」いずれかに決済IDが登録されている会員のみ対象。</strong> 照合キー：<strong>K列（ID(sendid)）の決済ID</strong>（「WC付き数字」または「数字のみ」）と会員の決済ID①②③を照合。照合完了後、AutoShipRun・AutoShipOrder・MlmPurchase・PointWallet を自動作成・更新します。<br />
          <span className="font-semibold">④ 汎用フォーマット</span>: ヘッダーに「会員コード（code）」「決済結果（result/status）」列が必要。
          結果コード: <code className="bg-yellow-100 px-1 rounded">OK</code>/<code className="bg-yellow-100 px-1 rounded">1</code> = 成功。
          <br /><br />
          📥 <strong>サンプルフォーマット</strong>:&nbsp;
          <a href="/csv-samples/credix_%E9%80%81%E4%BF%A1%E7%94%A8%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB.csv" download className="text-blue-600 underline">クレディックス送信用CSV</a>
          &nbsp;|&nbsp;
          <a href="/csv-samples/credix_%E7%B5%90%E6%9E%9C%E8%BF%94%E9%80%81%E7%94%A8%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB.csv" download className="text-blue-600 underline">クレディックス結果返送用CSV</a>
          &nbsp;|&nbsp;
          <a href="/csv-samples/mufg_%E9%80%81%E4%BF%A1%E7%94%A8%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB.csv" download className="text-blue-600 underline">三菱UFJ送信用CSV</a>
          &nbsp;|&nbsp;
          <a href="/csv-samples/mufg_TXT%E3%83%95%E3%82%A9%E3%83%BC%E3%83%9E%E3%83%83%E3%83%88%E8%AA%AC%E6%98%8E.txt" download className="text-blue-600 underline">三菱UFJ TXTフォーマット説明</a>
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
          <div className="mt-4 space-y-3">
            {/* ── サマリーカード ── */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
                <span className="text-white font-bold text-sm tracking-wide">📊 取込結果サマリー</span>
                {csvImportResult.effectivePaymentMethod && (
                  <span className="text-gray-300 text-xs font-mono">
                    {csvImportResult.effectivePaymentMethod === "bank_transfer" ? "🏦 口座引き落とし" :
                     csvImportResult.effectivePaymentMethod === "credit_card"   ? "💳 クレジットカード" :
                     csvImportResult.effectivePaymentMethod}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 bg-white">
                <div className="px-4 py-3 text-center">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">決済成功</div>
                  {/* ⑤ 要件: 0とOの判別が容易なフォント（スラッシュ付きゼロ）を使用 */}
                  <div className="text-2xl font-black text-green-600" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontVariantNumeric: "slashed-zero" }}>
                    {csvImportResult.paidCount}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">件</div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">決済失敗（DB検出）</div>
                  <div className="text-2xl font-black text-red-500" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontVariantNumeric: "slashed-zero" }}>
                    {csvImportResult.failedMembers?.length ?? csvImportResult.failedCount}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">件</div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">CSV未照合ID</div>
                  <div className="text-2xl font-black text-orange-500" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontVariantNumeric: "slashed-zero" }}>
                    {csvImportResult.unmatchedCount ?? 0}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">件</div>
                </div>
              </div>
              {csvImportResult.newRunId && (
                <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100">
                  <button
                    onClick={() => openDetail(csvImportResult.newRunId!)}
                    className="text-xs text-indigo-700 hover:underline font-medium"
                  >
                    → 作成された伝票を確認（Run ID: {csvImportResult.newRunId}）
                  </button>
                </div>
              )}
            </div>

            {/* ── 決済成功者一覧（要件②⑦） ── */}
            {csvImportResult.successMembers && csvImportResult.successMembers.length > 0 && (
              <div className="rounded-xl border border-green-200 overflow-hidden">
                <div className="bg-green-700 px-4 py-2 flex items-center gap-2">
                  <span className="text-white font-bold text-sm">✅ 決済成功者一覧</span>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>
                    {csvImportResult.successMembers.length}件
                  </span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-green-50 sticky top-0 z-10" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace" }}>
                      <tr className="text-green-800 text-[11px] uppercase tracking-wide">
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">会員ID</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">氏名</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">決済金額</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">決済日時</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">結果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-100 bg-white">
                      {csvImportResult.successMembers.map((m, i) => (
                        <tr key={m.memberCode} className="hover:bg-green-50">
                          <td className="px-3 py-1.5 text-gray-400 text-[11px]" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>{i + 1}</td>
                          <td className="px-3 py-1.5">
                            <span className="font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 text-[11px] select-all" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace", letterSpacing: "0.04em" }}>
                              {m.memberCode}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-gray-800 whitespace-nowrap">{m.memberName}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-gray-700 whitespace-nowrap" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>
                            {m.amount > 0 ? `¥${m.amount.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap text-[11px]" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>
                            {m.paidDate ? new Date(m.paidDate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-green-600 whitespace-nowrap">
                            {m.resultText || "決済完了"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 決済失敗者一覧（要件①②③④） ── */}
            {csvImportResult.failedMembers && csvImportResult.failedMembers.length > 0 && (
              <div className="rounded-xl border border-red-200 overflow-hidden">
                <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
                  <span className="text-white font-bold text-sm">❌ 決済失敗者一覧</span>
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>
                    {csvImportResult.failedMembers.length}件
                  </span>
                  <span className="text-red-200 text-[11px] ml-auto">会員DBで検出：決済ID①②③は登録済みだがCSVに不在（未決済）</span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-red-50 sticky top-0 z-10" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace" }}>
                      <tr className="text-red-800 text-[11px] uppercase tracking-wide">
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">会員ID</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">氏名</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">登録決済ID①②③（DB登録値）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 bg-white">
                      {csvImportResult.failedMembers.map((m, i) => (
                        <tr key={m.memberCode} className="hover:bg-red-50">
                          <td className="px-3 py-1.5 text-gray-400 text-[11px]" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>{i + 1}</td>
                          <td className="px-3 py-1.5">
                            <span className="font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-[11px] select-all" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace", letterSpacing: "0.04em" }}>
                              {m.memberCode}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-gray-800 whitespace-nowrap">{m.memberName}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {m.creditIds.map((id, j) => (
                                <span key={j} className="text-[11px] bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-gray-700 select-all" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace", letterSpacing: "0.05em" }}>
                                  {id}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CSV未照合ID一覧（会員DB未登録）── */}
            {csvImportResult.unmatchedCsvIds && csvImportResult.unmatchedCsvIds.length > 0 && (
              <div className="rounded-xl border border-orange-200 overflow-hidden">
                <div className="bg-orange-500 px-4 py-2 flex items-center gap-2">
                  <span className="text-white font-bold text-sm">🔍 CSV未照合ID一覧</span>
                  <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>
                    {csvImportResult.unmatchedCsvIds.length}件
                  </span>
                  <span className="text-orange-100 text-[11px] ml-auto">CSVに存在するが会員DBの決済ID①②③に未登録</span>
                </div>
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-orange-50 sticky top-0 z-10" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace" }}>
                      <tr className="text-orange-800 text-[11px] uppercase tracking-wide">
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">CSV元の値（K列）</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">正規化後（照合キー）</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">対処</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100 bg-white">
                      {csvImportResult.unmatchedCsvIds.map((u, i) => (
                        <tr key={i} className="hover:bg-orange-50">
                          <td className="px-3 py-1.5 text-gray-400 text-[11px]" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace" }}>{i + 1}</td>
                          <td className="px-3 py-1.5">
                            <span className="font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 text-[11px] select-all" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace", letterSpacing: "0.05em", fontVariantNumeric: "slashed-zero" }}>
                              {u.rawId}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="text-[11px] text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 select-all" style={{ fontFamily: "'Courier New', 'Noto Sans Mono', monospace", fontVariantNumeric: "slashed-zero" }}>
                              {u.normId}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-gray-500">
                            MLM会員詳細 → クレジット①②③に登録
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 警告 ── */}
            {csvImportResult.warnings && csvImportResult.warnings.length > 0 && (
              <details className="rounded-xl border border-yellow-200 overflow-hidden">
                <summary className="bg-yellow-50 px-4 py-2 cursor-pointer text-xs text-yellow-700 font-semibold hover:bg-yellow-100 flex items-center gap-2">
                  ⚠️ 警告情報（{csvImportResult.warnings.length}件）
                </summary>
                <div className="p-3 bg-yellow-50 text-xs text-yellow-700 space-y-1">
                  {csvImportResult.warnings.map((w, i) => (
                    <div key={i} className="break-all leading-relaxed">{w}</div>
                  ))}
                </div>
              </details>
            )}

            {/* ── デバッグ情報 ── */}
            {csvImportResult.debug && (
              <details className="rounded-xl border border-gray-200 overflow-hidden">
                <summary className="bg-gray-50 px-4 py-2 cursor-pointer text-xs text-gray-500 hover:bg-gray-100 flex items-center gap-2">
                  🔍 デバッグ情報（クリックで展開）
                </summary>
                <div className="p-3 bg-gray-50 text-xs font-mono text-gray-600 space-y-1">
                  <div>CSV決済ID数: <strong>{String(csvImportResult.debug.csvIdCount ?? "-")}</strong> / 会員数: <strong>{String(csvImportResult.debug.memberCount ?? "-")}</strong> / 照合マップ: <strong>{String(csvImportResult.debug.cardIdMapSize ?? "-")}</strong></div>
                  <div>照合件数: <strong>{String(csvImportResult.debug.matchedCount ?? "-")}</strong> / 成功: <strong>{String(csvImportResult.debug.paidCount ?? "-")}</strong> / 失敗: <strong>{String(csvImportResult.debug.failedCount ?? "-")}</strong></div>
                  <div>CSV未照合: <strong>{String(csvImportResult.debug.csvUnmatchedCount ?? "-")}</strong> / 会員DB失敗者: <strong>{String(csvImportResult.debug.failedMemberCount ?? "-")}</strong></div>
                  {csvImportResult.unmatchedCsvIds && csvImportResult.unmatchedCsvIds.length > 0 && (
                    <div className="text-orange-600 mt-1 break-all">
                      未照合ID（正規化後）: {csvImportResult.unmatchedCsvIds.map(u => u.normId).join(", ")}
                    </div>
                  )}
                </div>
              </details>
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
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition"
                      >
                        詳細・操作
                      </button>
                      <button
                        onClick={async () => {
                          const label = `${r.targetMonth} / ${PM_LABELS[r.paymentMethod] ?? r.paymentMethod}`;
                          const hasOrders = r.totalCount > 0;
                          const confirmMsg = hasOrders
                            ? `「${label}」を削除しますか？\n\n関連する注文 ${r.totalCount} 件も一緒に削除されます。\nこの操作は取り消せません。`
                            : `「${label}」を削除しますか？`;
                          if (!confirm(confirmMsg)) return;
                          try {
                            const res = await fetch(`/api/admin/autoship/${r.id}`, { method: "DELETE" });
                            if (!res.ok) { const d = await res.json(); alert(d.error ?? "削除失敗"); return; }
                            setMsg({ type: "success", text: `「${label}」を削除しました` });
                            if (detail?.id === r.id) setDetail(null);
                            loadRuns();
                          } catch { alert("削除に失敗しました"); }
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition"
                        title="このRunと関連注文を削除（再インポート時などに使用）"
                      >
                        🗑️ 削除
                      </button>
                    </div>
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
                    <div className={`flex-1 min-w-[140px] p-3 rounded-lg border ${detail.status === "importing" ? "bg-white border-indigo-300 shadow" : "bg-gray-50 border-gray-200"}`}>
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

                {/* ─── 注文一覧（成功・失敗 分割表示）─── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">注文明細 ({detail.orders.length}件)</h3>

                  {/* 成功者テーブル */}
                  {detail.orders.filter(o => o.status === "paid").length > 0 && (
                    <div className="mb-4 rounded-xl border border-green-200 overflow-hidden">
                      <div className="bg-green-700 px-4 py-2 flex items-center gap-2">
                        <span className="text-white font-bold text-xs">✅ 決済成功者</span>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontVariantNumeric: "slashed-zero" }}>
                          {detail.orders.filter(o => o.status === "paid").length}件
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontSize: "12px", fontVariantNumeric: "slashed-zero" }}>
                          <thead>
                            <tr className="bg-green-50 text-green-800 text-[11px] uppercase tracking-wide">
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">会員コード</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">氏名</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">電話番号</th>
                              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">決済金額</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">決済日時</th>
                              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">納品書</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-green-100 bg-white">
                            {detail.orders.filter(o => o.status === "paid").map((o, idx) => (
                              <tr key={o.id} className="hover:bg-green-50">
                                <td className="px-3 py-2 text-gray-400 text-[11px]">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  <span className="font-mono font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 text-[11px] select-all">
                                    {o.memberCode}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                                  {o.memberName}
                                  {o.memberNameKana && <div className="text-gray-400 text-[10px] font-normal">{o.memberNameKana}</div>}
                                </td>
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{o.memberPhone ?? "—"}</td>
                                <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">
                                  {fmtYen(o.totalAmount)}
                                </td>
                                <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]">
                                  {o.paidAt ? fmtDate(o.paidAt) : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {o.deliveryNoteId
                                    ? <span className="text-green-600 font-bold">✓</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 失敗者テーブル */}
                  {detail.orders.filter(o => o.status === "failed").length > 0 && (
                    <div className="mb-4 rounded-xl border border-red-200 overflow-hidden">
                      <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
                        <span className="text-white font-bold text-xs">❌ 決済失敗者</span>
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontVariantNumeric: "slashed-zero" }}>
                          {detail.orders.filter(o => o.status === "failed").length}件
                        </span>
                        <span className="text-red-200 text-[11px] ml-auto">会員DB検出：CSV未照合（未決済）</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontSize: "12px", fontVariantNumeric: "slashed-zero" }}>
                          <thead>
                            <tr className="bg-red-50 text-red-800 text-[11px] uppercase tracking-wide">
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">会員コード</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">氏名</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">電話番号</th>
                              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">金額</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">失敗理由</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100 bg-white">
                            {detail.orders.filter(o => o.status === "failed").map((o, idx) => (
                              <tr key={o.id} className="hover:bg-red-50">
                                <td className="px-3 py-2 text-gray-400 text-[11px]">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-[11px] select-all">
                                    {o.memberCode}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                                  {o.memberName}
                                  {o.memberNameKana && <div className="text-gray-400 text-[10px] font-normal">{o.memberNameKana}</div>}
                                </td>
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{o.memberPhone ?? "—"}</td>
                                <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">
                                  {fmtYen(o.totalAmount)}
                                </td>
                                <td className="px-3 py-2 text-red-600 whitespace-nowrap">
                                  {o.failReason || "CSVに記載なし（決済失敗）"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 未処理・その他 */}
                  {detail.orders.filter(o => o.status !== "paid" && o.status !== "failed").length > 0 && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gray-700 px-4 py-2 flex items-center gap-2">
                        <span className="text-white font-bold text-xs">⏳ 未処理・その他</span>
                        <span className="bg-gray-100 text-gray-800 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                          {detail.orders.filter(o => o.status !== "paid" && o.status !== "failed").length}件
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full" style={{ fontFamily: "'Courier New', 'Lucida Console', 'Noto Sans Mono', monospace", fontSize: "12px", fontVariantNumeric: "slashed-zero" }}>
                          <thead>
                            <tr className="bg-gray-50 text-gray-600 text-[11px] uppercase tracking-wide">
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">会員コード</th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">氏名</th>
                              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">金額</th>
                              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">ステータス</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {detail.orders.filter(o => o.status !== "paid" && o.status !== "failed").map((o, idx) => (
                              <tr key={o.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-400 text-[11px]">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  <span className="font-mono font-bold text-gray-600 bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 text-[11px] select-all">
                                    {o.memberCode}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{o.memberName}</td>
                                <td className="px-3 py-2 text-right text-gray-600">{fmtYen(o.totalAmount)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                                    {ORDER_STATUS_LABELS[o.status]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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

      {/* ══════════════ 個別伝票作成モーダル ══════════════ */}
      {slipModalMember && slipForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-violet-600 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-white">📋 伝票作成</h2>
                <p className="text-violet-200 text-xs mt-0.5">{slipModalMember.memberName}（{slipModalMember.memberCode}）</p>
              </div>
              <button onClick={() => { setSlipModalMember(null); setSlipForm(null); }} className="text-white hover:text-violet-200 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSlipSubmit} className="p-5 space-y-4">
              {/* ── ヘッダー情報 */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-medium w-20 shrink-0">注文日</span>
                    <SlipDatePicker value={slipForm.orderedAt} onChange={v => setSlipForm(f => f ? { ...f, orderedAt: v } : f)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium w-20 shrink-0">発送日</span>
                    <SlipDatePicker value={slipForm.shippedAt} onChange={v => setSlipForm(f => f ? { ...f, shippedAt: v } : f)} allowEmpty />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium w-20 shrink-0">入金日</span>
                    <SlipDatePicker value={slipForm.paidAt} onChange={v => setSlipForm(f => f ? { ...f, paidAt: v } : f)} allowEmpty />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-medium w-20 shrink-0">支払方法</span>
                    <select value={slipForm.paymentMethod} onChange={e => setSlipForm(f => f ? { ...f, paymentMethod: e.target.value } : f)}
                      className="border rounded px-2 py-1 text-xs bg-blue-50 w-full">
                      {SLIP_PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium w-20 shrink-0">伝票種別</span>
                    <select value={slipForm.slipType} onChange={e => setSlipForm(f => f ? { ...f, slipType: e.target.value } : f)}
                      className="border rounded px-2 py-1 text-xs bg-white w-full">
                      {SLIP_TYPES_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium w-20 shrink-0">配達希望日</span>
                    <SlipDatePicker value={slipForm.deliveryDate} onChange={v => setSlipForm(f => f ? { ...f, deliveryDate: v } : f)} allowEmpty />
                  </div>
                </div>
              </div>
              {/* ── 配送先情報（簡易）*/}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">注文者情報</div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-medium w-20 shrink-0">氏名</span>
                      <input value={slipForm.ordererName} onChange={e => setSlipForm(f => f ? { ...f, ordererName: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full bg-blue-50" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">郵便番号</span>
                      <input value={slipForm.ordererPostal} onChange={e => setSlipForm(f => f ? { ...f, ordererPostal: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" placeholder="例:1234567" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">住所</span>
                      <input value={slipForm.ordererCity} onChange={e => setSlipForm(f => f ? { ...f, ordererCity: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">電話番号</span>
                      <input value={slipForm.ordererPhone} onChange={e => setSlipForm(f => f ? { ...f, ordererPhone: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">備考</span>
                      <input value={slipForm.ordererNote} onChange={e => setSlipForm(f => f ? { ...f, ordererNote: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" />
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>配送先</span>
                    <button type="button" className="text-blue-600 hover:underline text-[10px]"
                      onClick={() => setSlipForm(f => f ? { ...f, recipientName: f.ordererName, recipientPostal: f.ordererPostal, recipientCity: f.ordererCity, recipientPhone: f.ordererPhone } : f)}>
                      注文者からコピー
                    </button>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">氏名</span>
                      <input value={slipForm.recipientName} onChange={e => setSlipForm(f => f ? { ...f, recipientName: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">郵便番号</span>
                      <input value={slipForm.recipientPostal} onChange={e => setSlipForm(f => f ? { ...f, recipientPostal: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" placeholder="例:1234567" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">住所</span>
                      <input value={slipForm.recipientCity} onChange={e => setSlipForm(f => f ? { ...f, recipientCity: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium w-20 shrink-0">電話番号</span>
                      <input value={slipForm.recipientPhone} onChange={e => setSlipForm(f => f ? { ...f, recipientPhone: e.target.value } : f)}
                        className="border rounded px-2 py-1 text-xs w-full" />
                    </div>
                  </div>
                </div>
              </div>
              {/* ── 商品テーブル */}
              <SlipItemsTable
                items={slipItems} setItems={setSlipItems}
                products={slipProducts}
                onProductSelect={(idx, pid) => onSlipProductSelect(idx, pid, slipItems, setSlipItems, slipProducts)}
                calcTotals={calcTotals}
              />
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setSlipModalMember(null); setSlipForm(null); }}
                  className="px-5 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={slipSubmitting}
                  className="px-8 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50">
                  {slipSubmitting ? "作成中…" : "伝票を作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ 一括伝票作成モーダル ══════════════ */}
      {showBulkSlipModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-violet-700 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-white">📋 一括伝票作成</h2>
                <p className="text-violet-200 text-xs mt-0.5">選択した {selectedMemberIds.size} 件の会員に同じ商品で伝票を作成します</p>
              </div>
              <button onClick={() => setShowBulkSlipModal(false)} className="text-white hover:text-violet-200 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleBulkSlipCreate} className="p-5 space-y-4">
              {/* 対象会員一覧 */}
              <div className="bg-gray-50 rounded-lg p-3 text-xs border">
                <p className="font-semibold text-gray-700 mb-2">対象会員（{selectedMemberIds.size}件）</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {memberListData.filter(m => selectedMemberIds.has(m.id)).map(m => (
                    <span key={m.id} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[11px]">
                      {m.memberName}
                    </span>
                  ))}
                </div>
              </div>
              {/* 共通設定 */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-medium w-20 shrink-0">支払方法</span>
                  <select value={bulkPaymentMethod} onChange={e => setBulkPaymentMethod(e.target.value)}
                    className="border rounded px-2 py-1 text-xs bg-blue-50 w-full">
                    {SLIP_PAYMENT_METHODS.filter(p => p.value).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium w-20 shrink-0">伝票種別</span>
                  <select value={bulkSlipType} onChange={e => setBulkSlipType(e.target.value)}
                    className="border rounded px-2 py-1 text-xs bg-white w-full">
                    {SLIP_TYPES_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {/* 商品テーブル */}
              <SlipItemsTable
                items={bulkSlipItems} setItems={setBulkSlipItems}
                products={bulkSlipProducts}
                onProductSelect={(idx, pid) => onSlipProductSelect(idx, pid, bulkSlipItems, setBulkSlipItems, bulkSlipProducts)}
                calcTotals={calcTotals}
              />
              {/* 結果表示 */}
              {bulkResult && (
                <div className={`p-3 rounded-lg text-sm border ${bulkResult.failed === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}>
                  <p className="font-semibold">✅ 一括作成完了: 成功 {bulkResult.success}件 / 失敗 {bulkResult.failed}件</p>
                  {bulkResult.errors.length > 0 && (
                    <ul className="mt-1 text-xs list-disc list-inside space-y-0.5">
                      {bulkResult.errors.map((e, i) => <li key={i} className="text-red-600">{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowBulkSlipModal(false)}
                  className="px-5 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">閉じる</button>
                <button type="submit" disabled={bulkSubmitting}
                  className="px-8 py-2 bg-violet-700 text-white text-sm font-bold rounded-lg hover:bg-violet-800 disabled:opacity-50">
                  {bulkSubmitting ? `作成中… (${bulkResult ? bulkResult.success + bulkResult.failed : 0}/${selectedMemberIds.size})` : `${selectedMemberIds.size}件まとめて伝票作成`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 有効会員テーブルコンポーネント ─── */
type MemberRow = {
  id: string; memberCode: string; memberName: string; memberPhone: string | null;
  memberEmail: string | null; memberPostal: string | null; memberAddress: string | null;
  companyName: string | null; paymentMethod: string;
  autoshipStartDate: string | null; autoshipStopDate: string | null;
};

function MemberTable({
  members, selectedIds, onToggle, onToggleAll, onSlip, pmLabels, showPmCol,
}: {
  members: MemberRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSlip: (m: MemberRow) => void;
  pmLabels: Record<string, string>;
  showPmCol: boolean;
}) {
  const allSelected = members.length > 0 && members.every(m => selectedIds.has(m.id));

  function fmtD(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
            <th className="px-3 py-2 text-center w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                title="全て選択/解除"
              />
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">会員コード</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">氏名／法人名</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">電話</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">メール</th>
            {showPmCol && <th className="px-3 py-2 text-left whitespace-nowrap">支払い方法</th>}
            <th className="px-3 py-2 text-left whitespace-nowrap">開始日</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">停止日</th>
            <th className="px-3 py-2 text-center whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map(m => (
            <tr key={m.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.has(m.id) ? "bg-blue-50" : "bg-white"}`}>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => onToggle(m.id)}
                  className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                />
              </td>
              <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">{m.memberCode}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <button
                  onClick={() => onSlip(m)}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-left"
                >
                  {m.memberName}
                </button>
                {m.companyName && m.companyName !== m.memberName && (
                  <div className="text-gray-400 text-[10px]">{m.companyName}</div>
                )}
              </td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{m.memberPhone ?? "—"}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap max-w-[160px] truncate">{m.memberEmail ?? "—"}</td>
              {showPmCol && (
                <td className="px-3 py-2 whitespace-nowrap">{pmLabels[m.paymentMethod] ?? m.paymentMethod}</td>
              )}
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                {m.autoshipStartDate
                  ? <span className="text-green-700 font-medium">{fmtD(m.autoshipStartDate)}</span>
                  : <span className="text-amber-600 text-[11px]">即時有効</span>
                }
              </td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                {m.autoshipStopDate
                  ? <span className="text-red-500">{fmtD(m.autoshipStopDate)}</span>
                  : <span className="text-gray-300">—</span>
                }
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => onSlip(m)}
                  className="px-2 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded text-xs font-medium whitespace-nowrap"
                >
                  📋 伝票作成
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── 商品テーブルコンポーネント（伝票作成共通）─── */
function SlipItemsTable({
  items, setItems, products, onProductSelect, calcTotals
}: {
  items: SlipItem[];
  setItems: React.Dispatch<React.SetStateAction<SlipItem[]>>;
  products: { id: string; product_code: string; name: string; price: number; pv: number }[];
  onProductSelect: (idx: number, productId: string) => void;
  calcTotals: (items: SlipItem[]) => { tax8: number; tax10: number; totalAmount: number; totalPoints: number; tax8total: number; tax10total: number };
}) {
  const totals = calcTotals(items);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-white px-3 py-1.5 text-xs font-bold">商品</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[500px]">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left w-8"></th>
              <th className="px-2 py-2 text-left">商品</th>
              <th className="px-2 py-2 text-right w-24">価格</th>
              <th className="px-2 py-2 text-center w-16">個数</th>
              <th className="px-2 py-2 text-right w-20">ポイント</th>
              <th className="px-2 py-2 text-right w-24">小計</th>
              <th className="px-2 py-2 text-center w-20">税率</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="px-2 py-1.5 text-center">
                  <button type="button"
                    onClick={() => setItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))}
                    className="text-gray-300 hover:text-red-500 text-sm font-bold">×</button>
                </td>
                <td className="px-2 py-1.5">
                  <select value={item.productId} onChange={e => onProductSelect(idx, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full focus:ring-1 focus:ring-blue-400">
                    <option value=""></option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_code} - {p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} value={item.unitPrice}
                    onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={1} value={item.quantity}
                    onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs text-center w-full bg-white" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} value={item.points}
                    onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, points: Number(e.target.value) } : it))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white" />
                </td>
                <td className="px-2 py-1.5 text-right font-medium">{(item.unitPrice * item.quantity).toLocaleString()}</td>
                <td className="px-2 py-1.5">
                  <select value={item.taxRate}
                    onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, taxRate: Number(e.target.value) } : it))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full">
                    <option value={10}>10%</option>
                    <option value={8}>8%</option>
                    <option value={0}>非課税</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 flex gap-2 bg-gray-50">
        <button type="button"
          onClick={() => setItems(prev => [...prev, { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 }])}
          className="w-7 h-7 bg-green-500 text-white rounded font-bold text-sm hover:bg-green-600 flex items-center justify-center">+</button>
        <button type="button"
          onClick={() => setItems(prev => prev.length > 1 ? prev.slice(0, -1) : prev)}
          className="w-7 h-7 bg-gray-400 text-white rounded font-bold text-sm hover:bg-gray-500 flex items-center justify-center">−</button>
      </div>
      <div className="border-t border-gray-200 px-4 py-3 flex justify-end">
        <table className="text-xs">
          <tbody>
            <tr><td className="px-3 py-0.5 text-right text-gray-600">外税（8%）</td><td className="px-3 py-0.5 text-right font-medium w-24">¥{totals.tax8.toLocaleString()}</td></tr>
            <tr><td className="px-3 py-0.5 text-right text-gray-600">外税（10%）</td><td className="px-3 py-0.5 text-right font-medium">¥{totals.tax10.toLocaleString()}</td></tr>
            <tr className="border-t border-gray-300">
              <td className="px-3 py-1 text-right font-bold text-gray-800">合計</td>
              <td className="px-3 py-1 text-right font-bold text-gray-900 text-sm">¥{totals.totalAmount.toLocaleString()}</td>
            </tr>
            <tr><td className="px-3 py-0.5 text-right text-gray-600">ポイント合計</td><td className="px-3 py-0.5 text-right font-medium text-blue-700">{totals.totalPoints.toLocaleString()}pt</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
