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
    <main className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">💬 相談窓口</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-red-500 text-white text-sm font-bold px-3 py-1 animate-pulse">
            未読 {unreadCount}件
          </span>
        )}
      </div>
      <ContactsPanel />
    </main>
  );
}
