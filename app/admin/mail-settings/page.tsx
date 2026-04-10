import MailSettingsPanel from "./ui/mail-settings-panel";

export default function AdminMailSettingsPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Mail Templates
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">送信メール内容編集</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          各登録・契約時に送信するメールの内容を編集できます。空欄の場合はデフォルトのテンプレートが使用されます。
        </p>
      </div>
      <MailSettingsPanel />
    </main>
  );
}
