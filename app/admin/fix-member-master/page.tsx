"use client"

import { useState } from "react"

interface DiffItem {
  memberCode: string
  changes: string[]
  referrerNotFound?: string
  uplineNotFound?: string
}

interface DryRunResult {
  dryRun: true
  totalCsvRecords: number
  diffCount: number
  diffs: DiffItem[]
}

interface UpdateResult {
  memberCode: string
  status: "updated" | "skipped" | "not_found" | "error"
  changes: string[]
  error?: string
}

interface ExecuteResult {
  summary: {
    total: number
    updated: number
    skipped: number
    notFound: number
    errors: number
  }
  results: UpdateResult[]
}

export default function FixMemberMasterPage() {
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null)
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDryRun = async () => {
    setLoading(true)
    setError(null)
    setDryRunResult(null)
    setExecuteResult(null)
    try {
      const res = await fetch("/api/admin/fix-member-master", { method: "GET" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDryRunResult(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!confirm("会員マスタを修正します。よろしいですか？")) return
    setLoading(true)
    setError(null)
    setExecuteResult(null)
    try {
      const res = await fetch("/api/admin/fix-member-master", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setExecuteResult(data)
      setDryRunResult(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">会員マスタ修正</h1>
      <p className="text-sm text-gray-500 mb-6">
        CSVマスタ（member_mst.csv）に基づき、紹介者・直上者・ステータス・条件達成を修正します。
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleDryRun}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "確認中..." : "差分確認（ドライラン）"}
        </button>
        <button
          onClick={handleExecute}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "更新中..." : "修正実行"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-red-700">
          {error}
        </div>
      )}

      {/* ドライラン結果 */}
      {dryRunResult && (
        <div className="bg-white border rounded-lg shadow p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">
            差分確認結果（ドライラン）
            <span className="ml-2 text-sm font-normal text-gray-500">
              CSV: {dryRunResult.totalCsvRecords}件 / 差分あり: {dryRunResult.diffCount}件
            </span>
          </h2>
          {dryRunResult.diffCount === 0 ? (
            <p className="text-green-600 font-medium">✅ 差分なし。DBはCSVと一致しています。</p>
          ) : (
            <div className="space-y-3">
              {dryRunResult.diffs.map((d) => (
                <div key={d.memberCode} className="border-l-4 border-yellow-400 pl-3 py-1">
                  <div className="font-mono text-sm font-semibold text-gray-700">{d.memberCode}</div>
                  <ul className="mt-1 space-y-0.5">
                    {d.changes.map((c, i) => (
                      <li key={i} className="text-xs text-gray-600">• {c}</li>
                    ))}
                  </ul>
                  {d.referrerNotFound && (
                    <div className="text-xs text-orange-600 mt-1">⚠️ 紹介者 {d.referrerNotFound} がDBに存在しません</div>
                  )}
                  {d.uplineNotFound && (
                    <div className="text-xs text-orange-600 mt-1">⚠️ 直上者 {d.uplineNotFound} がDBに存在しません</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 実行結果 */}
      {executeResult && (
        <div className="bg-white border rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold mb-3">修正実行結果</h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{executeResult.summary.updated}</div>
              <div className="text-xs text-gray-500">更新完了</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
              <div className="text-2xl font-bold text-gray-500">{executeResult.summary.skipped}</div>
              <div className="text-xs text-gray-500">変更なし</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{executeResult.summary.notFound}</div>
              <div className="text-xs text-gray-500">DB未存在</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{executeResult.summary.errors}</div>
              <div className="text-xs text-gray-500">エラー</div>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {executeResult.results
              .filter(r => r.status !== "skipped")
              .map((r) => (
                <div
                  key={r.memberCode}
                  className={`border-l-4 pl-3 py-1 ${
                    r.status === "updated"   ? "border-green-400" :
                    r.status === "error"     ? "border-red-400" :
                    r.status === "not_found" ? "border-yellow-400" : "border-gray-300"
                  }`}
                >
                  <div className="font-mono text-sm font-semibold">
                    {r.status === "updated"   && "✅ "}
                    {r.status === "error"     && "❌ "}
                    {r.status === "not_found" && "⚠️ "}
                    {r.memberCode}
                    {r.status === "not_found" && " — DBに存在しません"}
                  </div>
                  {r.changes.map((c, i) => (
                    <div key={i} className="text-xs text-gray-600">• {c}</div>
                  ))}
                  {r.error && <div className="text-xs text-red-600">{r.error}</div>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
