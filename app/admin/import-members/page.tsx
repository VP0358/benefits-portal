"use client"

import { useState, useRef, useCallback } from "react"

interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  linkCount: number
  errors: string[]
}

export default function ImportMembersPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith(".csv") && f.type !== "application/vnd.ms-excel" && f.type !== "text/csv") {
      setError("CSVファイル (.csv) を選択してください")
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileChange(dropped)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleImport = async () => {
    if (!file) {
      setError("CSVファイルを選択してください")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setProgress("CSVファイルを読み込み中...")

    try {
      const formData = new FormData()
      formData.append("file", file)

      setProgress("会員データをインポート中... (数分かかる場合があります)")

      const res = await fetch("/api/admin/import-members", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "インポートに失敗しました")
        return
      }

      setResult(data.result)
      setProgress("")
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <i className="fas fa-file-import text-violet-600" />
          会員マスターCSVインポート
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          旧システムから出力したCSVファイルをアップロードして会員データを一括登録・更新します
        </p>
      </div>

      {/* 注意事項 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-bold text-amber-800 flex items-center gap-1 mb-2">
          <i className="fas fa-exclamation-triangle" />
          インポート前の確認事項
        </h2>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>CSVの文字コードは <strong>CP932 (Shift-JIS)</strong> 形式に対応しています</li>
          <li>DBに<strong>存在しない会員</strong>は新規作成されます（初期パスワード: <code className="bg-amber-100 px-1 rounded">0000</code>）</li>
          <li>DBに<strong>既に存在する会員</strong>は生年月日・契約締結日・銀行情報などが更新されます</li>
          <li>会員IDの変換ルール: <code className="bg-amber-100 px-1 rounded">10234001</code> → <code className="bg-amber-100 px-1 rounded">102340-01</code></li>
          <li>紹介者・直上者の紐づけはインポート後に自動で設定されます</li>
          <li><strong>この操作は取り消せません</strong>。必ずDBのバックアップを確認してください</li>
        </ul>
      </div>

      {/* ファイル選択エリア */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6 ${
          isDragging
            ? "border-violet-500 bg-violet-50"
            : file
            ? "border-green-400 bg-green-50"
            : "border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            <p className="font-bold text-green-700">{file.name}</p>
            <p className="text-sm text-green-600">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <p className="text-xs text-gray-400">クリックまたはドラッグで変更</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl text-gray-300">
              <i className="fas fa-cloud-upload-alt" />
            </div>
            <p className="font-medium text-gray-600">
              CSVファイルをドラッグ＆ドロップ
            </p>
            <p className="text-sm text-gray-400">または クリックして選択</p>
            <p className="text-xs text-gray-400">
              対応形式: .csv (CP932/Shift-JIS)
            </p>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
          <i className="fas fa-times-circle text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">エラー</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* インポートボタン */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
        className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
          !file || loading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg"
        }`}
      >
        {loading ? (
          <>
            <i className="fas fa-spinner fa-spin" />
            {progress || "インポート中..."}
          </>
        ) : (
          <>
            <i className="fas fa-file-import" />
            インポート実行
          </>
        )}
      </button>

      {/* 進行中の注意書き */}
      {loading && (
        <p className="text-center text-sm text-gray-500 mt-3">
          <i className="fas fa-info-circle mr-1" />
          会員数が多い場合は数分かかります。ページを閉じないでください。
        </p>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-6 py-4 flex items-center gap-2">
            <i className="fas fa-check-circle text-green-500 text-xl" />
            <h2 className="font-bold text-green-800">インポート完了</h2>
          </div>

          {/* 統計グリッド */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <StatCard
              label="対象合計"
              value={result.total}
              icon="fa-users"
              color="text-gray-700"
              bg="bg-gray-50"
            />
            <StatCard
              label="新規作成"
              value={result.created}
              icon="fa-user-plus"
              color="text-blue-700"
              bg="bg-blue-50"
            />
            <StatCard
              label="更新"
              value={result.updated}
              icon="fa-sync-alt"
              color="text-violet-700"
              bg="bg-violet-50"
            />
            <StatCard
              label="スキップ"
              value={result.skipped}
              icon="fa-forward"
              color="text-amber-700"
              bg="bg-amber-50"
            />
          </div>

          <div className="px-6 pb-4">
            <p className="text-sm text-gray-500">
              <i className="fas fa-link mr-1" />
              紹介者・直上者の紐づけ更新: <strong>{result.linkCount}</strong> 件
            </p>
          </div>

          {/* エラー一覧 */}
          {result.errors.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                <i className="fas fa-exclamation-circle" />
                警告・エラー ({result.errors.length} 件)
              </h3>
              <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 mb-1 font-mono">
                    {e}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
            <a
              href="/admin/mlm-members"
              className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium"
            >
              <i className="fas fa-arrow-right" />
              MLM会員一覧を確認する
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// StatCard コンポーネント
// ──────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: string
  color: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-lg p-4 text-center`}>
      <div className={`text-2xl mb-1 ${color}`}>
        <i className={`fas ${icon}`} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
