"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/** ブラウザ側 JST 今日の日付 "YYYY-MM-DD" */
function todayJST() {
  return new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
}

// ── 日本語日付ピッカー（年・月・日 セレクトボックス） ────────────────
function SlipDatePicker({
  value,
  onChange,
  className,
  allowEmpty = false,
  highlightBg = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  allowEmpty?: boolean;
  highlightBg?: string;
}) {
  const curYear = new Date().getFullYear();
  const jstToday = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).split("/");
  const curMonth = parseInt(jstToday[1]);
  const curDay   = parseInt(jstToday[2]);

  const parts = value ? value.split("-") : [];
  const selYear  = parts[0] ? parseInt(parts[0]) : (allowEmpty ? 0 : curYear);
  const selMonth = parts[1] ? parseInt(parts[1]) : (allowEmpty ? 0 : curMonth);
  const selDay   = parts[2] ? parseInt(parts[2]) : (allowEmpty ? 0 : curDay);

  const daysInMonth = useMemo(() => {
    if (!selYear || !selMonth) return 31;
    return new Date(selYear, selMonth, 0).getDate();
  }, [selYear, selMonth]);

  const years = Array.from({ length: 11 }, (_, i) => curYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selCls = `border border-gray-300 rounded px-1 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${highlightBg}`;

  function update(y: number, m: number, d: number) {
    if (allowEmpty && y === 0) { onChange(""); return; }
    const safeY = y || curYear;
    const safeM = m || 1;
    const safeD = Math.min(d || 1, new Date(safeY, safeM, 0).getDate());
    onChange(`${safeY}-${String(safeM).padStart(2,"0")}-${String(safeD).padStart(2,"0")}`);
  }

  return (
    <div className={`flex items-center gap-0.5 ${className || ""}`}>
      <select value={selYear}
        onChange={(e) => update(Number(e.target.value), selMonth, selDay)}
        className={`${selCls} w-16`}>
        {allowEmpty && <option value={0}>未設定</option>}
        {years.map((y) => <option key={y} value={y}>{y}年</option>)}
      </select>
      <select value={selMonth}
        onChange={(e) => update(selYear, Number(e.target.value), selDay)}
        className={`${selCls} w-12`}>
        {allowEmpty && <option value={0}>月</option>}
        {months.map((m) => <option key={m} value={m}>{m}月</option>)}
      </select>
      <select value={selDay}
        onChange={(e) => update(selYear, selMonth, Number(e.target.value))}
        className={`${selCls} w-12`}>
        {allowEmpty && <option value={0}>日</option>}
        {days.map((d) => <option key={d} value={d}>{d}日</option>)}
      </select>
    </div>
  );
}

// ── MLM購入履歴 型定義 ─────────────────────────────────────────────
type MlmPurchaseRecord = {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  points: number;
  totalPoints: number;
  purchaseMonth: string;
  purchasedAt: string;
};

// ── 型定義 ────────────────────────────────────────────────────
type Product = {
  id: string;
  product_code: string;
  name: string;
  price: number;
  pv: number;
  status: string;
};

type OrderItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineAmount: number;
  points: number;
};

type MemberOrder = {
  id: string;
  orderNumber: string;
  slipType: string;
  slipTypeLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  paymentStatus: string;
  shippingStatus: string;
  outboxNo: number;
  orderedAt: string;
  paidAt: string | null;
  note: string;
  noteSlip: string;
  subtotalAmount: number;
  totalAmount: number;
  items: OrderItem[];
  shippingLabel: {
    id: string;
    recipientName: string;
    recipientPhone: string;
    recipientPostal: string;
    recipientAddress: string;
    recipientCompany: string;
    deliveryTime: string;
    shippedAt: string | null;
    trackingNumber: string;
  } | null;
};

// ── 一括編集フィールド型 ────────────────────────────────────────
type BulkSlipItem = {
  productId: string;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  points: number;
  taxRate: number;
};

type BulkEditFields = {
  orderedAt:     { enabled: boolean; value: string };
  slipType:      { enabled: boolean; value: string };
  paymentMethod: { enabled: boolean; value: string };
  paymentStatus: { enabled: boolean; value: string };
  shippingStatus:{ enabled: boolean; value: string };
  paidAt:        { enabled: boolean; value: string };
  shippedAt:     { enabled: boolean; value: string };
  items:         { enabled: boolean; value: BulkSlipItem[] };
};

// ── 選択肢定数 ────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "", label: "未選択" },
  { value: "postal_transfer", label: "振替（郵便）" },
  { value: "bank_transfer", label: "振替（銀行）" },
  { value: "bank_payment", label: "振込み" },
  { value: "cod", label: "代引き" },
  { value: "card", label: "カード" },
  { value: "cash", label: "現金" },
  { value: "convenience", label: "コンビニ" },
  { value: "other", label: "その他" },
  { value: "accounts_receivable", label: "売掛" },
  { value: "cod_ng", label: "代引NG" },
  { value: "stop_shipping", label: "発送停止" },
  { value: "refund", label: "返金" },
  { value: "points_payment", label: "ポイント" },
];

const SLIP_TYPES = [
  { value: "normal", label: "通常" },
  { value: "new_member", label: "新規" },
  { value: "next_month", label: "翌月分" },
  { value: "one_time", label: "都度購入" },
  { value: "additional", label: "追加" },
  { value: "autoship", label: "オートシップ" },
  { value: "return", label: "返品" },
  { value: "cooling_off", label: "クーリング・オフ" },
  { value: "exchange", label: "交換" },
  { value: "cancel", label: "キャンセル" },
  { value: "other", label: "その他" },
  { value: "redelivery", label: "再配送" },
  { value: "refund_target", label: "返金対象" },
  { value: "refund", label: "返金" },
  { value: "partial", label: "分納" },
  { value: "defective", label: "商品不良" },
  { value: "shortage", label: "過不足" },
  { value: "web", label: "Web" },
  { value: "present", label: "プレゼント" },
  { value: "mid_cancel", label: "中途解約" },
  { value: "subscription", label: "定期購入" },
  { value: "mypage", label: "MyPage" },
  { value: "next_mypage", label: "翌/MyP" },
  { value: "next_web", label: "翌/Web" },
];

const DELIVERY_TIMES = [
  { value: "", label: "指定無" },
  { value: "am", label: "午前中" },
  { value: "12-14", label: "12時〜14時" },
  { value: "14-16", label: "14時〜16時" },
  { value: "16-18", label: "16時〜18時" },
  { value: "18-20", label: "18時〜20時" },
  { value: "19-21", label: "19時〜21時" },
];

