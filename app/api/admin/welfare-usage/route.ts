export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

// ──────────────────────────────────────────────────────────────
// GET  /api/admin/welfare-usage
//   ?menuId=xxx  絞り込み（省略=全件）
//   ?userId=xxx  絞り込み
//   ?page=1&limit=50
// ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const sp       = req.nextUrl.searchParams;
  const menuId   = sp.get("menuId")  ? BigInt(sp.get("menuId")!)  : undefined;
  const userId   = sp.get("userId")  ? BigInt(sp.get("userId")!)  : undefined;
  const page     = Math.max(1, Number(sp.get("page")  ?? "1"));
  const limit    = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50")));
  const skip     = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (menuId) where.menuId = menuId;
  if (userId) where.userId = userId;

  const [total, rows] = await Promise.all([
    prisma.welfareUsage.count({ where }),
    prisma.welfareUsage.findMany({
      where,
      orderBy: { usedAt: "desc" },
      skip,
      take: limit,
      include: {
        menu: { select: { id: true, title: true, menuType: true, iconType: true } },
        user: { select: { id: true, name: true, memberCode: true, email: true } },
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id:          r.id.toString(),
    menuId:      r.menuId.toString(),
    menuTitle:   r.menu.title,
    menuType:    r.menu.menuType,
    menuIcon:    r.menu.iconType,
    userId:      r.userId.toString(),
    userName:    r.user.name,
    memberCode:  r.user.memberCode,
    email:       r.user.email,
    usedAt:      r.usedAt.toISOString(),
    note:        r.note ?? "",
    adminNote:   r.adminNote ?? "",
    createdAt:   r.createdAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, total, page, limit, data });
}

// ──────────────────────────────────────────────────────────────
// POST  /api/admin/welfare-usage
//   body: { menuId, userId, usedAt?, note?, adminNote? }
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const body = await req.json();
  const { menuId, userId, usedAt, note, adminNote } = body;

  if (!menuId || !userId) {
    return NextResponse.json({ ok: false, error: "menuId と userId は必須です" }, { status: 400 });
  }

  // メニュー・ユーザー存在確認
  const [menu, user] = await Promise.all([
    prisma.menu.findUnique({ where: { id: BigInt(menuId) } }),
    prisma.user.findUnique({ where: { id: BigInt(userId) } }),
  ]);
  if (!menu) return NextResponse.json({ ok: false, error: "メニューが見つかりません" }, { status: 404 });
  if (!user) return NextResponse.json({ ok: false, error: "会員が見つかりません" }, { status: 404 });

  const record = await prisma.welfareUsage.create({
    data: {
      menuId:    BigInt(menuId),
      userId:    BigInt(userId),
      usedAt:    usedAt ? new Date(usedAt) : new Date(),
      note:      note      ?? null,
      adminNote: adminNote ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: record.id.toString() });
}

// ──────────────────────────────────────────────────────────────
// PATCH  /api/admin/welfare-usage
//   body: { id, note?, adminNote?, usedAt? }
// ──────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const body = await req.json();
  const { id, note, adminNote, usedAt } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (note      !== undefined) data.note      = note ?? null;
  if (adminNote !== undefined) data.adminNote = adminNote ?? null;
  if (usedAt    !== undefined) data.usedAt    = new Date(usedAt);

  await prisma.welfareUsage.update({ where: { id: BigInt(id) }, data });
  return NextResponse.json({ ok: true });
}

// ──────────────────────────────────────────────────────────────
// DELETE  /api/admin/welfare-usage
//   body: { id }
// ──────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id は必須です" }, { status: 400 });

  await prisma.welfareUsage.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
