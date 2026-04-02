import ReferralHistoryTable from "./ui/referral-history-table";

export default function ReferralHistoryPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">紹介者変更履歴</h1>
        <p className="mt-2 text-slate-500 text-sm">会員の紹介者追加・変更・解除の操作ログです。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <ReferralHistoryTable />
      </section>
    </main>
  );
}
