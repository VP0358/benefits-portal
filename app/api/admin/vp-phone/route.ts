// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * GET /api/admin/vp-phone  – VP未来phone申し込み一覧
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;

  const [total, applications, statusCounts] = await Promise.all([
    prisma.vpPhoneApplication.count({ where }),
    prisma.vpPhoneApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, memberCode: true, email: true },
        },
      },
    }),
    prisma.vpPhoneApplication.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  );

  return NextResponse.json({
    total,
    page,
    pages: Math.ceil(total / limit),
    countByStatus,
    data: applications.map((a) => ({
      id:              a.id.toString(),
      userId:          a.userId.toString(),
      nameKanji:       a.nameKanji,
      nameKana:        a.nameKana,
      email:           a.email,
      // passwordは管理者にも表示するため含める（外部サービス申請用）
      password:        a.password ?? null,
      phone:           a.phone,
      birthDate:       a.birthDate,
      gender:          a.gender,
      lineId:          a.lineId,
      lineDisplayName: a.lineDisplayName,
      referrerCode:    a.referrerCode,
      referrerName:    a.referrerName,
      contractType:    a.contractType,
      desiredPlan:     a.desiredPlan,
      status:          a.status,
      adminNote:       a.adminNote,
      reviewedAt:      a.reviewedAt?.toISOString() ?? null,
      contractedAt:    a.contractedAt?.toISOString() ?? null,
      createdAt:       a.createdAt.toISOString(),
      user: {
        id:         a.user.id.toString(),
        name:       a.user.name,
        memberCode: a.user.memberCode,
        email:      a.user.email,
      },
    })),
  });
}
