// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

// GET /api/admin/contacts/unread-count
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const count = await prisma.contactInquiry.count({ where: { isRead: false } });
  return NextResponse.json({ count });
}
