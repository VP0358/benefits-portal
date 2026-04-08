"use client"

import { useState, useEffect } from "react"
import { 
  ShoppingCart, Search, Download, Calendar, 
  Filter, Package, Users, FileText, Plus, Edit, Trash2 
} from "lucide-react"

// 型定義
type PurchaseStatus = 
  | "autoship" 
  | "one_time" 
  | "new_member" 
  | "cooling_off" 
  | "canceled"
  | "out_of_stock"
  | "out_of_stock_minus_1"
  | "company_sale"
  | "other"

interface Product {
  code: string
  name: string
}

interface PurchaseRecord {
  id: number
  memberCode: string
  memberName: string
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  points: number
  totalPoints: number
  purchaseStatus: PurchaseStatus
  purchaseMonth: string
  purchasedAt: string
}

interface MonthlyPurchase {
  productCode: string
  productName: string
  months: {
    [month: string]: {
      quantity: number
      amount: number
      points: number
    }
  }
}

const statusLabels: Record<PurchaseStatus, string> = {
  autoship: "オートシップ",
  one_time: "定期購入",
  new_member: "入会時等",
  cooling_off: "クーリングオフ",
  canceled: "キャンセル",
  out_of_stock: "欠品",
  out_of_stock_minus_1: "欠品欠1",
  company_sale: "社販",
  other: "その他"
}

const products: Product[] = [
  { code: "1000", name: "VIOLA Pure 翠彩-SUMISAI-" },
  { code: "2000", name: "ぬか酵素ぱっぷ" },
  { code: "4000", name: "山宇開発食材等" },
  { code: "2001", name: "岩盤美楽ぱっぷ" },
  { code: "15000", name: "記念商品" }
]

