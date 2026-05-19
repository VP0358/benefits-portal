/**
 * GET /api/admin/mlm-members/force-list
 *
 * 強制アクティブ・強制タイトルが設定されている会員一覧を返す。
 *
 * クエリパラメータ:
 *   filter=all          全件（デフォルト）
 *   filter=forceActive  強制アクティブのみ
 *   filter=forceLevel   強制タイトルのみ
 *   filter=both         両方設定されている会員のみ
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const filter = searchParams.get("filter") ?? "all";

  // フィルター条件を構築
  type WhereClause = {
    OR?: ({ forceActive: boolean } | { forceLevel: { not: null } })[];
    forceActive?: boolean;
    forceLevel?: { not: null };
  };

  let where: WhereClause = {};
  switch (filter) {
    case "forceActive":
      where = { forceActive: true };
      break;
    case "forceLevel":
      where = { forceLevel: { not: null } };
      break;
    case "both":
      where = { forceActive: true, forceLevel: { not: null } };
      break;
    default: // "all"
      where = {
        OR: [
          { forceActive: true },
          { forceLevel: { not: null } },
        ],
      };
  }

  const members = await prisma.mlmMember.findMany({
    where,
    select: {
      id: true,
      memberCode: true,
      memberType: true,
      status: true,
      currentLevel: true,
      titleLevel: true,
      forceActive: true,
      forceLevel: true,
      contractDate: true,
      companyName: true,
      prefecture: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      upline: {
        select: {
          memberCode: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { memberCode: "asc" },
  });

  type MemberRow = (typeof members)[number];
  const rows = members.map((m: MemberRow) => ({
    id: m.id.toString(),
    memberCode: m.memberCode,
    memberType: m.memberType,
    status: m.status,
    currentLevel: m.currentLevel,
    titleLevel: m.titleLevel,
    forceActive: m.forceActive,
    forceLevel: m.forceLevel,
    contractDate: m.contractDate?.toISOString().slice(0, 10) ?? null,
    companyName: m.companyName ?? null,
    prefecture: m.prefecture ?? null,
    userName: m.user.name,
    userEmail: m.user.email,
    uplineMemberCode: m.upline?.memberCode ?? null,
    uplineName: m.upline?.user.name ?? null,
  }));

  return NextResponse.json({ rows, total: rows.length });
}
