import MailSettingsPanel from "./ui/mail-settings-panel";

export default function AdminMailSettingsPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">📧 送信メール内容編集</h1>
        <p className="mt-2 text-slate-600">
          各登録・契約時に送信するメールの内容を編集できます。空欄の場合はデフォルトのテンプレートが使用されます。
        </p>
      </div>
      <MailSettingsPanel />
    </main>
  );
}
