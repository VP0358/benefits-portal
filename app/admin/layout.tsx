import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNav from "./ui/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // /admin/login はサイドバーなしで表示（ログインページ）
  const hdrs = await headers();
  const pathname =
    hdrs.get("x-next-pathname") ??
    hdrs.get("x-invoke-path") ??
    hdrs.get("x-matched-path") ??
    "";
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  const session = await auth();

  if (!session?.user?.email) redirect("/admin/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#f5f3ff]">
      <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[240px_1fr] lg:p-6">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
