"use client"

import { useState, useEffect } from "react"
import { 
  Truck, Search, Download, Calendar, 
  Plus, Printer, FileText, User, Package, X, Edit
} from "lucide-react"

// 型定義
type ShippingCarrier = "yamato" | "sagawa" | "japan_post"
type ShippingLabelStatus = "pending" | "printed" | "shipped" | "canceled"

interface Product {
  name: string
  price: number
  value: number
  points: number
  quantity: number
  subtotal: number
}

interface ShippingLabel {
  id: number
  orderNumber: string
  carrier: ShippingCarrier
  trackingNumber: string | null
  status: ShippingLabelStatus
  recipientName: string
  recipientPhone: string
  recipientPostal: string
  recipientAddress: string
  recipientFax: string | null
  recipientCompany: string | null
  deliveryType: string | null
  deliveryTime: string | null
  shippingFee: number
  shippingFeeType: string
  customerRank: string | null
  autoshipNo: string | null
  memberJoinDate: string | null
  birthDate: string | null
  products: Product[]
  createdAt: string
}

interface SearchFilters {
  startDate: string
  endDate: string
  joinStartDate: string
  joinEndDate: string
  deliveryMethod: string
  carrier: string
  deliveryDate: string
  deliveryType: string
  customerRank: string
  shippingDestination: string
  deliveryTime: string
}

const carrierLabels: Record<ShippingCarrier, string> = {
  yamato: "ヤマト運輸",
  sagawa: "佐川急便",
  japan_post: "日本郵便"
}

const statusLabels: Record<ShippingLabelStatus, string> = {
  pending: "未印刷",
  printed: "印刷済み",
  shipped: "発送済み",
  canceled: "キャンセル"
}

const deliveryTypes = [
  "全体", "金券", "手渡し", "オートシップ", "クーリング・オフ", 
  "交換", "キャンセル", "その他", "総合予約", "追加", 
  "社員配送", "Web", "プレゼント", "出金納付"
]

const customerRanks = [
  "手順次", "一般", "その他", "会員", "会員配送"
]

const shippingDestinations = [
  "主婦向", "送料無料対象"
]

const deliveryTimes = [
  "午前", "午後", "12時～14時", "14時～16時", "16時～18時", 
  "18時～20時", "19時～21時", "10時～12時（午前中）", 
  "14時～16時（午後1）", "16時～18時（午後2）", "18時～20時（夕方1）", 
  "19時～21時（夕方2）"
]

const shippingFeeTypes = [
  { label: "送料無料", value: "free" },
  { label: "送料500円", value: "500" },
  { label: "着払い指定", value: "cod" }
]

