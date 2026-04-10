import AutoShipPanel from "./ui/autoship-panel";

export default function AutoShipPage() {
  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Recurring Purchase
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">継続購入管理</h1>
        <p className="text-sm text-stone-400 mt-0.5">自動出荷スケジュール・支払設定・実行状況の管理</p>
      </div>

      {/* コンテンツ */}
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <AutoShipPanel />
      </div>
    </main>
  );
}
