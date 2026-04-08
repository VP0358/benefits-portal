import { prisma } from "@/lib/prisma";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { requireAdmin } from "@/app/api/admin/route-guard";

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const logs = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });

  const header = ["ID", "管理者ID", "アクション", "対象テーブル", "対象ID", "作成日時"];
  const rows = logs.map(log => [
    log.id.toString(), log.adminId?.toString() ?? "", log.actionType, log.targetTable, log.targetId || "", log.createdAt.toISOString(),
  ]);

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit_logs.csv"',
    },
  });
}
