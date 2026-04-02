"use client";

import { useState } from "react";

type ReferrerOption = { id: string; name: string; email: string };
type Referral = { id: string; referrerName: string; referrerEmail: string; isActive: boolean };

export default function ReferralManager({
  userId, initialReferrals, referrerOptions,
}: { userId: string; initialReferrals: Referral[]; referrerOptions: ReferrerOption[] }) {
  const [referrals, setReferrals] = useState(initialReferrals);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addReferral() {
    if (!selected) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerUserId: selected }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "紹介者追加に失敗しました。");
      return;
    }
    const data = await res.json();
    setReferrals(prev => [...prev, { id: data.id.toString(), referrerName: data.referrer.name, referrerEmail: data.referrer.email, isActive: data.isActive }]);
    setSelected("");
  }

  async function removeReferral(referralId: string) {
    if (!confirm("この紹介者を解除しますか？")) return;
    const res = await fetch(`/api/admin/referrals/${referralId}`, { method: "DELETE" });
    if (!res.ok) { setError("紹介者解除に失敗しました。"); return; }
    setReferrals(prev => prev.filter(r => r.id !== referralId));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <select className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-800" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">紹介者を選択してください</option>
          {referrerOptions.map(item => <option key={item.id} value={item.id}>{item.name} ({item.email})</option>)}
        </select>
        <button type="button" onClick={addReferral} disabled={saving || !selected} className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white disabled:opacity-50 whitespace-nowrap">
          {saving ? "追加中..." : "追加"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {referrals.length === 0 ? <div className="text-sm text-slate-700">紹介者は未登録です。</div> : referrals.map(ref => (
          <div key={ref.id} className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{ref.referrerName}</div>
              <div className="text-xs text-slate-700">{ref.referrerEmail}</div>
            </div>
            <button type="button" onClick={() => removeReferral(ref.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600">解除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
