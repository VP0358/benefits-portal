import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminNav from "./ui/admin-nav";
import ViolaLogo from "@/app/components/viola-logo";

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
    <div
      className="flex min-h-screen"
      style={{ background: "#eee8e0", fontFamily: "var(--font-noto), 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', sans-serif" }}
    >
      <AdminNav />
      {/*
        ★ overflow-y-auto をここに置くと CSS 仕様上 overflow-x も auto/hidden になり
          子テーブルの overflow-x:auto が機能しなくなる。
          → 縦スクロールは html/body に任せ、この div は overflow:visible のまま。
      */}
      <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        {/* トップバー */}
        <div
          className="sticky top-0 z-10 h-14 flex items-center px-6 backdrop-blur-md flex-shrink-0"
          style={{
            background: "rgba(10,22,40,0.92)",
            borderBottom: "1px solid rgba(201,168,76,0.20)",
            boxShadow: "0 2px 12px rgba(10,22,40,0.25)",
          }}
        >
          <div className="flex items-center gap-3">
            <ViolaLogo size="sm" />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#c9a84c", fontFamily: "var(--font-josefin), 'Arial Narrow', sans-serif" }}>
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: "linear-gradient(135deg, #c9a84c, #e8c96a)", boxShadow: "0 0 6px rgba(201,168,76,0.6)" }}
            />
            Admin Portal
          </div>
        </div>
        {/* メインコンテンツ — overflow は指定しない（子の overflow-x:auto を妨げない） */}
        <div className="p-6 md:p-8 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