export default function ShippingLabelsAdvancedPage() {
  const [labels, setLabels] = useState<ShippingLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState<number[]>([])
  
  // 検索フィルター
  const [filters, setFilters] = useState<SearchFilters>({
    startDate: "",
    endDate: "",
    joinStartDate: "",
    joinEndDate: "",
    deliveryMethod: "",
    carrier: "",
    deliveryDate: "",
    deliveryType: "",
    customerRank: "",
    shippingDestination: "",
    deliveryTime: ""
  })

  // 伝票作成フォーム
  const [createForm, setCreateForm] = useState({
    autoshipNo: "",
    memberName: "",
    memberPhone: "",
    memberPostal: "",
    memberAddress: "",
    companyName: "",
    corporateName: "",
    representative: "",
    phone: "",
    fax: "",
    birthDate: "",
    initialContact: "",
    customerRank: "",
    shippingAddress: "",
    birthDateShipping: "",
    carrier: "yamato",
    trackingNumber: "",
    shippingDestination: "",
    shippingFeeType: "free",
    deliveryTime: ""
  })

  const [products, setProducts] = useState<Product[]>([
    { name: "", price: 0, value: 0, points: 0, quantity: 1, subtotal: 0 }
  ])

  useEffect(() => {
    fetchLabels()
  }, [])

  const fetchLabels = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.deliveryType) params.append("deliveryType", filters.deliveryType)
      if (filters.carrier) params.append("carrier", filters.carrier)

      const res = await fetch(`/api/admin/shipping-labels-advanced?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch labels")
      
      const data = await res.json()
      setLabels(data.labels || [])
    } catch (error) {
      console.error("Error fetching labels:", error)
      alert("伝票データの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchLabels()
  }

  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      joinStartDate: "",
      joinEndDate: "",
      deliveryMethod: "",
      carrier: "",
      deliveryDate: "",
      deliveryType: "",
      customerRank: "",
      shippingDestination: "",
      deliveryTime: ""
    })
  }

  const handleCreateLabel = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/shipping-labels-advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          products
        })
      })

      if (!res.ok) throw new Error("Failed to create label")

      alert("伝票を作成しました")
      setShowCreateModal(false)
      fetchLabels()
    } catch (error) {
      console.error("Error creating label:", error)
      alert("伝票作成に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handlePrintLabels = async (labelIds: number[]) => {
    try {
      const res = await fetch("/api/admin/shipping-labels-advanced/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds })
      })

      if (!res.ok) throw new Error("Failed to print labels")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank")
      window.URL.revokeObjectURL(url)
      
      fetchLabels()
    } catch (error) {
      console.error("Error printing labels:", error)
      alert("印刷に失敗しました")
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)

      const res = await fetch(`/api/admin/shipping-labels-advanced/export?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to export")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `shipping_labels_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("CSV出力に失敗しました")
    }
  }

  const addProduct = () => {
    setProducts([...products, { name: "", price: 0, value: 0, points: 0, quantity: 1, subtotal: 0 }])
  }

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index))
  }

  const updateProduct = (index: number, field: keyof Product, value: any) => {
    const newProducts = [...products]
    newProducts[index] = { ...newProducts[index], [field]: value }
    if (field === "quantity" || field === "price") {
      newProducts[index].subtotal = newProducts[index].quantity * newProducts[index].price
    }
    setProducts(newProducts)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Truck className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">伝票作成</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>新規作成</span>
              </button>
              {selectedLabels.length > 0 && (
                <button
                  onClick={() => handlePrintLabels(selectedLabels)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Printer className="w-4 h-4" />
                  <span>選択印刷 ({selectedLabels.length}件)</span>
                </button>
              )}
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Download className="w-4 h-4" />
                <span>CSV出力</span>
              </button>
            </div>
          </div>

          {/* 検索フィルター */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象日（開始）
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象日（終了）
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                受渡方法
              </label>
              <select
                value={filters.deliveryType}
                onChange={(e) => setFilters({ ...filters, deliveryType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {deliveryTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配送業者
              </label>
              <select
                value={filters.carrier}
                onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="yamato">ヤマト運輸</option>
                <option value="sagawa">佐川急便</option>
                <option value="japan_post">日本郵便</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧客ランク
              </label>
              <select
                value={filters.customerRank}
                onChange={(e) => setFilters({ ...filters, customerRank: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {customerRanks.map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配達希望時間帯
              </label>
              <select
                value={filters.deliveryTime}
                onChange={(e) => setFilters({ ...filters, deliveryTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {deliveryTimes.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSearch}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Search className="w-4 h-4" />
              <span>検索</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-2 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              <X className="w-4 h-4" />
              <span>クリア</span>
            </button>
          </div>
        </div>

        {/* 伝票一覧 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : labels.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">伝票がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLabels(labels.map(l => l.id))
                          } else {
                            setSelectedLabels([])
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">伝票番号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">宛先</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">配送業者</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">配達方法</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ステータス</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {labels.map((label) => (
                    <tr key={label.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLabels.includes(label.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLabels([...selectedLabels, label.id])
                            } else {
                              setSelectedLabels(selectedLabels.filter(id => id !== label.id))
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">{label.orderNumber}</td>
                      <td className="px-4 py-4 text-sm">
                        <div>{label.recipientName}</div>
                        <div className="text-gray-500 text-xs">{label.recipientAddress}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">{carrierLabels[label.carrier]}</td>
                      <td className="px-4 py-4 text-sm">{label.deliveryType || "-"}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {statusLabels[label.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handlePrintLabels([label.id])}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="印刷"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">伝票作成</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">基本情報</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        オートシップNo
                      </label>
                      <input
                        type="text"
                        value={createForm.autoshipNo}
                        onChange={(e) => setCreateForm({ ...createForm, autoshipNo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        会員名
                      </label>
                      <input
                        type="text"
                        value={createForm.memberName}
                        onChange={(e) => setCreateForm({ ...createForm, memberName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        電話番号
                      </label>
                      <input
                        type="tel"
                        value={createForm.memberPhone}
                        onChange={(e) => setCreateForm({ ...createForm, memberPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        郵便番号
                      </label>
                      <input
                        type="text"
                        value={createForm.memberPostal}
                        onChange={(e) => setCreateForm({ ...createForm, memberPostal: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* 商品情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">商品情報</h3>
                  {products.map((product, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="商品名"
                        value={product.name}
                        onChange={(e) => updateProduct(index, "name", e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="価格"
                        value={product.price}
                        onChange={(e) => updateProduct(index, "price", parseInt(e.target.value) || 0)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="数量"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value) || 1)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="ポイント"
                        value={product.points}
                        onChange={(e) => updateProduct(index, "points", parseInt(e.target.value) || 0)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => removeProduct(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addProduct}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    商品追加
                  </button>
                </div>

                {/* 配送設定 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">配送設定</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        配送業者
                      </label>
                      <select
                        value={createForm.carrier}
                        onChange={(e) => setCreateForm({ ...createForm, carrier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="yamato">ヤマト運輸</option>
                        <option value="sagawa">佐川急便</option>
                        <option value="japan_post">日本郵便</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        送料設定
                      </label>
                      <select
                        value={createForm.shippingFeeType}
                        onChange={(e) => setCreateForm({ ...createForm, shippingFeeType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {shippingFeeTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateLabel}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "作成中..." : "作成"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
