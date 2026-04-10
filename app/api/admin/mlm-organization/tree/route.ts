// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

type OrgType = "matrix" | "unilevel";

// ─── 組織図データ取得 ───
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const memberCode  = searchParams.get("memberCode");
    const name        = searchParams.get("name");
    const email       = searchParams.get("email");
    const phone       = searchParams.get("phone");
    const type        = (searchParams.get("type") as OrgType) || "matrix";
    const depthLimit  = Math.min(20, Math.max(1, parseInt(searchParams.get("depthLimit") ?? "5")));

    // ★ 検索条件なし → 全会員フラットリストを返す
    if (!memberCode && !name && !email && !phone) {
      const [allMembers, totalCount] = await Promise.all([
        prisma.mlmMember.findMany({
          select: {
            id: true, memberCode: true, currentLevel: true,
            status: true, uplineId: true, referrerId: true,
            user: { select: { name: true } },
          },
          orderBy: { memberCode: "asc" },
          take: 500,
        }),
        prisma.mlmMember.count(),
      ]);
      const list = allMembers.map(m => ({
        id: m.id.toString(), memberCode: m.memberCode, name: m.user.name,
        level: m.currentLevel, status: m.status,
        uplineId: m.uplineId?.toString() ?? null,
        referrerId: m.referrerId?.toString() ?? null,
        lastMonthPoints: 0, currentMonthPoints: 0, directDownlines: [],
        totalDescendants: 0, hasMore: false,
      }));
      return NextResponse.json({
        root: null, list, totalCount,
        message: "会員コードを入力すると個別ツリーを表示できます",
      }, { status: 200 });
    }

    // ─── 検索条件で対象会員を特定 ───
    let targetMember: { id: bigint; memberCode: string; user: { name: string } } | null = null;

    if (memberCode) {
      const candidates = await prisma.mlmMember.findMany({
        where: { memberCode: { startsWith: memberCode } },
        select: { id: true, memberCode: true, status: true, currentLevel: true, user: { select: { name: true } } },
        orderBy: { memberCode: "asc" },
        take: 30,
      });
      if (candidates.length === 0) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
      if (candidates.length === 1) {
        targetMember = candidates[0];
      } else {
        const exact = candidates.find(c => c.memberCode === memberCode);
        if (exact) {
          targetMember = exact;
        } else {
          return NextResponse.json({
            candidates: candidates.map(c => ({
              id: c.id.toString(), memberCode: c.memberCode,
              name: c.user.name, status: c.status, level: c.currentLevel,
            })),
          }, { status: 200 });
        }
      }
    } else if (name) {
      const members = await prisma.mlmMember.findMany({
        where: { user: { name: { contains: name } } },
        select: { id: true, memberCode: true, status: true, currentLevel: true, user: { select: { name: true } } },
        orderBy: { memberCode: "asc" },
        take: 50,
      });
      if (members.length === 0) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
      if (members.length === 1) {
        targetMember = members[0];
      } else {
        return NextResponse.json({
          candidates: members.map(c => ({
            id: c.id.toString(), memberCode: c.memberCode,
            name: c.user.name, status: c.status, level: c.currentLevel,
          })),
        }, { status: 200 });
      }
    } else if (email) {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (user) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          select: { id: true, memberCode: true, status: true, currentLevel: true, user: { select: { name: true } } },
        });
      }
    } else if (phone) {
      const user = await prisma.user.findFirst({
        where: { OR: [{ phone: { contains: phone } }, { mobile: { contains: phone } }] },
        select: { id: true },
      });
      if (user) {
        targetMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          select: { id: true, memberCode: true, status: true, currentLevel: true, user: { select: { name: true } } },
        });
      }
    }

    if (!targetMember) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    // ─── 全ダウンラインを一括取得してメモリでツリー構築 ───
    const parentField = type === "matrix" ? "uplineId" : "referrerId";
    const allDescendants = await fetchAllDescendants(targetMember.id, parentField);

    // memberCode → name の逆引きマップ（紹介者名・直上者名解決用）
    const idToName = new Map<string, string>();
    const idToCode = new Map<string, string>();
    for (const m of allDescendants) {
      idToName.set(m.id, m.name);
      idToCode.set(m.id, m.memberCode);
    }

    // 全会員の uplineId/referrerId から名前を引くために別途取得
    // （ルートの直上者・紹介者も取得）
    const rootMemberFull = await prisma.mlmMember.findUnique({
      where: { id: targetMember.id },
      select: {
        upline: { select: { id: true, memberCode: true, user: { select: { name: true } } } },
        referrer: { select: { id: true, memberCode: true, user: { select: { name: true } } } },
      },
    });
    const rootUplineName = rootMemberFull?.upline?.user?.name ?? null;
    const rootUplineCode = rootMemberFull?.upline?.memberCode ?? null;
    const rootReferrerName = rootMemberFull?.referrer?.user?.name ?? null;
    const rootReferrerCode = rootMemberFull?.referrer?.memberCode ?? null;

    const rootNode = buildTreeWithDepthLimit(
      targetMember.id, allDescendants, depthLimit, type,
      idToName, idToCode,
      rootUplineName, rootUplineCode, rootReferrerName, rootReferrerCode
    );
    const list = flattenTree(rootNode);

    return NextResponse.json({
      root: rootNode,
      list,
      totalDescendants: allDescendants.length - 1,
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching organization tree:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── 全ダウンラインを一括取得（matrix/unilevel共通） ───
async function fetchAllDescendants(rootId: bigint, parentField: "uplineId" | "referrerId") {
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      currentLevel: true,
      status: true,
      uplineId: true,
      referrerId: true,
      matrixPosition: true,
      contractDate: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          mlmRegistration: { select: { nickname: true } },
        },
      },
    },
    orderBy: parentField === "uplineId"
      ? { matrixPosition: "asc" }
      : { createdAt: "asc" },
  });

  // BFSで rootId 配下のメンバーだけ抽出
  const idSet = new Set<string>([rootId.toString()]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of allMembers) {
      const pid = parentField === "uplineId" ? m.uplineId : m.referrerId;
      if (pid && idSet.has(pid.toString()) && !idSet.has(m.id.toString())) {
        idSet.add(m.id.toString());
        changed = true;
      }
    }
  }

  return allMembers
    .filter(m => idSet.has(m.id.toString()))
    .map(m => {
      const pid = parentField === "uplineId" ? m.uplineId : m.referrerId;
      return {
        id: m.id.toString(),
        memberCode: m.memberCode,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone ?? null,
        nickname: m.user.mlmRegistration?.nickname ?? null,
        level: m.currentLevel,
        status: m.status,
        parentId: pid?.toString() ?? null,
        uplineId: m.uplineId?.toString() ?? null,
        referrerId: m.referrerId?.toString() ?? null,
        position: m.matrixPosition,
        contractDate: m.contractDate?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      };
    });
}

