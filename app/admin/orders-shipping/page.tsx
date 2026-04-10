"use client"

import { useState, useEffect } from "react"
import { 
  Package, Search, Download, Printer, 
  Truck, Edit, Trash2, X, CreditCard,
  ChevronDown, ChevronUp, RefreshCw
} from "lucide-react"

// 型定義
type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "canceled"
type ShippingCarrier = "yamato" | "sagawa" | "japan_post"
type ShippingLabelStatus = "pending" | "printed" | "shipped" | "canceled"

interface OrderItem {
  id: number
  productName: string
  productCode: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

interface ShippingLabel {
  id: number
  carrier: ShippingCarrier
  trackingNumber: string | null
  status: ShippingLabelStatus
  recipientName: string
  recipientPhone: string
  recipientPostal: string
  recipientAddress: string
  itemDescription: string
  itemCount: number
  deliveryType: string | null
  orderMethod: string | null
  printedAt: string | null
  shippedAt: string | null
}

interface Order {
  id: number
  orderNumber: string
  status: OrderStatus
  subtotalAmount: number
  usedPoints: number
  totalAmount: number
  orderedAt: string
  memberCode: string
  memberName: string
  memberEmail: string
  paymentMethod: string | null
  paymentMethodLabel: string
  items: OrderItem[]
  shippingLabel: ShippingLabel | null
}

interface SearchFilters {
  startDate: string
  endDate: string
  memberCode: string
  status: string
  carrier: string
  searchKeyword: string
  paymentMethod: string
  slipType: string
}

const statusLabels: Record<string, string> = {
  pending: "未処理",
  processing: "処理中",
  shipped: "発送済",
  completed: "完了",
  canceled: "キャンセル"
}

const carrierLabels: Record<string, string> = {
  yamato: "ヤマト運輸",
  sagawa: "佐川急便",
  japan_post: "日本郵便"
}

const shippingStatusLabels: Record<string, string> = {
  pending: "未印刷",
  printed: "印刷済み",
  shipped: "発送済み",
  canceled: "キャンセル"
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  canceled: "bg-red-100 text-red-800"
}

const deliveryTypeLabels: Record<string, string> = {
  autoship: "オートシップ",
  one_time: "都度払い",
  new_member: "新規",
  cooling_off: "クーリングオフ",
  return: "返品",
  voucher: "金券",
  hand_delivery: "手渡し",
  exchange: "交換",
  cancel: "キャンセル",
  other_order: "他発注",
  combined_reserve: "合わせ予約",
  additional: "追加",
  staff_delivery: "社員配達",
  web: "Web",
  present: "プレゼント",
  mid_cancel: "中途解約"
}

export default function OrdersShippingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  
  // フィルター状態
  const [filters, setFilters] = useState<SearchFilters>({
    startDate: "",
    endDate: "",
    memberCode: "",
    status: "",
    carrier: "",
    searchKeyword: "",
    paymentMethod: "",
    slipType: ""
  })

