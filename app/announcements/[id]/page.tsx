"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/announcements/${id}`)
      .then(r => r.json())
      .then(d => {
        setItem(d);
        // この記事を既読に追加
        const stored = localStorage.getItem("readAnnouncements");
        const read: string[] = stored ? JSON.parse(stored) : [];
        if (!read.includes(id)) {
          read.push(id);
          localStorage.setItem("readAnnouncements", JSON.stringify(read));
          window.dispatchEvent(new Event("announcementsRead"));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center">
        <div className="text-green-700 font-bold text-lg animate-pulse">読み込み中...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#e6f2dc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">😢</p>
          <p className="text-gray-700 font-bold">お知らせが見つかりませんでした</p>
          <Link href="/announcements" className="text-green-700 font-bold text-sm mt-3 block">← 一覧に戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-20">
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/announcements" className="text-green-700 text-xl font-bold">‹</Link>
        <span className="font-bold text-green-900 text-base">🔔 お知らせ詳細</span>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* タグ・日付 */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${TAG_STYLE[item.tag] ?? "bg-gray-400 text-white"}`}>
              {TAG_LABEL[item.tag] ?? "お知らせ"}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("ja-JP") : ""}
            </span>
          </div>

          {/* タイトル */}
          <h1 className="text-xl font-black text-gray-900 mb-4 leading-tight">
            {item.title}
          </h1>

          {/* 区切り線 */}
          <hr className="border-gray-100 mb-4" />

          {/* 本文 */}
          <div className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
            {item.content}
          </div>
        </div>

        <Link href="/announcements"
          className="block text-center text-sm font-bold text-green-700 mt-6 hover:underline">
          ← お知らせ一覧に戻る
        </Link>
      </main>
    </div>
  );
}
