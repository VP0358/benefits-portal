"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  transactionType: string;
  pointSourceType: string;
  points: number;
  balanceAfter: number;
  description: string | null;
  occurredAt: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  grant:           { label: "付与",     color: "text-emerald-600", bg: "bg-emerald-50", sign: "+" },
  adjust:          { label: "調整",     color: "text-blue-600",    bg: "bg-blue-50",    sign: "±" },
  external_import: { label: "外部取込", color: "text-purple-600",  bg: "bg-purple-50",  sign: "+" },
  use:             { label: "利用",     color: "text-red-500",     bg: "bg-red-50",     sign: "−" },
  expire:          { label: "失効",     color: "text-gray-600",    bg: "bg-gray-50",    sign: "−" },
  reversal:        { label: "取消",     color: "text-orange-500",  bg: "bg-orange-50",  sign: "±" },
};

const SOURCE_LABEL: Record<string, string> = {
  auto: "自動pt", manual: "手動pt", external: "外部pt",
};

export default function PointTransactionHistory() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "grant" | "use" | "expire">("all");

  useEffect(() => {
    fetch("/api/member/point-transactions")
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    if (filter === "all") return true;
    if (filter === "grant") return ["grant", "external_import", "adjust"].includes(r.transactionType);
    if (filter === "use") return r.transactionType === "use";
    if (filter === "expire") return r.transactionType === "expire";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-green-700 font-bold animate-pulse">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all",    label: "すべて" },
          { key: "grant",  label: "✅ 獲得" },
          { key: "use",    label: "💳 利用" },
          { key: "expire", label: "⏰ 失効" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === key
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-700 text-sm">
          履歴がありません
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const cfg = TYPE_CONFIG[row.transactionType] ?? {
              label: row.transactionType, color: "text-gray-700", bg: "bg-gray-50", sign: ""
            };
            const isPlus = ["grant", "external_import"].includes(row.transactionType);
            const isMinus = ["use", "expire"].includes(row.transactionType);

            return (
              <div key={row.id}
                className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                {/* アイコン */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                  {cfg.sign}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {SOURCE_LABEL[row.pointSourceType] ?? row.pointSourceType}
                    </span>
                  </div>
                  {row.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">{row.description}</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(row.occurredAt).toLocaleString("ja-JP", {
                      year: "numeric", month: "2-digit", day: "2-digit",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>

                {/* ポイント */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-black ${
                    isPlus ? "text-emerald-600" : isMinus ? "text-red-500" : "text-gray-600"
                  }`}>
                    {isPlus ? "+" : isMinus ? "−" : ""}{Math.abs(row.points).toLocaleString()}
                    <span className="text-xs font-semibold ml-0.5">pt</span>
                  </p>
                  <p className="text-[10px] text-gray-600">残 {row.balanceAfter.toLocaleString()}pt</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
