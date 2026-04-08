import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body    = await req.json();

    const { name, phone, email, menuTitle, content } = body;

    if (!name || !email || !content) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name,
        phone:     phone ?? "",
        email,
        menuTitle: menuTitle ?? null,
        content,
        userId:    session?.user?.id ? BigInt(session.user.id) : null,
      },
    });

    return NextResponse.json({ ok: true, id: inquiry.id.toString() }, { status: 201 });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
