import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNav from "./ui/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // x-pathname ヘッダーで現在のパスを取得
  // middleware が付与する "x-pathname" を使用
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";

  // /admin/login はログインページなのでそのまま表示（認証チェック不要）
  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  // それ以外の /admin/* はセッション & role チェック
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/admin/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff]">
      <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[240px_1fr] lg:p-6">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
