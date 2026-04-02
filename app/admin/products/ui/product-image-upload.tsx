"use client";

import { useRef, useState } from "react";

type Props = { value: string; onChange: (url: string) => void };

export default function ProductImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) { const data = await res.json().catch(() => null); setError(data?.error || "画像アップロードに失敗しました。"); return; }
    const data = await res.json();
    onChange(data.publicUrl);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800" disabled={uploading}>
          {uploading ? "アップロード中..." : "画像をアップロード"}
        </button>
        {value && <button type="button" onClick={() => onChange("")} className="rounded-xl border px-4 py-2 text-sm text-red-600">画像を外す</button>}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={e => { const file = e.target.files?.[0]; if (file) void handleFileChange(file); }} />
      {value && (
        <div className="rounded-2xl border bg-slate-50 p-4">
          <img src={value} alt="preview" className="h-24 w-24 rounded-xl object-cover shadow-sm" />
          <div className="mt-2 truncate text-xs text-slate-700">{value}</div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
