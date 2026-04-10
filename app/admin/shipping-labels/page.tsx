'use client'

import { useState, useEffect } from 'react'
import { Search, X, Plus, Printer, Download, Save, Trash2, Calendar } from 'lucide-react'

// 配達方法の選択肢
const DELIVERY_TYPES = [
  { value: 'voucher', label: '金券' },
  { value: 'hand_delivery', label: '手渡し' },
  { value: 'autoship', label: 'オートシップ' },
  { value: 'cooling_off', label: 'クーリング・オフ' },
  { value: 'exchange', label: '交換' },
  { value: 'cancel', label: 'キャンセル' },
  { value: 'other_order', label: '他発注' },
  { value: 'combined_reserve', label: '合わせ予約' },
  { value: 'additional', label: '追加' },
  { value: 'staff_delivery', label: '社員配達' },
  { value: 'staff_list', label: '社員配達リスト' },
  { value: 'web', label: 'Web' },
  { value: 'present', label: 'プレゼント' },
  { value: 'mid_cancel', label: '中途解約' },
]

// お客様ランク
const CUSTOMER_RANKS = [
  { value: 'sequential', label: '連続' },
  { value: 'regular', label: '定期' },
  { value: 'other', label: 'その他' },
  { value: 'member', label: '会員' },
  { value: 'card', label: 'カード' },
  { value: 'associate', label: '準会員' },
  { value: 'convenience', label: 'コンビニ' },
  { value: 'other_delivery', label: 'その他配達' },
]

// 受注方法
const ORDER_METHODS = [
  { value: 'handwritten', label: '手書' },
  { value: 'postcard', label: 'ハガキ' },
  { value: 'normal', label: '通常' },
  { value: 'overseas', label: '海外' },
]

// 配達時間
const DELIVERY_TIMES = [
  { value: '', label: '指定なし' },
  { value: 'morning', label: '午前中' },
  { value: '12-14', label: '12時〜14時' },
  { value: '14-16', label: '14時〜16時' },
  { value: '16-18', label: '16時〜18時' },
  { value: '18-20', label: '18時〜20時' },
  { value: '19-21', label: '19時〜21時' },
  { value: 'afternoon', label: '午後(12時〜)' },
  { value: '14-16-sat', label: '14時〜16時(土のみ)' },
  { value: '16-18-sat', label: '16時〜18時(土のみ)' },
  { value: '18-20-sat', label: '18時〜20時(土のみ)' },
  { value: 'afternoon-2days', label: '午後(2日後〜)' },
  { value: '14-16-2days', label: '14時〜16時(2日後〜)' },
  { value: '16-18-2days', label: '16時〜18時(2日後〜)' },
  { value: '18-20-2days', label: '18時〜20時(2日後〜)' },
]

// 配送センター
const DELIVERY_CENTERS = [
  { value: 'hand_delivery', label: '手渡し' },
  { value: 'big14_center', label: '第14Bigセンター' },
  { value: 'big2_center', label: '第2Bigセンター' },
  { value: 'other', label: 'その他' },
]

// 配送業者
const CARRIERS = [
  { value: 'yamato', label: 'ヤマト運輸' },
  { value: 'sagawa', label: '佐川急便' },
  { value: 'japan_post', label: '日本郵便' },
]

interface Product {
  id: string
  code: string
  name: string
  price: number
  points: number
  quantity: number
}

interface ShippingLabel {
  id?: number
  orderId?: number
  orderNumber?: string
  // 検索フィルター
  shippingDateFrom?: string
  shippingDateTo?: string
  arrivalDateFrom?: string
  arrivalDateTo?: string
  joinDateFrom?: string
  joinDateTo?: string
  orderMethod?: string
  deliveryNumber?: string
  desiredDeliveryDate?: string
  recordNumber?: string
  
  // 注文者情報
  ordererName?: string
  legalEntityName?: string
  representative?: string
  ordererPhone?: string
  ordererFax?: string
  ordererBirthDate?: string
  initialContact?: string
  customerRank?: string
  
  // 配送先情報
  recipientName: string
  recipientPhone: string
  recipientPostal: string
  recipientAddress: string
  recipientFax?: string
  recipientCompany?: string
  
  // 配送オプション
  carrier: string
  deliveryType?: string
  deliveryTime?: string
  deliveryCenter?: string
  autoshipNo?: string
  voucherNumber?: string
  desiredDeliveryDateValue?: string
  
  // 商品
  products: Product[]
  
