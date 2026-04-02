import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const contactSchema = z.object({
  name:      z.string().min(1).max(100),
  phone:     z.string().min(1).max(30),
  email:     z.string().email().max(255),
  content:   z.string().min(1).max(2000),
  menuTitle: z.string().max(255).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, phone, email, content, menuTitle } = parsed.data;

  // 送信者のユーザーIDを取得（会員の場合）
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  await prisma.contactInquiry.create({
    data: {
      name,
      phone,
      email,
      content,
      menuTitle: menuTitle ?? null,
      isRead:  false,
      userId:  user?.id ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
