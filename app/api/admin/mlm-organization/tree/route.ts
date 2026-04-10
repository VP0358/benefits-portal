// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

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
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const type = (searchParams.get("type") as OrgType) || "matrix";

    // ★ 検索条件なし → 全会員フラットリストを返す（タイムアウト防止）
    if (!memberCode && !name && !email && !phone) {
      const [allMembers, totalCount] = await Promise.all([
        prisma.mlmMember.findMany({
          select: {
            id: true,
            memberCode: true,
            currentLevel: true,
            status: true,
            uplineId: true,
            referrerId: true,
            user: { select: { name: true } },
          },
          orderBy: { memberCode: "asc" },
          take: 500,
        }),
        prisma.mlmMember.count(),
      ]);

      const list = allMembers.map(m => ({
        id: m.id.toString(),
        memberCode: m.memberCode,
        name: m.user.name,
        level: m.currentLevel,
        status: m.status,
        uplineId: m.uplineId?.toString() ?? null,
        referrerId: m.referrerId?.toString() ?? null,
        lastMonthPoints: 0,
        currentMonthPoints: 0,
        directDownlines: [],
      }));

      return NextResponse.json({
        root: null,
        list,
        totalCount,
        message: "会員コードを入力すると個別ツリーを表示できます",
      }, { status: 200 });
    }

    // 検索条件で対象会員を特定
    let targetMember: { id: bigint; memberCode: string; user: { name: string } } | null = null;

    if (memberCode) {
      targetMember = await prisma.mlmMember.findUnique({
        where: { memberCode },
        select: { id: true, memberCode: true, user: { select: { name: true } } },
      });
    } else if (name) {
      const users = await prisma.user.findMany({
        where: { name: { contains: name } },
        select: { id: true },
        take: 1,
      });
      if (users.length > 0) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: users[0].id },
          select: { id: true, memberCode: true, user: { select: { name: true } } },
        });
      }
    } else if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (user) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          select: { id: true, memberCode: true, user: { select: { name: true } } },
        });
      }
    } else if (phone) {
      const user = await prisma.user.findFirst({
        where: { OR: [{ phone: { contains: phone } }] },
        select: { id: true },
      });
      if (user) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          select: { id: true, memberCode: true, user: { select: { name: true } } },
        });
      }
    }

    if (!targetMember) {
      return NextResponse.json(
        { error: "会員が見つかりません" },
        { status: 404 }
      );
    }

    // ★ 一括取得でツリー構築（N+1クエリを廃止）
    if (type === "matrix") {
      // マトリックス: uplineId を辿る
      // 対象会員のダウンラインをすべて一括取得（再帰CTEの代わりに全取得してメモリ上でツリー構築）
      const allDescendants = await fetchAllMatrixDescendants(targetMember.id);
      const rootNode = buildTreeFromFlatList(targetMember.id, allDescendants, "matrix");
      const list = flattenTree(rootNode);
      return NextResponse.json({ root: rootNode, list }, { status: 200 });
    } else {
      // ユニレベル: referrerId を辿る
      const allDescendants = await fetchAllUnilevelDescendants(targetMember.id);
      const rootNode = buildTreeFromFlatList(targetMember.id, allDescendants, "unilevel");
      const list = flattenTree(rootNode);
      return NextResponse.json({ root: rootNode, list }, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching organization tree:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── マトリックスの全ダウンラインを一括取得 ───
async function fetchAllMatrixDescendants(rootId: bigint) {
  // rootId以下のメンバーを全部取得してメモリ上でツリー構築
  // まずrootを含む全メンバーを取得
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      currentLevel: true,
      status: true,
      uplineId: true,
      matrixPosition: true,
      user: { select: { name: true } },
    },
    orderBy: { matrixPosition: "asc" },
  });

  // rootId配下に存在するメンバーだけをフィルタ（BFS）
  const idSet = new Set<string>();
  idSet.add(rootId.toString());

  let changed = true;
  while (changed) {
    changed = false;
    for (const m of allMembers) {
      if (m.uplineId && idSet.has(m.uplineId.toString()) && !idSet.has(m.id.toString())) {
        idSet.add(m.id.toString());
        changed = true;
      }
    }
  }

  return allMembers.filter(m => idSet.has(m.id.toString())).map(m => ({
    id: m.id.toString(),
    memberCode: m.memberCode,
    name: m.user.name,
    level: m.currentLevel,
    status: m.status,
    parentId: m.uplineId?.toString() ?? null,
    position: m.matrixPosition,
    lastMonthPoints: 0,
    currentMonthPoints: 0,
  }));
}

// ─── ユニレベルの全ダウンラインを一括取得 ───
async function fetchAllUnilevelDescendants(rootId: bigint) {
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      currentLevel: true,
      status: true,
      referrerId: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const idSet = new Set<string>();
  idSet.add(rootId.toString());

  let changed = true;
  while (changed) {
    changed = false;
    for (const m of allMembers) {
      if (m.referrerId && idSet.has(m.referrerId.toString()) && !idSet.has(m.id.toString())) {
        idSet.add(m.id.toString());
        changed = true;
      }
    }
  }

  return allMembers.filter(m => idSet.has(m.id.toString())).map(m => ({
    id: m.id.toString(),
    memberCode: m.memberCode,
    name: m.user.name,
    level: m.currentLevel,
    status: m.status,
    parentId: m.referrerId?.toString() ?? null,
    position: 0,
    lastMonthPoints: 0,
    currentMonthPoints: 0,
  }));
}

// ─── フラットリストからツリーノードを構築 ───
type FlatMember = {
  id: string;
  memberCode: string;
  name: string;
  level: number;
  status: string;
  parentId: string | null;
  position: number;
  lastMonthPoints: number;
  currentMonthPoints: number;
};

type TreeNode = FlatMember & { directDownlines: TreeNode[] };

function buildTreeFromFlatList(rootId: bigint, members: FlatMember[], _type: OrgType): TreeNode {
  const map = new Map<string, TreeNode>();
  const rootIdStr = rootId.toString();

  for (const m of members) {
    map.set(m.id, { ...m, directDownlines: [] });
  }

  let root: TreeNode | undefined;
  for (const [id, node] of map) {
    if (id === rootIdStr) {
      root = node;
      continue;
    }
    if (node.parentId && map.has(node.parentId)) {
      const parent = map.get(node.parentId)!;
      parent.directDownlines.push(node);
    }
  }

  // 子ノードをpositionでソート
  for (const node of map.values()) {
    node.directDownlines.sort((a, b) => a.position - b.position);
  }

  return root ?? { id: rootIdStr, memberCode: "", name: "不明", level: 0, status: "unknown", parentId: null, position: 0, lastMonthPoints: 0, currentMonthPoints: 0, directDownlines: [] };
}

// ─── ツリーをフラットなリストに変換 ───
function flattenTree(node: TreeNode, depth = 0): FlatMember[] {
  const result: FlatMember[] = [{ ...node, level: depth }];
  for (const child of node.directDownlines) {
    result.push(...flattenTree(child, depth + 1));
  }
  return result;
}
