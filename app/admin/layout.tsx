import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNav from "./ui/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";

  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  // 印刷ページはサイドバー不要
  if (pathname.startsWith("/admin/print")) {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((session as any)?.user?.role !== "admin") redirect("/admin/login");
    return <>{children}</>;
  }

  const session = await auth();
  if (!session?.user?.email) redirect("/admin/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session as any)?.user?.role;
  if (role !== "admin") redirect("/admin/login");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--admin-bg, #f7f6f4)" }}>
      <AdminNav />
      <div className="flex-1 min-w-0 overflow-auto">
        {/* トップバー */}
        <div className="sticky top-0 z-10 h-14 flex items-center px-6 border-b border-stone-200/80 bg-white/80 backdrop-blur-sm">
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            VIOLA Pure 管理システム
          </div>
        </div>
        <div className="p-6 md:p-8 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
