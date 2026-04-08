import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** MLM会員一覧取得 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const search = searchParams.get("search") ?? "";
  const memberType = searchParams.get("memberType");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (memberType) where.memberType = memberType;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { memberCode: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
    ];
  }

  try {
    const [total, members] = await Promise.all([
      prisma.mlmMember.count({ where }),
      prisma.mlmMember.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, avatarUrl: true } },
          _count: { select: { downlines: true, referrals: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      members: members.map((m) => ({
        id: m.id.toString(),
        userId: m.userId.toString(),
        memberCode: m.memberCode,
        memberType: m.memberType,
        status: m.status,
        currentLevel: m.currentLevel,
        titleLevel: m.titleLevel,
        conditionAchieved: m.conditionAchieved,
        forceActive: m.forceActive,
        forceLevel: m.forceLevel,
        contractDate: m.contractDate?.toISOString() ?? null,
        autoshipEnabled: m.autoshipEnabled,
        autoshipStartDate: m.autoshipStartDate?.toISOString() ?? null,
        autoshipStopDate: m.autoshipStopDate?.toISOString() ?? null,
        autoshipSuspendMonths: m.autoshipSuspendMonths,
        paymentMethod: m.paymentMethod,
        savingsPoints: m.savingsPoints,
        userName: m.user.name,
        userEmail: m.user.email,
        avatarUrl: m.user.avatarUrl,
        downlineCount: m._count.downlines,
        referralCount: m._count.referrals,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("mlm-members GET error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/** MLM会員作成 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      userId,
      memberCode,
      memberType = "business",
      uplineId,
      referrerId,
      matrixPosition = 0,
      contractDate,
    } = body;

    if (!userId || !memberCode) {
      return NextResponse.json({ error: "userId と memberCode は必須です" }, { status: 400 });
    }

    // 既存チェック
    const existing = await prisma.mlmMember.findFirst({
      where: { OR: [{ userId: BigInt(userId) }, { memberCode }] },
    });
    if (existing) {
      return NextResponse.json({ error: "既にMLM会員として登録されています" }, { status: 409 });
    }

    const member = await prisma.mlmMember.create({
      data: {
        userId: BigInt(userId),
        memberCode,
        memberType,
        uplineId: uplineId ? BigInt(uplineId) : null,
        referrerId: referrerId ? BigInt(referrerId) : null,
        matrixPosition,
        contractDate: contractDate ? new Date(contractDate) : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, id: member.id.toString() });
  } catch (e) {
    console.error("mlm-members POST error:", e);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

/** MLM会員更新 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.memberType !== undefined) data.memberType = updates.memberType;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.conditionAchieved !== undefined) data.conditionAchieved = updates.conditionAchieved;
    if (updates.forceActive !== undefined) data.forceActive = updates.forceActive;
    if (updates.forceLevel !== undefined) data.forceLevel = updates.forceLevel;
    if (updates.contractDate !== undefined) {
      data.contractDate = updates.contractDate ? new Date(updates.contractDate) : null;
    }
    if (updates.autoshipEnabled !== undefined) data.autoshipEnabled = updates.autoshipEnabled;
    if (updates.autoshipStartDate !== undefined) {
      data.autoshipStartDate = updates.autoshipStartDate ? new Date(updates.autoshipStartDate) : null;
    }
    if (updates.autoshipStopDate !== undefined) {
      data.autoshipStopDate = updates.autoshipStopDate ? new Date(updates.autoshipStopDate) : null;
    }
    if (updates.autoshipSuspendMonths !== undefined) data.autoshipSuspendMonths = updates.autoshipSuspendMonths;
    if (updates.paymentMethod !== undefined) data.paymentMethod = updates.paymentMethod;
    if (updates.titleLevel !== undefined) data.titleLevel = updates.titleLevel;
    if (updates.currentLevel !== undefined) data.currentLevel = updates.currentLevel;
    if (updates.savingsPoints !== undefined) data.savingsPoints = updates.savingsPoints;
    if (updates.note !== undefined) data.note = updates.note;

    await prisma.mlmMember.update({
      where: { id: BigInt(id) },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("mlm-members PATCH error:", e);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
