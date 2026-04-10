import PointExpireManager from "./ui/point-expire-manager";

export default function PointExpirePage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Points Management
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ポイント失効処理</h1>
        <p className="text-sm text-stone-400 mt-0.5">会員の自動ポイントを失効させます。失効処理は取り消せません。</p>
      </div>
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <PointExpireManager />
      </div>
    </main>
  );
}
