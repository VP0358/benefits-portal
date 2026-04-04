"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  userName: string;
  currentForceStatus: string;  // "none" | "forced_active" | "forced_inactive"
  hasSubsc: boolean;            // 既存サブスクがあるか
  currentStatus?: string;       // サブスクの現在ステータス（hasSubsc=true時）
}

export default function TravelForceActions({
  userId, userName, currentForceStatus, hasSubsc, currentStatus
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function doAction(action: "force_active" | "force_inactive" | "clear") {
    const confirmMsg =
      action === "force_active"
        ? `「${userName}」を強制アクティブにしますか？\n（未登録の場合は Lv1 early で自動作成されます）`
        : action === "force_inactive"
        ? `「${userName}」を強制非アクティブにしますか？`
        : `「${userName}」の強制ステータスを解除しますか？`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/travel-subscriptions/force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "操作に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
      )}

      {/* 未登録 or 強制アクティブ以外 → 強制アクティブボタン */}
      {currentForceStatus !== "forced_active" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => doAction("force_active")}
          className="rounded-lg bg-cyan-500 text-white px-2.5 py-1 text-xs font-semibold hover:bg-cyan-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          ✨ 強制アクティブ
        </button>
      )}

      {/* サブスクあり かつ アクティブ状態 かつ 強制非アクティブ以外 → 強制非アクティブボタン */}
      {hasSubsc && currentForceStatus !== "forced_inactive" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => doAction("force_inactive")}
          className="rounded-lg bg-orange-500 text-white px-2.5 py-1 text-xs font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          ⏸ 強制非アクティブ
        </button>
      )}

      {/* 強制ステータス適用中 → 解除ボタン */}
      {(currentForceStatus === "forced_active" || currentForceStatus === "forced_inactive") && (
        <button
          type="button"
          disabled={loading}
          onClick={() => doAction("clear")}
          className="rounded-lg border border-slate-300 text-slate-600 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          🔄 強制解除
        </button>
      )}
    </div>
  );
}
