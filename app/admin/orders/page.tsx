import AdminOrderList from "./ui/admin-order-list";

export default function AdminOrdersPage() {
  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
            Order Management
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">注文管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">全注文の確認・ステータス管理・CSV出力</p>
        </div>
        <a
          href="/api/admin/export/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #1c1917, #3d3530)",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <i className="fas fa-download text-xs" /> CSV出力
        </a>
      </div>

      {/* コンテンツ */}
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <AdminOrderList />
      </div>
    </main>
  );
}