  // 編集フォーム状態
  const [editForm, setEditForm] = useState({
    status: "",
    carrier: "",
    trackingNumber: "",
    shippingStatus: ""
  })

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.memberCode) params.append("memberCode", filters.memberCode)
      if (filters.status) params.append("status", filters.status)
      if (filters.carrier) params.append("carrier", filters.carrier)
      if (filters.searchKeyword) params.append("keyword", filters.searchKeyword)
      if (filters.paymentMethod) params.append("paymentMethod", filters.paymentMethod)
      if (filters.slipType) params.append("slipType", filters.slipType)

      const res = await fetch(`/api/admin/orders-shipping?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      
      const data = await res.json()
      setOrders(data.orders || [])
      setHasSearched(true)
    } catch (error) {
      console.error("Error fetching orders:", error)
      alert("注文データの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOrders()
  }

  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      memberCode: "",
      status: "",
      carrier: "",
      searchKeyword: "",
      paymentMethod: "",
      slipType: ""
    })
    setOrders([])
    setHasSearched(false)
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order)
    setEditForm({
      status: order.status,
      carrier: order.shippingLabel?.carrier || "yamato",
      trackingNumber: order.shippingLabel?.trackingNumber || "",
      shippingStatus: order.shippingLabel?.status || "pending"
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingOrder) return

    try {
      const res = await fetch(`/api/admin/orders-shipping/${editingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editForm.status,
          carrier: editForm.carrier,
          trackingNumber: editForm.trackingNumber,
          shippingStatus: editForm.shippingStatus
        })
      })

      if (!res.ok) throw new Error("Failed to update order")

      alert("注文情報を更新しました")
      setShowEditModal(false)
      setEditingOrder(null)
      fetchOrders()
    } catch (error) {
      console.error("Error updating order:", error)
      alert("更新に失敗しました")
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("この注文を削除してもよろしいですか？")) return

    try {
      const res = await fetch(`/api/admin/orders-shipping/${orderId}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete order")

      alert("注文を削除しました")
      fetchOrders()
    } catch (error) {
      console.error("Error deleting order:", error)
      alert("削除に失敗しました")
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.memberCode) params.append("memberCode", filters.memberCode)
      if (filters.status) params.append("status", filters.status)
      if (filters.carrier) params.append("carrier", filters.carrier)
      if (filters.paymentMethod) params.append("paymentMethod", filters.paymentMethod)
      if (filters.slipType) params.append("slipType", filters.slipType)

      const res = await fetch(`/api/admin/orders-shipping/export?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to export CSV")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("CSV出力に失敗しました")
    }
  }

  const handlePrintLabel = async (orderId: number) => {
    try {
      const res = await fetch(`/api/admin/orders-shipping/${orderId}/label`, {
        method: "POST"
      })
      
      if (!res.ok) throw new Error("Failed to generate label")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank")
      window.URL.revokeObjectURL(url)
      
      fetchOrders()
    } catch (error) {
      console.error("Error printing label:", error)
      alert("ラベル印刷に失敗しました")
    }
  }

  const handleMarkAsShipped = async (orderId: number) => {
    if (!confirm("この注文を発送済みにしますか？")) return

    try {
      const res = await fetch(`/api/admin/orders-shipping/${orderId}/ship`, {
        method: "POST"
      })

      if (!res.ok) throw new Error("Failed to mark as shipped")

      alert("発送済みに更新しました")
      fetchOrders()
    } catch (error) {
      console.error("Error marking as shipped:", error)
      alert("更新に失敗しました")
    }
  }

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  return (
    <div className="space-y-6">
      <div>
        {/* ページヘッダー */}
        <div className="rounded-2xl bg-white border border-stone-100 p-5 mb-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>Shipping Status</p>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">受注・発送状況</h1>
              <p className="text-sm text-stone-400 mt-0.5">支払い方法・伝票種別での絞り込みと発送管理</p>
            </div>
            <div className="flex space-x-2">
              {hasSearched && orders.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV出力 ({orders.length}件)</span>
                </button>
              )}
            </div>
          </div>

          {/* 検索フィルター */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* 注文日 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">注文日（開始）</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">注文日（終了）</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 会員コード */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">会員コード</label>
              <input
                type="text"
                value={filters.memberCode}
                onChange={(e) => setFilters({ ...filters, memberCode: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="例: 417963-01"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 注文ステータス */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">注文ステータス</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全て</option>
                <option value="pending">未処理</option>
                <option value="processing">処理中</option>
                <option value="shipped">発送済</option>
                <option value="completed">完了</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>

            {/* 支払方法 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                <CreditCard className="inline w-3 h-3 mr-1" />
                支払方法
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全て</option>
                <option value="card">カード</option>
                <option value="bank_transfer">口座振替</option>
                <option value="bank_payment">銀行振り込み</option>
                <option value="cod">代引き</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* 伝票種別 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">伝票種別</label>
              <select
                value={filters.slipType}
                onChange={(e) => setFilters({ ...filters, slipType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全て</option>
                <option value="autoship">オートシップ</option>
                <option value="one_time">都度払い</option>
                <option value="new_member">新規</option>
                <option value="cooling_off">クーリングオフ</option>
                <option value="return">返品</option>
              </select>
            </div>

            {/* 配送業者 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">配送業者</label>
              <select
                value={filters.carrier}
                onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全て</option>
                <option value="yamato">ヤマト運輸</option>
                <option value="sagawa">佐川急便</option>
                <option value="japan_post">日本郵便</option>
              </select>
            </div>

            {/* 商品名・コード */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">商品名・コード</label>
              <input
                type="text"
                value={filters.searchKeyword}
                onChange={(e) => setFilters({ ...filters, searchKeyword: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="商品名またはコード"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>検索</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              <span>リセット</span>
            </button>
          </div>
        </div>

        {/* 結果エリア */}
        {!hasSearched ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">検索条件を入力して「検索」ボタンを押してください</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500">検索中...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">該当する注文が見つかりません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 件数バー */}
            <div className="px-4 py-3 bg-stone-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">{orders.length}件の注文が見つかりました</span>
            </div>

            <div className="divide-y divide-gray-100">
              {orders.map((order) => (
                <div key={order.id} className="hover:bg-stone-50 transition-colors">
                  {/* メイン行 */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* 展開ボタン */}
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      {expandedOrderId === order.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </button>

                    {/* 注文番号 */}
                    <div className="w-28 flex-shrink-0">
                      <div className="text-xs font-mono text-gray-800 font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.orderedAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>

                    {/* 会員情報 */}
                    <div className="w-36 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">{order.memberName}</div>
                      <div className="text-xs text-gray-500">{order.memberCode}</div>
                    </div>

                    {/* 支払方法 + 伝票種別 */}
                    <div className="w-32 flex-shrink-0">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-medium">
                        {order.paymentMethodLabel}
                      </span>
                      {order.shippingLabel?.deliveryType && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 font-medium">
                            {deliveryTypeLabels[order.shippingLabel.deliveryType] || order.shippingLabel.deliveryType}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 商品 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 truncate">
                        {order.items.map(i => i.productName).join("、")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)}点
                        　¥{order.totalAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* ステータス */}
                    <div className="w-20 flex-shrink-0 text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>

                    {/* 配送情報 */}
                    <div className="w-28 flex-shrink-0">
                      {order.shippingLabel ? (
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center space-x-1">
                            <Truck className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{carrierLabels[order.shippingLabel.carrier]}</span>
                          </div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            order.shippingLabel.status === "shipped" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {shippingStatusLabels[order.shippingLabel.status]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">配送未設定</span>
                      )}
                    </div>

                    {/* 操作ボタン */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintLabel(order.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="ラベル印刷"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {order.status === "processing" && (
                        <button
                          onClick={() => handleMarkAsShipped(order.id)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="発送済みにする"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 展開詳細 */}
                  {expandedOrderId === order.id && (
                    <div className="px-10 pb-4 bg-blue-50/30 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                        {/* 商品明細 */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-600 mb-2">商品明細</h4>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-200">
                                <td className="pb-1">商品名</td>
                                <td className="pb-1 text-right">単価</td>
                                <td className="pb-1 text-center">数量</td>
                                <td className="pb-1 text-right">小計</td>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100">
                                  <td className="py-1 text-gray-800">{item.productName}</td>
                                  <td className="py-1 text-right text-gray-600">¥{item.unitPrice.toLocaleString()}</td>
                                  <td className="py-1 text-center text-gray-600">{item.quantity}</td>
                                  <td className="py-1 text-right font-medium">¥{item.lineAmount.toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={3} className="pt-2 text-right font-semibold text-gray-700">合計</td>
                                <td className="pt-2 text-right font-bold text-gray-900">¥{order.totalAmount.toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* 配送情報詳細 */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-600 mb-2">配送情報</h4>
                          {order.shippingLabel ? (
                            <div className="text-xs text-gray-700 space-y-1">
                              <div><span className="text-gray-500">宛先：</span>{order.shippingLabel.recipientName}</div>
                              <div><span className="text-gray-500">電話：</span>{order.shippingLabel.recipientPhone}</div>
                              <div><span className="text-gray-500">住所：</span>〒{order.shippingLabel.recipientPostal} {order.shippingLabel.recipientAddress}</div>
                              <div><span className="text-gray-500">業者：</span>{carrierLabels[order.shippingLabel.carrier]}</div>
                              {order.shippingLabel.trackingNumber && (
                                <div><span className="text-gray-500">追跡番号：</span>{order.shippingLabel.trackingNumber}</div>
                              )}
                              {order.shippingLabel.shippedAt && (
                                <div><span className="text-gray-500">発送日：</span>{new Date(order.shippingLabel.shippedAt).toLocaleDateString("ja-JP")}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">配送情報未設定</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800">
                  注文編集 - {editingOrder.orderNumber}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 会員情報（読み取り専用） */}
              <div className="bg-stone-50 rounded-lg p-3 mb-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">会員名：</span>{editingOrder.memberName}</div>
                  <div><span className="text-gray-500">会員コード：</span>{editingOrder.memberCode}</div>
                  <div><span className="text-gray-500">支払方法：</span>{editingOrder.paymentMethodLabel}</div>
                  <div><span className="text-gray-500">伝票種別：</span>
                    {editingOrder.shippingLabel?.deliveryType
                      ? deliveryTypeLabels[editingOrder.shippingLabel.deliveryType] || editingOrder.shippingLabel.deliveryType
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">注文ステータス</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">未処理</option>
                    <option value="processing">処理中</option>
                    <option value="shipped">発送済</option>
                    <option value="completed">完了</option>
                    <option value="canceled">キャンセル</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">配送業者</label>
                  <select
                    value={editForm.carrier}
                    onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="yamato">ヤマト運輸</option>
                    <option value="sagawa">佐川急便</option>
                    <option value="japan_post">日本郵便</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">追跡番号</label>
                  <input
                    type="text"
                    value={editForm.trackingNumber}
                    onChange={(e) => setEditForm({ ...editForm, trackingNumber: e.target.value })}
                    placeholder="追跡番号を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">発送ステータス</label>
                  <select
                    value={editForm.shippingStatus}
                    onChange={(e) => setEditForm({ ...editForm, shippingStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">未印刷</option>
                    <option value="printed">印刷済み</option>
                    <option value="shipped">発送済み</option>
                    <option value="canceled">キャンセル</option>
                  </select>
                </div>

                {/* 配送先情報 */}
                {editingOrder.shippingLabel && (
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2 text-sm">配送先情報</h3>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>氏名: {editingOrder.shippingLabel.recipientName}</div>
                      <div>電話: {editingOrder.shippingLabel.recipientPhone}</div>
                      <div>〒{editingOrder.shippingLabel.recipientPostal}</div>
                      <div>{editingOrder.shippingLabel.recipientAddress}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
