"use client";

import { useEffect, useState } from "react";

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

const TAG_LABELS: Record<Tag, { label: string; bg: string; text: string }> = {
  important: { label: "重要",         bg: "bg-red-50",    text: "text-red-700" },
  campaign:  { label: "キャンペーン", bg: "bg-amber-50",  text: "text-amber-700" },
  new:       { label: "新機能",       bg: "bg-blue-50",   text: "text-blue-700" },
  notice:    { label: "お知らせ",     bg: "bg-stone-50",  text: "text-stone-600" },
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
    const url    = editing.id ? `/api/announcements/${editing.id}` : "/api/announcements";
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
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
            Announcements
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">お知らせ管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">お知らせの投稿・編集・公開管理</p>
        </div>
        <button
          onClick={() => setEditing(EMPTY)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #c9a84c, #a88830)", boxShadow: "0 2px 8px rgba(201,168,76,0.35)" }}
        >
          <i className="fas fa-plus text-xs" /> 新規作成
        </button>
      </div>

      {/* 編集・新規フォーム */}
      {editing && (
        <div
          className="rounded-2xl bg-white border border-stone-100 p-6 space-y-4"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
        >
          <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
            <i className={`fas ${editing.id ? "fa-edit" : "fa-plus-circle"} text-sm`} style={{ color: "#c9a84c" }} />
            {editing.id ? "お知らせを編集" : "新規お知らせ作成"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">タイトル</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="タイトルを入力"
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">タグ</label>
              <select
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
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
              <label className="block text-xs font-semibold text-stone-600 mb-1">内容</label>
              <textarea
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 h-32 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                placeholder="お知らせの内容を入力"
                value={editing.content ?? ""}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-amber-600"
                checked={editing.isPublished ?? false}
                onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
              />
              すぐに公開する
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #c9a84c, #a88830)", boxShadow: "0 2px 8px rgba(201,168,76,0.3)" }}
            >
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 保存中...</>
              ) : (
                <><i className="fas fa-save" /> 保存する</>
              )}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 一覧 */}
      <div
        className="rounded-2xl bg-white border border-stone-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <span className="w-5 h-5 border-2 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-sm text-stone-400">読み込み中...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center mb-4">
              <i className="fas fa-bullhorn text-2xl text-stone-300" />
            </div>
            <p className="font-semibold text-stone-700 mb-1">お知らせがありません</p>
            <p className="text-sm text-stone-400">「新規作成」からお知らせを追加してください</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {list.map((a) => {
              const tagInfo = TAG_LABELS[a.tag as Tag] ?? TAG_LABELS.notice;
              return (
                <div key={a.id} className="flex items-start gap-4 p-5 hover:bg-stone-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${tagInfo.bg} ${tagInfo.text}`} style={{ borderColor: "transparent" }}>
                        {tagInfo.label}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        a.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-stone-50 text-stone-500"
                      }`}>
                        {a.isPublished ? "公開中" : "非公開"}
                      </span>
                      <span className="text-xs text-stone-400">
                        {new Date(a.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <p className="font-semibold text-stone-800 text-sm truncate">{a.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{a.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(a)}
                      className="p-2 rounded-lg text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                      title="編集"
                    >
                      <i className="fas fa-edit" />
                    </button>
                    <button
                      onClick={() => togglePublish(a)}
                      className={`p-2 rounded-lg text-xs transition-colors ${
                        a.isPublished
                          ? "text-amber-500 hover:bg-amber-50"
                          : "text-emerald-500 hover:bg-emerald-50"
                      }`}
                      title={a.isPublished ? "非公開にする" : "公開する"}
                    >
                      <i className={`fas ${a.isPublished ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="p-2 rounded-lg text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="削除"
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
