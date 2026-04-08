import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MemberDashboard from "./ui/member-dashboard";

export default async function DashboardPage() {
  try {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (session.user.role === "admin") redirect("/admin");

    const userId = BigInt(session.user.id ?? "0");
  
  let vpPhoneApp = null;
  let travelSub = null;
  
  const [user, menus, mlmMember] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { pointWallet: true },
    }),
    prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.mlmMember.findFirst({
      where: { userId },
    }),
  ]);
  
  // VpPhoneとTravelSubは個別に取得（エラーがあっても続行）
  try {
    vpPhoneApp = await prisma.vpPhoneApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("VpPhoneApplication fetch error:", e);
  }
  
  try {
    travelSub = await prisma.travelSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("TravelSubscription fetch error:", e);
  }

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
          id: String(user.id),
          name: user.name ?? "",
          memberCode: user.memberCode ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          availablePoints: user.pointWallet?.availablePointsBalance ?? 0,
        }}
        mlmStatus={mlmMember?.status ? String(mlmMember.status) : null}
        vpPhoneStatus={vpPhoneApp?.status ? String(vpPhoneApp.status) : null}
        travelSubStatus={travelSub?.status ? String(travelSub.status) : null}
        announcements={announcements}
        menus={menus.map((m) => ({
          id: String(m.id),
          title: m.title,
          subtitle: m.subtitle ?? undefined,
          iconType: m.iconType ?? undefined,
          menuType: m.menuType ?? undefined,
          linkUrl: m.linkUrl ?? undefined,
        }))}
      />
    );
  } catch (error) {
    console.error("Dashboard page error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
          <p className="text-gray-700 mb-4">ダッシュボードの読み込み中にエラーが発生しました。</p>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
            {error instanceof Error ? error.message : String(error)}
          </pre>
          <a href="/login" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            ログインページへ
          </a>
        </div>
      </div>
    );
  }
}
