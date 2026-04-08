import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/mlm-members/search?code=M001
 * 会員コードでMLMメンバーを検索
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  try {
    const member = await prisma.mlmMember.findUnique({
      where: { memberCode: code },
      include: {
        user: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      member: {
        id: member.id.toString(),
        memberCode: member.memberCode,
        userName: member.user.name,
        userEmail: member.user.email,
        companyName: member.companyName,
      },
    });
  } catch (error) {
    console.error("Error searching member:", error);
    return NextResponse.json(
      { error: "Failed to search member" },
      { status: 500 }
    );
  }
}
