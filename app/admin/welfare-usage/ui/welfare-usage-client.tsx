"use client";

import { useState, useCallback } from "react";

// ────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  title: string;
  menuType: string;
  iconType: string;
}

interface UsageRecord {
  id: string;
  menuId: string;
  menuTitle: string;
  menuType: string;
  menuIcon: string | null;
  userId: string;
  userName: string;
  memberCode: string;
  email: string;
  usedAt: string;
  note: string;
  adminNote: string;
}

interface Props {
  initialMenus: MenuItem[];
  summaryMap: Record<string, number>;
}

// ────────────────────────────────────────────────────────────
// メニュータイプのラベル
// ────────────────────────────────────────────────────────────
const MENU_TYPE_LABEL: Record<string, string> = {
  vp_phone:    "VP未来phone",
  travel_sub:  "格安旅行",
  used_car:    "中古車",
  skin:        "肌診断",
  contact:     "相談窓口",
  url:         "URLリンク",
};

// ────────────────────────────────────────────────────────────
// 日付フォーマット
// ────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}
function fmtDateOnly(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

// ────────────────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────────────────
export default function WelfareUsageClient({ initialMenus, summaryMap }: Props) {
  const [menus]               = useState<MenuItem[]>(initialMenus);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // フィルター
  const [filterMenuId, setFilterMenuId] = useState("");
  const [filterMember, setFilterMember] = useState("");

  // 新規登録モーダル
  const [showAdd, setShowAdd]         = useState(false);
  const [addMenuId, setAddMenuId]     = useState("");
  const [addMemberCode, setAddMemberCode] = useState("");
  const [addUsedAt, setAddUsedAt]     = useState(() => new Date().toISOString().slice(0, 10));
  const [addNote, setAddNote]         = useState("");
  const [addLoading, setAddLoading]   = useState(false);
  const [addError, setAddError]       = useState("");

  // 編集モーダル
  const [editTarget, setEditTarget]       = useState<UsageRecord | null>(null);
  const [editNote, setEditNote]           = useState("");
  const [editAdminNote, setEditAdminNote] = useState("");
  const [editUsedAt, setEditUsedAt]       = useState("");
  const [editLoading, setEditLoading]     = useState(false);

  const LIMIT = 50;

  // ── データ取得 ───────────────────────────────────────────
  const fetchData = useCallback(async (p: number, menuId: string, member: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (menuId) params.set("menuId", menuId);
      const res  = await fetch(`/api/admin/welfare-usage?${params}`);
      const json = await res.json();
      let rows: UsageRecord[] = json.data ?? [];

      // 会員コード・名前のクライアントフィルター
      if (member) {
        const q = member.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.memberCode.toLowerCase().includes(q) ||
            r.userName.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
        );
      }

      setRecords(rows);
      setTotal(json.total ?? 0);
      setPage(p);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => fetchData(1, filterMenuId, filterMember);

  // ── 新規登録 ─────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addMenuId) { setAddError("福利厚生を選択してください"); return; }
    if (!addMemberCode) { setAddError("会員コードを入力してください"); return; }
    setAddError("");
    setAddLoading(true);
    try {
      // 会員コードからuserIdを取得（MLM会員検索APIを使用）
      const uRes  = await fetch(`/api/admin/mlm-members/search?memberCode=${encodeURIComponent(addMemberCode)}`);
      const uJson = await uRes.json();
      const member = uJson.member ?? null;
      if (!member) { setAddError("会員が見つかりません（会員コードを確認してください）"); setAddLoading(false); return; }

      // mlmMember.id ではなく user.id が必要なので mlm-members/[id] から取得
      // レスポンスはメンバーオブジェクトを直接返す（{ id, userId, user: {...} }）
      const mRes  = await fetch(`/api/admin/mlm-members/${member.id}`);
      const mJson = await mRes.json();
      const userId = mJson.userId ?? mJson.user?.id ?? null;
      if (!userId) { setAddError("会員情報の取得に失敗しました"); setAddLoading(false); return; }

      const res = await fetch("/api/admin/welfare-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId:    addMenuId,
          userId:    userId,
          usedAt:    addUsedAt,
          note:      addNote,
        }),
      });
      const json = await res.json();
      if (!json.ok) { setAddError(json.error ?? "登録に失敗しました"); return; }

      setShowAdd(false);
      setAddMenuId(""); setAddMemberCode(""); setAddNote("");
      setAddUsedAt(new Date().toISOString().slice(0, 10));
      fetchData(1, filterMenuId, filterMember);
    } finally {
      setAddLoading(false);
    }
  };

  // ── 編集 ─────────────────────────────────────────────────
  const openEdit = (r: UsageRecord) => {
    setEditTarget(r);
    setEditNote(r.note);
    setEditAdminNote(r.adminNote);
    setEditUsedAt(r.usedAt.slice(0, 10));
  };
  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await fetch("/api/admin/welfare-usage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:        editTarget.id,
          note:      editNote,
          adminNote: editAdminNote,
          usedAt:    editUsedAt,
        }),
      });
      setEditTarget(null);
      fetchData(page, filterMenuId, filterMember);
    } finally {
      setEditLoading(false);
    }
  };

  // ── 削除 ─────────────────────────────────────────────────
  const handleDelete = async (r: UsageRecord) => {
    if (!confirm(`「${r.menuTitle}」の利用記録（${r.userName}さん）を削除しますか？`)) return;
    await fetch("/api/admin/welfare-usage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id }),
    });
    fetchData(page, filterMenuId, filterMember);
  };

  // ── CSV出力 ──────────────────────────────────────────────
  const handleCsvExport = async () => {
    const params = new URLSearchParams({ page: "1", limit: "2000" });
    if (filterMenuId) params.set("menuId", filterMenuId);
    const res  = await fetch(`/api/admin/welfare-usage?${params}`);
    const json = await res.json();
    let rows: UsageRecord[] = json.data ?? [];
    if (filterMember) {
      const q = filterMember.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.memberCode.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q)
      );
    }

    const header = "利用日,福利厚生,種別,会員コード,氏名,メール,備考,管理メモ";
    const lines = rows.map((r) =>
      [
        fmtDateOnly(r.usedAt),
        `"${r.menuTitle}"`,
        MENU_TYPE_LABEL[r.menuType] ?? r.menuType,
        r.memberCode,
        `"${r.userName}"`,
        r.email,
        `"${r.note}"`,
        `"${r.adminNote}"`,
      ].join(",")
    );
    const csv  = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `welfare-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 総利用件数 ───────────────────────────────────────────
  const totalUsage = Object.values(summaryMap).reduce((a, b) => a + b, 0);

  // ────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── ヘッダー ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-heart text-pink-500" />
          福利厚生 利用状況
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          誰がどの福利厚生を利用しているか確認・記録できます。新しい福利厚生が増えてもメニュー登録すれば自動的に対応します。
        </p>
      </div>

      {/* ── サマリーカード ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <div className="text-3xl font-bold text-pink-600">{totalUsage.toLocaleString()}</div>
          <div className="text-xs text-pink-500 mt-1">総利用件数</div>
        </div>
        {menus.slice(0, 4).map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {(summaryMap[m.id] ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate" title={m.title}>{m.title}</div>
          </div>
        ))}
      </div>

      {/* ── 検索フィルター ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">福利厚生で絞り込み</label>
          <select
            value={filterMenuId}
            onChange={(e) => setFilterMenuId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="">すべて</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">会員コード / 氏名 / メール</label>
          <input
            type="text"
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="例: A00001 / 山田 / yamada@"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-60"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-pink-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 disabled:opacity-50"
        >
          {loading ? "検索中…" : "検索"}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowAdd(true)}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-1"
        >
          <i className="fas fa-plus" /> 利用を記録
        </button>
        {hasFetched && (
          <button
            onClick={handleCsvExport}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center gap-1"
          >
            <i className="fas fa-download" /> CSV出力
          </button>
        )}
      </div>

      {/* ── メニュー別サマリーテーブル ── */}
      {!hasFetched && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-600 font-medium">福利厚生名</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">種別</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">利用件数</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {menus.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">
                    メニューが登録されていません
                  </td>
                </tr>
              )}
              {menus.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.title}</td>
                  <td className="px-4 py-3">
                    <span className="bg-pink-50 text-pink-700 text-xs px-2 py-0.5 rounded-full border border-pink-200">
                      {MENU_TYPE_LABEL[m.menuType] ?? m.menuType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    {(summaryMap[m.id] ?? 0).toLocaleString()} 件
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setFilterMenuId(m.id); fetchData(1, m.id, filterMember); }}
                      className="text-pink-600 hover:text-pink-800 text-xs underline"
                    >
                      一覧を見る
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 利用記録テーブル ── */}
      {hasFetched && (
        <>
          <div className="text-sm text-gray-500 mb-2">
            {loading ? "読み込み中…" : `${total.toLocaleString()} 件中 ${records.length} 件表示`}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">利用日</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">福利厚生</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">会員コード</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">氏名</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">備考</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">管理メモ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      利用記録がありません
                    </td>
                  </tr>
                )}
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{fmtDate(r.usedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{r.menuTitle}</div>
                      <div className="text-xs text-gray-400">{MENU_TYPE_LABEL[r.menuType] ?? r.menuType}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{r.memberCode}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <a
                        href={`/admin/users/${r.userId}`}
                        className="hover:text-pink-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.userName}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={r.note}>
                      {r.note || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate" title={r.adminNote}>
                      {r.adminNote || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-blue-600 hover:text-blue-800 text-xs mr-3"
                      >
                        <i className="fas fa-edit" /> 編集
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        <i className="fas fa-trash" /> 削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {total > LIMIT && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => fetchData(page - 1, filterMenuId, filterMember)}
                disabled={page <= 1 || loading}
                className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
              >
                ← 前
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {page} / {Math.ceil(total / LIMIT)} ページ
              </span>
              <button
                onClick={() => fetchData(page + 1, filterMenuId, filterMember)}
                disabled={page >= Math.ceil(total / LIMIT) || loading}
                className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
              >
                次 →
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          新規登録モーダル
      ══════════════════════════════════════════════════════ */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-plus-circle text-emerald-500" />
              福利厚生 利用を記録
            </h2>

            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">
                {addError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  福利厚生 <span className="text-red-500">*</span>
                </label>
                <select
                  value={addMenuId}
                  onChange={(e) => setAddMenuId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {menus.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会員コード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addMemberCode}
                  onChange={(e) => setAddMemberCode(e.target.value)}
                  placeholder="例: A00001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用日</label>
                <input
                  type="date"
                  value={addUsedAt}
                  onChange={(e) => setAddUsedAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備考（プラン名・申込内容など）
                </label>
                <textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  rows={3}
                  placeholder="例: ライトプランを申し込み"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAdd(false); setAddError(""); }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex-1 bg-emerald-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                {addLoading ? "登録中…" : "登録する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          編集モーダル
      ══════════════════════════════════════════════════════ */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <i className="fas fa-edit text-blue-500" />
              利用記録を編集
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {editTarget.menuTitle} — {editTarget.userName}（{editTarget.memberCode}）
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用日</label>
                <input
                  type="date"
                  value={editUsedAt}
                  onChange={(e) => setEditUsedAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備考（プラン名・申込内容など）
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  管理メモ（内部用）
                </label>
                <textarea
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {editLoading ? "保存中…" : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
