"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tag = "important" | "campaign" | "new" | "notice";

interface Announcement {
  id: string;
  title: string;
  content: string;
  tag: Tag;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const TAG_LABELS: Record<Tag, { label: string; color: string }> = {
  important: { label: "重要",         color: "bg-red-100 text-red-700" },
  campaign:  { label: "キャンペーン", color: "bg-yellow-100 text-yellow-700" },
  new:       { label: "新機能",       color: "bg-blue-100 text-blue-700" },
  notice:    { label: "お知らせ",     color: "bg-gray-100 text-gray-600" },
};

const EMPTY: Partial<Announcement> = {
  title: "", content: "", tag: "notice", isPublished: false,
};

export default function AnnouncementsAdminPage() {
  const [list, setList]       = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Announcement> | null>(null);
  const [saving, setSaving]   = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/announcements");
    setList(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.content?.trim()) {
      alert("タイトルと内容を入力してください");
      return;
    }
    setSaving(true);
    const method = editing.id ? "PUT" : "POST";
    const url    = editing.id
      ? `/api/announcements/${editing.id}`
      : "/api/announcements";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    await load();
    setSaving(false);
  }

  async function togglePublish(a: Announcement) {
    await fetch(`/api/announcements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, isPublished: !a.isPublished }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("このお知らせを削除しますか？")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-indigo-400 hover:text-indigo-600 text-sm">
            ← 管理画面に戻る
          </Link>
          <h1 className="text-2xl font-bold text-indigo-900">📢 お知らせ管理</h1>
        </div>
        <button
          onClick={() => setEditing(EMPTY)}
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold shadow"
          style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}
        >
          ＋ 新規作成
        </button>
      </div>

      {/* 編集・新規フォーム */}
      {editing && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-indigo-100">
          <h2 className="text-lg font-bold text-indigo-800 mb-4">
            {editing.id ? "✏️ 編集" : "🆕 新規お知らせ"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">タイトル</label>
              <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="タイトルを入力"
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">タグ</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={editing.tag ?? "notice"}
                onChange={(e) => setEditing({ ...editing, tag: e.target.value as Tag })}
              >
                <option value="notice">お知らせ</option>
                <option value="important">重要</option>
                <option value="campaign">キャンペーン</option>
                <option value="new">新機能</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">内容</label>
              <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="お知らせの内容を入力"
                value={editing.content ?? ""}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-indigo-600"
                checked={editing.isPublished ?? false}
                onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
              />
              すぐに公開する
            </label>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 shadow"
              style={{ background: "linear-gradient(135deg, #4338ca, #7c3aed)" }}
            >
              {saving ? "保存中..." : "💾 保存する"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-6 py-2 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 一覧 */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : list.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-3">📭</p>
          <p>お知らせがありません</p>
          <p className="text-sm mt-1">「＋ 新規作成」から追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const tagInfo = TAG_LABELS[a.tag as Tag] ?? TAG_LABELS.notice;
            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl shadow p-4 flex items-start gap-4 border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tagInfo.color}`}>
                      {tagInfo.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      a.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {a.isPublished ? "✅ 公開中" : "🔒 非公開"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm truncate">{a.title}</p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5 line-clamp-2">{a.content}</p>
                </div>
                <div className="flex flex-col gap-2 min-w-max text-right">
                  <button
                    onClick={() => setEditing(a)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    ✏️ 編集
                  </button>
                  <button
                    onClick={() => togglePublish(a)}
                    className="text-xs text-green-600 hover:underline"
                  >
                    {a.isPublished ? "🔒 非公開に" : "✅ 公開する"}
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
