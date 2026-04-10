"use client"

import { useState, useEffect } from "react"
import { 
  ShoppingCart, Search, Download, Calendar, 
  Filter, Package, Users, FileText, Plus, Edit, CheckCircle, X
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
  one_time: "都度払い",
  new_member: "新規",
  cooling_off: "クーリングオフ",
  canceled: "キャンセル",
  out_of_stock: "欠品",
  out_of_stock_minus_1: "欠品欠1",
  company_sale: "社販",
  other: "その他"
}

const statusColors: Record<string, string> = {
  autoship: "bg-blue-100 text-blue-800",
  one_time: "bg-green-100 text-green-800",
  new_member: "bg-purple-100 text-purple-800",
  cooling_off: "bg-orange-100 text-orange-800",
  canceled: "bg-red-100 text-red-800",
  out_of_stock: "bg-gray-100 text-gray-800",
  out_of_stock_minus_1: "bg-gray-100 text-gray-700",
  company_sale: "bg-yellow-100 text-yellow-800",
  other: "bg-slate-100 text-slate-800"
}

export default function ProductPurchasesPage() {
  const [activeTab, setActiveTab] = useState<"input" | "list" | "status" | "product" | "member">("input")
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  
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
  
  // ステータス管理用状態
  const [statusFilters, setStatusFilters] = useState({
    startMonth: "",
    endMonth: "",
    status: "",
    memberCode: ""
  })
  const [statusPurchases, setStatusPurchases] = useState<PurchaseRecord[]>([])
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null)
  const [editingStatus, setEditingStatus] = useState<PurchaseStatus>("one_time")
  const [savingStatus, setSavingStatus] = useState(false)
  
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

  // 商品リストを取得
  useEffect(() => {
    fetch("/api/admin/products")
      .then(res => res.json())
      .then(data => {
        const productsArray = data.products || []
        const productList = productsArray.map((p: { productCode?: string; product_code?: string; name?: string }) => ({
          code: p.productCode || p.product_code || "",
          name: p.name || ""
        })).filter((p: Product) => p.code)
        setProducts(productList)
      })
      .catch(err => console.error("Failed to load products:", err))
  }, [])

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
      setInputData({ productCode: "", month: "", quantity: 0, amount: 0, points: 0 })
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
      if (statusFilters.memberCode) params.append("memberCode", statusFilters.memberCode)

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

  // 購入ステータス更新
  const handleUpdateStatus = async (purchaseId: number) => {
    try {
      setSavingStatus(true)
      const res = await fetch(`/api/admin/product-purchases/${purchaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseStatus: editingStatus })
      })
      if (!res.ok) throw new Error("Failed to update")
      
      // ローカル状態を更新
      setStatusPurchases(prev => prev.map(p => 
        p.id === purchaseId ? { ...p, purchaseStatus: editingStatus } : p
      ))
      setEditingPurchaseId(null)
      alert("ステータスを更新しました")
    } catch (error) {
      console.error("Error updating status:", error)
      alert("更新に失敗しました")
    } finally {
      setSavingStatus(false)
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

  const tabClass = (tab: string) =>
    `px-5 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${
      activeTab === tab
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-gray-600 hover:text-gray-800"
    }`

  return (
    <div className="space-y-6">
      <div>
        {/* ページヘッダー */}
        <div className="rounded-2xl bg-white border border-stone-100 p-6 mb-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>Product Purchases</p>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">商品購入管理</h1>
            <p className="text-sm text-stone-400 mt-0.5">購入記録・ステータス管理・CSV出力</p>
          </div>

          {/* タブ */}
          <div className="flex flex-wrap gap-1 border-b border-stone-100">
            <button onClick={() => setActiveTab("input")} className={tabClass("input")}>
              <Plus className="w-4 h-4" /><span>購入入力</span>
            </button>
            <button onClick={() => setActiveTab("list")} className={tabClass("list")}>
              <FileText className="w-4 h-4" /><span>購入一覧</span>
            </button>
            <button onClick={() => setActiveTab("status")} className={tabClass("status")}>
              <Edit className="w-4 h-4" /><span>購入ステータス管理</span>
            </button>
            <button onClick={() => setActiveTab("product")} className={tabClass("product")}>
              <Package className="w-4 h-4" /><span>商品別一覧</span>
            </button>
            <button onClick={() => setActiveTab("member")} className={tabClass("member")}>
              <Users className="w-4 h-4" /><span>会員別一覧</span>
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">

          {/* 購入入力タブ */}
          {activeTab === "input" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">商品購入入力</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品コード <span className="text-red-500">*</span></label>
                  <select
                    value={inputData.productCode}
                    onChange={(e) => setInputData({ ...inputData, productCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {products.map((product) => (
                      <option key={product.code} value={product.code}>{product.code} - {product.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">年月 <span className="text-red-500">*</span></label>
                  <input type="month" value={inputData.month} onChange={(e) => setInputData({ ...inputData, month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">数量</label>
                  <input type="number" value={inputData.quantity} onChange={(e) => setInputData({ ...inputData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">金額（円）</label>
                  <input type="number" value={inputData.amount} onChange={(e) => setInputData({ ...inputData, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ポイント</label>
                  <input type="number" value={inputData.points} onChange={(e) => setInputData({ ...inputData, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={handleAddPurchase} disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? "追加中..." : "購入データを追加"}
              </button>
            </div>
          )}

          {/* 購入一覧タブ */}
          {activeTab === "list" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">購入一覧（商品別月次）</h2>
                <button onClick={() => handleExportCSV("product")}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Download className="w-4 h-4" /><span>CSV出力</span>
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
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">商品コード</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">商品名</th>
                        {Object.keys(monthlyPurchases[0]?.months || {}).sort().map(month => (
                          <th key={month} className="px-4 py-3 text-right font-semibold text-gray-700">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monthlyPurchases.map((purchase) => (
                        <tr key={purchase.productCode} className="hover:bg-stone-50">
                          <td className="px-4 py-3">{purchase.productCode}</td>
                          <td className="px-4 py-3">{purchase.productName}</td>
                          {Object.keys(purchase.months).sort().map(month => (
                            <td key={month} className="px-4 py-3 text-right text-xs">
                              {purchase.months[month]?.quantity || 0}個 / 
                              ¥{(purchase.months[month]?.amount || 0).toLocaleString()} / 
                              {purchase.months[month]?.points || 0}pt
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 購入ステータス管理タブ */}
          {activeTab === "status" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">購入ステータス管理</h2>
              <p className="text-sm text-gray-600 mb-4">購入記録を検索し、ステータスを変更できます。</p>
              
              {/* 検索フォーム */}
              <div className="bg-stone-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">検索条件</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">開始年月</label>
                    <input type="month" value={statusFilters.startMonth}
                      onChange={(e) => setStatusFilters({ ...statusFilters, startMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">終了年月</label>
                    <input type="month" value={statusFilters.endMonth}
                      onChange={(e) => setStatusFilters({ ...statusFilters, endMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ステータス</label>
                    <select value={statusFilters.status}
                      onChange={(e) => setStatusFilters({ ...statusFilters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">すべて</option>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">会員コード</label>
                    <input type="text" value={statusFilters.memberCode} placeholder="例: 100001"
                      onChange={(e) => setStatusFilters({ ...statusFilters, memberCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleSearchByStatus} disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <Search className="w-4 h-4" /><span>{loading ? "検索中..." : "検索"}</span>
                  </button>
                  <button onClick={() => handleExportCSV("status")}
                    className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Download className="w-4 h-4" /><span>CSV出力</span>
                  </button>
                </div>
              </div>

              {/* 検索結果 */}
              {statusPurchases.length > 0 && (
                <div className="overflow-x-auto mt-2">
                  <p className="text-sm text-gray-600 mb-3">検索結果: {statusPurchases.length}件</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700">会員コード</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700">氏名</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700">商品</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">現在のステータス</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700">数量</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700">金額</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700">ポイント</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">購入月</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {statusPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-stone-50">
                          <td className="px-3 py-3">{purchase.memberCode}</td>
                          <td className="px-3 py-3">{purchase.memberName}</td>
                          <td className="px-3 py-3 text-xs">
                            <div className="font-medium">{purchase.productName}</div>
                            <div className="text-gray-500">{purchase.productCode}</div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {editingPurchaseId === purchase.id ? (
                              <div className="flex items-center gap-2 justify-center">
                                <select
                                  value={editingStatus}
                                  onChange={(e) => setEditingStatus(e.target.value as PurchaseStatus)}
                                  className="px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                  autoFocus
                                >
                                  {Object.entries(statusLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleUpdateStatus(purchase.id)}
                                  disabled={savingStatus}
                                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="保存"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => setEditingPurchaseId(null)}
                                  className="p-1 text-gray-500 hover:text-gray-700"
                                  title="キャンセル"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[purchase.purchaseStatus] || "bg-gray-100 text-gray-800"}`}>
                                {statusLabels[purchase.purchaseStatus] || purchase.purchaseStatus}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">{purchase.quantity}</td>
                          <td className="px-3 py-3 text-right">¥{purchase.totalAmount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right">{purchase.totalPoints}</td>
                          <td className="px-3 py-3 text-center">{purchase.purchaseMonth}</td>
                          <td className="px-3 py-3 text-center">
                            {editingPurchaseId !== purchase.id && (
                              <button
                                onClick={() => {
                                  setEditingPurchaseId(purchase.id)
                                  setEditingStatus(purchase.purchaseStatus)
                                }}
                                className="flex items-center gap-1 mx-auto px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                              >
                                <Edit className="w-3 h-3" /><span>変更</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {statusPurchases.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>検索条件を設定して「検索」ボタンをクリックしてください</p>
                </div>
              )}
            </div>
          )}

          {/* 商品別購入一覧タブ */}
          {activeTab === "product" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">商品別購入一覧</h2>
              <div className="bg-stone-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">商品コード</label>
                    <select value={productFilters.productCode}
                      onChange={(e) => setProductFilters({ ...productFilters, productCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">すべて</option>
                      {products.map((product) => (
                        <option key={product.code} value={product.code}>{product.code} - {product.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">開始年月</label>
                    <input type="month" value={productFilters.startMonth}
                      onChange={(e) => setProductFilters({ ...productFilters, startMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">終了年月</label>
                    <input type="month" value={productFilters.endMonth}
                      onChange={(e) => setProductFilters({ ...productFilters, endMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleSearchByProduct} disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <Search className="w-4 h-4" /><span>{loading ? "検索中..." : "検索"}</span>
                  </button>
                  <button onClick={() => handleExportCSV("product")}
                    className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Download className="w-4 h-4" /><span>CSV出力</span>
                  </button>
                </div>
              </div>

              {productPurchases.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-sm text-gray-600 mb-3">検索結果: {productPurchases.length}件</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">氏名</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員コード</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">ステータス</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">数量</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">金額</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">ポイント</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">購入月</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3">{purchase.id}</td>
                          <td className="px-4 py-3">{purchase.memberName}</td>
                          <td className="px-4 py-3">{purchase.memberCode}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[purchase.purchaseStatus] || "bg-gray-100 text-gray-800"}`}>
                              {statusLabels[purchase.purchaseStatus] || purchase.purchaseStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{purchase.quantity}</td>
                          <td className="px-4 py-3 text-right">¥{purchase.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{purchase.totalPoints}</td>
                          <td className="px-4 py-3 text-center">{purchase.purchaseMonth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {productPurchases.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>検索条件を設定して「検索」ボタンをクリックしてください</p>
                </div>
              )}
            </div>
          )}

          {/* 会員別購入一覧タブ */}
          {activeTab === "member" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">会員別購入記録一覧</h2>
              <div className="bg-stone-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">会員コード</label>
                    <input type="text" value={memberFilters.memberCode} placeholder="例: 100001"
                      onChange={(e) => setMemberFilters({ ...memberFilters, memberCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">開始年月</label>
                    <input type="month" value={memberFilters.startMonth}
                      onChange={(e) => setMemberFilters({ ...memberFilters, startMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">終了年月</label>
                    <input type="month" value={memberFilters.endMonth}
                      onChange={(e) => setMemberFilters({ ...memberFilters, endMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleSearchByMember} disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <Search className="w-4 h-4" /><span>{loading ? "検索中..." : "検索"}</span>
                  </button>
                  <button onClick={() => handleExportCSV("member")}
                    className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Download className="w-4 h-4" /><span>CSV出力</span>
                  </button>
                </div>
              </div>

              {memberPurchases.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-sm text-gray-600 mb-3">検索結果: {memberPurchases.length}件</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">氏名</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">会員コード</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">商品</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">ステータス</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">数量</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">金額</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">購入日</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">購入月</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {memberPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-stone-50">
                          <td className="px-4 py-3">{purchase.id}</td>
                          <td className="px-4 py-3">{purchase.memberName}</td>
                          <td className="px-4 py-3">{purchase.memberCode}</td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium">{purchase.productName}</div>
                            <div className="text-gray-500">{purchase.productCode}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[purchase.purchaseStatus] || "bg-gray-100 text-gray-800"}`}>
                              {statusLabels[purchase.purchaseStatus] || purchase.purchaseStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{purchase.quantity}</td>
                          <td className="px-4 py-3 text-right">¥{purchase.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">{new Date(purchase.purchasedAt).toLocaleDateString("ja-JP")}</td>
                          <td className="px-4 py-3 text-center">{purchase.purchaseMonth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {memberPurchases.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>会員コードを入力して「検索」ボタンをクリックしてください</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
