"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  tag: string;
  publishedAt: string | null;
}

const TAG_STYLE: Record<string, string> = {
  important: "bg-red-500 text-white",
  campaign:  "bg-yellow-400 text-yellow-900",
  new:       "bg-blue-500 text-white",
  notice:    "bg-gray-400 text-white",
};
const TAG_LABEL: Record<string, string> = {
  important: "重要",
  campaign:  "キャンペーン",
  new:       "新機能",
  notice:    "お知らせ",
};

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    // 既読IDを取得
    const stored = localStorage.getItem("readAnnouncements");
    if (stored) setReadIds(JSON.parse(stored));

    fetch("/api/announcements?published=true")
      .then(r => r.json())
      .then(d => {
        setList(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-20">
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-green-700 text-xl font-bold">‹</Link>
        <span className="font-bold text-green-900 text-base">🔔 お知らせ一覧</span>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-3">
        {loading ? (
          <div className="text-center text-green-700 font-bold py-12 animate-pulse">読み込み中...</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm font-medium text-gray-600">現在お知らせはありません</p>
          </div>
        ) : (
          list.map(a => {
            const isRead = readIds.includes(a.id);
            return (
              <Link key={a.id} href={`/announcements/${a.id}`}
                className={`block bg-white rounded-2xl shadow p-4 hover:shadow-md transition active:scale-95 relative ${!isRead ? "border-l-4 border-green-500" : ""}`}>
                {!isRead && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TAG_STYLE[a.tag] ?? "bg-gray-400 text-white"}`}>
                    {TAG_LABEL[a.tag] ?? "お知らせ"}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("ja-JP") : ""}
                  </span>
                </div>
                <p className={`font-bold text-sm ${isRead ? "text-gray-700" : "text-gray-900"}`}>{a.title}</p>
                <p className="text-xs font-medium text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-green-600 font-semibold mt-2 text-right">続きを読む →</p>
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
