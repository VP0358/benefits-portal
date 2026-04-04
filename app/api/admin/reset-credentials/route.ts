/**
 * 緊急用：管理者・テスト会員のパスワードを初期値にリセットするAPI
 * POST /api/admin/reset-credentials
 * Body: { secret: "VIOLA_RESET_2024" }
 *
 * 使用後は必ずこのファイルを削除してください。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const RESET_SECRET = "VIOLA_RESET_2024";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.secret !== RESET_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const adminHash  = await hash("AdminPass123!", 10);
    const memberHash = await hash("MemberPass123!", 10);

    // 管理者リセット（メールも初期化）
    const admin = await prisma.admin.upsert({
      where:  { email: "admin@example.com" },
      update: { passwordHash: adminHash, name: "管理者" },
      create: {
        email:        "admin@example.com",
        name:         "管理者",
        passwordHash: adminHash,
        role:         "super_admin",
      },
    });

    // テスト会員リセット
    const member = await prisma.user.upsert({
      where:  { email: "member@example.com" },
      update: { passwordHash: memberHash, status: "active" },
      create: {
        memberCode:   "M0001",
        name:         "VIOLAさん",
        email:        "member@example.com",
        passwordHash: memberHash,
        status:       "active",
      },
    });

    return NextResponse.json({
      success: true,
      message: "パスワードをリセットしました",
      admin:  { email: admin.email,  password: "AdminPass123!" },
      member: { email: member.email, password: "MemberPass123!" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Reset failed", detail: String(e) }, { status: 500 });
  }
}
