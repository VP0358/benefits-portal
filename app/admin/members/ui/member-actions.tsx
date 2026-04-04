"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  memberId: string;
  memberName: string;
  currentStatus: string;
}

export default function MemberActions({ memberId, memberName, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ── 契約解除 ──────────────────────────────────
  async function handleCancel() {
    if (!confirm(`「${memberName}」を契約解除しますか？\nステータスが「契約解除済」になります。`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, { method: "PATCH" });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "契約解除に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    }
    setLoading(false);
  }

  // ── 物理削除 ──────────────────────────────────
  async function handleDelete() {
    if (!confirm(`「${memberName}」を完全に削除しますか？\nこの操作は取り消せません。`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "削除に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {/* 契約解除ボタン：active / suspended / invited のみ表示 */}
      {currentStatus !== "canceled" && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition whitespace-nowrap"
        >
          {loading ? "処理中..." : "🚫 契約解除"}
        </button>
      )}
      {/* 削除ボタン：canceled のみ */}
      {currentStatus === "canceled" && (
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition whitespace-nowrap"
        >
          {loading ? "削除中..." : "🗑️ 削除"}
        </button>
      )}
    </div>
  );
}
