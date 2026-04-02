import SiteSettingsForm from "./ui/site-settings-form";

export default function AdminSiteSettingsPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">サイト設定</h1>
        <p className="mt-2 text-slate-800">ファビコンとサイトタイトルを変更できます。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <SiteSettingsForm />
      </section>
    </main>
  );
}
