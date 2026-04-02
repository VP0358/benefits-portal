import CsvExportPanel from "./ui/csv-export-panel";

export default function ExportPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">CSV エクスポート</h1>
        <p className="mt-2 text-slate-500 text-sm">会員・注文・監査ログのデータをCSVでダウンロードできます。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <CsvExportPanel />
      </section>
    </main>
  );
}
