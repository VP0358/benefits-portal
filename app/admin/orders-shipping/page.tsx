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
  id: number; productId: number; productName: string; productCode: string
  quantity: number; unitPrice: number; lineAmount: number
}
interface Product {
  id: string; code: string; name: string; price: number
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

// 未処理伝票テーブルの固定列定義
const SUMMARY_COLS: { key: string; label: string }[] = [
  { key: "bank_transfer", label: "振替(銀行)" },
  { key: "postal_transfer", label: "振替(郵便)" },
  { key: "bank_payment",  label: "振込" },
  { key: "cod",           label: "代引/売掛" },
  { key: "cash",          label: "現金/(他)" },
  { key: "card",          label: "カード" },
  { key: "stop_shipping", label: "発送停止" },
  { key: "refund",        label: "返金" },
  { key: "cod_ng",        label: "代引(NG)" },
]

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

  // 結果 + 表示元管理
  const [orders,   setOrders]   = useState<Order[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // どのソースの伝票を表示中か: "search" | "outbox" | "summary"
  const [orderSource, setOrderSource] = useState<"search" | "outbox" | "summary" | null>(null)
  const [orderSourceLabel, setOrderSourceLabel] = useState<string>("")

  // サマリー
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // 出庫BOX
  const [selectedOutbox,   setSelectedOutbox]   = useState(1)
  const [moveTargetOutbox, setMoveTargetOutbox]  = useState(1)
  const [moveFromOutbox,   setMoveFromOutbox]    = useState(1)
  const [moveToOutbox,     setMoveToOutbox]      = useState(2)
  const [outboxOrders,     setOutboxOrders]      = useState<Order[] | null>(null)
  const [outboxLoading,    setOutboxLoading]     = useState(false)
  const [displayedOutbox,  setDisplayedOutbox]   = useState<number | null>(null)

  // 未処理伝票クリック（後方互換用 - 実際にはorders/orderSourceで管理）
  const [summaryFilterLabel, setSummaryFilterLabel] = useState<string | null>(null)
  const [summaryOrders,      setSummaryOrders]      = useState<Order[] | null>(null)
  const [summaryOrdersLoading, setSummaryOrdersLoading] = useState(false)
  const [summarySelected, setSummarySelected] = useState<Set<number>>(new Set())
  const [summaryBulkNote,      setSummaryBulkNote]      = useState("")
  const [summaryBulkPaidDate,  setSummaryBulkPaidDate]  = useState(today.toISOString().split("T")[0])
  const [summaryBulkProcessing, setSummaryBulkProcessing] = useState(false)

  // 一括処理
  const [bulkAction,    setBulkAction]    = useState("")
  const [bulkNote,      setBulkNote]      = useState("")
  const [bulkPaidDate,  setBulkPaidDate]  = useState(today.toISOString().split("T")[0])
  const [bulkDateType,  setBulkDateType]  = useState("paidAt") // paidAt / shippedAt / orderedAt
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // 伝票編集モーダル
  const [editModalOrder, setEditModalOrder] = useState<Order | null>(null)
  const [editModalForm,  setEditModalForm]  = useState<{
    orderedAt: string; paidAt: string; shippedAt: string
    slipType: string; paymentMethod: string
    note: string; noteSlip: string; outboxNo: number
  } | null>(null)
  const [editModalItems, setEditModalItems] = useState<{
    productId: string; productName: string; unitPrice: number; quantity: number
  }[]>([])
  const [editModalSubmitting, setEditModalSubmitting] = useState(false)
  const [deletingOrderId,     setDeletingOrderId]     = useState<number | null>(null)

  // 商品マスター
  const [products, setProducts] = useState<Product[]>([])

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
    setExpandedId(null)
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
      setOrderSource("search")
      const parts = []
      if (startDate || endDate) parts.push(`${startDate||""} 〜 ${endDate||""}`)
      if (slipType) parts.push(SLIP_TYPES.find(s=>s.value===slipType)?.label||slipType)
      if (paymentMethod) parts.push(PAYMENT_METHODS.find(p=>p.value===paymentMethod)?.label||paymentMethod)
      if (paymentStatus) parts.push(PAY_STATUS_OPTS.find(p=>p.value===paymentStatus)?.label||paymentStatus)
      if (shippingStatus) parts.push(SHIP_STATUS_OPTS.find(p=>p.value===shippingStatus)?.label||shippingStatus)
      if (keyword) parts.push(`"${keyword}"`)
      setOrderSourceLabel(parts.length > 0 ? `検索: ${parts.join(" / ")}` : "検索結果")
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

  // 商品マスター取得
  useEffect(() => {
    fetch("/api/admin/products")
      .then(r => r.json())
      .then(d => {
        const active = (d.products || []).filter((p: Product & { status?: string; isActive?: boolean }) =>
          p.status === "active" || p.isActive === true
        )
        setProducts(active)
      })
      .catch(() => {})
  }, [])

  // ─── 選択 ───────────────────────────────────────────
  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(selected.size === orders.length ? new Set() : new Set(orders.map(o => o.id)))

  // ─── 未処理伝票一覧の選択 ────────────────────────────
  const toggleSummarySelect = (id: number) =>
    setSummarySelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleSummaryAll = () =>
    setSummarySelected(prev =>
      summaryOrders && prev.size === summaryOrders.length
        ? new Set()
        : new Set((summaryOrders || []).map(o => o.id))
    )

  // 未処理伝票一覧内での一括処理（bulkPatch後に一覧を再取得）
  const summaryBulkPatch = async (action: string, value: unknown, ids?: number[]) => {
    const targetIds = ids ?? Array.from(summarySelected)
    if (targetIds.length === 0) { alert("伝票を選択してください"); return }
    setSummaryBulkProcessing(true)
    try {
      const res = await fetch("/api/admin/orders-shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: targetIds, action, value }),
      })
      if (!res.ok) { alert("更新に失敗しました"); return }
      // 一覧を再取得して表示を更新
      if (summaryOrders) {
        // summaryのカウントを再取得
        const updated = await fetch("/api/admin/orders-shipping?summaryOnly=true")
        const d = await updated.json()
        if (d.summary) setSummary(d.summary)
        // summaryOrders をローカルで状態更新
        setSummaryOrders(prev => {
          if (!prev) return prev
          return prev.map(o => {
            if (!targetIds.includes(o.id)) return o
            const updated = { ...o }
            if (action === "setPaymentStatus") {
              updated.paymentStatus = value as PaymentStatus
              if (value === "paid") updated.paidAt = new Date().toISOString()
            }
            if (action === "setPaidAt") {
              updated.paidAt = value ? new Date(value as string).toISOString() : null
              updated.paymentStatus = "paid"
            }
            if (action === "clearPaidAt") {
              updated.paidAt = null
              updated.paymentStatus = "unpaid"
            }
            if (action === "setShippingStatus") {
              updated.shippingStatus = value as ShippingStatus
            }
            if (action === "setNote") updated.note = value as string
            if (action === "setNoteSlip") updated.noteSlip = value as string
            return updated
          })
        })
      }
      setSummarySelected(new Set())
      fetchSummary()
    } finally {
      setSummaryBulkProcessing(false)
    }
  }