export default function ProductPurchasesPage() {
  const [activeTab, setActiveTab] = useState<"input" | "list" | "status" | "product" | "member">("input")
  const [loading, setLoading] = useState(false)
  
  // 購入入力用状態
  const [inputData, setInputData] = useState({
    productCode: "",
    month: "",
    quantity: 0,
    amount: 0,
    points: 0
  })
  
  // 購入一覧用状態
  const [monthlyPurchases, setMonthlyPurchases] = useState<MonthlyPurchase[]>([])
  
  // ステータス別検索用状態
  const [statusFilters, setStatusFilters] = useState({
    startMonth: "",
    endMonth: "",
    status: ""
  })
  const [statusPurchases, setStatusPurchases] = useState<PurchaseRecord[]>([])
  
  // 商品別検索用状態
  const [productFilters, setProductFilters] = useState({
    productCode: "",
    startMonth: "",
    endMonth: ""
  })
  const [productPurchases, setProductPurchases] = useState<PurchaseRecord[]>([])
  
  // 購入者別検索用状態
  const [memberFilters, setMemberFilters] = useState({
    memberCode: "",
    startMonth: "",
    endMonth: ""
  })
  const [memberPurchases, setMemberPurchases] = useState<PurchaseRecord[]>([])

  // 商品コードから商品名を取得
  const getProductName = (code: string) => {
    const product = products.find(p => p.code === code)
    return product?.name || ""
  }

  // 購入データ入力
  const handleAddPurchase = async () => {
    if (!inputData.productCode || !inputData.month) {
      alert("商品コードと年月を入力してください")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/admin/product-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: inputData.productCode,
          productName: getProductName(inputData.productCode),
          month: inputData.month,
          quantity: inputData.quantity,
          amount: inputData.amount,
          points: inputData.points
        })
      })

      if (!res.ok) throw new Error("Failed to add purchase")

      alert("購入データを追加しました")
      setInputData({
        productCode: "",
        month: "",
        quantity: 0,
        amount: 0,
        points: 0
      })
      fetchMonthlyPurchases()
    } catch (error) {
      console.error("Error adding purchase:", error)
      alert("追加に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  // 購入一覧取得
  const fetchMonthlyPurchases = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/product-purchases/monthly")
      if (!res.ok) throw new Error("Failed to fetch purchases")
      
      const data = await res.json()
      setMonthlyPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error fetching monthly purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  // ステータス別検索
  const handleSearchByStatus = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilters.startMonth) params.append("startMonth", statusFilters.startMonth)
      if (statusFilters.endMonth) params.append("endMonth", statusFilters.endMonth)
      if (statusFilters.status) params.append("status", statusFilters.status)

      const res = await fetch(`/api/admin/product-purchases/by-status?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to search")
      
      const data = await res.json()
      setStatusPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error searching by status:", error)
      alert("検索に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  // 商品別検索
  const handleSearchByProduct = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (productFilters.productCode) params.append("productCode", productFilters.productCode)
      if (productFilters.startMonth) params.append("startMonth", productFilters.startMonth)
      if (productFilters.endMonth) params.append("endMonth", productFilters.endMonth)

      const res = await fetch(`/api/admin/product-purchases/by-product?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to search")
      
      const data = await res.json()
      setProductPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error searching by product:", error)
      alert("検索に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  // 購入者別検索
  const handleSearchByMember = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (memberFilters.memberCode) params.append("memberCode", memberFilters.memberCode)
      if (memberFilters.startMonth) params.append("startMonth", memberFilters.startMonth)
      if (memberFilters.endMonth) params.append("endMonth", memberFilters.endMonth)

      const res = await fetch(`/api/admin/product-purchases/by-member?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to search")
      
      const data = await res.json()
      setMemberPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error searching by member:", error)
      alert("検索に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  // CSV出力
  const handleExportCSV = async (type: "status" | "product" | "member") => {
    try {
      let url = ""
      const params = new URLSearchParams()
      
      if (type === "status") {
        if (statusFilters.startMonth) params.append("startMonth", statusFilters.startMonth)
        if (statusFilters.endMonth) params.append("endMonth", statusFilters.endMonth)
        if (statusFilters.status) params.append("status", statusFilters.status)
        url = `/api/admin/product-purchases/export/by-status?${params.toString()}`
      } else if (type === "product") {
        if (productFilters.productCode) params.append("productCode", productFilters.productCode)
        if (productFilters.startMonth) params.append("startMonth", productFilters.startMonth)
        if (productFilters.endMonth) params.append("endMonth", productFilters.endMonth)
        url = `/api/admin/product-purchases/export/by-product?${params.toString()}`
      } else if (type === "member") {
        if (memberFilters.memberCode) params.append("memberCode", memberFilters.memberCode)
        if (memberFilters.startMonth) params.append("startMonth", memberFilters.startMonth)
        if (memberFilters.endMonth) params.append("endMonth", memberFilters.endMonth)
        url = `/api/admin/product-purchases/export/by-member?${params.toString()}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to export")

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `purchases_${type}_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("CSV出力に失敗しました")
    }
  }

  useEffect(() => {
    if (activeTab === "list") {
      fetchMonthlyPurchases()
    }
  }, [activeTab])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">商品購入管理</h1>
          </div>

          {/* タブ */}
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("input")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "input"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>商品購入入力</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "list"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>購入一覧</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "status"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>購入ポイント設定上限検索</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("product")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "product"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>商品別購入一覧</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("member")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "member"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>購入者の購入記録一覧</span>
              </div>
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* 商品購入入力タブ */}
          {activeTab === "input" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">商品購入入力</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品コード <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inputData.productCode}
                    onChange={(e) => setInputData({ ...inputData, productCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {products.map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年月 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    value={inputData.month}
                    onChange={(e) => setInputData({ ...inputData, month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数量
                  </label>
                  <input
                    type="number"
                    value={inputData.quantity}
                    onChange={(e) => setInputData({ ...inputData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    金額（円）
                  </label>
                  <input
                    type="number"
                    value={inputData.amount}
                    onChange={(e) => setInputData({ ...inputData, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ポイント
                  </label>
                  <input
                    type="number"
                    value={inputData.points}
                    onChange={(e) => setInputData({ ...inputData, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleAddPurchase}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "追加中..." : "購入データを追加"}
              </button>
            </div>
          )}

          {/* 購入一覧タブ */}
          {activeTab === "list" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">購入一覧</h2>
                <button
                  onClick={() => handleExportCSV("product")}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV出力</span>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : monthlyPurchases.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">購入データがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品コード</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品名</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">2024年2月</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">2024年3月</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">2024年4月</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monthlyPurchases.map((purchase) => (
                        <tr key={purchase.productCode} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm">{purchase.productCode}</td>
                          <td className="px-4 py-4 text-sm">{purchase.productName}</td>
                          <td className="px-4 py-4 text-sm text-right">
                            {purchase.months["2024-02"]?.quantity || 0} / 
                            ¥{(purchase.months["2024-02"]?.amount || 0).toLocaleString()} / 
                            {purchase.months["2024-02"]?.points || 0}pt
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            {purchase.months["2024-03"]?.quantity || 0} / 
                            ¥{(purchase.months["2024-03"]?.amount || 0).toLocaleString()} / 
                            {purchase.months["2024-03"]?.points || 0}pt
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            {purchase.months["2024-04"]?.quantity || 0} / 
                            ¥{(purchase.months["2024-04"]?.amount || 0).toLocaleString()} / 
                            {purchase.months["2024-04"]?.points || 0}pt
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 購入ポイント設定上限検索タブ */}
          {activeTab === "status" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">購入ポイント設定上限検索</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始年月
                  </label>
                  <input
                    type="month"
                    value={statusFilters.startMonth}
                    onChange={(e) => setStatusFilters({ ...statusFilters, startMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了年月
                  </label>
                  <input
                    type="month"
                    value={statusFilters.endMonth}
                    onChange={(e) => setStatusFilters({ ...statusFilters, endMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <select
                    value={statusFilters.status}
                    onChange={(e) => setStatusFilters({ ...statusFilters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">すべて</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSearchByStatus}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>検索</span>
                </button>
                <button
                  onClick={() => handleExportCSV("status")}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>ダウンロード</span>
                </button>
              </div>

              {statusPurchases.length > 0 && (
                <div className="overflow-x-auto mt-6">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">会員コード</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">氏名</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ステータス</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">数量</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">金額</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">ポイント</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">購入月</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {statusPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm">{purchase.memberCode}</td>
                          <td className="px-4 py-4 text-sm">{purchase.memberName}</td>
                          <td className="px-4 py-4 text-sm">
                            {purchase.productCode} - {purchase.productName}
                          </td>
                          <td className="px-4 py-4 text-sm text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {statusLabels[purchase.purchaseStatus]}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-right">{purchase.quantity}</td>
                          <td className="px-4 py-4 text-sm text-right">¥{purchase.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-right">{purchase.totalPoints}</td>
                          <td className="px-4 py-4 text-sm text-center">{purchase.purchaseMonth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 商品別購入一覧タブ */}
          {activeTab === "product" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">商品別購入一覧</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品ID
                  </label>
                  <select
                    value={productFilters.productCode}
                    onChange={(e) => setProductFilters({ ...productFilters, productCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">すべて</option>
                    {products.map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始年月
                  </label>
                  <input
                    type="month"
                    value={productFilters.startMonth}
                    onChange={(e) => setProductFilters({ ...productFilters, startMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了年月
                  </label>
                  <input
                    type="month"
                    value={productFilters.endMonth}
                    onChange={(e) => setProductFilters({ ...productFilters, endMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSearchByProduct}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>検索</span>
                </button>
                <button
                  onClick={() => handleExportCSV("product")}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>ダウンロード</span>
                </button>
              </div>

              {productPurchases.length > 0 && (
                <div className="overflow-x-auto mt-6">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">注文ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">氏名</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">会員コード</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">購入数</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">金額</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">ポイント</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">購入月</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm">{purchase.id}</td>
                          <td className="px-4 py-4 text-sm">{purchase.memberName}</td>
                          <td className="px-4 py-4 text-sm">{purchase.memberCode}</td>
                          <td className="px-4 py-4 text-sm text-right">{purchase.quantity}</td>
                          <td className="px-4 py-4 text-sm text-right">¥{purchase.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-right">{purchase.totalPoints}</td>
                          <td className="px-4 py-4 text-sm text-center">{purchase.purchaseMonth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 購入者の購入記録一覧タブ */}
          {activeTab === "member" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">購入者の購入記録一覧</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    会員ID
                  </label>
                  <input
                    type="text"
                    value={memberFilters.memberCode}
                    onChange={(e) => setMemberFilters({ ...memberFilters, memberCode: e.target.value })}
                    placeholder="会員コードを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始年月
                  </label>
                  <input
                    type="month"
                    value={memberFilters.startMonth}
                    onChange={(e) => setMemberFilters({ ...memberFilters, startMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了年月
                  </label>
                  <input
                    type="month"
                    value={memberFilters.endMonth}
                    onChange={(e) => setMemberFilters({ ...memberFilters, endMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSearchByMember}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>検索</span>
                </button>
                <button
                  onClick={() => handleExportCSV("member")}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>ダウンロード</span>
                </button>
              </div>

              {memberPurchases.length > 0 && (
                <div className="overflow-x-auto mt-6">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">注文1</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">氏名</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">注文確認日</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">会員コード</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">数量</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">金額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {memberPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm">{purchase.id}</td>
                          <td className="px-4 py-4 text-sm">{purchase.memberName}</td>
                          <td className="px-4 py-4 text-sm">
                            {new Date(purchase.purchasedAt).toLocaleDateString("ja-JP")}
                          </td>
                          <td className="px-4 py-4 text-sm">{purchase.memberCode}</td>
                          <td className="px-4 py-4 text-sm">
                            {purchase.productCode} - {purchase.productName}
                          </td>
                          <td className="px-4 py-4 text-sm text-right">{purchase.quantity}</td>
                          <td className="px-4 py-4 text-sm text-right">¥{purchase.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
