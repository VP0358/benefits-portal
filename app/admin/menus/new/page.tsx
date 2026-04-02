"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "../ui/image-upload";

const iconOptions = [
  { value: "smartphone", label: "スマホ" },
  { value: "plane", label: "旅行" },
  { value: "smile", label: "笑顔" },
  { value: "cart", label: "カート" },
  { value: "message", label: "相談" },
  { value: "jar", label: "予約" },
  { value: "star", label: "スター" },
  { value: "heart", label: "ハート" },
];

export default function AdminMenuNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", subtitle: "", iconType: "smartphone", imageUrl: "",
    linkUrl: "https://", isActive: true, isHighlight: false, sortOrder: 0,
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, imageUrl: form.imageUrl || null, subtitle: form.subtitle || null }),
    });
    setLoading(false);
    if (!res.ok) { setError("保存に失敗しました。"); return; }
    router.push("/admin/menus");
    router.refresh();
  }

  return (
    <main className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-800">新規メニュー追加</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">タイトル <span className="text-red-500">*</span></label>
          <input required className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">補足テキスト</label>
          <input className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">アイコン</label>
          <select className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400" value={form.iconType} onChange={e => setForm({ ...form, iconType: e.target.value })}>
            {iconOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">並び順</label>
          <input className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400" type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">リンクURL <span className="text-red-500">*</span></label>
          <input required className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400" value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} />
        </div>
        <div className="flex items-center gap-6 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />公開する
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isHighlight} onChange={e => setForm({ ...form, isHighlight: e.target.checked })} className="rounded" />強調表示
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">画像</label>
          <ImageUpload value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} />
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        <div className="md:col-span-2 flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/admin/menus")} className="rounded-xl border px-4 py-3 text-sm">戻る</button>
          <button type="submit" disabled={loading} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50">{loading ? "保存中..." : "保存する"}</button>
        </div>
      </form>
    </main>
  );
}
