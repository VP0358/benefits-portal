import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const actionType = searchParams.get("actionType");
  const targetTable = searchParams.get("targetTable");
  const q = searchParams.get("q");
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);
  const skip = (page - 1) * limit;

  const where = {
    ...(actionType ? { actionType } : {}),
    ...(targetTable ? { targetTable } : {}),
    ...(q ? { OR: [
      { actionType: { contains: q, mode: "insensitive" as const } },
      { targetTable: { contains: q, mode: "insensitive" as const } },
      { targetId: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return NextResponse.json({
    rows: rows.map(row => ({ ...row, id: row.id.toString(), adminId: row.adminId?.toString() ?? null })),
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}
