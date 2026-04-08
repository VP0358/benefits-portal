"use client"

import { useState, useEffect } from "react"
import { BarChart3, Smartphone, TrendingUp, Users, MapPin, Calendar } from "lucide-react"

interface StatsData {
  // 基本統計
  totalApplications: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  activeCount: number
  canceledCount: number
  
  // キャリア別
  carrierDistribution: {
    carrier: string
    count: number
  }[]
  
  // プラン別
  planDistribution: {
    plan: string
    count: number
  }[]
  
  // 年齢分布
  ageDistribution: {
    range: string
    count: number
  }[]
  
  // 性別分布
  genderDistribution: {
    gender: string
    count: number
  }[]
  
  // 地域分布（都道府県別）
  prefectureDistribution: {
    prefecture: string
    count: number
  }[]
  
  // 月別申込数（過去12ヶ月）
  monthlyApplications: {
    month: string
    count: number
  }[]
}

export default function VpPhoneStatsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'carrier' | 'age' | 'gender' | 'region'>('overview')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/vp-phone/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        alert('統計データの取得に失敗しました')
      }
    } catch (error) {
      console.error('統計取得エラー:', error)
      alert('統計データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">統計データを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">統計データがありません</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-8 px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="h-8 w-8" />
            <h1 className="text-3xl font-bold">携帯契約統計</h1>
          </div>
          <p className="text-green-100">VP Phone契約データの統計情報とグラフを表示します</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">総申込数</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalApplications.toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">承認済み</p>
                <p className="text-3xl font-bold text-green-600">{stats.approvedCount.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">利用中</p>
                <p className="text-3xl font-bold text-blue-600">{stats.activeCount.toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">審査中</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setSelectedView('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'overview'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                概要
              </button>
              <button
                onClick={() => setSelectedView('carrier')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'carrier'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                キャリア・プラン
              </button>
              <button
                onClick={() => setSelectedView('age')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'age'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                年齢分布
              </button>
              <button
                onClick={() => setSelectedView('gender')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'gender'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                性別分布
              </button>
              <button
                onClick={() => setSelectedView('region')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'region'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                地域分布
              </button>
            </nav>
          </div>

          <div className="p-6">
            {selectedView === 'overview' && (
              <div className="space-y-8">
                {/* ステータス分布 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">契約ステータス分布</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">審査中</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((stats.pendingCount / stats.totalApplications) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">承認済み</p>
                      <p className="text-2xl font-bold text-green-600">{stats.approvedCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((stats.approvedCount / stats.totalApplications) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">利用中</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.activeCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((stats.activeCount / stats.totalApplications) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">解約済み</p>
                      <p className="text-2xl font-bold text-gray-600">{stats.canceledCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((stats.canceledCount / stats.totalApplications) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 月別申込数 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    月別申込数（過去12ヶ月）
                  </h3>
                  <div className="space-y-2">
                    {stats.monthlyApplications.map((item) => (
                      <div key={item.month} className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-24">{item.month}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                          <div
                            className="bg-green-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                            style={{
                              width: `${Math.max((item.count / Math.max(...stats.monthlyApplications.map(m => m.count))) * 100, 5)}%`
                            }}
                          >
                            {item.count}件
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedView === 'carrier' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">キャリア別契約数</h3>
                  <div className="space-y-3">
                    {stats.carrierDistribution.map((item) => (
                      <div key={item.carrier} className="flex items-center gap-4">
                        <span className="text-sm text-gray-700 w-32">{item.carrier}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-10 relative">
                          <div
                            className="bg-purple-600 h-10 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                            style={{
                              width: `${Math.max((item.count / Math.max(...stats.carrierDistribution.map(c => c.count))) * 100, 5)}%`
                            }}
                          >
                            {item.count}件
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 w-16 text-right">
                          {((item.count / stats.totalApplications) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">プラン別契約数</h3>
                  <div className="space-y-2">
                    {stats.planDistribution.map((item) => (
                      <div key={item.plan} className="flex items-center gap-4">
                        <span className="text-sm text-gray-700 w-40">{item.plan}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                          <div
                            className="bg-indigo-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                            style={{
                              width: `${Math.max((item.count / Math.max(...stats.planDistribution.map(p => p.count))) * 100, 5)}%`
                            }}
                          >
                            {item.count}件
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 w-16 text-right">
                          {((item.count / stats.totalApplications) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedView === 'age' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">年齢分布</h3>
                <div className="space-y-3">
                  {stats.ageDistribution.map((item) => (
                    <div key={item.range} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-32">{item.range}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                        <div
                          className="bg-orange-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                          style={{
                            width: `${Math.max((item.count / Math.max(...stats.ageDistribution.map(a => a.count))) * 100, 5)}%`
                          }}
                        >
                          {item.count}件
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 w-16 text-right">
                        {((item.count / stats.totalApplications) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedView === 'gender' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">性別分布</h3>
                <div className="grid grid-cols-3 gap-6">
                  {stats.genderDistribution.map((item) => (
                    <div key={item.gender} className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                      <p className="text-sm text-gray-600 mb-2">{item.gender}</p>
                      <p className="text-4xl font-bold text-green-600 mb-2">{item.count}</p>
                      <p className="text-sm text-gray-600">
                        全体の {((item.count / stats.totalApplications) * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedView === 'region' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  都道府県別契約数（上位15）
                </h3>
                <div className="space-y-2">
                  {stats.prefectureDistribution.slice(0, 15).map((item, index) => (
                    <div key={item.prefecture} className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-8 text-right">{index + 1}</span>
                      <span className="text-sm text-gray-700 w-24">{item.prefecture}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                        <div
                          className="bg-teal-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                          style={{
                            width: `${Math.max((item.count / stats.prefectureDistribution[0].count) * 100, 5)}%`
                          }}
                        >
                          {item.count}件
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 w-16 text-right">
                        {((item.count / stats.totalApplications) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
