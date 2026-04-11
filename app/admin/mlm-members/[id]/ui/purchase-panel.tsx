"use client";

import { useState, useEffect, useCallback } from "react";

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
  orderedAt: string;
  paidAt: string | null;
  note: string;
  subtotalAmount: number;
  totalAmount: number;
  items: OrderItem[];
  shippingLabel: {
    recipientName: string;
    recipientPhone: string;
    recipientPostal: string;
    recipientAddress: string;
    shippedAt: string | null;
  } | null;
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
  { value: "yamato_am", label: "午前(クロネコ)" },
  { value: "yamato_14-16", label: "14時〜16時(クロネコ)" },
  { value: "yamato_16-18", label: "16時〜18時(クロネコ)" },
  { value: "yamato_18-20", label: "18時〜20時(クロネコ)" },
  { value: "yamato_19-21", label: "19時〜21時(クロネコ)" },
  { value: "yupack_am", label: "午前(ゆうパック)" },
  { value: "yupack_12-14", label: "12時〜14時(ゆうパック)" },
  { value: "yupack_14-16", label: "14時〜16時(ゆうパック)" },
  { value: "yupack_16-18", label: "16時〜18時(ゆうパック)" },
  { value: "yupack_18-20", label: "18時〜20時(ゆうパック)" },
  { value: "yupack_19-21", label: "19時〜21時(ゆうパック)" },
];

const DETAIL_NAMES = [
  { value: "delivery", label: "納品書" },
  { value: "receipt", label: "領収書" },
];

// 空フォームの初期値
function makeEmptyForm(memberCode: string, memberName: string, memberPostal: string, memberAddress: string, memberPhone: string) {
  const today = new Date().toISOString().split("T")[0];
  return {
    // ヘッダー
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
    // 注文者情報
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
    // 配送先
    recipientCompany: "",
    recipientName: memberName,
    recipientPostal: memberPostal.replace(/-/g, ""),
    recipientPrefecture: "",
    recipientCity: memberAddress,
    recipientBuilding: "",
    recipientPhone: memberPhone,
    deliveryCenter: "",
    // 作成後BOX
    afterCreateOutbox: 0,
  };
}

