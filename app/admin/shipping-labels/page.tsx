import ShippingLabelList from "./ui/shipping-label-list";
import CreateShippingLabelForm from "./ui/create-shipping-label-form";

export default function AdminShippingLabelsPage() {
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📦 発送伝票管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            注文からヤマト・佐川・ゆうパックの発送伝票を自動作成できます。
          </p>
        </div>
      </div>

      {/* 新規伝票作成フォーム */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-800">➕ 伝票を作成する</h2>
        <CreateShippingLabelForm />
      </section>

      {/* 伝票一覧 */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-800">伝票一覧</h2>
        <ShippingLabelList />
      </section>
    </main>
  );
}
