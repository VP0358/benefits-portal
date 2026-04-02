"use client";

import { useCallback, useEffect, useState } from "react";

type WalletItem = {
  userId: string;
  memberCode: string;
  name: string;
  email: string;
  autoPointsBalance: number;
  availablePointsBalance: number;
};

export default function PointExpireManager() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [totalAutoPoints, setTotalAutoPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState("期限切れポイントの失効処理");

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/points/expire");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotalAutoPoints(data.totalAutoPoints);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  async function executeExpire(userId?: string) {
    const target = userId ? `「${items.find(i => i.userId === userId)?.name}」の自動ポイント` : `全会員の自動ポイント (${totalAutoPoints.toLocaleString()}pt)`;
    if (!confirm(`${target}を失効させます。よろしいですか？`)) return;

    setProcessing(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/admin/points/expire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(userId ? { userId } : { expireAll: true }),
        description,
      }),
    });

    setProcessing(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "失効処理に失敗しました。");
      return;
    }
    const data = await res.json();
    setMessage(`✅ ${data.expiredCount}件・合計 ${data.totalExpiredPoints.toLocaleString()}pt を失効しました。`);
    await fetchPreview();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          ⚠️ 失効処理は取り消せません。実行前に必ず内容を確認してください。
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">失効理由（ポイント履歴に記録）</label>
        <input
          className="w-full rounded-xl border px-4 py-2 text-sm"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          失効対象: <span className="font-bold text-slate-800">{items.length}名</span>
          ／合計 <span className="font-bold text-amber-700">{totalAutoPoints.toLocaleString()}pt</span>
        </div>
        <button
          onClick={() => executeExpire()}
          disabled={processing || items.length === 0}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          {processing ? "処理中..." : "全員を一括失効"}
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-slate-400">失効対象の自動ポイントはありません。</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">会員番号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">氏名</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">自動ポイント残高</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">利用可能ポイント</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.memberCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    {item.autoPointsBalance.toLocaleString()}pt
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {item.availablePointsBalance.toLocaleString()}pt
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => executeExpire(item.userId)}
                      disabled={processing}
                      className="rounded-xl border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      失効
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
