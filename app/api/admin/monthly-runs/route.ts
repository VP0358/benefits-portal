import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const rewardMonth = searchParams.get("rewardMonth");
  const mode = searchParams.get("mode");
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);
  const skip = (page - 1) * limit;

  const where = {
    ...(rewardMonth ? { rewardMonth } : {}),
    ...(mode ? { mode } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.monthlyRewardRun.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.monthlyRewardRun.count({ where }),
  ]);

  return NextResponse.json({
    rows: rows.map(row => ({
      ...row,
      id: row.id.toString(),
      executedByAdminId: row.executedByAdminId?.toString() ?? null,
    })),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}