// ─── 型定義 ───
type FlatMember = {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  level: number;
  status: string;
  parentId: string | null;
  uplineId: string | null;
  referrerId: string | null;
  position: number;
  contractDate: string | null;
  createdAt: string;
};

type TreeNode = FlatMember & {
  depth: number;
  directDownlines: TreeNode[];
  totalDescendants: number;
  hasMore: boolean;
  uplineName: string | null;
  uplineCode: string | null;
  referrerName: string | null;
  referrerCode: string | null;
};

// ─── フラットリストから depthLimit 段のツリーを構築 ───
function buildTreeWithDepthLimit(
  rootId: bigint,
  members: FlatMember[],
  depthLimit: number,
  _type: OrgType,
  idToName: Map<string, string>,
  idToCode: Map<string, string>,
  rootUplineName: string | null,
  rootUplineCode: string | null,
  rootReferrerName: string | null,
  rootReferrerCode: string | null,
): TreeNode {
  const map = new Map<string, TreeNode & { _allChildren: string[] }>();
  const rootIdStr = rootId.toString();

  // 全ノードを登録
  for (const m of members) {
    const upName = m.id === rootIdStr ? rootUplineName : (m.uplineId ? (idToName.get(m.uplineId) ?? null) : null);
    const upCode = m.id === rootIdStr ? rootUplineCode : (m.uplineId ? (idToCode.get(m.uplineId) ?? null) : null);
    const refName = m.id === rootIdStr ? rootReferrerName : (m.referrerId ? (idToName.get(m.referrerId) ?? null) : null);
    const refCode = m.id === rootIdStr ? rootReferrerCode : (m.referrerId ? (idToCode.get(m.referrerId) ?? null) : null);

    map.set(m.id, {
      ...m,
      depth: 0,
      directDownlines: [],
      totalDescendants: 0,
      hasMore: false,
      uplineName: upName,
      uplineCode: upCode,
      referrerName: refName,
      referrerCode: refCode,
      _allChildren: [],
    });
  }

  // 親子関係を構築
  for (const [id, node] of map) {
    if (id === rootIdStr) continue;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!._allChildren.push(id);
    }
  }

  // BFSで深さを設定
  const queue: { id: string; depth: number }[] = [{ id: rootIdStr, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const node = map.get(id);
    if (!node) continue;
    node.depth = depth;
    for (const childId of node._allChildren) {
      queue.push({ id: childId, depth: depth + 1 });
    }
  }

  // depthLimit以内のみ directDownlines に追加
  for (const [, node] of map) {
    node._allChildren.sort((a, b) => {
      const na = map.get(a)!; const nb = map.get(b)!;
      return na.position - nb.position || na.memberCode.localeCompare(nb.memberCode);
    });
    if (node.depth < depthLimit) {
      for (const childId of node._allChildren) {
        const child = map.get(childId);
        if (child) node.directDownlines.push(child);
      }
    } else {
      node.hasMore = node._allChildren.length > 0;
    }
  }

  // totalDescendants を集計
  const calcDescendants = (id: string): number => {
    const node = map.get(id);
    if (!node) return 0;
    let total = node._allChildren.length;
    for (const childId of node._allChildren) {
      total += calcDescendants(childId);
    }
    node.totalDescendants = total;
    return total;
  };
  calcDescendants(rootIdStr);

  const root = map.get(rootIdStr);
  return root ?? {
    id: rootIdStr, memberCode: "", name: "不明", email: "", phone: null, nickname: null,
    level: 0, status: "unknown", parentId: null, uplineId: null, referrerId: null,
    position: 0, contractDate: null, createdAt: "",
    depth: 0, directDownlines: [], totalDescendants: 0, hasMore: false,
    uplineName: null, uplineCode: null, referrerName: null, referrerCode: null,
    _allChildren: [],
  };
}

// ─── ツリーをフラットなリストに変換 ───
function flattenTree(node: TreeNode, depthOffset = 0): FlatMember[] {
  const result: FlatMember[] = [{ ...node, level: depthOffset }];
  for (const child of node.directDownlines) {
    result.push(...flattenTree(child, depthOffset + 1));
  }
  return result;
}
