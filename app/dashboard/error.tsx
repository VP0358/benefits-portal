"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#eee8e0" }}>
      <div className="max-w-md w-full mx-4 rounded-2xl p-6 text-center" style={{ background: "#0d1e38", border: "1px solid rgba(201,168,76,0.3)" }}>
        <p className="text-red-400 font-bold text-base mb-2">エラーが発生しました</p>
        <p className="text-white/60 text-sm mb-1">{error.message}</p>
        {error.digest && <p className="text-white/40 text-xs mb-4">digest: {error.digest}</p>}
        <pre className="text-white/40 text-xs text-left overflow-auto max-h-40 mb-4 p-2 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96a)" }}
        >
          再試行
        </button>
      </div>
    </div>
  );
}
