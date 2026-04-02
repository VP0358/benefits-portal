import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminAccountPanel from "./ui/admin-account-panel";

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <main className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-1">🔐 ログイン情報変更</h1>
        <p className="text-sm text-slate-700">
          管理者のログインID（メールアドレス）とパスワードを変更できます。
        </p>
      </div>
      <AdminAccountPanel />
    </main>
  );
}
