// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type OrgType = "matrix" | "unilevel";

// MLMポイント情報を取得する関数
async function getMlmPoints(userId: bigint) {
  try {
    // 先月の範囲を計算
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // 今月の範囲を計算（昨日まで）
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const currentMonthEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)

    // 先月の購入データ取得
    const lastMonthOrders = await prisma.order.findMany({
      where: {
        userId,
        orderedAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    })

    // 今月の購入データ取得（昨日まで）
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        userId,
        orderedAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      }
    })

    // 先月の購入金額集計
    const lastMonthPurchaseAmount = lastMonthOrders.reduce((sum, order) => {
      return sum + order.totalAmount
    }, 0)

    // 今月の購入金額集計（昨日まで）
    const currentMonthPurchaseAmount = currentMonthOrders.reduce((sum, order) => {
      return sum + order.totalAmount
    }, 0)

    // ポイント計算（1pt = 100円）
    return {
      lastMonthPoints: Math.floor(lastMonthPurchaseAmount / 100),
      currentMonthPoints: Math.floor(currentMonthPurchaseAmount / 100)
    }
  } catch (error) {
    console.error('ポイント取得エラー:', error)
    return {
      lastMonthPoints: 0,
      currentMonthPoints: 0
    }
  }
}

// 組織図データ取得
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get("memberCode");
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const type = (searchParams.get("type") as OrgType) || "matrix";

    // 検索条件の構築
    let targetMember;
    
    if (memberCode) {
      targetMember = await prisma.mlmMember.findUnique({
        where: { memberCode },
        include: {
          user: { select: { name: true } },
        },
      });
    } else if (name) {
      // 氏名で検索（部分一致）
      const users = await prisma.user.findMany({
        where: { name: { contains: name } },
        take: 1,
      });
      if (users.length > 0) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: users[0].id },
          include: {
            user: { select: { name: true } },
          },
        });
      }
    } else if (email) {
      // メールアドレスで検索
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (user) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          include: {
            user: { select: { name: true } },
          },
        });
      }
    } else if (phone) {
      // 電話番号で検索（mobile or phone）
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: { contains: phone } },
          ],
        },
      });
      if (user) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          include: {
            user: { select: { name: true } },
          },
        });
      }
    } else {
      // ★ 検索条件なし → 全体組織図：上位（uplineId=null）の会員を全取得してツリー/リストを返す
      const rootMembers = await prisma.mlmMember.findMany({
        where: { uplineId: null },
        include: { user: { select: { name: true } } },
        orderBy: { memberCode: "asc" },
      });

      if (type === "matrix") {
        // 複数ルートのツリーを並べて返す
        const roots = await Promise.all(rootMembers.map(m => buildMatrixTree(m.id, 0)));
        const list  = await Promise.all(rootMembers.map(m => getMatrixList(m.id)));
        return NextResponse.json({
          root: roots.length === 1 ? roots[0] : { id: "root", memberCode: "（全体）", name: "全体", level: -1, status: "active", directDownlines: roots.filter(Boolean) },
          list: list.flat(),
        }, { status: 200 });
      } else {
        // ユニレベル（referrerId=null の会員を起点）
        const uniRootMembers = await prisma.mlmMember.findMany({
          where: { referrerId: null },
          include: { user: { select: { name: true } } },
          orderBy: { memberCode: "asc" },
        });
        const roots = await Promise.all(uniRootMembers.map(m => buildUnilevelTree(m.id, 0)));
        const list  = await Promise.all(uniRootMembers.map(m => getUnilevelList(m.id)));
        return NextResponse.json({
          root: roots.length === 1 ? roots[0] : { id: "root", memberCode: "（全体）", name: "全体", level: -1, status: "active", directDownlines: roots.filter(Boolean) },
          list: list.flat(),
        }, { status: 200 });
      }
    }

    if (!targetMember) {
      return NextResponse.json(
        { error: "会員が見つかりません" },
        { status: 404 }
      );
    }

    if (type === "matrix") {
      // マトリックス組織図（直下のみ）
      const root = await buildMatrixTree(targetMember.id, 0);
      const list = await getMatrixList(targetMember.id);
      return NextResponse.json({ root, list }, { status: 200 });
    } else {
      // ユニレベル組織図（紹介ライン）
      const root = await buildUnilevelTree(targetMember.id, 0);
      const list = await getUnilevelList(targetMember.id);
      return NextResponse.json({ root, list }, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching organization tree:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// マトリックスツリー構築（再帰）
async function buildMatrixTree(memberId: bigint, currentDepth: number, maxDepth = 5) {
  if (currentDepth > maxDepth) {
    return null;
  }

  const member = await prisma.mlmMember.findUnique({
    where: { id: memberId },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      downlines: {
        select: {
          id: true,
          memberCode: true,
          status: true,
          currentLevel: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          matrixPosition: "asc",
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  const children = await Promise.all(
    member.downlines.map((child) =>
      buildMatrixTree(child.id, currentDepth + 1, maxDepth)
    )
  );

  // ポイント情報を取得
  const points = await getMlmPoints(member.userId);

  return {
    id: member.id.toString(),
    memberCode: member.memberCode,
    name: member.user.name,
    level: member.currentLevel,
    status: member.status,
    directDownlines: children.filter(Boolean),
    lastMonthPoints: points.lastMonthPoints,
    currentMonthPoints: points.currentMonthPoints,
  };
}

// ユニレベルツリー構築（再帰）
async function buildUnilevelTree(memberId: bigint, currentDepth: number, maxDepth = 5) {
  if (currentDepth > maxDepth) {
    return null;
  }

  const member = await prisma.mlmMember.findUnique({
    where: { id: memberId },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      referrals: {
        select: {
          id: true,
          memberCode: true,
          status: true,
          currentLevel: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  const children = await Promise.all(
    member.referrals.map((child) =>
      buildUnilevelTree(child.id, currentDepth + 1, maxDepth)
    )
  );

  // ポイント情報を取得
  const points = await getMlmPoints(member.userId);

  return {
    id: member.id.toString(),
    memberCode: member.memberCode,
    name: member.user.name,
    level: member.currentLevel,
    status: member.status,
    directDownlines: children.filter(Boolean),
    lastMonthPoints: points.lastMonthPoints,
    currentMonthPoints: points.currentMonthPoints,
  };
}

// マトリックスリスト取得（フラット）
async function getMatrixList(memberId: bigint) {
  const visited = new Set<string>();
  const result: any[] = [];

  async function traverse(id: bigint, depth: number) {
    const idStr = id.toString();
    if (visited.has(idStr) || depth > 10) {
      return;
    }
    visited.add(idStr);

    const member = await prisma.mlmMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        downlines: {
          select: {
            id: true,
          },
        },
      },
    });

    if (member) {
      result.push({
        id: member.id.toString(),
        memberCode: member.memberCode,
        name: member.user.name,
        level: depth,
        status: member.status,
      });

      for (const child of member.downlines) {
        await traverse(child.id, depth + 1);
      }
    }
  }

  await traverse(memberId, 0);
  return result;
}

// ユニレベルリスト取得（フラット）
async function getUnilevelList(memberId: bigint) {
  const visited = new Set<string>();
  const result: any[] = [];

  async function traverse(id: bigint, depth: number) {
    const idStr = id.toString();
    if (visited.has(idStr) || depth > 10) {
      return;
    }
    visited.add(idStr);

    const member = await prisma.mlmMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        referrals: {
          select: {
            id: true,
          },
        },
      },
    });

    if (member) {
      result.push({
        id: member.id.toString(),
        memberCode: member.memberCode,
        name: member.user.name,
        level: depth,
        status: member.status,
      });

      for (const child of member.referrals) {
        await traverse(child.id, depth + 1);
      }
    }
  }

  await traverse(memberId, 0);
  return result;
}
