import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(id);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
  if (user.status !== "canceled") {
    return NextResponse.json({ error: "退会済み会員のみ削除できます" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
