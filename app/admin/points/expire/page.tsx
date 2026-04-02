import PointExpireManager from "./ui/point-expire-manager";

export default function PointExpirePage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">ポイント失効処理</h1>
        <p className="mt-2 text-slate-500 text-sm">会員の自動ポイントを失効させます。失効処理は取り消せません。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <PointExpireManager />
      </section>
    </main>
  );
}
