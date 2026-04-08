// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/announcements/:id  （会員向け：公開済みのみ）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement || !announcement.isPublished) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    tag: announcement.tag,
    publishedAt: announcement.publishedAt ? announcement.publishedAt.toISOString() : null,
  });
}

// PUT /api/announcements/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, content, tag, isPublished } = body;

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      title,
      content,
      tag,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  });

  return NextResponse.json(announcement);
}

// DELETE /api/announcements/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
