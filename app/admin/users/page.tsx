import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import UsersSearchBar from "./ui/users-search-bar";

const STATUS_LABELS: Record<string, string> = {
  active:    "有効",
  inactive:  "無効",
  suspended: "停止中",
  banned:    "禁止",
};
const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  inactive:  "bg-gray-100 text-gray-500",
  suspended: "bg-yellow-100 text-yellow-700",
  banned:    "bg-red-100 text-red-700",
};

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    sort?: string;
  }>;
}

const PAGE_SIZE = 30;

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp     = await searchParams;
  const q      = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const page   = Math.max(Number(sp.page ?? 1), 1);
  const sort   = sp.sort ?? "createdAt_desc";
  const skip   = (page - 1) * PAGE_SIZE;

  // -------------------------------------------------------
  // where句の構築
  // -------------------------------------------------------
  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { memberCode: { contains: q, mode: "insensitive" } },
      { name:       { contains: q, mode: "insensitive" } },
      { nameKana:   { contains: q, mode: "insensitive" } },
      { email:      { contains: q, mode: "insensitive" } },
      { phone:      { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status as Prisma.EnumUserStatusFilter;
  }

  // -------------------------------------------------------
  // ソート
  // -------------------------------------------------------
  const orderByMap: Record<string, Prisma.UserOrderByWithRelationInput> = {
    createdAt_desc: { createdAt: "desc" },
    createdAt_asc:  { createdAt: "asc" },
    name_asc:       { name: "asc" },
    memberCode_asc: { memberCode: "asc" },
  };
  const orderBy = orderByMap[sort] ?? { createdAt: "desc" };

  // -------------------------------------------------------
  // データ取得
  // -------------------------------------------------------
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id:          true,
        memberCode:  true,
        name:        true,
        nameKana:    true,
        email:       true,
        phone:       true,
        status:      true,
        createdAt:   true,
        lastLoginAt: true,
        pointWallet: { select: { availablePointsBalance: true } },
        referrals:   { select: { id: true } },
        mlmMember:   { select: { currentLevel: true, titleLevel: true, memberType: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  // ページリンク生成ヘルパー
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (sort !== "createdAt_desc") params.set("sort", sort);
    params.set("page", String(p));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <main className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
            Member Management
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">会員管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            会員情報・ポイント残高・MLMステータスを確認できます
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export/members"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium"
          >
            📥 CSV出力
          </a>
          <Link
            href="/admin/users/new"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white hover:bg-slate-700 font-medium"
          >
            ＋ 新規登録
          </Link>
        </div>
      </div>

      {/* 検索・フィルターバー（Client Component） */}
      <UsersSearchBar defaultQ={q} defaultStatus={status} defaultSort={sort} />

      {/* 検索結果サマリー */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {total.toLocaleString()}名
          {q && <span className="ml-2 text-violet-600 font-medium">「{q}」の検索結果</span>}
          {status && <span className="ml-2 text-blue-600 font-medium">({STATUS_LABELS[status] ?? status}のみ)</span>}
        </span>
        <span className="text-slate-400">
          {page} / {totalPages} ページ
        </span>
      </div>

      {/* 一覧テーブル */}
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        {/* テーブルヘッダー */}
        <div className="grid grid-cols-[110px_1fr_1fr_90px_90px_100px_80px] gap-3 border-b bg-stone-50 px-5 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
          <div>会員番号</div>
          <div>氏名</div>
          <div>メール</div>
          <div>ステータス</div>
          <div className="text-right">ポイント</div>
          <div className="text-center">MLMレベル</div>
          <div>操作</div>
        </div>

        {/* データなし */}
        {users.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">
            <i className="fas fa-search text-2xl mb-3 block text-slate-300"></i>
            {q || status ? "検索条件に一致する会員が見つかりませんでした" : "会員が登録されていません"}
          </div>
        )}

        {/* 行データ */}
        {users.map((user) => (
          <div
            key={user.id.toString()}
            className="grid grid-cols-[110px_1fr_1fr_90px_90px_100px_80px] gap-3 border-b px-5 py-3.5 text-sm hover:bg-slate-50 transition items-center"
          >
            <div className="font-mono text-xs text-slate-500">{user.memberCode}</div>
            <div>
              <div className="font-semibold text-slate-800">{user.name}</div>
              {user.nameKana && (
                <div className="text-xs text-slate-400">{user.nameKana}</div>
              )}
            </div>
            <div className="truncate text-slate-600 text-xs">{user.email}</div>
            <div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[user.status] ?? "bg-gray-100 text-gray-500"}`}>
                {STATUS_LABELS[user.status] ?? user.status}
              </span>
            </div>
            <div className="text-right font-medium text-slate-700 text-xs">
              {(user.pointWallet?.availablePointsBalance ?? 0).toLocaleString()}
              <span className="text-slate-400 ml-0.5">pt</span>
            </div>
            <div className="text-center text-xs">
              {user.mlmMember ? (
                <span className="text-violet-700 font-semibold">
                  Lv.{user.mlmMember.currentLevel}
                  <span className="text-slate-400 ml-1">
                    ({user.mlmMember.memberType === "business" ? "B" : "C"})
                  </span>
                </span>
              ) : (
                <span className="text-slate-300">-</span>
              )}
            </div>
            <div>
              <Link
                href={`/admin/users/${user.id.toString()}`}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                詳細
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              ← 前へ
            </Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            // 現在ページ周辺のページ番号を表示
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <Link
                key={pageNum}
                href={pageHref(pageNum)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  pageNum === page
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              次へ →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
