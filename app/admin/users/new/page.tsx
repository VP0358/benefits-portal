"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    nameKana: "",
    email: "",
    password: "",
    phone: "",
    postalCode: "",
    address: "",
    memberCode: "",
    status: "active",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        nameKana: form.nameKana || undefined,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        postalCode: form.postalCode || undefined,
        address: form.address || undefined,
        memberCode: form.memberCode || undefined,
        status: form.status,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "会員登録に失敗しました。");
      return;
    }

    const user = await res.json();
    router.push(`/admin/users/${user.id}`);
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">会員新規登録</h1>
        <p className="mt-2 text-slate-700 text-sm">新しい会員を登録します。</p>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">氏名 *</label>
              <input
                required
                placeholder="例: 山田 太郎"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">フリガナ</label>
              <input
                placeholder="例: ヤマダ タロウ"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.nameKana}
                onChange={e => setForm({ ...form, nameKana: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス *</label>
              <input
                required
                type="email"
                placeholder="例: yamada@example.com"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">電話番号</label>
              <input
                type="tel"
                placeholder="例: 090-1234-5678"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">郵便番号</label>
              <input
                placeholder="例: 123-4567"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.postalCode}
                onChange={e => setForm({ ...form, postalCode: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">住所</label>
              <input
                placeholder="例: 東京都渋谷区〇〇町1-2-3"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">パスワード * (8文字以上)</label>
              <input
                required
                type="password"
                minLength={8}
                placeholder="8文字以上"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">会員番号（空欄で自動採番）</label>
              <input
                placeholder="例: M0010"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                value={form.memberCode}
                onChange={e => setForm({ ...form, memberCode: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ステータス</label>
              <select
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">有効</option>
                <option value="invited">招待中</option>
                <option value="suspended">停止</option>
              </select>
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => router.push("/admin/users")}
              className="rounded-xl border px-5 py-3 text-sm text-slate-800"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50"
            >
              {saving ? "登録中..." : "会員を登録"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
