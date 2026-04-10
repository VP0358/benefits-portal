import MonthlyRunsTable from "./ui/monthly-runs-table";

export default function AdminMonthlyRunsPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Monthly Processing
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">月次ポイント実行履歴</h1>
        <p className="text-sm text-stone-400 mt-0.5">プレビューと本実行の履歴を確認できます</p>
      </div>
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <MonthlyRunsTable />
      </div>
    </main>
  );
}
