"use client";

import { useRef, useState } from "react";

type Props = { value: string; onChange: (url: string) => void };

export default function ImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function handleFileChange(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "画像アップロードに失敗しました。");
      return;
    }
    const data = await res.json();
    onChange(data.publicUrl);
  }

  function applyUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) { setError("URLを入力してください"); return; }
    onChange(trimmed);
    setUrlInput("");
    setShowUrlInput(false);
    setError("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* ファイルアップロード */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
          disabled={uploading}
        >
          {uploading ? "⏳ アップロード中..." : "📁 ファイルを選択"}
        </button>

        {/* URL貼り付けトグル */}
        <button
          type="button"
          onClick={() => { setShowUrlInput(!showUrlInput); setError(""); }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors"
        >
          🔗 URLで指定
        </button>

        {/* 画像削除 */}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            🗑 画像を外す
          </button>
        )}
      </div>

      {/* URL入力欄 */}
      {showUrlInput && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 space-y-2">
          <label className="block text-xs font-semibold text-blue-700">画像URL を貼り付け</label>
          <p className="text-xs text-blue-500">S3/CloudFlare/外部CDNなどの画像URLを直接入力できます。</p>
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
            />
            <button
              type="button"
              onClick={applyUrl}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
            >
              適用
            </button>
            <button
              type="button"
              onClick={() => { setShowUrlInput(false); setUrlInput(""); setError(""); }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={e => { const file = e.target.files?.[0]; if (file) void handleFileChange(file); }}
      />

      {/* プレビュー */}
      {value && (
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">プレビュー</div>
          <img src={value} alt="preview" className="h-20 w-20 rounded-xl object-cover shadow-sm" />
          <div className="mt-2 truncate text-xs text-slate-600">{value}</div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