  // 計算
  subtotal: number
  subtotal10: number
  totalAmount: number
  totalPoints: number
  
  // その他
  trackingNumber?: string
  status: string
  note?: string
}

export default function ShippingLabelsPage() {
  const [labels, setLabels] = useState<ShippingLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingLabel, setEditingLabel] = useState<ShippingLabel | null>(null)
  
  // 検索フィルター
  const [filters, setFilters] = useState({
    shippingDateFrom: '',
    shippingDateTo: '',
    arrivalDateFrom: '',
    arrivalDateTo: '',
    joinDateFrom: '',
    joinDateTo: '',
    orderMethod: '',
    deliveryNumber: '',
    desiredDeliveryDate: '',
    recordNumber: '',
  })
  
  // フォームデータ
  const [formData, setFormData] = useState<ShippingLabel>({
    recipientName: '',
    recipientPhone: '',
    recipientPostal: '',
    recipientAddress: '',
    carrier: 'yamato',
    products: [],
    subtotal: 0,
    subtotal10: 0,
    totalAmount: 0,
    totalPoints: 0,
    status: 'pending',
  })
  
  // 商品追加フォーム
  const [productForm, setProductForm] = useState({
    code: '',
    name: '',
    price: 0,
    points: 0,
    quantity: 1,
  })
  
  useEffect(() => {
    fetchLabels()
  }, [])
  
  const fetchLabels = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(filters as any).toString()
      const res = await fetch(`/api/admin/shipping-labels?${query}`)
      const data = await res.json()
      setLabels(data.labels || [])
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = () => {
    fetchLabels()
  }
  
  const handleReset = () => {
    setFilters({
      shippingDateFrom: '',
      shippingDateTo: '',
      arrivalDateFrom: '',
      arrivalDateTo: '',
      joinDateFrom: '',
      joinDateTo: '',
      orderMethod: '',
      deliveryNumber: '',
      desiredDeliveryDate: '',
      recordNumber: '',
    })
  }
  
  const handleAddProduct = () => {
    if (!productForm.code || !productForm.name) {
      alert('商品コードと品名を入力してください')
      return
    }
    
    const newProduct: Product = {
      id: Date.now().toString(),
      code: productForm.code,
      name: productForm.name,
      price: productForm.price,
      points: productForm.points,
      quantity: productForm.quantity,
    }
    
    const updatedProducts = [...formData.products, newProduct]
    const subtotal = updatedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)
    const subtotal10 = Math.floor(subtotal * 1.1)
    const totalPoints = updatedProducts.reduce((sum, p) => sum + p.points * p.quantity, 0)
    
    setFormData({
      ...formData,
      products: updatedProducts,
      subtotal,
      subtotal10,
      totalAmount: subtotal10,
      totalPoints,
    })
    
    // リセット
    setProductForm({
      code: '',
      name: '',
      price: 0,
      points: 0,
      quantity: 1,
    })
  }
  
  const handleRemoveProduct = (id: string) => {
    const updatedProducts = formData.products.filter(p => p.id !== id)
    const subtotal = updatedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)
    const subtotal10 = Math.floor(subtotal * 1.1)
    const totalPoints = updatedProducts.reduce((sum, p) => sum + p.points * p.quantity, 0)
    
    setFormData({
      ...formData,
      products: updatedProducts,
      subtotal,
      subtotal10,
      totalAmount: subtotal10,
      totalPoints,
    })
  }
  
  const handleSave = async () => {
    if (!formData.recipientName || !formData.recipientPhone) {
      alert('配送先の氏名と電話番号は必須です')
      return
    }
    
    try {
      const method = editingLabel ? 'PUT' : 'POST'
      const url = editingLabel
        ? `/api/admin/shipping-labels/${editingLabel.id}`
        : '/api/admin/shipping-labels'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (res.ok) {
        alert('保存しました')
        setShowForm(false)
        setEditingLabel(null)
        fetchLabels()
      } else {
        const error = await res.json()
        alert(`保存に失敗しました: ${error.message}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('保存中にエラーが発生しました')
    }
  }
  
  const handleEdit = (label: ShippingLabel) => {
    setEditingLabel(label)
    setFormData(label)
    setShowForm(true)
  }
  
  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか?')) return
    
    try {
      const res = await fetch(`/api/admin/shipping-labels/${id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        alert('削除しました')
        fetchLabels()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('削除中にエラーが発生しました')
    }
  }
  
  const handlePrint = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/shipping-labels/${id}/print`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipping-label-${id}.pdf`
      a.click()
    } catch (error) {
      console.error('Print error:', error)
      alert('印刷に失敗しました')
    }
  }
  
  const handleExportCSV = async () => {
    try {
      const query = new URLSearchParams(filters as any).toString()
      const res = await fetch(`/api/admin/shipping-labels/export?${query}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipping-labels-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (error) {
      console.error('Export error:', error)
      alert('エクスポートに失敗しました')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="rounded-2xl border border-stone-100 p-6 mb-0" style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 60%, #1c1917 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>Shipping Labels</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">発送伝票管理</h1>
            <p className="text-stone-400 text-xs mt-1">CLAIRホールディングス株式会社 / 〒020-0026 岩手県盛岡市 / TEL: 019-681-3667</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(true)
                setEditingLabel(null)
                setFormData({
                  recipientName: '',
                  recipientPhone: '',
                  recipientPostal: '',
                  recipientAddress: '',
                  carrier: 'yamato',
                  products: [],
                  subtotal: 0,
                  subtotal10: 0,
                  totalAmount: 0,
                  totalPoints: 0,
                  status: 'pending',
                })
              }}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition flex items-center gap-2 font-semibold shadow"
            >
              <Plus className="w-5 h-5" />
              新規作成
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2 font-semibold shadow"
            >
              <Download className="w-5 h-5" />
              CSV出力
            </button>
          </div>
        </div>
      </div>
      
      {/* 検索フィルター */}
      {!showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
          <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
            <Search className="w-5 h-5" />
            伝票検索
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {/* 発送日 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">発送日</label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={filters.shippingDateFrom}
                  onChange={(e) => setFilters({ ...filters, shippingDateFrom: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="date"
                  value={filters.shippingDateTo}
                  onChange={(e) => setFilters({ ...filters, shippingDateTo: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
              </div>
            </div>
            
            {/* 到着日 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">到着日</label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={filters.arrivalDateFrom}
                  onChange={(e) => setFilters({ ...filters, arrivalDateFrom: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="date"
                  value={filters.arrivalDateTo}
                  onChange={(e) => setFilters({ ...filters, arrivalDateTo: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
              </div>
            </div>
            
            {/* 入会日 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">入会日</label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={filters.joinDateFrom}
                  onChange={(e) => setFilters({ ...filters, joinDateFrom: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="date"
                  value={filters.joinDateTo}
                  onChange={(e) => setFilters({ ...filters, joinDateTo: e.target.value })}
                  className="border rounded px-2 py-1 text-sm flex-1"
                />
              </div>
            </div>
            
            {/* 受注方法 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">受注方法</label>
              <select
                value={filters.orderMethod}
                onChange={(e) => setFilters({ ...filters, orderMethod: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              >
                <option value="">すべて</option>
                {ORDER_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            
            {/* 配達番号指定 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">配達番号指定</label>
              <input
                type="text"
                value={filters.deliveryNumber}
                onChange={(e) => setFilters({ ...filters, deliveryNumber: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
                placeholder="配達番号"
              />
            </div>
            
            {/* 配送希望日指定 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">配送希望日指定</label>
              <input
                type="date"
                value={filters.desiredDeliveryDate}
                onChange={(e) => setFilters({ ...filters, desiredDeliveryDate: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </div>
            
            {/* 記録(伝票) */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">記録(伝票)</label>
              <input
                type="text"
                value={filters.recordNumber}
                onChange={(e) => setFilters({ ...filters, recordNumber: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
                placeholder="記録番号"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2 font-semibold shadow"
            >
              <Search className="w-4 h-4" />
              検索
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded hover:bg-gray-200 transition flex items-center gap-2 font-semibold"
            >
              <X className="w-4 h-4" />
              クリア
            </button>
          </div>
        </div>
      )}
      
      {/* フォーム */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              {editingLabel ? '伝票編集' : '伝票作成'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingLabel(null)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* クイック入力セクション */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded border border-blue-200">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">生年月日(西暦)</label>
              <input
                type="date"
                value={formData.ordererBirthDate || ''}
                onChange={(e) => setFormData({ ...formData, ordererBirthDate: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">受注方法</label>
              <select
                value={formData.orderMethod || ''}
                onChange={(e) => setFormData({ ...formData, orderMethod: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              >
                <option value="">選択してください</option>
                {ORDER_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">配達方法</label>
              <select
                value={formData.deliveryType || ''}
                onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              >
                <option value="">選択してください</option>
                {DELIVERY_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">配送希望日</label>
              <input
                type="date"
                value={formData.desiredDeliveryDateValue || ''}
                onChange={(e) => setFormData({ ...formData, desiredDeliveryDateValue: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">配送希望日指定</label>
              <input
                type="text"
                value={formData.desiredDeliveryDate || ''}
                onChange={(e) => setFormData({ ...formData, desiredDeliveryDate: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
                placeholder="指定内容"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">記録(伝票)</label>
              <input
                type="text"
                value={formData.recordNumber || ''}
                onChange={(e) => setFormData({ ...formData, recordNumber: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
                placeholder="記録番号"
              />
            </div>
          </div>
          
          {/* 注文者情報 */}
          <div className="mb-6">
            <h3 className="text-md font-bold mb-3 text-gray-800 bg-gray-100 p-2 rounded">注文者情報</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">会員ID</label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="会員ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">法人名</label>
                <input
                  type="text"
                  value={formData.legalEntityName || ''}
                  onChange={(e) => setFormData({ ...formData, legalEntityName: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="法人名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">法人代表者</label>
                <input
                  type="text"
                  value={formData.representative || ''}
                  onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="代表者名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">注文者名</label>
                <input
                  type="text"
                  value={formData.ordererName || ''}
                  onChange={(e) => setFormData({ ...formData, ordererName: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="注文者名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">注文者電話番号</label>
                <input
                  type="tel"
                  value={formData.ordererPhone || ''}
                  onChange={(e) => setFormData({ ...formData, ordererPhone: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="電話番号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">注文者FAX</label>
                <input
                  type="tel"
                  value={formData.ordererFax || ''}
                  onChange={(e) => setFormData({ ...formData, ordererFax: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="FAX番号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">生年月日</label>
                <input
                  type="date"
                  value={formData.ordererBirthDate || ''}
                  onChange={(e) => setFormData({ ...formData, ordererBirthDate: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">初回接触</label>
                <input
                  type="text"
                  value={formData.initialContact || ''}
                  onChange={(e) => setFormData({ ...formData, initialContact: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="初回接触方法"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">お客様ランク</label>
                <select
                  value={formData.customerRank || ''}
                  onChange={(e) => setFormData({ ...formData, customerRank: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                >
                  <option value="">選択してください</option>
                  {CUSTOMER_RANKS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* 配送先情報 */}
          <div className="mb-6">
            <h3 className="text-md font-bold mb-3 text-gray-800 bg-gray-100 p-2 rounded">配送先情報</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">配送先名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="氏名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">法人名</label>
                <input
                  type="text"
                  value={formData.recipientCompany || ''}
                  onChange={(e) => setFormData({ ...formData, recipientCompany: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="法人名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">電話番号 <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={formData.recipientPhone}
                  onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="電話番号"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">FAX</label>
                <input
                  type="tel"
                  value={formData.recipientFax || ''}
                  onChange={(e) => setFormData({ ...formData, recipientFax: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="FAX番号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">郵便番号</label>
                <input
                  type="text"
                  value={formData.recipientPostal}
                  onChange={(e) => setFormData({ ...formData, recipientPostal: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="000-0000"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700">住所</label>
                <input
                  type="text"
                  value={formData.recipientAddress}
                  onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="住所"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">配送センター</label>
                <select
                  value={formData.deliveryCenter || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryCenter: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                >
                  <option value="">選択してください</option>
                  {DELIVERY_CENTERS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">配送業者</label>
                <select
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                >
                  {CARRIERS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">配達時間</label>
                <select
                  value={formData.deliveryTime || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                >
                  {DELIVERY_TIMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* その他情報 */}
          <div className="mb-6">
            <h3 className="text-md font-bold mb-3 text-gray-800 bg-gray-100 p-2 rounded">その他情報</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">オートシップNo</label>
                <input
                  type="text"
                  value={formData.autoshipNo || ''}
                  onChange={(e) => setFormData({ ...formData, autoshipNo: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="オートシップ番号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">金券番号</label>
                <input
                  type="text"
                  value={formData.voucherNumber || ''}
                  onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="金券番号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">追跡番号</label>
                <input
                  type="text"
                  value={formData.trackingNumber || ''}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="追跡番号"
                />
              </div>
            </div>
          </div>
          
          {/* 商品テーブル */}
          <div className="mb-6">
            <h3 className="text-md font-bold mb-3 text-gray-800 bg-gray-100 p-2 rounded">商品明細</h3>
            
            {/* 商品追加フォーム */}
            <div className="grid grid-cols-6 gap-2 mb-3 p-3 bg-stone-50 rounded border">
              <div>
                <label className="block text-xs font-medium mb-1">商品コード</label>
                <input
                  type="text"
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="商品コード"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">品名</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  placeholder="品名"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">単価</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                  className="border rounded px-2 py-1 text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">ポイント</label>
                <input
                  type="number"
                  value={productForm.points}
                  onChange={(e) => setProductForm({ ...productForm, points: Number(e.target.value) })}
                  className="border rounded px-2 py-1 text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">数量</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: Number(e.target.value) })}
                    className="border rounded px-2 py-1 text-sm w-full"
                    min="1"
                  />
                  <button
                    onClick={handleAddProduct}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
            
            {/* 商品リスト */}
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2 py-1 text-left">商品コード</th>
                  <th className="border px-2 py-1 text-left">品名</th>
                  <th className="border px-2 py-1 text-right">単価</th>
                  <th className="border px-2 py-1 text-right">数量</th>
                  <th className="border px-2 py-1 text-right">ポイント</th>
                  <th className="border px-2 py-1 text-right">ポイント小計</th>
                  <th className="border px-2 py-1 text-right">小計</th>
                  <th className="border px-2 py-1 w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {formData.products.map((product) => (
                  <tr key={product.id}>
                    <td className="border px-2 py-1">{product.code}</td>
                    <td className="border px-2 py-1">{product.name}</td>
                    <td className="border px-2 py-1 text-right">¥{product.price.toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">{product.quantity}</td>
                    <td className="border px-2 py-1 text-right">{product.points}</td>
                    <td className="border px-2 py-1 text-right">{(product.points * product.quantity).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">¥{(product.price * product.quantity).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() => handleRemoveProduct(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {formData.products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="border px-2 py-4 text-center text-gray-500">
                      商品が登録されていません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* 合計 */}
            <div className="mt-4 flex justify-end">
              <div className="bg-blue-50 p-4 rounded border border-blue-200 w-96">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">小計(税抜):</span>
                  <span className="font-bold">¥{formData.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">小計(10%):</span>
                  <span className="font-bold">¥{formData.subtotal10.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">内訳:</span>
                  <span className="font-bold">¥{formData.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">ポイント合計:</span>
                  <span className="font-bold text-blue-600">{formData.totalPoints.toLocaleString()}pt</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 備考 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1 text-gray-700">備考</label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="border rounded px-2 py-1 text-sm w-full h-20"
              placeholder="備考・特記事項"
            />
          </div>
          
          {/* 保存ボタン */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowForm(false)
                setEditingLabel(null)
              }}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded hover:bg-gray-200 transition font-semibold"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2 font-semibold shadow"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      )}
      
      {/* 伝票一覧 */}
      {!showForm && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">伝票番号</th>
                  <th className="px-4 py-3 text-left font-semibold">注文番号</th>
                  <th className="px-4 py-3 text-left font-semibold">配送先</th>
                  <th className="px-4 py-3 text-left font-semibold">電話番号</th>
                  <th className="px-4 py-3 text-left font-semibold">配送業者</th>
                  <th className="px-4 py-3 text-left font-semibold">追跡番号</th>
                  <th className="px-4 py-3 text-left font-semibold">ステータス</th>
                  <th className="px-4 py-3 text-left font-semibold">金額</th>
                  <th className="px-4 py-3 text-center font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : labels.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  labels.map((label) => (
                    <tr key={label.id} className="border-b hover:bg-stone-50">
                      <td className="px-4 py-3">{label.id}</td>
                      <td className="px-4 py-3">{label.orderNumber}</td>
                      <td className="px-4 py-3">{label.recipientName}</td>
                      <td className="px-4 py-3">{label.recipientPhone}</td>
                      <td className="px-4 py-3">
                        {CARRIERS.find(c => c.value === label.carrier)?.label}
                      </td>
                      <td className="px-4 py-3">{label.trackingNumber || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          label.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          label.status === 'printed' ? 'bg-blue-100 text-blue-800' :
                          label.status === 'shipped' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {label.status === 'pending' ? '未印刷' :
                           label.status === 'printed' ? '印刷済み' :
                           label.status === 'shipped' ? '発送済み' :
                           label.status === 'canceled' ? 'キャンセル' : label.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">¥{(label.totalAmount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleEdit(label)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="編集"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handlePrint(label.id!)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="印刷"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(label.id!)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
