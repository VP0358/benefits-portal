// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type OrgType = "matrix" | "unilevel";

// 組織図データ取得
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get("memberCode");
    const type = (searchParams.get("type") as OrgType) || "matrix";

    if (!memberCode) {
      return NextResponse.json(
        { error: "会員コードが必要です" },
        { status: 400 }
      );
    }

    // 対象会員を検索
    const targetMember = await prisma.mlmMember.findUnique({
      where: { memberCode },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

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

  return {
    id: member.id.toString(),
    memberCode: member.memberCode,
    name: member.user.name,
    level: member.currentLevel,
    status: member.status,
    directDownlines: children.filter(Boolean),
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

  return {
    id: member.id.toString(),
    memberCode: member.memberCode,
    name: member.user.name,
    level: member.currentLevel,
    status: member.status,
    directDownlines: children.filter(Boolean),
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
