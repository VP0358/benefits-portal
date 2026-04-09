"use client";

import { useEffect, useState } from "react";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const LINEN      = "#f5f0e8";

type Transaction = {
  id: string;
  transactionType: string;
  pointSourceType: string;
  points: number;
  balanceAfter: number;
  description: string | null;
  occurredAt: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; iconBg: string; sign: string; dot: string }> = {
  grant:           { label: "付与",     color: "#34d399", iconBg: "rgba(52,211,153,0.15)",  sign: "+", dot: "#34d399" },
  adjust:          { label: "調整",     color: "#93c5fd", iconBg: "rgba(147,197,253,0.15)", sign: "±", dot: "#93c5fd" },
  external_import: { label: "外部取込", color: "#c4b5fd", iconBg: "rgba(196,181,253,0.15)", sign: "+", dot: "#c4b5fd" },
  use:             { label: "利用",     color: "#f87171", iconBg: "rgba(248,113,113,0.15)", sign: "−", dot: "#f87171" },
  expire:          { label: "失効",     color: "#6b7280", iconBg: "rgba(107,114,128,0.12)", sign: "−", dot: "#6b7280" },
  reversal:        { label: "取消",     color: GOLD,      iconBg: `${GOLD}18`,              sign: "±", dot: GOLD },
};

const SOURCE_LABEL: Record<string, string> = {
  auto: "自動pt", manual: "手動pt", external: "外部pt",
};

export default function PointTransactionHistory() {
  const [rows, setRows]     = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState<"all" | "grant" | "use" | "expire">("all");

  useEffect(() => {
    fetch("/api/member/point-transactions")
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    if (filter === "all")    return true;
    if (filter === "grant")  return ["grant", "external_import", "adjust"].includes(r.transactionType);
    if (filter === "use")    return r.transactionType === "use";
    if (filter === "expire") return r.transactionType === "expire";
    return true;
  });

  const filters = [
    { key: "all",    label: "すべて" },
    { key: "grant",  label: "獲得" },
    { key: "use",    label: "利用" },
    { key: "expire", label: "失効" },
  ] as const;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
        <p className="text-sm font-jp" style={{ color: `${GOLD}70` }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* フィルターバー */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
            style={filter === key
              ? { background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: "white", boxShadow: `0 4px 12px ${GOLD}40` }
              : { background: "rgba(10,22,40,0.07)", color: "rgba(10,22,40,0.50)", border: "1px solid rgba(10,22,40,0.08)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 件数表示 */}
      {!loading && (
        <p className="text-xs font-jp" style={{ color: `${NAVY}50` }}>
          {filtered.length}件の履歴
        </p>
      )}

      {/* 空状態 */}
      {filtered.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: LINEN, border: "1px solid rgba(201,168,76,0.18)" }}>
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm font-jp" style={{ color: `${NAVY}40` }}>履歴がありません</p>
        </div>
      )}

      {/* 履歴リスト */}
      <div className="space-y-2">
        {filtered.map(row => {
          const cfg = TYPE_CONFIG[row.transactionType] ?? {
            label: row.transactionType, color: "#9ca3af", iconBg: "rgba(156,163,175,0.12)", sign: "", dot: "#9ca3af"
          };
          const isPlus  = ["grant", "external_import"].includes(row.transactionType);
          const isMinus = ["use", "expire"].includes(row.transactionType);

          return (
            <div key={row.id}
              className="rounded-2xl overflow-hidden flex items-center gap-4 p-4"
              style={{
                background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
                border: `1px solid ${GOLD}18`,
                boxShadow: "0 4px 16px rgba(10,22,40,0.14)",
              }}>

              {/* アイコン */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: cfg.iconBg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                {cfg.sign}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.iconBg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-label" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {SOURCE_LABEL[row.pointSourceType] ?? row.pointSourceType}
                  </span>
                </div>
                {row.description && (
                  <p className="text-xs truncate font-jp mt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>
                    {row.description}
                  </p>
                )}
                <p className="text-[10px] mt-0.5 font-label" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {new Date(row.occurredAt).toLocaleString("ja-JP", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>

              {/* ポイント */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black"
                  style={{ color: isPlus ? "#34d399" : isMinus ? "#f87171" : "#9ca3af" }}>
                  {isPlus ? "+" : isMinus ? "−" : ""}{Math.abs(row.points).toLocaleString()}
                  <span className="text-xs font-semibold ml-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>pt</span>
                </p>
                <p className="text-[10px] font-label" style={{ color: `${GOLD}55` }}>
                  残 {row.balanceAfter.toLocaleString()}pt
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