// 商品行の型
type SlipItem = {
  productId: string;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  points: number;
  taxRate: number;
};

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
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState(() =>
    makeEmptyForm(memberCode, memberName || "", memberPostal || "", memberAddress || "", memberPhone || "")
  );

  const [slipItems, setSlipItems] = useState<SlipItem[]>([
    { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 },
  ]);

  // 伝票一覧取得
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mlm-members/orders?memberCode=${memberCode}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [memberCode]);

  // 商品マスター取得
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
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  // 商品選択時に価格・ポイントを自動反映
  function onProductSelect(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setSlipItems((prev) =>
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

  // 行追加・削除
  function addRow() {
    setSlipItems((prev) => [
      ...prev,
      { productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 },
    ]);
  }
  function removeRow(idx: number) {
    if (slipItems.length <= 1) return;
    setSlipItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // 合計計算
  const tax8total = slipItems
    .filter((i) => i.taxRate === 8)
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax10total = slipItems
    .filter((i) => i.taxRate === 10)
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax8 = Math.floor(tax8total * 0.08);
  const tax10 = Math.floor(tax10total * 0.1);
  const totalAmount = tax8total + tax10total + tax8 + tax10;
  const totalPoints = slipItems.reduce((s, i) => s + i.points * i.quantity, 0);

  // 伝票作成送信
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = slipItems.filter((i) => i.productId);
    if (validItems.length === 0) {
      alert("商品を1つ以上選択してください");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/mlm-members/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, memberCode, items: validItems }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "伝票作成に失敗しました");
        return;
      }
      alert(`伝票を作成しました\n注文番号: ${data.orderNumber}\n合計金額: ¥${data.totalAmount?.toLocaleString()}`);
      setShowForm(false);
      setSlipItems([{ productId: "", productCode: "", productName: "", unitPrice: 0, quantity: 1, points: 0, taxRate: 10 }]);
      setForm(makeEmptyForm(memberCode, memberName || "", memberPostal || "", memberAddress || "", memberPhone || ""));
      await fetchOrders();
    } finally {
      setSubmitting(false);
    }
  }

  // input/select helper
  const F = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ─── 入力欄スタイル
  const inp = "border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full";
  const sel = "border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full";
  const lbl = "text-[11px] text-gray-600 font-medium whitespace-nowrap";
  const fieldBg = "bg-blue-50";

  return (
    <section className="bg-white rounded-2xl border border-stone-100 p-5">
      {/* ヘッダ */}
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h2 className="text-base font-bold text-slate-800">
          <i className="fas fa-file-invoice mr-2 text-slate-600" />
          伝票・購入履歴
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition"
        >
          {showForm ? "✕ キャンセル" : "＋ 購入履歴追加（伝票作成）"}
        </button>
      </div>

      {/* ══════════════════════════════════════════
          伝票作成フォーム
      ══════════════════════════════════════════ */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 border border-blue-200 rounded-xl overflow-hidden">
          {/* フォームタイトル */}
          <div className="bg-blue-600 text-white px-4 py-2 text-sm font-bold">伝票作成</div>

          <div className="p-4 space-y-4">
            {/* ── ヘッダー情報グリッド ────────────────── */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {/* 左列 */}
              <div className="space-y-2">
                {/* 注文日 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24 text-red-600`}>注文日</span>
                  <input type="date" value={form.orderedAt} onChange={(e) => F("orderedAt", e.target.value)} className={`${inp} ${fieldBg} w-36`} />
                </div>
                {/* 発送日 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24`}>発送日</span>
                  <input type="date" value={form.shippedAt} onChange={(e) => F("shippedAt", e.target.value)} className={`${inp} w-36`} />
                </div>
                {/* 入金日 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24`}>入金日</span>
                  <input type="date" value={form.paidAt} onChange={(e) => F("paidAt", e.target.value)} className={`${inp} w-36`} />
                </div>
                {/* 支払方法 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24 text-red-600`}>支払方法</span>
                  <select value={form.paymentMethod} onChange={(e) => F("paymentMethod", e.target.value)} className={`${sel} ${fieldBg} w-32`}>
                    {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <span className={lbl}>種別</span>
                  <select value={form.slipType} onChange={(e) => F("slipType", e.target.value)} className={`${sel} w-28`}>
                    {SLIP_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {/* 配達希望日 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24`}>配達希望日</span>
                  <input type="date" value={form.deliveryDate} onChange={(e) => F("deliveryDate", e.target.value)} className={`${inp} w-36`} />
                </div>
                {/* 配達希望時間帯 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24`}>配達希望時間帯</span>
                  <select value={form.deliveryTime} onChange={(e) => F("deliveryTime", e.target.value)} className={`${sel} w-48`}>
                    {DELIVERY_TIMES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                {/* 同梱先ID */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-24`}>同梱先 ID</span>
                  <input value={form.bundleTargetId} onChange={(e) => F("bundleTargetId", e.target.value)} className={`${inp} w-28`} />
                </div>
              </div>

              {/* 右列 */}
              <div className="space-y-2">
                {/* 配送伝票番号 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-28`}>配送伝票番号</span>
                  <input value={form.deliverySlipNo} onChange={(e) => F("deliverySlipNo", e.target.value)} className={`${inp} flex-1`} />
                </div>
                {/* オートシップNo */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-28`}>オートシップNo</span>
                  <input value={form.autoshipNo} onChange={(e) => F("autoshipNo", e.target.value)} className={`${inp} flex-1`} />
                </div>
                {/* 課税方法 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-28`}>課税方法</span>
                  <select value={form.taxMethod} onChange={(e) => F("taxMethod", e.target.value)} className={`${sel} w-24`}>
                    <option value="external">外税</option>
                    <option value="internal">内税</option>
                    <option value="none">非課税</option>
                  </select>
                </div>
                {/* 支払い名義人 */}
                <div className="flex items-center gap-2">
                  <span className={`${lbl} w-28`}>支払い名義人</span>
                  <input value={form.paymentHolder} onChange={(e) => F("paymentHolder", e.target.value)} className={`${inp} flex-1`} />
                </div>
              </div>
            </div>

            {/* ── 注文者情報 ＋ 配送先 ───────────────── */}
            <div className="grid grid-cols-2 gap-4">
              {/* 注文者情報 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 flex items-center gap-2">
                  <span>注文者情報</span>
                  <button type="button" className="text-blue-600 hover:underline text-[10px]">郵便番号検索</button>
                </div>
                <div className="p-3 space-y-1.5 text-xs">
                  <Row label="会員ID" color>
                    <input value={form.ordererMemberId} onChange={(e) => F("ordererMemberId", e.target.value)} className={`${inp} ${fieldBg}`} />
                  </Row>
                  <Row label="法人名" color>
                    <input value={form.ordererCompany} onChange={(e) => F("ordererCompany", e.target.value)} className={`${inp} ${fieldBg}`} />
                  </Row>
                  <Row label="氏名" color>
                    <input value={form.ordererName} onChange={(e) => F("ordererName", e.target.value)} className={`${inp} ${fieldBg}`} />
                  </Row>
                  <Row label="郵便番号" color>
                    <div className="flex gap-1">
                      <input value={form.ordererPostal} onChange={(e) => F("ordererPostal", e.target.value)} className={`${inp} ${fieldBg} w-24`} placeholder="例:1234567" />
                      <span className={lbl}>都道府県</span>
                      <input value={form.ordererPrefecture} onChange={(e) => F("ordererPrefecture", e.target.value)} className={`${inp} ${fieldBg} w-20`} />
                    </div>
                  </Row>
                  <Row label="市区町村番地" color>
                    <input value={form.ordererCity} onChange={(e) => F("ordererCity", e.target.value)} className={`${inp} ${fieldBg}`} />
                  </Row>
                  <Row label="建物名・部屋番号" color>
                    <input value={form.ordererBuilding} onChange={(e) => F("ordererBuilding", e.target.value)} className={`${inp} ${fieldBg}`} />
                  </Row>
                  <Row label="電話番号">
                    <input value={form.ordererPhone} onChange={(e) => F("ordererPhone", e.target.value)} className={inp} />
                  </Row>
                  <Row label="備考">
                    <input value={form.ordererNote} onChange={(e) => F("ordererNote", e.target.value)} className={inp} />
                  </Row>
                  <Row label="備考(納品書)">
                    <input value={form.ordererNoteSlip} onChange={(e) => F("ordererNoteSlip", e.target.value)} className={inp} />
                  </Row>
                  <Row label="明細名称">
                    <select value={form.detailName} onChange={(e) => F("detailName", e.target.value)} className={sel}>
                      {DETAIL_NAMES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </Row>
                </div>
              </div>

              {/* 配送先 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>配送先</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline text-[10px]"
                      onClick={() => setForm((f) => ({
                        ...f,
                        recipientCompany: f.ordererCompany,
                        recipientName: f.ordererName,
                        recipientPostal: f.ordererPostal,
                        recipientPrefecture: f.ordererPrefecture,
                        recipientCity: f.ordererCity,
                        recipientBuilding: f.ordererBuilding,
                        recipientPhone: f.ordererPhone,
                      }))}
                    >コピー</button>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 text-[10px]"
                      onClick={() => setForm((f) => ({
                        ...f,
                        recipientCompany: "",
                        recipientName: "",
                        recipientPostal: "",
                        recipientPrefecture: "",
                        recipientCity: "",
                        recipientBuilding: "",
                        recipientPhone: "",
                      }))}
                    >クリア</button>
                    <button type="button" className="text-blue-600 hover:underline text-[10px]">郵便番号検索</button>
                  </div>
                </div>
                <div className="p-3 space-y-1.5 text-xs">
                  <Row label="法人名">
                    <input value={form.recipientCompany} onChange={(e) => F("recipientCompany", e.target.value)} className={inp} />
                  </Row>
                  <Row label="氏名">
                    <input value={form.recipientName} onChange={(e) => F("recipientName", e.target.value)} className={inp} />
                  </Row>
                  <Row label="郵便番号">
                    <div className="flex gap-1">
                      <input value={form.recipientPostal} onChange={(e) => F("recipientPostal", e.target.value)} className={`${inp} w-24`} placeholder="例:1234567" />
                      <span className={lbl}>都道府県</span>
                      <input value={form.recipientPrefecture} onChange={(e) => F("recipientPrefecture", e.target.value)} className={`${inp} w-20`} />
                    </div>
                  </Row>
                  <Row label="市区町村番地">
                    <input value={form.recipientCity} onChange={(e) => F("recipientCity", e.target.value)} className={inp} />
                  </Row>
                  <Row label="建物名・部屋番号">
                    <input value={form.recipientBuilding} onChange={(e) => F("recipientBuilding", e.target.value)} className={inp} />
                  </Row>
                  <Row label="配送センター">
                    <select value={form.deliveryCenter} onChange={(e) => F("deliveryCenter", e.target.value)} className={sel}>
                      <option value="">未選択</option>
                      <option value="hand">手渡し</option>
                      <option value="big1">第14Bigセンター</option>
                      <option value="big2">第2Bigセンター</option>
                    </select>
                  </Row>
                  <Row label="電話番号">
                    <input value={form.recipientPhone} onChange={(e) => F("recipientPhone", e.target.value)} className={inp} />
                  </Row>
                </div>
              </div>
            </div>

            {/* ── 商品テーブル ────────────────────────── */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-800 text-white px-3 py-1.5 text-xs font-bold">
                {form.ordererMemberId ? `${form.ordererMemberId}` : "ビジネス会員"}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[700px]">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2 text-left w-8"></th>
                      <th className="px-2 py-2 text-left">商品</th>
                      <th className="px-2 py-2 text-right w-24">価格</th>
                      <th className="px-2 py-2 text-center w-16">個数</th>
                      <th className="px-2 py-2 text-right w-20">ポイント</th>
                      <th className="px-2 py-2 text-right w-24">ポイント小計</th>
                      <th className="px-2 py-2 text-right w-24">小計</th>
                      <th className="px-2 py-2 text-center w-20">税率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slipItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        {/* 削除ボタン */}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-gray-300 hover:text-red-500 text-xs"
                            title="行を削除"
                          >
                            <i className="fas fa-times text-gray-400" />
                          </button>
                        </td>
                        {/* 商品選択 */}
                        <td className="px-2 py-1.5">
                          <select
                            value={item.productId}
                            onChange={(e) => onProductSelect(idx, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-full focus:ring-1 focus:ring-blue-400"
                          >
                            <option value=""></option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.product_code} - {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* 価格 */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number" min={0}
                            value={item.unitPrice}
                            onChange={(e) => setSlipItems((prev) => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white"
                          />
                        </td>
                        {/* 個数 */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number" min={1}
                            value={item.quantity}
                            onChange={(e) => setSlipItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs text-center w-full bg-white"
                          />
                        </td>
                        {/* ポイント */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number" min={0}
                            value={item.points}
                            onChange={(e) => setSlipItems((prev) => prev.map((it, i) => i === idx ? { ...it, points: Number(e.target.value) } : it))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs text-right w-full bg-white"
                          />
                        </td>
                        {/* ポイント小計 */}
                        <td className="px-2 py-1.5 text-right font-medium text-blue-700">
                          {(item.points * item.quantity).toLocaleString()}
                        </td>
                        {/* 小計 */}
                        <td className="px-2 py-1.5 text-right font-medium">
                          {(item.unitPrice * item.quantity).toLocaleString()}
                        </td>
                        {/* 税率 */}
                        <td className="px-2 py-1.5">
                          <select
                            value={item.taxRate}
                            onChange={(e) => setSlipItems((prev) => prev.map((it, i) => i === idx ? { ...it, taxRate: Number(e.target.value) } : it))}
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

              {/* 行追加・削除ボタン */}
              <div className="px-3 py-2 flex gap-2">
                <button type="button" onClick={addRow}
                  className="w-7 h-7 bg-green-500 text-white rounded font-bold text-sm hover:bg-green-600 flex items-center justify-center">+</button>
                <button type="button" onClick={() => slipItems.length > 1 && removeRow(slipItems.length - 1)}
                  className="w-7 h-7 bg-gray-400 text-white rounded font-bold text-sm hover:bg-gray-500 flex items-center justify-center">−</button>
              </div>

              {/* 合計欄 */}
              <div className="border-t border-gray-200 px-4 py-3 flex justify-end">
                <table className="text-xs">
                  <tbody>
                    <tr>
                      <td className="px-3 py-0.5 text-right text-gray-600">外税（8%）</td>
                      <td className="px-3 py-0.5 text-right font-medium w-24">¥{tax8.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-0.5 text-right text-gray-600">外税（10%）</td>
                      <td className="px-3 py-0.5 text-right font-medium">¥{tax10.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t border-gray-300">
                      <td className="px-3 py-1 text-right font-bold text-gray-800">合計</td>
                      <td className="px-3 py-1 text-right font-bold text-gray-900 text-sm">¥{totalAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-0.5 text-right text-gray-600">ポイント合計</td>
                      <td className="px-3 py-0.5 text-right font-medium text-blue-700">{totalPoints.toLocaleString()}pt</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 作成後BOX + 伝票作成ボタン ─────────── */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={form.afterCreateOutbox > 0}
                  onChange={(e) => F("afterCreateOutbox", e.target.checked ? 1 : 0)}
                />
                作成後
                <select
                  value={form.afterCreateOutbox || 1}
                  onChange={(e) => F("afterCreateOutbox", Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  disabled={form.afterCreateOutbox === 0}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>出庫BOX{n}</option>
                  ))}
                </select>
                に入れる
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="px-12 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "作成中..." : "伝票作成"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════
          伝票一覧
      ══════════════════════════════════════════ */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-sm">伝票データなし</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2 text-left">注文日</th>
                <th className="px-3 py-2 text-left">注文番号</th>
                <th className="px-3 py-2 text-left">種別</th>
                <th className="px-3 py-2 text-left">支払方法</th>
                <th className="px-3 py-2 text-center">入金</th>
                <th className="px-3 py-2 text-center">発送</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-right">合計pt</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="border-b hover:bg-violet-50 cursor-pointer transition"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <td className="px-3 py-2">{order.orderedAt.slice(0, 10)}</td>
                    <td className="px-3 py-2 font-mono text-blue-700">{order.orderNumber}</td>
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
                  </tr>
                  {/* 展開詳細 */}
                  {expandedId === order.id && (
                    <tr key={`${order.id}-detail`}>
                      <td colSpan={8} className="bg-violet-50/40 px-4 py-3 border-b border-violet-100">
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
              ))}
            </tbody>
          </table>
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