const DETAIL_NAMES = [
  { value: "delivery", label: "納品書" },
  { value: "receipt", label: "領収書" },
];

// 空フォームの初期値
function makeEmptyForm(memberCode: string, memberName: string, memberPostal: string, memberAddress: string, memberPhone: string) {
  const today = todayJST();
  return {
    orderedAt: today,
    shippedAt: "",
    paidAt: "",
    slipType: "normal",
    paymentMethod: "",
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

type SlipItem = {
  productId: string;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  points: number;
  taxRate: number;
};

function makeEmptyBulkItem(): BulkSlipItem {
  return { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 };
}

// 一括編集フィールドの初期値
function makeEmptyBulkFields(): BulkEditFields {
  return {
    orderedAt:     { enabled: false, value: todayJST() },
    slipType:      { enabled: false, value: "normal" },
    paymentMethod: { enabled: false, value: "" },
    paymentStatus: { enabled: false, value: "paid" },
    shippingStatus:{ enabled: false, value: "shipped" },
    paidAt:        { enabled: false, value: "" },
    shippedAt:     { enabled: false, value: "" },
    items:         { enabled: false, value: [makeEmptyBulkItem()] },
  };
}

// ── コンポーネント ────────────────────────────────────────────
export default function PurchasePanel({
  memberCode,
  memberName,
  memberPostal,
  memberAddress,
  memberPhone,
}: {
  memberCode: string;
  memberName?: string;
  memberPostal?: string;
  memberAddress?: string;
  memberPhone?: string;
}) {
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mlmPurchases, setMlmPurchases] = useState<MlmPurchaseRecord[]>([]);
  const [mlmLoading, setMlmLoading] = useState(true);
  const [deletingMlmId, setDeletingMlmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 編集モーダル
  const [editOrder, setEditOrder] = useState<MemberOrder | null>(null);
  const [editForm, setEditForm] = useState<ReturnType<typeof makeEmptyForm> | null>(null);
  const [editItems, setEditItems] = useState<SlipItem[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── 一括選択・一括編集 ─────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkFields, setBulkFields] = useState<BulkEditFields>(makeEmptyBulkFields());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [form, setForm] = useState(() =>
    makeEmptyForm(memberCode, memberName || "", memberPostal || "", memberAddress || "", memberPhone || "")
  );

  const [slipItems, setSlipItems] = useState<SlipItem[]>([
    { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 },
  ]);

  // 伝票一覧取得
  const fetchOrders = useCallback(async (): Promise<MemberOrder[]> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mlm-members/orders?memberCode=${memberCode}`);
      if (res.ok) {
        const data = await res.json();
        const fetched: MemberOrder[] = data.orders || [];
        setOrders(fetched);
        return fetched;
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [memberCode]);

  // MLM購入履歴取得
  const fetchMlmPurchasesWithOrders = useCallback(async (currentOrders: MemberOrder[]) => {
    setMlmLoading(true);
    try {
      const res = await fetch(`/api/admin/product-purchases?memberCode=${memberCode}`);
      if (res.ok) {
        const data = await res.json();
        const orderIdMap = new Map<string, string>();
        const monthOrderMap = new Map<string, string[]>();
        for (const order of currentOrders) {
          orderIdMap.set(order.id, order.orderNumber);
          const month = order.orderedAt.slice(0, 7);
          if (!monthOrderMap.has(month)) monthOrderMap.set(month, []);
          monthOrderMap.get(month)!.push(order.orderNumber);
        }
        const filtered = (data.purchases || [])
          .filter((p: MlmPurchaseRecord) => p.productCode === "1000" || p.productCode === "2000")
          .map((p: MlmPurchaseRecord) => {
            let resolvedOrderNumber: string | null = null;
            if (p.orderId) {
              resolvedOrderNumber = orderIdMap.get(p.orderId) ?? null;
            } else {
              const monthOrders = monthOrderMap.get(p.purchaseMonth) || [];
              if (monthOrders.length === 1) {
                resolvedOrderNumber = monthOrders[0];
              } else if (monthOrders.length > 1) {
                resolvedOrderNumber = `(${monthOrders.length}件)`;
              }
            }
            return { ...p, orderNumber: resolvedOrderNumber };
          });
        filtered.sort((a: MlmPurchaseRecord, b: MlmPurchaseRecord) => {
          const monthCmp = b.purchaseMonth.localeCompare(a.purchaseMonth);
          if (monthCmp !== 0) return monthCmp;
          return a.purchasedAt.localeCompare(b.purchasedAt);
        });
        setMlmPurchases(filtered);
      }
    } finally {
      setMlmLoading(false);
    }
  }, [memberCode]);

  const fetchMlmPurchases = useCallback(async () => {
    const latestOrders = await fetchOrders();
    await fetchMlmPurchasesWithOrders(latestOrders);
  }, [fetchOrders, fetchMlmPurchasesWithOrders]);

  async function handleDeleteMlmPurchase(id: string, month: string, productName: string) {
    if (!confirm(`購入履歴を削除しますか？\n${productName} / ${month}\nこの操作は取り消せません。`)) return;
    setDeletingMlmId(id);
    try {
      const res = await fetch(`/api/admin/product-purchases?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "削除に失敗しました"); return; }
      await fetchMlmPurchases();
    } finally {
      setDeletingMlmId(null);
    }
  }

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts((data.products || []).filter((p: Product) => p.status === "active"));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      const [fetchedOrders] = await Promise.all([fetchOrders(), fetchProducts()]);
      await fetchMlmPurchasesWithOrders(fetchedOrders);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberCode]);

  function onProductSelect(idx: number, productId: string, setter: React.Dispatch<React.SetStateAction<SlipItem[]>>) {
    const product = products.find((p) => p.id === productId);
    setter((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              productId: product?.id || "",
              productCode: product?.product_code || "",
              productName: product?.name || "",
              unitPrice: product?.price || 0,
              points: product?.pv || 0,
              taxRate: 10,
            }
          : item
      )
    );
  }

  function addRow(setter: React.Dispatch<React.SetStateAction<SlipItem[]>>) {
    setter((prev) => [
      ...prev,
      { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 },
    ]);
  }
  function removeRow(idx: number, setter: React.Dispatch<React.SetStateAction<SlipItem[]>>, items: SlipItem[]) {
    if (items.length <= 1) return;
    setter((prev) => prev.filter((_, i) => i !== idx));
  }

  function calcTotals(items: SlipItem[]) {
    const tax8total = items.filter((i) => i.taxRate === 8).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const tax10total = items.filter((i) => i.taxRate === 10).reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const tax8 = Math.floor(tax8total * 0.08);
    const tax10 = Math.floor(tax10total * 0.1);
    return {
      tax8total, tax10total, tax8, tax10,
      totalAmount: tax8total + tax10total + tax8 + tax10,
      totalPoints: items.reduce((s, i) => s + i.points * i.quantity, 0),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = slipItems.filter((i) => i.productId);
    if (validItems.length === 0) { alert("商品を1つ以上選択してください"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/mlm-members/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, memberCode, items: validItems }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "伝票作成に失敗しました"); return; }
      alert(`伝票を作成しました\n注文番号: ${data.orderNumber}\n合計金額: ¥${data.totalAmount?.toLocaleString()}`);
      setShowForm(false);
      setSlipItems([{ productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 }]);
      setForm(makeEmptyForm(memberCode, memberName || "", memberPostal || "", memberAddress || "", memberPhone || ""));
      const newOrders = await fetchOrders();
      await fetchMlmPurchasesWithOrders(newOrders);
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(order: MemberOrder) {
    setEditOrder(order);
    const orderedDate = order.orderedAt.slice(0, 10);
    const paidDate = order.paidAt ? order.paidAt.slice(0, 10) : "";
    const sl = order.shippingLabel;
    const addr = sl?.recipientAddress || "";
    setEditForm({
      orderedAt: orderedDate,
      shippedAt: sl?.shippedAt ? sl.shippedAt.slice(0, 10) : "",
      paidAt: paidDate,
      slipType: order.slipType,
      paymentMethod: order.paymentMethod,
      deliveryDate: "",
      deliveryTime: sl?.deliveryTime || "",
      bundleTargetId: memberCode,
      autoshipNo: "",
      deliverySlipNo: "",
      taxMethod: "external",
      paymentHolder: "",
      ordererMemberId: memberCode,
      ordererCompany: sl?.recipientCompany || "",
      ordererName: sl?.recipientName || memberName || "",
      ordererPostal: sl?.recipientPostal || "",
      ordererPrefecture: "",
      ordererCity: addr,
      ordererBuilding: "",
      ordererPhone: sl?.recipientPhone || memberPhone || "",
      ordererNote: order.note || "",
      ordererNoteSlip: order.noteSlip || "",
      detailName: "delivery",
      recipientCompany: sl?.recipientCompany || "",
      recipientName: sl?.recipientName || memberName || "",
      recipientPostal: sl?.recipientPostal || "",
      recipientPrefecture: "",
      recipientCity: addr,
      recipientBuilding: "",
      recipientPhone: sl?.recipientPhone || memberPhone || "",
      deliveryCenter: "",
      afterCreateOutbox: order.outboxNo || 0,
    });
    setEditItems(
      order.items.length > 0
        ? order.items.map((item) => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            points: item.points,
            taxRate: 10,
          }))
        : [{ productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 }]
    );
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder || !editForm) return;
    const validItems = editItems.filter((i) => i.productId);
    if (validItems.length === 0) { alert("商品を1つ以上選択してください"); return; }
    setEditSubmitting(true);
    try {
      const res = await fetch("/api/admin/mlm-members/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, orderId: editOrder.id, memberCode, items: validItems }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "伝票更新に失敗しました"); return; }
      alert("伝票を更新しました");
      setEditOrder(null);
      setEditForm(null);
      const updatedOrders = await fetchOrders();
      await fetchMlmPurchasesWithOrders(updatedOrders);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(orderId: string, orderNumber: string) {
    if (!confirm(`伝票「${orderNumber}」を削除しますか？\nこの操作は取り消せません。`)) return;
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/admin/mlm-members/orders?orderId=${orderId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "削除に失敗しました"); return; }
      alert("伝票を削除しました");
      setEditOrder(null);
      const remainOrders = await fetchOrders();
      await fetchMlmPurchasesWithOrders(remainOrders);
    } finally {
      setDeletingId(null);
    }
  }

  function handlePrintInvoice(orderId: string) {
    window.open(`/admin/orders-shipping/delivery-note?ids=${orderId}&type=delivery`, "_blank");
  }

  // ── チェックボックス制御 ───────────────────────────────────
  const allChecked = orders.length > 0 && selectedIds.size === orders.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < orders.length;

  function toggleAll() {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── 一括編集実行 ───────────────────────────────────────────
  async function handleBulkSave() {
    const enabledFields = Object.entries(bulkFields).filter(([, v]) => v.enabled);
    if (enabledFields.length === 0) {
      alert("変更する項目を1つ以上チェックしてください");
      return;
    }
    if (selectedIds.size === 0) return;

    const FIELD_LABELS: Record<string, string> = {
      orderedAt: "注文日",
      slipType: "種別",
      paymentMethod: "支払方法",
      paymentStatus: "入金ステータス",
      shippingStatus: "発送ステータス",
      paidAt: "入金日",
      shippedAt: "発送日",
      items: "商品明細",
    };

    // 商品が有効な場合、空行を除いてバリデーション
    if (bulkFields.items.enabled) {
      const validItems = bulkFields.items.value.filter((i) => i.productId || i.productName);
      if (validItems.length === 0) {
        alert("商品を1つ以上選択してください");
        return;
      }
    }

    const confirmMsg = [
      `選択中の伝票 ${selectedIds.size} 件を一括更新します。`,
      "",
      "【変更する項目】",
      ...enabledFields.map(([key, v]) => {
        if (key === "items") {
          const validItems = (v.value as BulkSlipItem[]).filter((i) => i.productId || i.productName);
          return `・商品明細：${validItems.length}商品に差し替え`;
        }
        return `・${FIELD_LABELS[key] || key}：${(v as { value: string }).value || "（クリア）"}`;
      }),
      "",
      "よろしいですか？",
    ].join("\n");

    if (!confirm(confirmMsg)) return;

    setBulkSubmitting(true);
    try {
      // 送信するフィールドを組み立て（enabledのみ）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: Record<string, any> = {};
      for (const [key, v] of enabledFields) {
        if (key === "items") {
          // 空行を除いた商品リストだけ送信
          fields[key] = (v.value as BulkSlipItem[]).filter((i) => i.productId || i.productName);
        } else {
          fields[key] = (v as { value: string }).value || null;
        }
      }

      const res = await fetch("/api/admin/mlm-members/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: Array.from(selectedIds), fields }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "一括更新に失敗しました");
        return;
      }

      const msg = [`${data.updatedCount} 件の伝票を更新しました。`];
      if (data.errors?.length) {
        msg.push("", `エラー（${data.errors.length}件）:`, ...data.errors.slice(0, 5));
      }
      alert(msg.join("\n"));

      setShowBulkEdit(false);
      setSelectedIds(new Set());
      setBulkFields(makeEmptyBulkFields());
      const updated = await fetchOrders();
      await fetchMlmPurchasesWithOrders(updated);
    } finally {
      setBulkSubmitting(false);
    }
  }

  // input/select helper
  const F = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));
  const EF = (key: keyof ReturnType<typeof makeEmptyForm>, value: string | number) =>
    setEditForm((f) => f ? { ...f, [key]: value } : f);

  const inp = "border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full";
  const sel = "border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full";
  const lbl = "text-[11px] text-gray-600 font-medium whitespace-nowrap";
  const fieldBg = "bg-blue-50";

  const totals = calcTotals(slipItems);
  const editTotals = calcTotals(editItems);

  function SlipFormBody({
    f, setF, items, setItems, onProductSelectFn, onAddRow, onRemoveRow, totalsData,
  }: {
    f: ReturnType<typeof makeEmptyForm>;
    setF: (key: keyof ReturnType<typeof makeEmptyForm>, value: string | number) => void;
    items: SlipItem[];
    setItems: React.Dispatch<React.SetStateAction<SlipItem[]>>;
    onProductSelectFn: (idx: number, productId: string) => void;
    onAddRow: () => void;
    onRemoveRow: (idx: number) => void;
    totalsData: ReturnType<typeof calcTotals>;
  }) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-24 text-red-600`}>注文日</span>
              <SlipDatePicker value={f.orderedAt} onChange={(v) => setF("orderedAt", v)} highlightBg={fieldBg} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-24`}>発送日</span>
              <SlipDatePicker value={f.shippedAt} onChange={(v) => setF("shippedAt", v)} allowEmpty />
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-24`}>入金日</span>
              <SlipDatePicker value={f.paidAt} onChange={(v) => setF("paidAt", v)} allowEmpty />
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-24 text-red-600`}>支払方法</span>
              <select value={f.paymentMethod} onChange={(e) => setF("paymentMethod", e.target.value)} className={`${sel} ${fieldBg} w-32`}>
                {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span className={lbl}>種別</span>
              <select value={f.slipType} onChange={(e) => setF("slipType", e.target.value)} className={`${sel} w-28`}>
                {SLIP_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-24`}>配達希望日</span>
              <SlipDatePicker value={f.deliveryDate} onChange={(v) => setF("deliveryDate", v)} allowEmpty />
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-24`}>配達希望時間帯</span>
              <select value={f.deliveryTime} onChange={(e) => setF("deliveryTime", e.target.value)} className={`${sel} w-48`}>
                {DELIVERY_TIMES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-28`}>配送伝票番号</span>
              <input value={f.deliverySlipNo} onChange={(e) => setF("deliverySlipNo", e.target.value)} className={`${inp} flex-1`} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-28`}>オートシップNo</span>
              <input value={f.autoshipNo} onChange={(e) => setF("autoshipNo", e.target.value)} className={`${inp} flex-1`} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-28`}>課税方法</span>
              <select value={f.taxMethod} onChange={(e) => setF("taxMethod", e.target.value)} className={`${sel} w-24`}>
                <option value="external">外税</option>
                <option value="internal">内税</option>
                <option value="none">非課税</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${lbl} w-28`}>支払い名義人</span>
              <input value={f.paymentHolder} onChange={(e) => setF("paymentHolder", e.target.value)} className={`${inp} flex-1`} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">注文者情報</div>
            <div className="p-3 space-y-1.5 text-xs">
              <Row label="会員ID" color><input value={f.ordererMemberId} onChange={(e) => setF("ordererMemberId", e.target.value)} className={`${inp} ${fieldBg}`} /></Row>
              <Row label="法人名" color><input value={f.ordererCompany} onChange={(e) => setF("ordererCompany", e.target.value)} className={`${inp} ${fieldBg}`} /></Row>
              <Row label="氏名" color><input value={f.ordererName} onChange={(e) => setF("ordererName", e.target.value)} className={`${inp} ${fieldBg}`} /></Row>
              <Row label="郵便番号" color>
                <div className="flex gap-1">
                  <input value={f.ordererPostal} onChange={(e) => setF("ordererPostal", e.target.value)} className={`${inp} ${fieldBg} w-24`} placeholder="例:1234567" />
                  <span className={lbl}>都道府県</span>
                  <input value={f.ordererPrefecture} onChange={(e) => setF("ordererPrefecture", e.target.value)} className={`${inp} ${fieldBg} w-20`} />
                </div>
              </Row>
              <Row label="市区町村番地" color><input value={f.ordererCity} onChange={(e) => setF("ordererCity", e.target.value)} className={`${inp} ${fieldBg}`} /></Row>
              <Row label="建物名・部屋番号" color><input value={f.ordererBuilding} onChange={(e) => setF("ordererBuilding", e.target.value)} className={`${inp} ${fieldBg}`} /></Row>
              <Row label="電話番号"><input value={f.ordererPhone} onChange={(e) => setF("ordererPhone", e.target.value)} className={inp} /></Row>
              <Row label="備考"><input value={f.ordererNote} onChange={(e) => setF("ordererNote", e.target.value)} className={inp} /></Row>
              <Row label="備考(納品書)"><input value={f.ordererNoteSlip} onChange={(e) => setF("ordererNoteSlip", e.target.value)} className={inp} /></Row>
              <Row label="明細名称">
                <select value={f.detailName} onChange={(e) => setF("detailName", e.target.value)} className={sel}>
                  {DETAIL_NAMES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Row>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>配送先</span>
              <div className="flex gap-1">
                <button type="button" className="text-blue-600 hover:underline text-[10px]"
                  onClick={() => {
                    setF("recipientCompany", f.ordererCompany);
                    setF("recipientName", f.ordererName);
                    setF("recipientPostal", f.ordererPostal);
                    setF("recipientPrefecture", f.ordererPrefecture);
                    setF("recipientCity", f.ordererCity);
                    setF("recipientBuilding", f.ordererBuilding);
                    setF("recipientPhone", f.ordererPhone);
                  }}>コピー</button>
              </div>
            </div>
            <div className="p-3 space-y-1.5 text-xs">
              <Row label="法人名"><input value={f.recipientCompany} onChange={(e) => setF("recipientCompany", e.target.value)} className={inp} /></Row>
              <Row label="氏名"><input value={f.recipientName} onChange={(e) => setF("recipientName", e.target.value)} className={inp} /></Row>
              <Row label="郵便番号">
                <div className="flex gap-1">
                  <input value={f.recipientPostal} onChange={(e) => setF("recipientPostal", e.target.value)} className={`${inp} w-24`} placeholder="例:1234567" />
                  <span className={lbl}>都道府県</span>
                  <input value={f.recipientPrefecture} onChange={(e) => setF("recipientPrefecture", e.target.value)} className={`${inp} w-20`} />
                </div>
              </Row>
              <Row label="市区町村番地"><input value={f.recipientCity} onChange={(e) => setF("recipientCity", e.target.value)} className={inp} /></Row>
              <Row label="建物名・部屋番号"><input value={f.recipientBuilding} onChange={(e) => setF("recipientBuilding", e.target.value)} className={inp} /></Row>
              <Row label="電話番号"><input value={f.recipientPhone} onChange={(e) => setF("recipientPhone", e.target.value)} className={inp} /></Row>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-800 text-white px-3 py-1.5 text-xs font-bold">{f.ordererMemberId || "ビジネス会員"}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[700px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left w-8"></th>
                  <th className="px-2 py-2 text-left">商品</th>
                  <th className="px-2 py-2 text-right w-24">価格</th>
                  <th className="px-2 py-2 text-center w-16">個数</th>
                  <th className="px-2 py-2 text-right w-20">ポイント</th>
                  <th className="px-2 py-2 text-right w-24">pt小計</th>
                  <th className="px-2 py-2 text-right w-24">小計</th>
                  <th className="px-2 py-2 text-center w-20">税率</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onRemoveRow(idx)} className="text-gray-300 hover:text-red-500">
                        <i className="fas fa-times text-gray-400" />
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={item.productId} onChange={(e) => onProductSelectFn(idx, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full focus:ring-1 focus:ring-blue-400">
                        <option value=""></option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.product_code} - {p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} value={item.unitPrice}
                        onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                        className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={1} value={item.quantity}
                        onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it))}
                        className="border border-gray-300 rounded px-2 py-1 text-xs text-center w-full bg-white" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} value={item.points}
                        onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, points: Number(e.target.value) } : it))}
                        className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white" />
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium text-blue-700">{(item.points * item.quantity).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{(item.unitPrice * item.quantity).toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      <select value={item.taxRate}
                        onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, taxRate: Number(e.target.value) } : it))}
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
          <div className="px-3 py-2 flex gap-2">
            <button type="button" onClick={onAddRow}
              className="w-7 h-7 bg-green-500 text-white rounded font-bold text-sm hover:bg-green-600 flex items-center justify-center">+</button>
            <button type="button" onClick={() => onRemoveRow(items.length - 1)}
              className="w-7 h-7 bg-gray-400 text-white rounded font-bold text-sm hover:bg-gray-500 flex items-center justify-center">−</button>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 flex justify-end">
            <table className="text-xs">
              <tbody>
                <tr><td className="px-3 py-0.5 text-right text-gray-600">外税（8%）</td><td className="px-3 py-0.5 text-right font-medium w-24">¥{totalsData.tax8.toLocaleString()}</td></tr>
                <tr><td className="px-3 py-0.5 text-right text-gray-600">外税（10%）</td><td className="px-3 py-0.5 text-right font-medium">¥{totalsData.tax10.toLocaleString()}</td></tr>
                <tr className="border-t border-gray-300">
                  <td className="px-3 py-1 text-right font-bold text-gray-800">合計</td>
                  <td className="px-3 py-1 text-right font-bold text-gray-900 text-sm">¥{totalsData.totalAmount.toLocaleString()}</td>
                </tr>
                <tr><td className="px-3 py-0.5 text-right text-gray-600">ポイント合計</td><td className="px-3 py-0.5 text-right font-medium text-blue-700">{totalsData.totalPoints.toLocaleString()}pt</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={f.afterCreateOutbox > 0}
              onChange={(e) => setF("afterCreateOutbox", e.target.checked ? 1 : 0)} />
            作成後
            <select value={f.afterCreateOutbox || 1}
              onChange={(e) => setF("afterCreateOutbox", Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              disabled={f.afterCreateOutbox === 0}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>出庫BOX{n}</option>
              ))}
            </select>
            に入れる
          </label>
        </div>
      </div>
    );
  }

  // ── 一括編集フィールド行コンポーネント ─────────────────────
  function BulkFieldRow({
    fieldKey, label, children,
  }: {
    fieldKey: keyof BulkEditFields;
    label: string;
    children: React.ReactNode;
  }) {
    const enabled = bulkFields[fieldKey].enabled;
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition ${
        enabled ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
      }`}>
        <label className="flex items-center gap-2 cursor-pointer select-none min-w-[140px]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              setBulkFields((prev) => ({
                ...prev,
                [fieldKey]: { ...prev[fieldKey], enabled: e.target.checked },
              }))
            }
            className="w-4 h-4 rounded accent-amber-500"
          />
          <span className={`text-xs font-semibold ${enabled ? "text-amber-800" : "text-gray-400"}`}>
            {label}
          </span>
        </label>
        <div className={`flex-1 transition ${enabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-100 p-5">
      {/* ヘッダ */}
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h2 className="text-base font-bold text-slate-800">
          <i className="fas fa-file-invoice mr-2 text-slate-600" />
          伝票・購入履歴
        </h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition">
          {showForm ? "✕ キャンセル" : "＋ 購入履歴追加（伝票作成）"}
        </button>
      </div>

      {/* 伝票作成フォーム */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 border border-blue-200 rounded-xl overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 text-sm font-bold">伝票作成</div>
          <SlipFormBody
            f={form}
            setF={F}
            items={slipItems}
            setItems={setSlipItems}
            onProductSelectFn={(idx, pid) => onProductSelect(idx, pid, setSlipItems)}
            onAddRow={() => addRow(setSlipItems)}
            onRemoveRow={(idx) => removeRow(idx, setSlipItems, slipItems)}
            totalsData={totals}
          />
          <div className="px-4 pb-4 flex justify-center">
            <button type="submit" disabled={submitting}
              className="px-12 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "作成中..." : "伝票作成"}
            </button>
          </div>
        </form>
      )}

      {/* ── 一括操作バー ────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <i className="fas fa-check-square text-amber-500" />
          <span className="text-xs font-bold text-amber-800">
            {selectedIds.size} 件 選択中
          </span>
          <button
            onClick={() => setShowBulkEdit(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition shadow-sm"
          >
            <i className="fas fa-edit text-[10px]" />
            一括編集
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 bg-white text-gray-500 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            選択解除
          </button>
        </div>
      )}

      {/* 伝票一覧 */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-sm">伝票データなし</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[750px]">
            <thead className="bg-slate-800 text-white">
              <tr>
                {/* 全選択チェックボックス */}
                <th className="px-3 py-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded cursor-pointer accent-amber-400"
                    title="全選択"
                  />
                </th>
                <th className="px-3 py-2 text-left">注文日</th>
                <th className="px-3 py-2 text-left">注文番号</th>
                <th className="px-3 py-2 text-left">種別</th>
                <th className="px-3 py-2 text-left">支払方法</th>
                <th className="px-3 py-2 text-center">入金</th>
                <th className="px-3 py-2 text-center">発送</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-right">合計pt</th>
                <th className="px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                return (
                  <>
                    <tr key={order.id}
                      className={`border-b cursor-pointer transition ${
                        isSelected
                          ? "bg-amber-50 hover:bg-amber-100"
                          : "hover:bg-violet-50"
                      }`}
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      {/* チェックボックスセル */}
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(order.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-amber-500"
                        />
                      </td>
                      <td className="px-3 py-2">{order.orderedAt.slice(0, 10)}</td>
                      <td className="px-3 py-2" onClick={(e) => { e.stopPropagation(); openEditModal(order); }}>
                        <span className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">{order.slipTypeLabel}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded ${
                          order.paymentMethod === "card" ? "bg-blue-50 text-blue-700"
                          : order.paymentMethod === "bank_transfer" || order.paymentMethod === "postal_transfer" ? "bg-yellow-50 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>{order.paymentMethodLabel || "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {order.paymentStatus === "paid" ? "入金済" : "未入金"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded ${order.shippingStatus === "shipped" ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-600"}`}>
                          {order.shippingStatus === "shipped" ? "発送済" : "未発送"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">¥{order.totalAmount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-700">
                        {order.items.reduce((s, i) => s + i.points * i.quantity, 0).toLocaleString()} pt
                      </td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => handlePrintInvoice(order.id)}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-[10px] hover:bg-indigo-100 whitespace-nowrap"
                            title="納品書PDF"
                          >
                            <i className="fas fa-file-pdf mr-0.5" />納品書
                          </button>
                          <button
                            onClick={() => handleDelete(order.id, order.orderNumber)}
                            disabled={deletingId === order.id}
                            className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] hover:bg-red-100 whitespace-nowrap disabled:opacity-50"
                            title="削除"
                          >
                            {deletingId === order.id ? "..." : <><i className="fas fa-trash mr-0.5" />削除</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-detail`}>
                        <td colSpan={10} className="bg-violet-50/40 px-4 py-3 border-b border-violet-100">
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500">入金日：{order.paidAt?.slice(0, 10) || "—"}</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b">
                                  <td className="pb-1">商品</td>
                                  <td className="pb-1 text-right">単価</td>
                                  <td className="pb-1 text-center">数</td>
                                  <td className="pb-1 text-right">小計</td>
                                  <td className="pb-1 text-right">pt</td>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.id} className="border-b border-gray-100">
                                    <td className="py-0.5 text-gray-700">{item.productName}</td>
                                    <td className="py-0.5 text-right text-gray-500">¥{item.unitPrice.toLocaleString()}</td>
                                    <td className="py-0.5 text-center">{item.quantity}</td>
                                    <td className="py-0.5 text-right font-medium">¥{item.lineAmount.toLocaleString()}</td>
                                    <td className="py-0.5 text-right text-blue-600">{(item.points * item.quantity).toLocaleString()}pt</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {order.shippingLabel && (
                              <p className="text-xs text-gray-500">
                                配送先：{order.shippingLabel.recipientName} 〒{order.shippingLabel.recipientPostal} {order.shippingLabel.recipientAddress}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MLM購入履歴セクション（商品コード1000・2000）
      ═══════════════════════════════════════════ */}
      <div className="mt-6 border-t pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">
            <i className="fas fa-box mr-2 text-slate-500" />
            商品購入履歴
            <span className="ml-2 text-xs font-normal text-slate-400">（商品コード1000・2000）</span>
          </h3>
          <button
            onClick={fetchMlmPurchases}
            disabled={mlmLoading}
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200 transition disabled:opacity-50"
          >
            <i className={`fas fa-sync text-[10px] ${mlmLoading ? "animate-spin" : ""}`} />
            {mlmLoading ? "読込中..." : "更新"}
          </button>
        </div>

        {mlmLoading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : mlmPurchases.length === 0 ? (
          <p className="text-gray-500 text-sm">商品購入履歴なし</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[700px]">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">購入月</th>
                  <th className="px-3 py-2 text-left font-semibold">注文番号</th>
                  <th className="px-3 py-2 text-left font-semibold">商品コード</th>
                  <th className="px-3 py-2 text-left font-semibold">商品名</th>
                  <th className="px-3 py-2 text-center font-semibold">数量</th>
                  <th className="px-3 py-2 text-right font-semibold">単価</th>
                  <th className="px-3 py-2 text-right font-semibold">PV</th>
                  <th className="px-3 py-2 text-center font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {mlmPurchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-3 py-2 font-semibold text-slate-700">{p.purchaseMonth}</td>
                    <td className="px-3 py-2">
                      {p.orderNumber ? (
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.orderNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.productCode === "1000"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {p.productCode}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.productName}</td>
                    <td className="px-3 py-2 text-center font-medium">{p.quantity}</td>
                    <td className="px-3 py-2 text-right">¥{p.unitPrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">{p.totalPoints.toLocaleString()}pt</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDeleteMlmPurchase(p.id, p.purchaseMonth, p.productName)}
                        disabled={deletingMlmId === p.id}
                        className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingMlmId === p.id ? "..." : <><i className="fas fa-trash mr-0.5" />削除</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-xs font-bold text-slate-600">合計</td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-slate-700">
                    {mlmPurchases.reduce((s, p) => s + p.quantity, 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">
                    ¥{mlmPurchases.reduce((s, p) => s + p.unitPrice * p.quantity, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-blue-700">
                    {mlmPurchases.reduce((s, p) => s + p.totalPoints, 0).toLocaleString()}pt
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          伝票編集モーダル（個別編集）
      ═══════════════════════════════════════════ */}
      {editOrder && editForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden">
            <div className="bg-orange-600 text-white px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm">伝票修正</span>
                <span className="ml-3 text-orange-200 text-xs font-mono">{editOrder.orderNumber}</span>
              </div>
              <button onClick={() => { setEditOrder(null); setEditForm(null); }}
                className="text-white hover:text-orange-200 text-lg font-bold">✕</button>
            </div>
            <form onSubmit={handleEditSave}>
              <SlipFormBody
                f={editForm}
                setF={EF}
                items={editItems}
                setItems={setEditItems}
                onProductSelectFn={(idx, pid) => onProductSelect(idx, pid, setEditItems)}
                onAddRow={() => addRow(setEditItems)}
                onRemoveRow={(idx) => removeRow(idx, setEditItems, editItems)}
                totalsData={editTotals}
              />
              <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleDelete(editOrder.id, editOrder.orderNumber)}
                  disabled={deletingId === editOrder.id}
                  className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <i className="fas fa-trash text-xs" />
                  {deletingId === editOrder.id ? "削除中..." : "この伝票を削除"}
                </button>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => { setEditOrder(null); setEditForm(null); }}
                    className="px-5 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-100">
                    キャンセル
                  </button>
                  <button type="submit" disabled={editSubmitting}
                    className="px-8 py-2 bg-orange-600 text-white text-sm font-bold rounded hover:bg-orange-700 disabled:opacity-50">
                    {editSubmitting ? "更新中..." : "伝票を更新"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          一括編集モーダル
      ═══════════════════════════════════════════ */}
      {showBulkEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
            {/* モーダルヘッダ */}
            <div className="bg-amber-500 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-edit" />
                <span className="font-bold text-sm">一括編集</span>
                <span className="ml-1 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedIds.size} 件選択中
                </span>
              </div>
              <button
                onClick={() => { setShowBulkEdit(false); setBulkFields(makeEmptyBulkFields()); }}
                className="text-white hover:text-amber-200 text-lg font-bold"
              >✕</button>
            </div>

            {/* 説明文 */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <i className="fas fa-info-circle text-blue-400 mr-1.5" />
                チェックを入れた項目だけが更新されます。チェックなしの項目は変更されません。
              </p>
            </div>

            {/* フィールド一覧 */}
            <div className="px-5 py-3 space-y-2 max-h-[60vh] overflow-y-auto">

              {/* 注文日 */}
              <BulkFieldRow fieldKey="orderedAt" label="注文日">
                <SlipDatePicker
                  value={bulkFields.orderedAt.value}
                  onChange={(v) => setBulkFields((p) => ({ ...p, orderedAt: { ...p.orderedAt, value: v } }))}
                  highlightBg="bg-amber-50"
                />
              </BulkFieldRow>

              {/* 種別 */}
              <BulkFieldRow fieldKey="slipType" label="種別">
                <select
                  value={bulkFields.slipType.value}
                  onChange={(e) => setBulkFields((p) => ({ ...p, slipType: { ...p.slipType, value: e.target.value } }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full focus:ring-1 focus:ring-amber-400"
                >
                  {SLIP_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </BulkFieldRow>

              {/* 支払方法 */}
              <BulkFieldRow fieldKey="paymentMethod" label="支払方法">
                <select
                  value={bulkFields.paymentMethod.value}
                  onChange={(e) => setBulkFields((p) => ({ ...p, paymentMethod: { ...p.paymentMethod, value: e.target.value } }))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full focus:ring-1 focus:ring-amber-400"
                >
                  {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </select>
              </BulkFieldRow>

              {/* 入金ステータス */}
              <BulkFieldRow fieldKey="paymentStatus" label="入金ステータス">
                <div className="flex gap-3">
                  {[
                    { value: "paid",   label: "入金済", color: "text-green-700 bg-green-50 border-green-200" },
                    { value: "unpaid", label: "未入金", color: "text-red-600 bg-red-50 border-red-200" },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      bulkFields.paymentStatus.value === opt.value ? opt.color : "text-gray-400 bg-white border-gray-200"
                    }`}>
                      <input
                        type="radio"
                        name="bulk_paymentStatus"
                        value={opt.value}
                        checked={bulkFields.paymentStatus.value === opt.value}
                        onChange={(e) => setBulkFields((p) => ({ ...p, paymentStatus: { ...p.paymentStatus, value: e.target.value } }))}
                        className="accent-amber-500"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </BulkFieldRow>

              {/* 入金日 */}
              <BulkFieldRow fieldKey="paidAt" label="入金日">
                <SlipDatePicker
                  value={bulkFields.paidAt.value}
                  onChange={(v) => setBulkFields((p) => ({ ...p, paidAt: { ...p.paidAt, value: v } }))}
                  allowEmpty
                  highlightBg="bg-amber-50"
                />
              </BulkFieldRow>

              {/* 発送ステータス */}
              <BulkFieldRow fieldKey="shippingStatus" label="発送ステータス">
                <div className="flex gap-3">
                  {[
                    { value: "shipped",   label: "発送済", color: "text-green-700 bg-green-50 border-green-200" },
                    { value: "unshipped", label: "未発送", color: "text-orange-600 bg-orange-50 border-orange-200" },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      bulkFields.shippingStatus.value === opt.value ? opt.color : "text-gray-400 bg-white border-gray-200"
                    }`}>
                      <input
                        type="radio"
                        name="bulk_shippingStatus"
                        value={opt.value}
                        checked={bulkFields.shippingStatus.value === opt.value}
                        onChange={(e) => setBulkFields((p) => ({ ...p, shippingStatus: { ...p.shippingStatus, value: e.target.value } }))}
                        className="accent-amber-500"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </BulkFieldRow>

  {/* 発送日 */}
              <BulkFieldRow fieldKey="shippedAt" label="発送日">
                <SlipDatePicker
                  value={bulkFields.shippedAt.value}
                  onChange={(v) => setBulkFields((p) => ({ ...p, shippedAt: { ...p.shippedAt, value: v } }))}
                  allowEmpty
                  highlightBg="bg-amber-50"
                />
              </BulkFieldRow>

              {/* ── 商品明細（差し替え） ── */}
              <div className={`rounded-lg border transition ${
                bulkFields.items.enabled ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
              }`}>
                {/* ヘッダ行（チェックボックス＋ラベル） */}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none min-w-[140px]">
                    <input
                      type="checkbox"
                      checked={bulkFields.items.enabled}
                      onChange={(e) =>
                        setBulkFields((p) => ({
                          ...p,
                          items: { ...p.items, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className={`text-xs font-semibold ${
                      bulkFields.items.enabled ? "text-amber-800" : "text-gray-400"
                    }`}>
                      商品明細
                    </span>
                  </label>
                  <span className={`text-[10px] ${
                    bulkFields.items.enabled ? "text-amber-600" : "text-gray-400"
                  }`}>
                    選択した全伝票の商品を下記に差し替えます
                  </span>
                </div>

                {/* 商品テーブル */}
                <div className={`transition ${
                  bulkFields.items.enabled ? "opacity-100" : "opacity-30 pointer-events-none"
                }`}>
                  <div className="overflow-x-auto px-4 pb-2">
                    <table className="w-full text-xs border-collapse min-w-[560px]">
                      <thead>
                        <tr className="border-b border-amber-200 text-amber-700">
                          <th className="pb-1 text-left pl-1 w-6"></th>
                          <th className="pb-1 text-left">商品</th>
                          <th className="pb-1 text-right w-20">単価</th>
                          <th className="pb-1 text-center w-14">数量</th>
                          <th className="pb-1 text-right w-16">PV</th>
                          <th className="pb-1 text-center w-16">税率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkFields.items.value.map((item, idx) => (
                          <tr key={idx} className="border-b border-amber-100">
                            {/* 削除ボタン */}
                            <td className="py-1.5 text-center pl-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setBulkFields((p) => ({
                                    ...p,
                                    items: {
                                      ...p.items,
                                      value: p.items.value.length <= 1
                                        ? p.items.value
                                        : p.items.value.filter((_, i) => i !== idx),
                                    },
                                  }))
                                }
                                className="text-gray-300 hover:text-red-500 transition"
                              >
                                <i className="fas fa-times" />
                              </button>
                            </td>
                            {/* 商品選択 */}
                            <td className="py-1.5 pr-1">
                              <select
                                value={item.productId}
                                onChange={(e) => {
                                  const product = products.find((p) => p.id === e.target.value);
                                  setBulkFields((p) => ({
                                    ...p,
                                    items: {
                                      ...p.items,
                                      value: p.items.value.map((it, i) =>
                                        i === idx
                                          ? {
                                              ...it,
                                              productId: product?.id || "",
                                              productCode: product?.product_code || "",
                                              productName: product?.name || "",
                                              unitPrice: product?.price || 0,
                                              points: product?.pv || 0,
                                            }
                                          : it
                                      ),
                                    },
                                  }));
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full focus:ring-1 focus:ring-amber-400"
                              >
                                <option value="">— 商品を選択 —</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.product_code} - {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* 単価 */}
                            <td className="py-1.5 pr-1">
                              <input
                                type="number" min={0}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  setBulkFields((p) => ({
                                    ...p,
                                    items: {
                                      ...p.items,
                                      value: p.items.value.map((it, i) =>
                                        i === idx ? { ...it, unitPrice: Number(e.target.value) } : it
                                      ),
                                    },
                                  }))
                                }
                                className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white"
                              />
                            </td>
                            {/* 数量 */}
                            <td className="py-1.5 pr-1">
                              <input
                                type="number" min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  setBulkFields((p) => ({
                                    ...p,
                                    items: {
                                      ...p.items,
                                      value: p.items.value.map((it, i) =>
                                        i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it
                                      ),
                                    },
                                  }))
                                }
                                className="border border-gray-300 rounded px-2 py-1 text-xs text-center w-full bg-white"
                              />
                            </td>
                            {/* PV */}
                            <td className="py-1.5 pr-1">
                              <input
                                type="number" min={0}
                                value={item.points}
                                onChange={(e) =>
                                  setBulkFields((p) => ({
                                    ...p,
                                    items: {
                                      ...p.items,
                                      value: p.items.value.map((it, i) =>
                                        i === idx ? { ...it, points: Number(e.target.value) } : it
                                      ),
                                    },
                                  }))
                                }
                                className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white"
                              />
                            </td>
                            {/* 税率 */}
                            <td className="py-1.5">
                              <select
                                value={item.taxRate}
                                onChange={(e) =>
                                  setBulkFields((p) => ({
                                    ...p,
                                    items: {
                                      ...p.items,
                                      value: p.items.value.map((it, i) =>
                                        i === idx ? { ...it, taxRate: Number(e.target.value) } : it
                                      ),
                                    },
                                  }))
                                }
                                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full"
                              >
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
                  {/* 行追加ボタン */}
                  <div className="px-4 pb-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBulkFields((p) => ({
                          ...p,
                          items: { ...p.items, value: [...p.items.value, makeEmptyBulkItem()] },
                        }))
                      }
                      className="w-7 h-7 bg-green-500 text-white rounded font-bold text-sm hover:bg-green-600 flex items-center justify-center transition"
                    >+</button>
                    <button
                      type="button"
                      onClick={() =>
                        setBulkFields((p) => ({
                          ...p,
                          items: {
                            ...p.items,
                            value: p.items.value.length <= 1
                              ? p.items.value
                              : p.items.value.slice(0, -1),
                          },
                        }))
                      }
                      className="w-7 h-7 bg-gray-400 text-white rounded font-bold text-sm hover:bg-gray-500 flex items-center justify-center transition"
                    >−</button>
                    <span className="text-[10px] text-amber-600">
                      {bulkFields.items.value.filter((i) => i.productId).length} 商品選択中
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* フッタ */}
            <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between gap-3">
              <button
                onClick={() => setBulkFields(makeEmptyBulkFields())}
                className="px-4 py-2 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                <i className="fas fa-undo mr-1 text-[10px]" />リセット
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowBulkEdit(false); setBulkFields(makeEmptyBulkFields()); }}
                  className="px-5 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleBulkSave}
                  disabled={bulkSubmitting || Object.values(bulkFields).every((v) => !v.enabled)}
                  className="px-8 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 disabled:opacity-40 transition flex items-center gap-2"
                >
                  {bulkSubmitting ? (
                    <><i className="fas fa-spinner animate-spin text-xs" />更新中...</>
                  ) : (
                    <><i className="fas fa-check text-xs" />{selectedIds.size} 件を一括更新</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── ラベル付き行コンポーネント ────────────────────────────────
function Row({ label, children, color }: { label: string; children: React.ReactNode; color?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-medium whitespace-nowrap w-28 shrink-0 ${color ? "text-red-600" : "text-gray-600"}`}>
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
