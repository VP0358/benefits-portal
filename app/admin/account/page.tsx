import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminAccountPanel from "./ui/admin-account-panel";

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Account Settings
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ログイン情報変更</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          管理者のログインID（メールアドレス）とパスワードを変更できます
        </p>
      </div>
      <AdminAccountPanel />
    </main>
  );
}
