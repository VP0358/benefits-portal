"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MemberActions({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`「${memberName}」を完全に削除しますか？\nこの操作は取り消せません。`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        alert("削除しました");
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
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
    >
      {loading ? "削除中..." : "🗑️ 削除"}
    </button>
  );
}
