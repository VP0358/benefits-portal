"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface Props {
  defaultQ: string;
  defaultStatus: string;
  defaultSort: string;
}

const STATUS_OPTIONS = [
  { value: "",         label: "全ステータス" },
  { value: "active",   label: "有効" },
  { value: "inactive", label: "無効" },
  { value: "suspended",label: "停止中" },
  { value: "banned",   label: "禁止" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "登録日（新しい順）" },
  { value: "createdAt_asc",  label: "登録日（古い順）" },
  { value: "name_asc",       label: "氏名（あいうえお順）" },
  { value: "memberCode_asc", label: "会員番号順" },
];

export default function UsersSearchBar({ defaultQ, defaultStatus, defaultSort }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [q,      setQ]      = useState(defaultQ);
  const [status, setStatus] = useState(defaultStatus);
  const [sort,   setSort]   = useState(defaultSort);

  const applySearch = useCallback(
    (newQ: string, newStatus: string, newSort: string) => {
      const params = new URLSearchParams();
      if (newQ.trim())  params.set("q", newQ.trim());
      if (newStatus)    params.set("status", newStatus);
      if (newSort && newSort !== "createdAt_desc") params.set("sort", newSort);
      // ページは1にリセット
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(q, status, sort);
  };

  const handleReset = () => {
    setQ("");
    setStatus("");
    setSort("createdAt_desc");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilter = defaultQ || defaultStatus || defaultSort !== "createdAt_desc";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-stone-100 p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div className="flex flex-wrap gap-3 items-end">
        {/* キーワード検索 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            キーワード検索
          </label>
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="会員番号・氏名・フリガナ・メール・電話"
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
          </div>
        </div>

        {/* ステータスフィルター */}
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            ステータス
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              applySearch(q, e.target.value, sort);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ソート */}
        <div className="min-w-[180px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            並び替え
          </label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applySearch(q, status, e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 検索ボタン */}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50 whitespace-nowrap"
        >
          <i className="fas fa-search mr-1.5"></i>
          {isPending ? "検索中..." : "検索"}
        </button>

        {/* リセットボタン */}
        {hasFilter && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
          >
            <i className="fas fa-times mr-1"></i>
            クリア
          </button>
        )}
      </div>
    </form>
  );
}
