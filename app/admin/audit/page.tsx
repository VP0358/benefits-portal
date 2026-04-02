import AuditLogTable from "./ui/audit-log-table";

export default function AdminAuditPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">監査ログ</h1>
        <p className="mt-2 text-slate-600">管理者の操作履歴を確認できます。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <AuditLogTable />
      </section>
    </main>
  );
}
