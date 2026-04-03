import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// PUT /api/announcements/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, content, tag, isPublished } = body;

  const announcement = await prisma.announcement.update({
    where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.announcement.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
