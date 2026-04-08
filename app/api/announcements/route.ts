// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/announcements?published=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("published") === "true";

  const announcements = await prisma.announcement.findMany({
    where: publishedOnly ? { isPublished: true } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(announcements);
}

// POST /api/announcements （管理者のみ）
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, content, tag, isPublished } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      tag: tag ?? "notice",
      isPublished: isPublished ?? false,
      publishedAt: isPublished ? new Date() : null,
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}
