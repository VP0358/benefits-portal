"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search, RefreshCw, ChevronDown, ChevronUp, Download, Upload,
  Package, CheckSquare, Square, Truck, CreditCard, AlertCircle,
  FileText, ArrowRight, Box, ChevronLeft, ChevronRight
} from "lucide-react"

// ─── 型定義 ───────────────────────────────────────────
type PaymentStatus  = "unpaid" | "paid" | "ignored"
type ShippingStatus = "unshipped" | "shipped" | "ignored"

interface OrderItem {
  id: number; productName: string; productCode: string
  quantity: number; unitPrice: number; lineAmount: number
}
interface ShippingLabel {
  id: number; carrier: string; trackingNumber: string | null; status: string
  recipientName: string; recipientPhone: string; recipientPostal: string; recipientAddress: string
  itemDescription: string; itemCount: number; deliveryType: string | null
  printedAt: string | null; shippedAt: string | null
}
interface Order {
  id: number; orderNumber: string; status: string
  slipType: string; slipTypeLabel: string
  paymentMethod: string; paymentMethodLabel: string
  paymentStatus: PaymentStatus; shippingStatus: ShippingStatus
  outboxNo: number; paidAt: string | null; note: string | null; noteSlip: string | null
  subtotalAmount: number; usedPoints: number; totalAmount: number
  orderedAt: string; createdAt: string
  memberCode: string; memberName: string; memberEmail: string
  items: OrderItem[]; shippingLabel: ShippingLabel | null
}
interface SummaryRow { [pm: string]: number }
interface Summary {
  prevUnpaidCount: number; totalUnpaid: number; totalUnshipped: number
  thisMonth: { unpaid: SummaryRow; unshipped: SummaryRow }
  lastMonth: { unpaid: SummaryRow; unshipped: SummaryRow }
  paymentMethods: string[]
  outboxCounts: Record<number, number>
}

// ─── 定数 ─────────────────────────────────────────────
const PM_LABELS: Record<string,string> = {
  bank_transfer: "口座振替", card: "カード", credit_card: "カード",
  direct_debit: "口座振替", cod: "代引き", bank_payment: "銀行振込",
  convenience: "コンビニ", other: "その他",
}
const PM_SUMMARY_LABELS: Record<string,string> = {
  bank_transfer: "振替(銀行)", card: "カード", credit_card: "カード",
  direct_debit: "振替(口座)", cod: "代引", bank_payment: "振込",
  convenience: "コンビニ", other: "その他",
}
const SLIP_TYPES = [
  { value: "", label: "全て" },
  { value: "new_member",  label: "新規" },
  { value: "one_time",    label: "都度購入" },
  { value: "autoship",    label: "オートシップ" },
  { value: "return",      label: "返品" },
  { value: "cooling_off", label: "クーリングオフ" },
  { value: "exchange",    label: "交換" },
  { value: "cancel",      label: "キャンセル" },
  { value: "additional",  label: "追加" },
  { value: "present",     label: "プレゼント" },
  { value: "web",         label: "Web" },
  { value: "other",       label: "その他" },
]
const PAYMENT_METHODS = [
  { value: "", label: "全て" },
  { value: "bank_transfer",  label: "口座振替" },
  { value: "card",           label: "カード" },
  { value: "bank_payment",   label: "銀行振込" },
  { value: "cod",            label: "代引き" },
  { value: "convenience",    label: "コンビニ" },
  { value: "other",          label: "その他" },
]
const DATE_TYPES = [
  { value: "orderedAt",  label: "注文日" },
  { value: "paidAt",     label: "入金日" },
  { value: "shippedAt",  label: "発送日" },
  { value: "createdAt",  label: "伝票作成日" },
]
const PAY_STATUS_OPTS = [{ value: "", label: "無制限" }, { value: "unpaid", label: "未完了" }, { value: "paid", label: "完了" }, { value: "ignored", label: "無視" }]
const SHIP_STATUS_OPTS = [{ value: "", label: "無制限" }, { value: "unshipped", label: "未完了" }, { value: "shipped", label: "完了" }, { value: "ignored", label: "無視" }]
const BULK_ACTIONS = [
  { value: "", label: "備考に" },
  { value: "setNote", label: "備考に" },
  { value: "setNoteSlip", label: "備考(納品書)に" },
  { value: "setNoteAll", label: "備考・備考(納品書)に" },
]

function getThisMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split("T")[0],
    end:   end.toISOString().split("T")[0],
  }
}
function offsetMonth(dateStr: string, offset: number) {
  const d = new Date(dateStr + "-01")
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

// ─── メインコンポーネント ───────────────────────────────
export default function OrdersShippingPage() {
  const router = useRouter()
  const today = new Date()
  const { start: mStart, end: mEnd } = getThisMonthRange()

  // 検索フィルター
  const [dateType,       setDateType]       = useState("orderedAt")
  const [startDate,      setStartDate]      = useState(mStart)
  const [endDate,        setEndDate]        = useState(mEnd)
  const [slipType,       setSlipType]       = useState("")
  const [paymentMethod,  setPaymentMethod]  = useState("")
  const [paymentStatus,  setPaymentStatus]  = useState("")
  const [shippingStatus, setShippingStatus] = useState("")
  const [keyword,        setKeyword]        = useState("")

  // 結果
  const [orders,   setOrders]   = useState<Order[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // サマリー
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // 出庫BOX
  const [selectedOutbox,   setSelectedOutbox]   = useState(1)
  const [moveTargetOutbox, setMoveTargetOutbox]  = useState(1)
  const [moveFromOutbox,   setMoveFromOutbox]    = useState(1)
  const [moveToOutbox,     setMoveToOutbox]      = useState(2)

  // 一括処理
  const [bulkAction,    setBulkAction]    = useState("")
  const [bulkNote,      setBulkNote]      = useState("")
  const [bulkPaidDate,  setBulkPaidDate]  = useState(today.toISOString().split("T")[0])
  const [bulkDateType,  setBulkDateType]  = useState("paidAt") // paidAt / shippedAt / orderedAt
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // CSV取込
  const yamotoInputRef = useRef<HTMLInputElement>(null)
  const debitInputRef  = useRef<HTMLInputElement>(null)

  // ─── 月ナビ ─────────────────────────────────────────
  const shiftMonth = (offset: number) => {
    const ym = startDate.slice(0, 7)
    const newYm = offsetMonth(ym, offset)
    const [y, m] = newYm.split("-").map(Number)
    const s = new Date(y, m - 1, 1)
    const e = new Date(y, m, 0)
    setStartDate(s.toISOString().split("T")[0])
    setEndDate(e.toISOString().split("T")[0])
  }

  // ─── 検索 ───────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const p = new URLSearchParams()
      if (startDate)     p.set("startDate",      startDate)
      if (endDate)       p.set("endDate",        endDate)
      if (dateType)      p.set("dateType",       dateType)
      if (slipType)      p.set("slipType",       slipType)
      if (paymentMethod) p.set("paymentMethod",  paymentMethod)
      if (paymentStatus) p.set("paymentStatus",  paymentStatus)
      if (shippingStatus)p.set("shippingStatus", shippingStatus)
      if (keyword)       p.set("keyword",        keyword)
      const res  = await fetch(`/api/admin/orders-shipping?${p}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setSearched(true)
    } catch { alert("取得エラー") }
    finally  { setLoading(false) }
  }, [startDate, endDate, dateType, slipType, paymentMethod, paymentStatus, shippingStatus, keyword])

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res  = await fetch("/api/admin/orders-shipping?summaryOnly=true")
      const data = await res.json()
      setSummary(data.summary)
    } catch { console.error("summary error") }
    finally  { setSummaryLoading(false) }
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  // ─── 選択 ───────────────────────────────────────────
  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(selected.size === orders.length ? new Set() : new Set(orders.map(o => o.id)))

  // ─── 出庫BOX操作 ────────────────────────────────────
  const putToOutbox = async (outbox: number) => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    await bulkPatch("setOutbox", outbox, Array.from(selected))
    fetchSummary()
    fetchOrders()
  }
  const removeFromOutbox = async (outbox: number) => {
    const ids = orders.filter(o => o.outboxNo === outbox).map(o => o.id)
    if (ids.length === 0) { alert("対象伝票がありません"); return }
    await bulkPatch("setOutbox", 0, ids)
    fetchSummary()
    fetchOrders()
  }
  const moveAllInOutbox = async (from: number, to: number) => {
    const ids = orders.filter(o => o.outboxNo === from).map(o => o.id)
    if (ids.length === 0) { alert("対象伝票がありません"); return }
    await bulkPatch("setOutbox", to, ids)
    fetchSummary()
    fetchOrders()
  }
  const showOutbox = async (outbox: number) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/orders-shipping?outboxNo=${outbox}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setSearched(true)
    } catch { alert("取得エラー") }
    finally  { setLoading(false) }
  }

  // ─── 一括処理 ────────────────────────────────────────
  const bulkPatch = async (action: string, value: unknown, ids?: number[]) => {
    const targetIds = ids || Array.from(selected)
    if (targetIds.length === 0) return
    const res = await fetch("/api/admin/orders-shipping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: targetIds, action, value }),
    })
    if (!res.ok) { alert("更新に失敗しました"); return }
    return await res.json()
  }

  const handleBulkExecute = async () => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    if (!bulkAction && !bulkNote) { alert("アクションを選択してください"); return }
    setBulkProcessing(true)
    try {
      if (bulkNote && bulkAction) {
        const action = bulkAction === "setNoteAll" ? "setNote" : bulkAction
        await bulkPatch(action, bulkNote)
        if (bulkAction === "setNoteAll") await bulkPatch("setNoteSlip", bulkNote)
      }
      fetchOrders()
      setBulkNote("")
    } catch { alert("処理に失敗しました") }
    finally  { setBulkProcessing(false) }
  }

  const handleSetBulkDate = async () => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    const actionMap: Record<string, string> = {
      paidAt:    "setPaidAt",
      shippedAt: "setShippedAt",
      orderedAt: "setOrderedAt",
    }
    await bulkPatch(actionMap[bulkDateType] || "setPaidAt", bulkPaidDate)
    fetchSummary(); fetchOrders()
  }

  const handleSetShipped = async () => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    await bulkPatch("setShippingStatus", "shipped")
    fetchSummary(); fetchOrders()
  }

  // 納品書ページへ遷移（選択IDをクエリパラメータで渡す）
  const handleGoDeliveryNote = (type: "delivery" | "receipt" = "delivery") => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    const ids = Array.from(selected).join(",")
    router.push(`/admin/orders-shipping/delivery-note?ids=${ids}&type=${type}`)
  }

  // ─── CSV出力 ─────────────────────────────────────────
  const exportCSV = () => {
    const target = selected.size > 0 ? orders.filter(o => selected.has(o.id)) : orders
    if (target.length === 0) { alert("伝票がありません"); return }
    const headers = ["注文番号","注文日","入金日","会員コード","氏名","支払方法","伝票種別","入金状態","発送状態","金額","出庫BOX","追跡番号","備考"]
    const rows = target.map(o => [
      o.orderNumber,
      o.orderedAt.slice(0,10),
      o.paidAt?.slice(0,10) || "",
      o.memberCode, o.memberName,
      o.paymentMethodLabel, o.slipTypeLabel,
      o.paymentStatus === "paid" ? "入金済" : o.paymentStatus === "ignored" ? "無視" : "未入金",
      o.shippingStatus === "shipped" ? "発送済" : o.shippingStatus === "ignored" ? "無視" : "未発送",
      o.totalAmount,
      o.outboxNo > 0 ? `BOX${o.outboxNo}` : "",
      o.shippingLabel?.trackingNumber || "",
      o.note || "",
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url; a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ─── ヤマトCSV取込 ───────────────────────────────────
  const handleYamatoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData(); fd.append("file", file)
    const res  = await fetch("/api/admin/orders-shipping/import-yamato", { method: "POST", body: fd })
    const data = await res.json()
    alert(`取込完了: 成功${data.successCount}件 / エラー${data.errorCount}件\n${data.errors?.join("\n") || ""}`)
    fetchOrders(); fetchSummary()
    if (yamotoInputRef.current) yamotoInputRef.current.value = ""
  }

  // ─── 口座振替CSV取込 ──────────────────────────────────
  const handleDebitImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData(); fd.append("file", file)
    const res  = await fetch("/api/admin/orders-shipping/import-debit", { method: "POST", body: fd })
    const data = await res.json()
    alert(`取込完了: 入金${data.successCount}件 / 未入金${data.failCount}件 / エラー${data.errorCount}件`)
    fetchOrders(); fetchSummary()
    if (debitInputRef.current) debitInputRef.current.value = ""
  }

  // ─── 出庫BOXドロップダウン選択肢 ────────────────────────
  const outboxOptions = (cur: number) =>
    Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
      <option key={n} value={n}>
        出庫BOX{n}：({summary?.outboxCounts[n] ?? 0})
      </option>
    ))

  // ─── レンダリング ────────────────────────────────────
  return (
    <div className="space-y-4 text-sm">
      {/* ── ページタイトル ── */}
      <div className="rounded-2xl bg-white border border-stone-100 px-5 py-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: "#c9a84c" }}>Order & Shipping</p>
        <h1 className="text-xl font-bold text-stone-900">受注・発送状況</h1>
      </div>

      {/* ══════════════════════════════════════════════
          検索セクション
      ══════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="bg-blue-600 px-4 py-2 text-white font-semibold text-sm">検索</div>
        <div className="p-4 space-y-3">

          {/* 期間設定行 */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={dateType} onChange={e => setDateType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {DATE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <span className="text-gray-500">〜</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <button onClick={() => shiftMonth(-1)}
              className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />前月
            </button>
            <button onClick={() => { const { start, end } = getThisMonthRange(); setStartDate(start); setEndDate(end) }}
              className="px-2 py-1 border border-blue-400 text-blue-600 rounded text-sm hover:bg-blue-50">当月</button>
            <button onClick={() => shiftMonth(1)}
              className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1">
              次月<ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 絞り込み行 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 伝票種別 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">種別</span>
              <select value={slipType} onChange={e => setSlipType(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[120px]">
                {SLIP_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {/* 支払方法 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">支払</span>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[120px]">
                {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {/* 入金チェック */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">入金</span>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[100px]">
                {PAY_STATUS_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {/* 発送チェック */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">発送</span>
              <select value={shippingStatus} onChange={e => setShippingStatus(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[100px]">
                {SHIP_STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* キーワード + 検索ボタン */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchOrders()}
              placeholder="注文番号・氏名・商品名・追跡番号"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-64"
            />
            <button onClick={fetchOrders} disabled={loading}
              className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              検索
            </button>
            <button onClick={() => { setSlipType(""); setPaymentMethod(""); setPaymentStatus(""); setShippingStatus(""); setKeyword(""); setOrders([]); setSearched(false) }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
              クリア
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          出庫BOXセクション
      ══════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="bg-blue-600 px-4 py-2 text-white font-semibold text-sm flex items-center gap-2">
          <Box className="w-4 h-4" />出庫BOX
        </div>
        <div className="p-4 space-y-2">
          {/* 表示・に入れる・から出す */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedOutbox} onChange={e => setSelectedOutbox(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {Array.from({length:10},(_,i)=>i+1).map(n=>(
                <option key={n} value={n}>出庫BOX{n}：({summary?.outboxCounts[n]??0})</option>
              ))}
            </select>
            <button onClick={() => showOutbox(selectedOutbox)}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-300 rounded text-sm hover:bg-blue-200">
              を表示する
            </button>
            <span className="text-gray-400">|</span>
            <select value={moveTargetOutbox} onChange={e => setMoveTargetOutbox(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {outboxOptions(moveTargetOutbox)}
            </select>
            <button onClick={() => putToOutbox(moveTargetOutbox)}
              className="px-3 py-1.5 bg-green-100 text-green-700 border border-green-300 rounded text-sm hover:bg-green-200 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />に入れる
            </button>
            <button onClick={() => removeFromOutbox(selectedOutbox)}
              className="px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-300 rounded text-sm hover:bg-orange-200">
              から出す
            </button>
          </div>
          {/* 全件移動 */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={moveFromOutbox} onChange={e => setMoveFromOutbox(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {outboxOptions(moveFromOutbox)}
            </select>
            <span className="text-gray-500">→</span>
            <select value={moveToOutbox} onChange={e => setMoveToOutbox(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {outboxOptions(moveToOutbox)}
            </select>
            <button onClick={() => moveAllInOutbox(moveFromOutbox, moveToOutbox)}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-300 rounded text-sm hover:bg-purple-200">
              へ全件移動する
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          一括処理セクション
      ══════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="bg-blue-600 px-4 py-2 text-white font-semibold text-sm">一括処理</div>
        <div className="p-4 space-y-3">
          {/* 備考一括入力 */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[160px]">
              {BULK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <input type="text" value={bulkNote} onChange={e => setBulkNote(e.target.value)}
              placeholder="入力テキスト"
              className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[200px]" />
            <button onClick={handleBulkExecute} disabled={bulkProcessing}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              一括入力実行
            </button>
          </div>
          {/* 日付一括設定 */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkDateType}
              onChange={e => setBulkDateType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[90px]"
            >
              <option value="paidAt">入金日</option>
              <option value="shippedAt">発送日</option>
              <option value="orderedAt">注文日</option>
            </select>
            <span className="text-xs text-gray-500">を</span>
            <input type="date" value={bulkPaidDate} onChange={e => setBulkPaidDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <button onClick={handleSetBulkDate}
              className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200">
              にする
            </button>
            <button onClick={() => setBulkPaidDate(today.toISOString().split("T")[0])}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
              クリア
            </button>
          </div>
          {/* 操作ボタン群 */}
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-400 rounded text-sm hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" />伝票CSV出力
            </button>
            {/* 納品書ボタン → 納品書・出庫リストページへ遷移 */}
            <button
              onClick={() => handleGoDeliveryNote("delivery")}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-400 text-indigo-700 rounded text-sm hover:bg-indigo-50 font-medium"
              title="選択した伝票の納品書・出庫リストページへ移動">
              <FileText className="w-3.5 h-3.5" />納品書
            </button>
            {/* 領収書ボタン → 同じページへ遷移（領収書タブ） */}
            <button
              onClick={() => handleGoDeliveryNote("receipt")}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-green-400 text-green-700 rounded text-sm hover:bg-green-50 font-medium"
              title="選択した伝票の領収書を作成・ダウンロード">
              <FileText className="w-3.5 h-3.5" />領収書
            </button>
            <button onClick={handleSetShipped}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-green-400 text-green-700 rounded text-sm hover:bg-green-50">
              <Truck className="w-3.5 h-3.5" />発送完了処理
            </button>
            {/* ヤマトCSV取込 */}
            <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-orange-400 text-orange-700 rounded text-sm hover:bg-orange-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />発送CSV取込(ヤマト)
              <input ref={yamotoInputRef} type="file" accept=".csv" className="hidden" onChange={handleYamatoImport} />
            </label>
            {/* 口座振替CSV取込 */}
            <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-400 text-blue-700 rounded text-sm hover:bg-blue-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />振替結果CSV取込
              <input ref={debitInputRef} type="file" accept=".csv" className="hidden" onChange={handleDebitImport} />
            </label>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          未処理伝票サマリー
      ══════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="bg-blue-600 px-4 py-2 text-white font-semibold text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />未処理伝票</span>
          {summary && (
            <div className="flex gap-4 text-xs">
              <button onClick={() => { setPaymentStatus("unpaid"); setStartDate(""); setEndDate(""); fetchOrders() }}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded">
                当月以前未入金（{summary.prevUnpaidCount}件）
              </button>
              <button onClick={() => { setPaymentStatus("unpaid"); fetchOrders() }}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded">
                未入金（{summary.totalUnpaid}件）
              </button>
              <button onClick={() => { setShippingStatus("unshipped"); fetchOrders() }}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded">
                未発送（{summary.totalUnshipped}件）
              </button>
            </div>
          )}
        </div>

        {summaryLoading ? (
          <div className="p-4 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : summary ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium w-16"></th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium w-20"></th>
                  {summary.paymentMethods.map(pm => (
                    <th key={pm} className="px-3 py-2 text-center text-gray-600 font-medium">
                      {PM_SUMMARY_LABELS[pm] || pm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "当月", rowLabel: "未入金",  data: summary.thisMonth.unpaid },
                  { label: "",    rowLabel: "未発送",  data: summary.thisMonth.unshipped },
                  { label: "先月", rowLabel: "未入金",  data: summary.lastMonth.unpaid },
                  { label: "",    rowLabel: "未発送",  data: summary.lastMonth.unshipped },
                ].map((row, ri) => (
                  <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    <td className="px-3 py-2 text-gray-700 font-medium text-xs">{row.label}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{row.rowLabel}</td>
                    {summary.paymentMethods.map(pm => (
                      <td key={pm} className="px-3 py-2 text-center">
                        {(row.data[pm] || 0) > 0 ? (
                          <span className="text-blue-600 font-medium cursor-pointer hover:underline"
                            onClick={() => {
                              setPaymentMethod(pm)
                              setPaymentStatus(row.rowLabel === "未入金" ? "unpaid" : "")
                              setShippingStatus(row.rowLabel === "未発送" ? "unshipped" : "")
                              fetchOrders()
                            }}>
                            {row.data[pm]}件
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* ══════════════════════════════════════════════
          伝票一覧テーブル
      ══════════════════════════════════════════════ */}
      {searched && (
        <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {/* ヘッダバー */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                {selected.size === orders.length && orders.length > 0
                  ? <CheckSquare className="w-4 h-4 text-blue-600" />
                  : <Square className="w-4 h-4" />}
                全選択
              </button>
              {selected.size > 0 && (
                <span className="text-xs text-blue-600 font-medium">{selected.size}件選択中</span>
              )}
              <span className="text-xs text-gray-500">計 {orders.length}件</span>
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-1 text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" />CSV出力
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">検索中...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">該当する伝票がありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-left">
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-2 py-2">種別</th>
                    <th className="px-2 py-2">注文日</th>
                    <th className="px-2 py-2">入金日</th>
                    <th className="px-2 py-2">会員ID</th>
                    <th className="px-2 py-2">氏名/配送先</th>
                    <th className="px-2 py-2">支払方法</th>
                    <th className="px-2 py-2">ステイタス</th>
                    <th className="px-2 py-2 text-right">金額</th>
                    <th className="px-2 py-2 text-center">出庫BOX</th>
                    <th className="px-2 py-2">伝票作成</th>
                    <th className="px-2 py-2">備考</th>
                    <th className="px-2 py-2">備考(納品)</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <>
                      <tr key={order.id}
                        className={`border-b border-gray-100 cursor-pointer transition-colors
                          ${selected.has(order.id) ? "bg-blue-50" : "hover:bg-stone-50"}`}
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                        {/* チェックボックス */}
                        <td className="px-2 py-2" onClick={e => { e.stopPropagation(); toggleSelect(order.id) }}>
                          {selected.has(order.id)
                            ? <CheckSquare className="w-4 h-4 text-blue-600" />
                            : <Square className="w-4 h-4 text-gray-300" />}
                        </td>
                        {/* 種別 */}
                        <td className="px-2 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700">
                            {order.slipTypeLabel}
                          </span>
                        </td>
                        {/* 注文日 */}
                        <td className="px-2 py-2 text-gray-700 whitespace-nowrap">
                          {order.orderedAt.slice(0,10)}
                        </td>
                        {/* 入金日 */}
                        <td className="px-2 py-2 whitespace-nowrap">
                          {order.paidAt
                            ? <span className="text-green-700">{order.paidAt.slice(0,10)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        {/* 会員ID */}
                        <td className="px-2 py-2 text-gray-600 font-mono">{order.memberCode}</td>
                        {/* 氏名 */}
                        <td className="px-2 py-2">
                          <div className="text-gray-800 font-medium">{order.memberName}</div>
                          {order.shippingLabel && (
                            <div className="text-gray-400 text-xs">{order.shippingLabel.recipientName}</div>
                          )}
                        </td>
                        {/* 支払方法 */}
                        <td className="px-2 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            order.paymentMethod === "card" || order.paymentMethod === "credit_card"
                              ? "bg-blue-50 text-blue-700"
                              : order.paymentMethod === "bank_transfer"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {order.paymentMethodLabel}
                          </span>
                        </td>
                        {/* ステイタス */}
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs w-fit ${
                              order.paymentStatus === "paid"
                                ? "bg-green-100 text-green-700"
                                : order.paymentStatus === "ignored"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-red-50 text-red-600"
                            }`}>
                              {order.paymentStatus === "paid" ? "入金済" : order.paymentStatus === "ignored" ? "無視" : "未入金"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs w-fit ${
                              order.shippingStatus === "shipped"
                                ? "bg-green-100 text-green-700"
                                : order.shippingStatus === "ignored"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-orange-50 text-orange-600"
                            }`}>
                              {order.shippingStatus === "shipped" ? "発送済" : order.shippingStatus === "ignored" ? "無視" : "未発送"}
                            </span>
                          </div>
                        </td>
                        {/* 金額 */}
                        <td className="px-2 py-2 text-right font-medium text-gray-800">
                          ¥{order.totalAmount.toLocaleString()}
                        </td>
                        {/* 出庫BOX */}
                        <td className="px-2 py-2 text-center">
                          {order.outboxNo > 0
                            ? <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">BOX{order.outboxNo}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        {/* 伝票作成 */}
                        <td className="px-2 py-2 text-gray-400 whitespace-nowrap">
                          {order.createdAt.slice(0,10)}
                        </td>
                        {/* 備考 */}
                        <td className="px-2 py-2 text-gray-600 max-w-[120px] truncate">
                          {order.note || ""}
                        </td>
                        {/* 備考(納品) */}
                        <td className="px-2 py-2 text-gray-600 max-w-[120px] truncate">
                          {order.noteSlip || ""}
                        </td>
                      </tr>

                      {/* 展開詳細 */}
                      {expandedId === order.id && (
                        <tr key={`${order.id}-detail`}>
                          <td colSpan={13} className="bg-blue-50/40 px-6 py-3 border-b border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* 商品明細 */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />商品明細
                                </h4>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400 border-b">
                                      <td className="pb-1">商品</td>
                                      <td className="pb-1 text-right">単価</td>
                                      <td className="pb-1 text-center">数</td>
                                      <td className="pb-1 text-right">小計</td>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map(item => (
                                      <tr key={item.id} className="border-b border-gray-100">
                                        <td className="py-0.5 text-gray-700">{item.productName}</td>
                                        <td className="py-0.5 text-right text-gray-500">¥{item.unitPrice.toLocaleString()}</td>
                                        <td className="py-0.5 text-center text-gray-500">{item.quantity}</td>
                                        <td className="py-0.5 text-right font-medium">¥{item.lineAmount.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={3} className="pt-1 text-right text-gray-500">合計</td>
                                      <td className="pt-1 text-right font-bold text-gray-800">¥{order.totalAmount.toLocaleString()}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              {/* 配送情報 */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                                  <Truck className="w-3.5 h-3.5" />配送情報
                                </h4>
                                {order.shippingLabel ? (
                                  <div className="text-xs text-gray-700 space-y-0.5">
                                    <div><span className="text-gray-400">宛先：</span>{order.shippingLabel.recipientName}</div>
                                    <div><span className="text-gray-400">電話：</span>{order.shippingLabel.recipientPhone}</div>
                                    <div><span className="text-gray-400">住所：</span>〒{order.shippingLabel.recipientPostal} {order.shippingLabel.recipientAddress}</div>
                                    <div><span className="text-gray-400">業者：</span>{{yamato:"ヤマト運輸",sagawa:"佐川急便",japan_post:"日本郵便"}[order.shippingLabel.carrier] || order.shippingLabel.carrier}</div>
                                    {order.shippingLabel.trackingNumber && (
                                      <div><span className="text-gray-400">追跡：</span>
                                        <span className="font-mono text-blue-600">{order.shippingLabel.trackingNumber}</span>
                                      </div>
                                    )}
                                    {order.shippingLabel.shippedAt && (
                                      <div><span className="text-gray-400">発送日：</span>{order.shippingLabel.shippedAt.slice(0,10)}</div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-gray-400 text-xs">配送情報未設定</p>
                                )}
                              </div>
                              {/* 入金・操作 */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                                  <CreditCard className="w-3.5 h-3.5" />入金・操作
                                </h4>
                                <div className="space-y-1.5">
                                  <div className="text-xs text-gray-600">
                                    <span className="text-gray-400">注文番号：</span>
                                    <span className="font-mono">{order.orderNumber}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      onClick={() => bulkPatch("setPaymentStatus","paid",[order.id]).then(()=>fetchOrders())}
                                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                                      入金済にする
                                    </button>
                                    <button
                                      onClick={() => bulkPatch("setPaymentStatus","unpaid",[order.id]).then(()=>fetchOrders())}
                                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                                      未入金に戻す
                                    </button>
                                    <button
                                      onClick={() => bulkPatch("setPaymentStatus","ignored",[order.id]).then(()=>fetchOrders())}
                                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">
                                      入金無視
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      onClick={() => bulkPatch("setShippingStatus","shipped",[order.id]).then(()=>fetchOrders())}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                                      発送済にする
                                    </button>
                                    <button
                                      onClick={() => bulkPatch("setShippingStatus","unshipped",[order.id]).then(()=>fetchOrders())}
                                      className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200">
                                      未発送に戻す
                                    </button>
                                    <button
                                      onClick={() => bulkPatch("setShippingStatus","ignored",[order.id]).then(()=>fetchOrders())}
                                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">
                                      発送無視
                                    </button>
                                  </div>
                                </div>
                              </div>
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
        </div>
      )}
    </div>
  )
}
