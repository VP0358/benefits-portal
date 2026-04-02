import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminNav from "./ui/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#e6f2dc]">
      <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[240px_1fr] lg:p-6">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
