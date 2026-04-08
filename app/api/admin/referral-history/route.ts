// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where = userId ? { userId: BigInt(userId) } : {};

  const [rows, total] = await Promise.all([
    prisma.referralHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referralHistory.count({ where }),
  ]);

  // ユーザー情報を一括取得
  const userIds = [...new Set(rows.map(r => r.userId))];
  const referrerIds = [...new Set(rows.map(r => r.referrerUserId).filter(Boolean) as bigint[])];
  const adminIds = [...new Set(rows.map(r => r.operatedByAdminId).filter(Boolean) as bigint[])];

  const [users, referrers, admins] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, memberCode: true },
    }),
    referrerIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: referrerIds } },
          select: { id: true, name: true, memberCode: true },
        })
      : Promise.resolve([]),
    adminIds.length > 0
      ? prisma.admin.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map(u => [u.id.toString(), u]));
  const referrerMap = new Map(referrers.map(u => [u.id.toString(), u]));
  const adminMap = new Map(admins.map(a => [a.id.toString(), a]));

  return NextResponse.json({
    rows: rows.map(row => {
      const user = userMap.get(row.userId.toString());
      const referrer = row.referrerUserId ? referrerMap.get(row.referrerUserId.toString()) : null;
      const admin = row.operatedByAdminId ? adminMap.get(row.operatedByAdminId.toString()) : null;
      return {
        id: row.id.toString(),
        userId: row.userId.toString(),
        userName: user?.name ?? "—",
        userMemberCode: user?.memberCode ?? "—",
        referrerId: row.referrerUserId?.toString() ?? null,
        referrerName: referrer?.name ?? null,
        referrerMemberCode: referrer?.memberCode ?? null,
        actionType: row.actionType,
        adminName: admin?.name ?? null,
        note: row.note,
        createdAt: row.createdAt,
      };
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const { userId, referrerUserId, actionType, note } = json;

  if (!userId || !actionType) {
    return NextResponse.json({ error: "userId and actionType are required" }, { status: 400 });
  }

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;

  const history = await prisma.referralHistory.create({
    data: {
      userId: BigInt(userId),
      referrerUserId: referrerUserId ? BigInt(referrerUserId) : BigInt(0),
      actionType,
      operatedByAdminId: adminId,
      note: note ?? null,
    },
  });

  return NextResponse.json({
    id: history.id.toString(),
    userId: history.userId.toString(),
    actionType: history.actionType,
    createdAt: history.createdAt,
  }, { status: 201 });
}
