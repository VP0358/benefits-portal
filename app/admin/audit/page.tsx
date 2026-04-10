import AuditLogTable from "./ui/audit-log-table";

export default function AdminAuditPage() {
  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Audit Log
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">監査ログ</h1>
        <p className="text-sm text-stone-400 mt-0.5">管理者の操作履歴を確認できます</p>
      </div>

      {/* コンテンツ */}
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <AuditLogTable />
      </div>
    </main>
  );
}
