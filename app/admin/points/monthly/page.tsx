import MonthlyGrantManager from "./ui/monthly-grant-manager";

export default function AdminMonthlyPointsPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Points Management
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">月次ポイント計算</h1>
        <p className="text-sm text-stone-400 mt-0.5">月次紹介ポイントのプレビューと本実行</p>
      </div>
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <MonthlyGrantManager />
      </div>
    </main>
  );
}
