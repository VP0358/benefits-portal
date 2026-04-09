import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNav from "./ui/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware が x-pathname をセットする
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";

  // /admin/login はサイドバー不要・認証チェック不要
  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  // それ以外の /admin/* はセッション & role チェック
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/admin/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session as any)?.user?.role;
  if (role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