  // ─── 出庫BOX操作 ────────────────────────────────────
  // チェックした伝票を指定BOXへ入れる
  const putToOutbox = async (outbox: number) => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    await bulkPatch("setOutbox", outbox, Array.from(selected))
    fetchSummary()
    fetchOrders()
  }
  // チェックした伝票をBOXから出す（outboxNo=0 に設定）
  const removeSelectedFromOutbox = async () => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    const ids = Array.from(selected)
    if (!confirm(`選択した${ids.length}件の伝票を出庫BOXから出しますか？`)) return
    await bulkPatch("setOutbox", 0, ids)
    fetchSummary()
    fetchOrders()
  }
  // 指定BOXの全件をBOXから出す（選択に関係なく全件）
  const removeAllFromOutbox = async (outbox: number) => {
    const ids = outboxOrders
      ? outboxOrders.filter(o => o.outboxNo === outbox).map(o => o.id)
      : orders.filter(o => o.outboxNo === outbox).map(o => o.id)
    if (ids.length === 0) { alert("対象伝票がありません"); return }
    if (!confirm(`出庫BOX${outbox} の全${ids.length}件をBOXから出しますか？`)) return
    await bulkPatch("setOutbox", 0, ids)
    fetchSummary()
    fetchOrders()
    if (displayedOutbox === outbox) showOutbox(outbox)
  }
  // チェックした伝票を別のBOXへ移動
  const moveSelectedToOutbox = async (to: number) => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    const ids = Array.from(selected)
    await bulkPatch("setOutbox", to, ids)
    fetchSummary()
    fetchOrders()
  }
  // 指定BOXの全件を別BOXへ移動
  const moveAllInOutbox = async (from: number, to: number) => {
    const ids = outboxOrders
      ? outboxOrders.filter(o => o.outboxNo === from).map(o => o.id)
      : orders.filter(o => o.outboxNo === from).map(o => o.id)
    if (ids.length === 0) { alert("対象伝票がありません"); return }
    await bulkPatch("setOutbox", to, ids)
    fetchSummary()
    fetchOrders()
    if (displayedOutbox === from) showOutbox(from)
  }
  const showOutbox = async (outbox: number) => {
    setLoading(true)
    setDisplayedOutbox(outbox)
    setOutboxOrders(null)
    setSelected(new Set())
    setExpandedId(null)
    try {
      const res  = await fetch(`/api/admin/orders-shipping?outboxNo=${outbox}`)
      const data = await res.json()
      const result = data.orders || []
      setOutboxOrders(result)
      // メイン一覧にも反映
      setOrders(result)
      setSearched(true)
      setOrderSource("outbox")
      setOrderSourceLabel(`出庫BOX${outbox} の伝票一覧`)
    } catch { alert("取得エラー") }
    finally  { setLoading(false); setOutboxLoading(false) }
  }

  // 未処理伝票セルクリック → 対象伝票を取得・一覧表示
  const showSummaryOrders = async (pm: string, statusType: "unpaid" | "unshipped", period: "thisMonth" | "lastMonth") => {
    setLoading(true)
    setSummaryOrdersLoading(true)
    setSummaryOrders(null)
    setSelected(new Set())
    setExpandedId(null)
    const now = new Date()
    let y = now.getFullYear(), m = now.getMonth()
    if (period === "lastMonth") { m -= 1; if (m < 0) { m = 11; y-- } }
    const start = new Date(y, m, 1).toISOString().split("T")[0]
    const end   = new Date(y, m + 1, 0).toISOString().split("T")[0]
    const p = new URLSearchParams()
    p.set("startDate", start); p.set("endDate", end); p.set("dateType", "orderedAt")

    // カラムキーをAPIの支払方法にマッピング
    const pmApiMap: Record<string, string> = {
      bank_transfer:  "bank_transfer",
      postal_transfer: "bank_transfer",
      bank_payment:   "bank_payment",
      cod:            "cod",
      cash:           "cash",
      card:           "card",
      stop_shipping:  "stop_shipping",
      refund:         "refund",
      cod_ng:         "cod_ng",
    }
    if (pmApiMap[pm]) p.set("paymentMethod", pmApiMap[pm])
    if (statusType === "unpaid")    p.set("paymentStatus",  "unpaid")
    if (statusType === "unshipped") p.set("shippingStatus", "unshipped")

    const col = SUMMARY_COLS.find(c => c.key === pm)
    const label = `${period === "thisMonth" ? "当月" : "先月"} ${col?.label || pm} ${statusType === "unpaid" ? "未入金" : "未発送"}`
    setSummaryFilterLabel(label)
    try {
      const res  = await fetch(`/api/admin/orders-shipping?${p}`)
      const data = await res.json()
      const result = data.orders || []
      setSummaryOrders(result)
      // メイン一覧にも反映
      setOrders(result)
      setSearched(true)
      setOrderSource("summary")
      setOrderSourceLabel(`未処理: ${label}`)
    } catch { alert("取得エラー") }
    finally { setLoading(false); setSummaryOrdersLoading(false) }
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

  // ─── 伝票編集モーダルを開く ──────────────────────────
  const openEditModal = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditModalOrder(order)
    setEditModalForm({
      orderedAt: order.orderedAt.slice(0, 10),
      paidAt: order.paidAt ? order.paidAt.slice(0, 10) : "",
      shippedAt: order.shippingLabel?.shippedAt ? order.shippingLabel.shippedAt.slice(0, 10) : "",
      slipType: order.slipType,
      paymentMethod: order.paymentMethod,
      note: order.note || "",
      noteSlip: order.noteSlip || "",
      outboxNo: order.outboxNo,
    })
    // 商品明細を初期セット
    setEditModalItems(
      order.items.length > 0
        ? order.items.map(item => ({
            productId: String(item.productId || ""),
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          }))
        : [{ productId: "", productName: "", unitPrice: 0, quantity: 1 }]
    )
  }

  // 伝票編集保存
  const handleEditModalSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModalOrder || !editModalForm) return
    const validItems = editModalItems.filter(i => i.productId)
    if (validItems.length === 0) { alert("商品を1つ以上選択してください"); return }
    setEditModalSubmitting(true)
    try {
      const res = await fetch("/api/admin/orders-shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editModalOrder.id,
          orderedAt: editModalForm.orderedAt,
          paidAt: editModalForm.paidAt || null,
          shippedAt: editModalForm.shippedAt || null,
          slipType: editModalForm.slipType,
          paymentMethod: editModalForm.paymentMethod,
          note: editModalForm.note,
          noteSlip: editModalForm.noteSlip,
          outboxNo: editModalForm.outboxNo,
          items: validItems,
        }),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || "伝票更新に失敗しました"); return }
      alert("伝票を更新しました")
      const savedOrderId = editModalOrder.id
      const savedForm = editModalForm
      setEditModalOrder(null)
      setEditModalForm(null)
      setEditModalItems([])
      fetchSummary()
      fetchOrders()
      // summaryOrders内の対象伝票もローカル更新
      setSummaryOrders(prev => {
        if (!prev) return prev
        return prev.map(o => {
          if (o.id !== savedOrderId) return o
          return {
            ...o,
            orderedAt: savedForm.orderedAt ? new Date(savedForm.orderedAt).toISOString() : o.orderedAt,
            paidAt: savedForm.paidAt ? new Date(savedForm.paidAt).toISOString() : null,
            paymentStatus: savedForm.paidAt ? "paid" : "unpaid",
            shippingStatus: savedForm.shippedAt ? "shipped" : "unshipped",
            slipType: savedForm.slipType,
            paymentMethod: savedForm.paymentMethod,
            note: savedForm.note,
            noteSlip: savedForm.noteSlip,
            outboxNo: savedForm.outboxNo,
          }
        })
      })
    } finally {
      setEditModalSubmitting(false)
    }
  }

  // 伝票削除
  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(`伝票「${orderNumber}」を削除しますか？\nこの操作は取り消せません。`)) return
    setDeletingOrderId(orderId)
    try {
      const res = await fetch(`/api/admin/orders-shipping?id=${orderId}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); alert(d.error || "削除に失敗しました"); return }
      setEditModalOrder(null)
      setEditModalForm(null)
      fetchSummary()
      fetchOrders()
      // summaryOrdersからも削除
      setSummaryOrders(prev => prev ? prev.filter(o => o.id !== orderId) : prev)
      setSummarySelected(prev => { const s = new Set(prev); s.delete(orderId); return s })
    } finally {
      setDeletingOrderId(null)
    }
  }

  // チェック済み伝票の納品書一括PDF出力
  const handleBulkDeliveryNote = () => {
    if (selected.size === 0) { alert("伝票を選択してください"); return }
    const ids = Array.from(selected).join(",")
    window.open(`/admin/orders-shipping/delivery-note?ids=${ids}&type=delivery`, "_blank")
  }

  // ─── クロネコヤマトB2CSV出力 ──────────────────────────
  const handleExportYamatoCSV = async () => {
    const target = selected.size > 0 ? orders.filter(o => selected.has(o.id)) : orders
    if (target.length === 0) { alert("伝票がありません"); return }
    const ids = target.map(o => o.id).join(",")
    try {
      const res = await fetch(`/api/admin/orders-shipping/yamato-csv?ids=${ids}`)
      if (!res.ok) { const d = await res.json(); alert(d.error || "CSV出力に失敗しました"); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href = url
      a.download = `yamato_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert("CSV出力に失敗しました") }
  }

  // ─── 振替伝票の入金日削除 ──────────────────────────────
  const handleClearBankTransferPaidAt = async () => {
    const target = selected.size > 0
      ? orders.filter(o => selected.has(o.id) && (o.paymentMethod === "bank_transfer" || o.paymentMethod === "direct_debit"))
      : orders.filter(o => o.paymentMethod === "bank_transfer" || o.paymentMethod === "direct_debit")
    if (target.length === 0) { alert("口座振替の伝票がありません（選択された伝票を確認してください）"); return }
    if (!confirm(`口座振替 ${target.length}件 の入金日を削除しますか？\n（入金状態は「未入金」に戻ります）`)) return
    const res = await fetch("/api/admin/orders-shipping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: target.map(o => o.id), action: "clearPaidAt", value: null }),
    })
    if (!res.ok) { alert("更新に失敗しました"); return }
    alert(`${target.length}件の入金日を削除しました`)
    fetchSummary(); fetchOrders()
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
        <div className="p-4 space-y-3">
          {/* ── チェック選択伝票への操作 ── */}
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/40 space-y-2">
            <div className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-1">
              <CheckSquare className="w-3.5 h-3.5" />チェック選択した伝票への操作
              {selected.size > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]">{selected.size}件選択中</span>
              )}
            </div>
            {/* BOXへ入れる */}
            <div className="flex flex-wrap items-center gap-2">
              <select value={moveTargetOutbox} onChange={e => setMoveTargetOutbox(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                {outboxOptions(moveTargetOutbox)}
              </select>
              <button onClick={() => putToOutbox(moveTargetOutbox)}
                className="px-3 py-1.5 bg-green-600 text-white border border-green-700 rounded text-xs hover:bg-green-700 flex items-center gap-1 font-medium">
                <ArrowRight className="w-3 h-3" />チェック伝票を入れる
              </button>
              <button onClick={removeSelectedFromOutbox}
                className="px-3 py-1.5 bg-orange-500 text-white border border-orange-600 rounded text-xs hover:bg-orange-600 font-medium">
                チェック伝票をBOXから出す
              </button>
              <button onClick={() => moveSelectedToOutbox(moveToOutbox)}
                className="px-3 py-1.5 bg-purple-600 text-white border border-purple-700 rounded text-xs hover:bg-purple-700 flex items-center gap-1 font-medium">
                <ArrowRight className="w-3 h-3" />チェック伝票を
                <select value={moveToOutbox} onChange={e => { e.stopPropagation(); setMoveToOutbox(Number(e.target.value)) }}
                  className="border border-purple-400 rounded px-1 py-0.5 text-xs bg-purple-100 text-purple-800 ml-0.5"
                  onClick={e => e.stopPropagation()}>
                  {Array.from({length:10},(_,i)=>i+1).map(n=>(
                    <option key={n} value={n}>BOX{n}({summary?.outboxCounts[n]??0})</option>
                  ))}
                </select>
                へ移動
              </button>
            </div>
          </div>

          {/* ── BOX全体の操作 ── */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600 mb-1">BOX全体の操作</div>
            {/* BOX表示 */}
            <div className="flex flex-wrap items-center gap-2">
              <select value={selectedOutbox} onChange={e => setSelectedOutbox(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                {Array.from({length:10},(_,i)=>i+1).map(n=>(
                  <option key={n} value={n}>出庫BOX{n}：({summary?.outboxCounts[n]??0})</option>
                ))}
              </select>
              <button onClick={() => showOutbox(selectedOutbox)}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-300 rounded text-xs hover:bg-blue-200 font-medium">
                を表示する
              </button>
              <button onClick={() => removeAllFromOutbox(selectedOutbox)}
                className="px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-300 rounded text-xs hover:bg-orange-200">
                の全件をBOXから出す
              </button>
            </div>
            {/* 全件移動 */}
            <div className="flex flex-wrap items-center gap-2">
              <select value={moveFromOutbox} onChange={e => setMoveFromOutbox(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                {outboxOptions(moveFromOutbox)}
              </select>
              <span className="text-gray-500">→</span>
              <select value={moveToOutbox} onChange={e => setMoveToOutbox(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                {outboxOptions(moveToOutbox)}
              </select>
              <button onClick={() => moveAllInOutbox(moveFromOutbox, moveToOutbox)}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-300 rounded text-xs hover:bg-purple-200">
                へ全件移動する
              </button>
            </div>
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
            {/* クロネコヤマトB2CSV出力 */}
            <button onClick={handleExportYamatoCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-500 text-amber-700 rounded text-sm hover:bg-amber-50"
              title="選択した伝票をヤマトB2クラウド取込用CSVでダウンロード">
              <Download className="w-3.5 h-3.5" />ヤマトB2CSV出力
            </button>
            {/* 納品書ボタン → 納品書・出庫リストページへ遷移 */}
            <button
              onClick={() => handleGoDeliveryNote("delivery")}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-400 text-indigo-700 rounded text-sm hover:bg-indigo-50 font-medium"
              title="選択した伝票の納品書・出庫リストページへ移動">
              <FileText className="w-3.5 h-3.5" />納品書
            </button>
            {/* 納品書PDF一括ダウンロード */}
            <button
              onClick={handleBulkDeliveryNote}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-700 rounded text-sm hover:bg-indigo-700 font-medium"
              title="選択した伝票の納品書PDFを一括ダウンロード">
              <Download className="w-3.5 h-3.5" />納品書PDF一括出力
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
        {/* ヘッダ：翌月以降未入金 / 未入金合計 / 未発送合計 */}
        <div className="bg-blue-600 px-4 py-2 text-white font-semibold text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />未処理伝票</span>
          {summary && (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => { setPaymentStatus("unpaid"); setStartDate(""); setEndDate(""); fetchOrders(); setSearched(true) }}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded whitespace-nowrap">
                翌月以降未入金（{summary.prevUnpaidCount}件）
              </button>
              <button
                onClick={() => { setPaymentStatus("unpaid"); setPaymentMethod(""); const { start, end } = getThisMonthRange(); setStartDate(start); setEndDate(end); setTimeout(fetchOrders, 0); setSearched(true) }}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded whitespace-nowrap">
                未入金（{summary.totalUnpaid}件）
              </button>
              <button
                onClick={() => { setShippingStatus("unshipped"); setPaymentMethod(""); const { start, end } = getThisMonthRange(); setStartDate(start); setEndDate(end); setTimeout(fetchOrders, 0); setSearched(true) }}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded whitespace-nowrap">
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
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-3 py-2 text-gray-600 font-bold text-center border-r border-gray-200 w-12"></th>
                  <th className="px-3 py-2 text-gray-600 font-bold text-center border-r border-gray-200 w-14"></th>
                  {SUMMARY_COLS.map(col => (
                    <th key={col.key} className="px-3 py-2 text-center text-gray-700 font-bold border-r border-gray-200 whitespace-nowrap text-xs">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 当月 */}
                {([
                  { statusType: "unpaid"    as const, rowLabel: "未入金", rowBg: "bg-red-50/30",    isFirst: true,  period: "thisMonth" as const, monthLabel: "当月" },
                  { statusType: "unshipped" as const, rowLabel: "未発送", rowBg: "bg-orange-50/20", isFirst: false, period: "thisMonth" as const, monthLabel: "当月" },
                  { statusType: "unpaid"    as const, rowLabel: "未入金", rowBg: "bg-red-50/20",    isFirst: true,  period: "lastMonth" as const, monthLabel: "先月" },
                  { statusType: "unshipped" as const, rowLabel: "未発送", rowBg: "",                isFirst: false, period: "lastMonth" as const, monthLabel: "先月" },
                ]).map((row, ri) => {
                  const data = summary[row.period][row.statusType]
                  return (
                    <tr key={ri} className={`border-b border-gray-100 ${row.rowBg}`}>
                      {row.isFirst && (
                        <td
                          className="px-4 py-2.5 text-gray-700 font-bold text-center border-r border-gray-200 whitespace-nowrap bg-gray-50 text-sm"
                          rowSpan={2}
                        >
                          {row.monthLabel}
                        </td>
                      )}
                      <td className={"px-3 py-2.5 font-semibold text-center border-r border-gray-200 whitespace-nowrap text-xs " + (row.statusType === "unpaid" ? "text-red-600" : "text-orange-600")}>
                        {row.rowLabel}
                      </td>
                      {SUMMARY_COLS.map(col => {
                        const apiKeys: string[] = col.key === "postal_transfer"
                          ? ["postal_transfer"]
                          : col.key === "cash"
                          ? ["cash", "convenience"]
                          : col.key === "stop_shipping"
                          ? ["stop_shipping"]
                          : col.key === "refund"
                          ? ["refund"]
                          : col.key === "cod_ng"
                          ? ["cod_ng"]
                          : [col.key]
                        const count = apiKeys.reduce((sum, k) => sum + (data[k] || 0), 0)
                        return (
                          <td key={col.key} className="px-3 py-2.5 text-center border-r border-gray-100">
                            {count > 0 ? (
                              <button
                                className={"font-bold text-xs hover:underline transition-colors " + (row.statusType === "unpaid" ? "text-red-600 hover:text-red-800" : "text-orange-600 hover:text-orange-800")}
                                onClick={() => showSummaryOrders(col.key, row.statusType, row.period)}>
                                {count}件
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
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
          {/* ── ソースラベル＋件数バー ── */}
          <div className={"px-4 py-2 flex items-center justify-between flex-wrap gap-2 " + (orderSource === "outbox" ? "bg-blue-600 text-white" : orderSource === "summary" ? "bg-amber-500 text-white" : "bg-gray-700 text-white")}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {orderSource === "outbox" && <Box className="w-4 h-4" />}
              {orderSource === "summary" && <AlertCircle className="w-4 h-4" />}
              {orderSource === "search" && <Search className="w-4 h-4" />}
              <span>{orderSourceLabel || "伝票一覧"}</span>
              <span className="text-xs font-normal opacity-80">（{orders.length}件）</span>
            </div>
            <button
              onClick={() => { setOrders([]); setSearched(false); setOrderSource(null); setOrderSourceLabel(""); setSelected(new Set()) }}
              className="text-xs opacity-70 hover:opacity-100 px-2 py-0.5 rounded hover:bg-black/20">
              ✕ 閉じる
            </button>
          </div>

          {/* ── 一括編集バー ── */}
          <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 space-y-2">
            {/* 行1: 全選択・件数・CSV */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={toggleAll} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-100">
                {selected.size === orders.length && orders.length > 0
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  : <Square className="w-3.5 h-3.5" />}
                全選択
              </button>
              <span className="text-xs text-gray-500 border-r border-gray-300 pr-2">
                {selected.size > 0
                  ? <span className="font-medium text-blue-600">{selected.size}件選択中</span>
                  : <span>チェックで選択</span>}
              </span>
              {/* 入金操作 */}
              <button
                onClick={() => bulkPatch("setPaymentStatus", "paid").then(() => { fetchOrders(); fetchSummary() })}
                disabled={selected.size === 0 || bulkProcessing}
                className="px-2 py-1 bg-green-100 text-green-700 border border-green-300 rounded text-xs hover:bg-green-200 disabled:opacity-40 whitespace-nowrap">
                入金済にする
              </button>
              <button
                onClick={() => bulkPatch("setPaymentStatus", "unpaid").then(() => { fetchOrders(); fetchSummary() })}
                disabled={selected.size === 0 || bulkProcessing}
                className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs hover:bg-red-100 disabled:opacity-40 whitespace-nowrap">
                未入金に戻す
              </button>
              <button
                onClick={() => bulkPatch("setPaymentStatus", "ignored").then(() => { fetchOrders(); fetchSummary() })}
                disabled={selected.size === 0 || bulkProcessing}
                className="px-2 py-1 bg-gray-100 text-gray-600 border border-gray-300 rounded text-xs hover:bg-gray-200 disabled:opacity-40 whitespace-nowrap">
                入金無視
              </button>
              <span className="border-l border-gray-300 pl-2 flex items-center gap-1">
                <button
                  onClick={() => bulkPatch("setShippingStatus", "shipped").then(() => { fetchOrders(); fetchSummary() })}
                  disabled={selected.size === 0 || bulkProcessing}
                  className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-300 rounded text-xs hover:bg-blue-200 disabled:opacity-40 whitespace-nowrap">
                  発送済にする
                </button>
                <button
                  onClick={() => bulkPatch("setShippingStatus", "unshipped").then(() => { fetchOrders(); fetchSummary() })}
                  disabled={selected.size === 0 || bulkProcessing}
                  className="px-2 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded text-xs hover:bg-orange-100 disabled:opacity-40 whitespace-nowrap">
                  未発送に戻す
                </button>
              </span>
              {bulkProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
            </div>
            {/* 行2: 日付設定・備考・CSV */}
            <div className="flex items-center gap-2 flex-wrap">
              <select value={bulkDateType} onChange={e => setBulkDateType(e.target.value)}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white">
                <option value="paidAt">入金日</option>
                <option value="shippedAt">発送日</option>
                <option value="orderedAt">注文日</option>
              </select>
              <input type="date" value={bulkPaidDate} onChange={e => setBulkPaidDate(e.target.value)}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs" />
              <button onClick={handleSetBulkDate} disabled={selected.size === 0 || bulkProcessing}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-40 whitespace-nowrap">
                日付セット
              </button>
              <span className="border-l border-gray-300 pl-2 flex items-center gap-1">
                <input type="text" value={bulkNote} onChange={e => setBulkNote(e.target.value)}
                  placeholder="備考テキスト"
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-28" />
                <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white">
                  <option value="setNote">備考に</option>
                  <option value="setNoteSlip">備考(納品)に</option>
                  <option value="setNoteAll">両方に</option>
                </select>
                <button onClick={handleBulkExecute} disabled={selected.size === 0 || !bulkNote || bulkProcessing}
                  className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 disabled:opacity-40 whitespace-nowrap">
                  備考セット
                </button>
              </span>
              <span className="border-l border-gray-300 pl-2 flex items-center gap-1">
                <button onClick={exportCSV}
                  className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50">
                  <Download className="w-3 h-3" />CSV
                </button>
                <button onClick={handleExportYamatoCSV}
                  className="flex items-center gap-1 text-xs px-2 py-1 border border-amber-400 text-amber-700 rounded bg-white hover:bg-amber-50">
                  <Download className="w-3 h-3" />ヤマトCSV
                </button>
                {selected.size > 0 && (
                  <button onClick={handleBulkDeliveryNote}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    <Download className="w-3 h-3" />納品書PDF({selected.size}件)
                  </button>
                )}
              </span>
            </div>
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
                    <th className="px-2 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <>
                      <tr key={order.id}
                        className={"border-b border-gray-100 cursor-pointer transition-colors " + (selected.has(order.id) ? "bg-blue-50" : "hover:bg-stone-50")}
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
                        {/* 注文日（クリックで伝票編集モーダル） */}
                        <td className="px-2 py-2 whitespace-nowrap" onClick={e => openEditModal(order, e)}>
                          <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium">
                            {order.orderedAt.slice(0,10)}
                          </span>
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
                          <span className={"px-1.5 py-0.5 rounded text-xs " + (order.paymentMethod === "card" || order.paymentMethod === "credit_card" ? "bg-blue-50 text-blue-700" : order.paymentMethod === "bank_transfer" ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-600")}>
                            {order.paymentMethodLabel}
                          </span>
                        </td>
                        {/* ステイタス */}
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className={"px-1.5 py-0.5 rounded text-xs w-fit " + (order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : order.paymentStatus === "ignored" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-600")}>
                              {order.paymentStatus === "paid" ? "入金済" : order.paymentStatus === "ignored" ? "無視" : "未入金"}
                            </span>
                            <span className={"px-1.5 py-0.5 rounded text-xs w-fit " + (order.shippingStatus === "shipped" ? "bg-green-100 text-green-700" : order.shippingStatus === "ignored" ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-600")}>
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
                        {/* 個別操作ボタン */}
                        <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => bulkPatch("setPaymentStatus", "paid", [order.id]).then(() => { fetchOrders(); fetchSummary() })}
                              className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] hover:bg-green-200 whitespace-nowrap">
                              入金済
                            </button>
                            <button
                              onClick={() => bulkPatch("setShippingStatus", "shipped", [order.id]).then(() => { fetchOrders(); fetchSummary() })}
                              className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] hover:bg-blue-200 whitespace-nowrap">
                              発送済
                            </button>
                            <button
                              onClick={e => openEditModal(order, e)}
                              className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] hover:bg-orange-200 whitespace-nowrap">
                              編集
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 展開詳細 */}
                      {expandedId === order.id && (
                        <tr key={`${order.id}-detail`}>
                          <td colSpan={14} className="bg-blue-50/40 px-6 py-3 border-b border-blue-100">
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
                                  {/* 伝票編集・削除 */}
                                  <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
                                    <button
                                      onClick={e => openEditModal(order, e)}
                                      className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 flex items-center gap-0.5">
                                      <i className="fas fa-edit text-[10px]" />伝票を編集
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                                      disabled={deletingOrderId === order.id}
                                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 disabled:opacity-50 flex items-center gap-0.5">
                                      <i className="fas fa-trash text-[10px]" />
                                      {deletingOrderId === order.id ? "削除中..." : "この伝票を削除"}
                                    </button>
                                    <button
                                      onClick={() => window.open(`/admin/orders-shipping/delivery-note?ids=${order.id}&type=delivery`, "_blank")}
                                      className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200 flex items-center gap-0.5">
                                      <i className="fas fa-file-pdf text-[10px]" />納品書PDF
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

      {/* ═══════════════════════════════════════════════
          伝票編集モーダル（注文日クリックで開く）
      ═══════════════════════════════════════════════ */}
      {editModalOrder && editModalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* モーダルヘッダ */}
            <div className="bg-orange-600 text-white px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm">伝票編集</span>
                <span className="ml-3 text-orange-200 text-xs font-mono">{editModalOrder.orderNumber}</span>
              </div>
              <button onClick={() => { setEditModalOrder(null); setEditModalForm(null) }}
                className="text-white hover:text-orange-200 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleEditModalSave} className="p-5 space-y-3">
              {/* 会員情報 */}
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                <span className="font-medium">{editModalOrder.memberCode}</span>
                <span className="mx-2 text-gray-400">/</span>
                <span>{editModalOrder.memberName}</span>
                <span className="ml-3 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{editModalOrder.slipTypeLabel}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* 注文日 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-red-600">注文日</label>
                  <input type="date" value={editModalForm.orderedAt}
                    onChange={e => setEditModalForm(f => f ? { ...f, orderedAt: e.target.value } : f)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                {/* 入金日 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-600">入金日</label>
                  <input type="date" value={editModalForm.paidAt}
                    onChange={e => setEditModalForm(f => f ? { ...f, paidAt: e.target.value } : f)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                {/* 発送日 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-600">発送日</label>
                  <input type="date" value={editModalForm.shippedAt}
                    onChange={e => setEditModalForm(f => f ? { ...f, shippedAt: e.target.value } : f)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                {/* 出庫BOX */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-600">出庫BOX</label>
                  <select value={editModalForm.outboxNo}
                    onChange={e => setEditModalForm(f => f ? { ...f, outboxNo: Number(e.target.value) } : f)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value={0}>なし</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>出庫BOX{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 支払方法 */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="text-[11px] font-medium text-gray-600">支払方法</label>
                <select value={editModalForm.paymentMethod}
                  onChange={e => setEditModalForm(f => f ? { ...f, paymentMethod: e.target.value } : f)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {[
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
                  ].map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* 備考 */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="text-[11px] font-medium text-gray-600">備考</label>
                <input value={editModalForm.note}
                  onChange={e => setEditModalForm(f => f ? { ...f, note: e.target.value } : f)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <label className="text-[11px] font-medium text-gray-600">備考（納品書）</label>
                <input value={editModalForm.noteSlip}
                  onChange={e => setEditModalForm(f => f ? { ...f, noteSlip: e.target.value } : f)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>

              {/* 商品明細（編集可能） */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-700 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between">
                  <span>商品明細（編集可）</span>
                  <button type="button"
                    onClick={() => setEditModalItems(prev => [...prev, { productId: "", productName: "", unitPrice: 0, quantity: 1 }])}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded">
                    ＋ 行追加
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-1 py-1.5 w-6"></th>
                        <th className="px-2 py-1.5 text-left">商品</th>
                        <th className="px-2 py-1.5 text-right w-24">単価</th>
                        <th className="px-2 py-1.5 text-center w-16">数量</th>
                        <th className="px-2 py-1.5 text-right w-24">小計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editModalItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-1 py-1 text-center">
                            <button type="button"
                              onClick={() => setEditModalItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))}
                              className="text-gray-300 hover:text-red-500 text-base leading-none">×</button>
                          </td>
                          <td className="px-2 py-1">
                            <select value={item.productId}
                              onChange={e => {
                                const pid = e.target.value
                                const found = products.find(p => p.id === pid)
                                setEditModalItems(prev => prev.map((it, i) => i === idx ? {
                                  productId: pid,
                                  productName: found?.name || it.productName,
                                  unitPrice: found ? found.price : it.unitPrice,
                                  quantity: it.quantity,
                                } : it))
                              }}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white w-full focus:ring-1 focus:ring-blue-400">
                              <option value="">{item.productName ? item.productName + "（未マッチ）" : "─ 選択 ─"}</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.code ? p.code + " - " : ""}{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" min={0} value={item.unitPrice}
                              onChange={e => setEditModalItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs text-right w-full" />
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" min={1} value={item.quantity}
                              onChange={e => setEditModalItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it))}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs text-center w-full" />
                          </td>
                          <td className="px-2 py-1 text-right font-medium text-gray-700">
                            ¥{(item.unitPrice * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50">
                        <td colSpan={4} className="px-2 py-1.5 text-right font-semibold text-gray-700">合計（税別）</td>
                        <td className="px-2 py-1.5 text-right font-bold text-gray-900">
                          ¥{editModalItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-2 py-1 text-right text-gray-500 text-[11px]">消費税（10%）</td>
                        <td className="px-2 py-1 text-right text-gray-500 text-[11px]">
                          ¥{Math.floor(editModalItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 0.1).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td colSpan={4} className="px-2 py-1.5 text-right font-bold text-blue-700">合計（税込）</td>
                        <td className="px-2 py-1.5 text-right font-bold text-blue-700">
                          ¥{Math.floor(editModalItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 1.1).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* フッタボタン */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button type="button"
                  onClick={() => handleDeleteOrder(editModalOrder.id, editModalOrder.orderNumber)}
                  disabled={deletingOrderId === editModalOrder.id}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                  <i className="fas fa-trash text-[10px]" />
                  {deletingOrderId === editModalOrder.id ? "削除中..." : "この伝票を削除"}
                </button>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => { setEditModalOrder(null); setEditModalForm(null) }}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-100">
                    キャンセル
                  </button>
                  <button type="submit" disabled={editModalSubmitting}
                    className="px-6 py-2 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 disabled:opacity-50">
                    {editModalSubmitting ? "更新中..." : "更新する"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
