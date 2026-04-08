"use client"

import { useState, useEffect } from "react"
import { 
  Package, Search, Download, Printer, Calendar, 
  User, Truck, FileText, Edit, Trash2, Filter, X 
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
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "未処理",
  processing: "処理中",
  shipped: "発送済",
  completed: "完了",
  canceled: "キャンセル"
}

const carrierLabels: Record<ShippingCarrier, string> = {
  yamato: "ヤマト運輸",
  sagawa: "佐川急便",
  japan_post: "日本郵便"
}

const shippingStatusLabels: Record<ShippingLabelStatus, string> = {
  pending: "未印刷",
  printed: "印刷済み",
  shipped: "発送済み",
  canceled: "キャンセル"
}

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  canceled: "bg-red-100 text-red-800"
}

export default function OrdersShippingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // フィルター状態
  const [filters, setFilters] = useState<SearchFilters>({
    startDate: "",
    endDate: "",
    memberCode: "",
    status: "",
    carrier: "",
    searchKeyword: ""
  })

  // 編集フォーム状態
  const [editForm, setEditForm] = useState({
    status: "",
    carrier: "",
    trackingNumber: "",
    shippingStatus: ""
  })

  useEffect(() => {
    fetchOrders()
  }, [])

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

      const res = await fetch(`/api/admin/orders-shipping?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch orders")
      
      const data = await res.json()
      setOrders(data.orders || [])
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
      searchKeyword: ""
    })
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">受注・発送状況</h1>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>CSV出力</span>
            </button>
          </div>

          {/* 検索フィルター */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                注文日（開始）
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                注文日（終了）
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会員コード
              </label>
              <input
                type="text"
                value={filters.memberCode}
                onChange={(e) => setFilters({ ...filters, memberCode: e.target.value })}
                placeholder="会員コードで検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                注文ステータス
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全て</option>
                <option value="pending">未処理</option>
                <option value="processing">処理中</option>
                <option value="shipped">発送済</option>
                <option value="completed">完了</option>
                <option value="canceled">キャンセル</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配送方法
              </label>
              <select
                value={filters.carrier}
                onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全て</option>
                <option value="yamato">ヤマト運輸</option>
                <option value="sagawa">佐川急便</option>
                <option value="japan_post">日本郵便</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品名・コード
              </label>
              <input
                type="text"
                value={filters.searchKeyword}
                onChange={(e) => setFilters({ ...filters, searchKeyword: e.target.value })}
                placeholder="商品名またはコードで検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSearch}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>検索</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-2 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>リセット</span>
            </button>
          </div>
        </div>

        {/* 注文一覧 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">該当する注文がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">注文番号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">注文日時</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">会員情報</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品情報</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">金額</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ステータス</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">配送情報</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(order.orderedAt).toLocaleString("ja-JP")}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{order.memberName}</div>
                          <div className="text-gray-500">{order.memberCode}</div>
                          <div className="text-gray-500 text-xs">{order.memberEmail}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-sm">
                              <span className="font-medium">{item.productName}</span>
                              <span className="text-gray-500 ml-2">
                                ({item.productCode}) × {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            ¥{order.totalAmount.toLocaleString()}
                          </div>
                          {order.usedPoints > 0 && (
                            <div className="text-xs text-green-600">
                              -{order.usedPoints}pt使用
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusColors[order.status as OrderStatus]}`}>
                          {statusLabels[order.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {order.shippingLabel ? (
                          <div className="text-sm space-y-1">
                            <div className="flex items-center space-x-1">
                              <Truck className="w-3 h-3 text-gray-500" />
                              <span>{carrierLabels[order.shippingLabel.carrier]}</span>
                            </div>
                            {order.shippingLabel.trackingNumber && (
                              <div className="text-xs text-gray-500">
                                追跡: {order.shippingLabel.trackingNumber}
                              </div>
                            )}
                            <div className="text-xs">
                              <span className="px-2 py-0.5 bg-gray-100 rounded">
                                {shippingStatusLabels[order.shippingLabel.status]}
                              </span>
                            </div>
                            {order.shippingLabel.shippedAt && (
                              <div className="text-xs text-gray-500">
                                発送日: {new Date(order.shippingLabel.shippedAt).toLocaleDateString("ja-JP")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">未設定</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintLabel(order.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="ラベル印刷"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {order.status === "processing" && (
                            <button
                              onClick={() => handleMarkAsShipped(order.id)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="発送済みにする"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">注文編集</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    注文番号
                  </label>
                  <input
                    type="text"
                    value={editingOrder.orderNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    注文ステータス
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配送業者
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    追跡番号
                  </label>
                  <input
                    type="text"
                    value={editForm.trackingNumber}
                    onChange={(e) => setEditForm({ ...editForm, trackingNumber: e.target.value })}
                    placeholder="追跡番号を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    発送ステータス
                  </label>
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

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">配送先情報</h3>
                  {editingOrder.shippingLabel && (
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>氏名: {editingOrder.shippingLabel.recipientName}</div>
                      <div>電話: {editingOrder.shippingLabel.recipientPhone}</div>
                      <div>〒{editingOrder.shippingLabel.recipientPostal}</div>
                      <div>{editingOrder.shippingLabel.recipientAddress}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
