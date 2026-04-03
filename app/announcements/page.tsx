import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const TAG_STYLE: Record<string, string> = {
  important: "bg-red-500 text-white",
  campaign:  "bg-yellow-400 text-yellow-900",
  new:       "bg-blue-500 text-white",
  notice:    "bg-gray-400 text-white",
};
const TAG_LABEL: Record<string, string> = {
  important: "重要", campaign: "キャンペーン", new: "新機能", notice: "お知らせ",
};
const CARD_BG = [
  "linear-gradient(135deg, #2563eb, #60a5fa)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #ea580c, #fb923c)",
  "linear-gradient(135deg, #0891b2, #22d3ee)",
  "linear-gradient(135deg, #db2777, #f472b6)",
];

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const announcements = await prisma.announcement.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-10">
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-green-700 text-sm font-bold">← 戻る</Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
               style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>V</div>
          <span className="font-bold text-green-800 text-sm">お知らせ一覧</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-3">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 shadow">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-medium">現在お知らせはありません</p>
          </div>
        ) : (
          announcements.map((a, i) => (
            <div key={a.id}
                 className="rounded-2xl shadow overflow-hidden text-white"
                 style={{ background: CARD_BG[i % CARD_BG.length] }}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TAG_STYLE[a.tag] ?? "bg-gray-400 text-white"}`}>
                    {TAG_LABEL[a.tag] ?? "お知らせ"}
                  </span>
                  <span className="text-xs font-medium opacity-80">
                    {a.publishedAt
                      ? new Date(a.publishedAt).toLocaleDateString("ja-JP")
                      : new Date(a.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="font-bold text-base">{a.title}</p>
                <p className="text-sm font-medium opacity-90 mt-1">{a.content}</p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
