import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContactsPanel from "./ui/contacts-panel";

export default async function AdminContactsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const unreadCount = await prisma.contactInquiry.count({ where: { isRead: false } });

  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
            Contact Center
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">相談窓口</h1>
          <p className="text-sm text-stone-400 mt-0.5">会員からの相談・問い合わせ対応</p>
        </div>
        {unreadCount > 0 && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold animate-pulse"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
          >
            <i className="fas fa-bell" />
            未読 {unreadCount}件
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div
        className="rounded-2xl bg-white border border-stone-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        <ContactsPanel />
      </div>
    </main>
  );
}
