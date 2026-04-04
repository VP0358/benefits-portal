import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MemberDashboard from "./ui/member-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");

  const [user, menus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: BigInt(session.user.id ?? "0") },
      include: { pointWallet: true },
    }),
    prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) redirect("/login");

  // Announcementテーブルは存在しない場合に備えてtry-catch
  let announcements: {
    id: string;
    title: string;
    content: string;
    tag: string;
    isPublished: boolean;
    publishedAt: string | null;
  }[] = [];

  try {
    const rows = await prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    announcements = rows.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      tag: a.tag,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    }));
  } catch (e) {
    console.error("Announcement fetch error:", e);
  }

  return (
    <MemberDashboard
      user={{
        id: user.id.toString(),
        name: user.name ?? "",
        memberCode: user.memberCode ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        availablePoints: user.pointWallet?.availablePointsBalance ?? 0,
      }}
      announcements={announcements}
      menus={menus.map((m) => ({
        id: m.id.toString(),
        title: m.title,
        subtitle: m.subtitle ?? undefined,
        iconType: m.iconType ?? undefined,
        menuType: m.menuType ?? undefined,
        linkUrl: m.linkUrl ?? undefined,
      }))}
    />
  );
}
