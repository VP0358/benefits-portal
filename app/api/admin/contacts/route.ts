// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

// GET /api/admin/contacts?page=1&filter=unread|read|all
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const filter = searchParams.get("filter") ?? "all"; // all | unread | read
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = 30;
  const skip   = (page - 1) * limit;

  const where =
    filter === "unread" ? { isRead: false } :
    filter === "read"   ? { isRead: true }  : {};

  const [total, items] = await Promise.all([
    prisma.contactInquiry.count({ where }),
    prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: { memberCode: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    items: items.map(c => ({
      id:        c.id.toString(),
      name:      c.name,
      phone:     c.phone,
      email:     c.email,
      content:   c.content,
      menuTitle: c.menuTitle,
      isRead:    c.isRead,
      readAt:    c.readAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      user:      c.user ? { memberCode: c.user.memberCode, name: c.user.name } : null,
    })),
  });
}
