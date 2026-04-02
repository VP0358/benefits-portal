"use client";

import { useCallback, useEffect, useState } from "react";

type WalletItem = {
  userId: string;
  memberCode: string;
  name: string;
  email: string;
  autoPointsBalance: number;
  manualPointsBalance: number;
  externalPointsBalance: number;
  availablePointsBalance: number;
};

type PointType = "auto" | "manual" | "external" | "all";
type ExpireMode = "full" | "partial"; // 全額 or 一部指定

const POINT_TYPE_LABELS: Record<PointType, string> = {
  auto:     "🔄 自動ポイント",
  manual:   "✏️ 手動ポイント",
  external: "📥 外部ポイント",
  all:      "🗂️ すべて（自動＋手動＋外部）",
};

function getBalance(item: WalletItem, type: PointType): number {
  if (type === "auto")     return item.autoPointsBalance;
  if (type === "manual")   return item.manualPointsBalance;
  if (type === "external") return item.externalPointsBalance;
  return item.autoPointsBalance + item.manualPointsBalance + item.externalPointsBalance;
}

// ─── 手動失効モーダル ────────────────────────────────────
function ManualExpireModal({
  item,
  onClose,
  onDone,
}: {
  item: WalletItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pointType, setPointType] = useState<PointType>("auto");
  const [mode, setMode]           = useState<ExpireMode>("full");
  const [amount, setAmount]       = useState<string>("");
  const [description, setDescription] = useState("手動ポイント失効処理");
  const [processing, setProcessing]   = useState(false);
  const [error, setError]             = useState("");

  const maxBalance = getBalance(item, pointType);
  const expireAmount = mode === "full" ? maxBalance : Math.min(Number(amount) || 0, maxBalance);

  async function onSubmit() {
    if (expireAmount <= 0) { setError("失効するポイントが0です。"); return; }
    if (!confirm(`${item.name}さんの ${expireAmount.toLocaleString()}pt を失効します。よろしいですか？`)) return;

    setProcessing(true);
    setError("");
    const res = await fetch("/api/admin/points/expire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId:      item.userId,
        pointType:   pointType === "all" ? undefined : pointType,
        expireAll:   pointType === "all" ? true : undefined,
        amount:      mode === "partial" ? expireAmount : undefined,
        description,
      }),
    });
    setProcessing(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "失効処理に失敗しました。");
      return;
    }
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">手動ポイント失効</h2>
          <button onClick={onClose} className="text-slate-700 hover:text-slate-600">✕</button>
        </div>

        {/* 会員情報 */}
        <div className="rounded-xl bg-slate-50 px-4 py-3 mb-4">
          <div className="text-sm font-semibold text-slate-700">{item.name}</div>
          <div className="text-xs text-slate-700">{item.memberCode} / {item.email}</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
            <div className="rounded-lg bg-white p-2 border">
              <div className="text-slate-700">自動</div>
              <div className="font-bold text-slate-700">{item.autoPointsBalance.toLocaleString()}pt</div>
            </div>
            <div className="rounded-lg bg-white p-2 border">
              <div className="text-slate-700">手動</div>
              <div className="font-bold text-slate-700">{item.manualPointsBalance.toLocaleString()}pt</div>
            </div>
            <div className="rounded-lg bg-white p-2 border">
              <div className="text-slate-700">外部</div>
              <div className="font-bold text-slate-700">{item.externalPointsBalance.toLocaleString()}pt</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* ポイント種別 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">失効するポイント種別</label>
            <div className="grid grid-cols-2 gap-2">
              {(["auto","manual","external","all"] as PointType[]).map(t => (
                <label key={t} className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer text-xs transition-colors ${
                  pointType === t ? "border-slate-800 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                }`}>
                  <input type="radio" name="pointType" value={t} checked={pointType === t}
                    onChange={() => setPointType(t)} className="shrink-0" />
                  <span>{POINT_TYPE_LABELS[t]}</span>
                  <span className="ml-auto font-bold text-amber-700">
                    {getBalance(item, t).toLocaleString()}pt
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 失効モード */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">失効方法</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-2 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${
                mode === "full" ? "border-slate-800 bg-slate-50" : "border-slate-200 hover:border-slate-300"
              }`}>
                <input type="radio" name="mode" value="full" checked={mode === "full"} onChange={() => setMode("full")} />
                <span>全額失効 <span className="font-bold text-red-600">({maxBalance.toLocaleString()}pt)</span></span>
              </label>
              <label className={`flex-1 flex items-center gap-2 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${
                mode === "partial" ? "border-slate-800 bg-slate-50" : "border-slate-200 hover:border-slate-300"
              }`}>
                <input type="radio" name="mode" value="partial" checked={mode === "partial"} onChange={() => setMode("partial")} />
                <span>一部指定</span>
              </label>
            </div>
            {mode === "partial" && (
              <div className="mt-2">
                <input type="number" min={1} max={maxBalance}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
                  placeholder={`1 〜 ${maxBalance.toLocaleString()}`}
                  value={amount}
                  onChange={e => setAmount(e.target.value)} />
              </div>
            )}
          </div>

          {/* 失効理由 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">失効理由</label>
            <input className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* 失効確認 */}
          {expireAmount > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              ⚠️ <span className="font-bold">{expireAmount.toLocaleString()}pt</span> を失効します
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-xl border px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
              キャンセル
            </button>
            <button onClick={onSubmit} disabled={processing || expireAmount <= 0}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {processing ? "処理中..." : "失効を実行"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 一括失効モーダル ────────────────────────────────────
function BulkExpireModal({
  items,
  totalPoints,
  onClose,
  onDone,
}: {
  items: WalletItem[];
  totalPoints: { auto: number; manual: number; external: number };
  onClose: () => void;
  onDone: () => void;
}) {
  const [pointType, setPointType]     = useState<PointType>("auto");
  const [description, setDescription] = useState("一括ポイント失効処理");
  const [processing, setProcessing]   = useState(false);
  const [error, setError]             = useState("");

  const targetPt =
    pointType === "auto"     ? totalPoints.auto :
    pointType === "manual"   ? totalPoints.manual :
    pointType === "external" ? totalPoints.external :
    totalPoints.auto + totalPoints.manual + totalPoints.external;

  const targetCount = items.filter(i => getBalance(i, pointType) > 0).length;

  async function onSubmit() {
    if (!confirm(`全会員の${POINT_TYPE_LABELS[pointType]}（${targetPt.toLocaleString()}pt / ${targetCount}名）を失効します。よろしいですか？`)) return;
    setProcessing(true);
    setError("");
    const res = await fetch("/api/admin/points/expire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expireAll:  true,
        pointType:  pointType === "all" ? undefined : pointType,
        description,
      }),
    });
    setProcessing(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "失効処理に失敗しました。");
      return;
    }
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">一括ポイント失効</h2>
          <button onClick={onClose} className="text-slate-700 hover:text-slate-600">✕</button>
        </div>

        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-4 text-sm text-red-700">
          ⚠️ 全会員に対して失効処理を実行します。取り消せません。
        </div>

        <div className="space-y-4">
          {/* 種別 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">失効するポイント種別</label>
            <div className="space-y-2">
              {(["auto","manual","external","all"] as PointType[]).map(t => {
                const pt =
                  t === "auto"     ? totalPoints.auto :
                  t === "manual"   ? totalPoints.manual :
                  t === "external" ? totalPoints.external :
                  totalPoints.auto + totalPoints.manual + totalPoints.external;
                return (
                  <label key={t} className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer text-sm transition-colors ${
                    pointType === t ? "border-slate-800 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="bulkType" value={t} checked={pointType === t}
                        onChange={() => setPointType(t)} />
                      {POINT_TYPE_LABELS[t]}
                    </span>
                    <span className="font-bold text-amber-700">{pt.toLocaleString()}pt</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 理由 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">失効理由</label>
            <input className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {targetPt > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              ⚠️ <span className="font-bold">{targetCount}名・{targetPt.toLocaleString()}pt</span> を失効します
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-xl border px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
              キャンセル
            </button>
            <button onClick={onSubmit} disabled={processing || targetPt <= 0}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {processing ? "処理中..." : "一括失効を実行"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ────────────────────────────────
export default function PointExpireManager() {
  const [items, setItems]             = useState<WalletItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState("");
  const [manualTarget, setManualTarget] = useState<WalletItem | null>(null);
  const [showBulk, setShowBulk]       = useState(false);
  const [search, setSearch]           = useState("");

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/points/expire");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const filtered = items.filter(i =>
    i.name.includes(search) || i.memberCode.includes(search) || i.email.includes(search)
  );

  const totalPoints = {
    auto:     items.reduce((s, i) => s + i.autoPointsBalance, 0),
    manual:   items.reduce((s, i) => s + i.manualPointsBalance, 0),
    external: items.reduce((s, i) => s + i.externalPointsBalance, 0),
  };

  function handleDone() {
    setMessage("✅ 失効処理が完了しました。");
    fetchPreview();
    setTimeout(() => setMessage(""), 5000);
  }

  return (
    <div className="space-y-5">
      {/* 注意書き */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        ⚠️ 失効処理は取り消せません。実行前に必ず内容を確認してください。
      </div>

      {message && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "対象会員数",   value: `${items.length}名`,              color: "text-slate-800" },
          { label: "自動ポイント計", value: `${totalPoints.auto.toLocaleString()}pt`,     color: "text-amber-700" },
          { label: "手動ポイント計", value: `${totalPoints.manual.toLocaleString()}pt`,   color: "text-blue-700" },
          { label: "外部ポイント計", value: `${totalPoints.external.toLocaleString()}pt`, color: "text-purple-700" },
        ].map(c => (
          <div key={c.label} className="rounded-2xl bg-slate-50 border p-4 text-center">
            <div className="text-xs text-slate-700 mb-1">{c.label}</div>
            <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 操作ヘッダー */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="会員名 / 会員番号 / メールで検索"
          className="flex-1 min-w-[200px] rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowBulk(true)}
          disabled={items.length === 0}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
        >
          🗂️ 一括失効...
        </button>
      </div>

      {/* 一覧テーブル */}
      {loading ? (
        <div className="py-12 text-center text-slate-700">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-700 rounded-2xl border border-dashed">
          {search ? "検索結果がありません" : "ポイント残高のある会員はいません"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">会員</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-600">自動</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600">手動</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600">外部</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">利用可能計</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">手動失効</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(item => (
                <tr key={item.userId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-700">{item.memberCode} / {item.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-amber-700">
                    {item.autoPointsBalance > 0 ? item.autoPointsBalance.toLocaleString() + "pt" : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-blue-700">
                    {item.manualPointsBalance > 0 ? item.manualPointsBalance.toLocaleString() + "pt" : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-purple-700">
                    {item.externalPointsBalance > 0 ? item.externalPointsBalance.toLocaleString() + "pt" : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">
                    {item.availablePointsBalance.toLocaleString()}pt
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setManualTarget(item)}
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      失効...
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* モーダル */}
      {manualTarget && (
        <ManualExpireModal
          item={manualTarget}
          onClose={() => setManualTarget(null)}
          onDone={handleDone}
        />
      )}
      {showBulk && (
        <BulkExpireModal
          items={items}
          totalPoints={totalPoints}
          onClose={() => setShowBulk(false)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
