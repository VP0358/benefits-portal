// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

type OrgType = "matrix" | "unilevel";

/** アクティブマーカー種別 */
type ActiveMarker = "active" | "warning" | "danger" | "none";

// ─── アクティブ判定用ヘルパー ───
function isProduct1000(code: string): boolean {
  return code === "1000" || code === "s1000";
}
function isProduct2000(code: string): boolean {
  return code === "2000";
}

/**
 * 対象月（YYYY-MM）の会員IDリストに対してアクティブマーカーを計算する
 */
async function calcActiveMarkers(
  memberIds: bigint[],
  userIds: bigint[],
  memberMap: Map<string, { contractDate: Date | null; forceActive: boolean; status: string; userId: bigint }>,
  targetMonth: string
): Promise<Map<string, ActiveMarker>> {
  const result = new Map<string, ActiveMarker>();

  if (memberIds.length === 0) return result;

  const [targetYear, targetMonthNum] = targetMonth.split("-").map(Number);

  // 対象月の範囲
  const monthStart = new Date(targetYear, targetMonthNum - 1, 1, 0, 0, 0, 0);
  const monthEnd   = new Date(targetYear, targetMonthNum, 0, 23, 59, 59, 999);

  // 直近6ヶ月前
  const sixMonthsAgo = new Date(monthStart);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // userId → memberId マップ
  const userIdToMemberId = new Map<string, string>();
  for (const [mid, m] of memberMap) {
    userIdToMemberId.set(m.userId.toString(), mid);
  }

  // 直近6ヶ月の入金済み伝票（対象商品含む）を一括取得
  const historicOrders = await prisma.order.findMany({
    where: {
      userId: { in: userIds },
      paymentStatus: "paid",
      OR: [
        { paidAt: { gte: sixMonthsAgo, lte: monthEnd } },
        { paidAt: null, orderedAt: { gte: sixMonthsAgo, lte: monthEnd } },
      ],
    },
    select: {
      userId: true,
      paidAt: true,
      orderedAt: true,
      items: {
        select: {
          mlmProduct: { select: { productCode: true } },
        },
      },
    },
  });

  // 会員ごとに当月 1000/2000 購入フラグ & 過去月別入金セット
  const memberHas1000 = new Set<string>();
  const memberHas2000 = new Set<string>();
  const memberPaidMonths = new Map<string, Set<string>>();

  for (const order of historicOrders) {
    const memberId = userIdToMemberId.get(order.userId.toString());
    if (!memberId) continue;

    const effectiveDate = order.paidAt ?? order.orderedAt;
    const ym = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, "0")}`;
    const isCurrentMonth = ym === targetMonth;

    let hasTarget = false;
    for (const item of order.items) {
      const code = item.mlmProduct?.productCode ?? "";
      if (isProduct1000(code) || isProduct2000(code)) {
        hasTarget = true;
        if (isCurrentMonth) {
          if (isProduct1000(code)) memberHas1000.add(memberId);
          if (isProduct2000(code)) memberHas2000.add(memberId);
        }
      }
    }
    if (hasTarget) {
      if (!memberPaidMonths.has(memberId)) memberPaidMonths.set(memberId, new Set());
      memberPaidMonths.get(memberId)!.add(ym);
    }
  }

  // 各会員のマーカーを判定
  for (const [mid, member] of memberMap) {
    if (member.forceActive) {
      result.set(mid, "active");
      continue;
    }
    if (["withdrawn", "lapsed", "suspended", "midCancel"].includes(member.status)) {
      result.set(mid, "none");
      continue;
    }

    // 当月アクティブ: 1000/s1000 AND 2000 両方入金済み
    if (memberHas1000.has(mid) && memberHas2000.has(mid)) {
      result.set(mid, "active");
      continue;
    }

    // 5/6ヶ月目判定
    if (!member.contractDate) {
      result.set(mid, "none");
      continue;
    }
    const cd = member.contractDate;
    const contractYear  = cd.getFullYear();
    const contractMonth = cd.getMonth() + 1;
    const monthsElapsed = (targetYear - contractYear) * 12 + (targetMonthNum - contractMonth);

    if (monthsElapsed < 4) {
      result.set(mid, "none");
      continue;
    }

    // 最後に入金があった月を検索
    const paidMonths = memberPaidMonths.get(mid) ?? new Set<string>();
    let lastPaidYear  = contractYear;
    let lastPaidMonth = contractMonth - 1;
    for (let offset = 0; offset <= monthsElapsed; offset++) {
      const checkYear  = contractYear + Math.floor((contractMonth - 1 + offset) / 12);
      const checkMonth = ((contractMonth - 1 + offset) % 12) + 1;
      const ym = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
      if (paidMonths.has(ym)) {
        lastPaidYear  = checkYear;
        lastPaidMonth = checkMonth;
      }
    }
    const monthsSinceLastPaid = (targetYear - lastPaidYear) * 12 + (targetMonthNum - lastPaidMonth);

    if (monthsSinceLastPaid >= 6)      result.set(mid, "danger");
    else if (monthsSinceLastPaid >= 5) result.set(mid, "warning");
    else                               result.set(mid, "none");
  }

  return result;
}

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

    // ★ 検索条件なし → 全会員フラットリストを返す（アクティブマーカー付き）
    if (!memberCode && !name && !email && !phone) {
      const allMembersResult = await prisma.mlmMember.findMany({
        select: {
          id: true, memberCode: true, currentLevel: true,
          status: true, uplineId: true, referrerId: true,
          contractDate: true, forceActive: true, userId: true,
          user: { select: { name: true } },
        },
        orderBy: { memberCode: "asc" },
        take: 500,
      });
      const totalCount = await prisma.mlmMember.count();
      const allMembers = allMembersResult;

      // アクティブマーカーを計算
      const nowJST2 = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const currentMonth = `${nowJST2.getUTCFullYear()}-${String(nowJST2.getUTCMonth() + 1).padStart(2, "0")}`;
      const listMemberInfoMap = new Map<string, { contractDate: Date | null; forceActive: boolean; status: string; userId: bigint }>();
      const listUserIds: bigint[] = [];
      for (const m of allMembers) {
        listMemberInfoMap.set(m.id.toString(), { contractDate: m.contractDate, forceActive: m.forceActive, status: m.status, userId: m.userId });
        listUserIds.push(m.userId);
      }
      const listMemberIds: bigint[] = allMembers.map((m) => m.id as bigint);
      const listActiveMarkers = await calcActiveMarkers(
        listMemberIds,
        listUserIds,
        listMemberInfoMap,
        currentMonth
      );

      const list = allMembers.map((m) => ({
        id: (m.id as bigint).toString(), memberCode: m.memberCode, name: m.user.name,
        level: m.currentLevel, status: m.status,
        uplineId: m.uplineId?.toString() ?? null,
        referrerId: m.referrerId?.toString() ?? null,
        lastMonthPoints: 0, currentMonthPoints: 0, directDownlines: [],
        totalDescendants: 0, hasMore: false,
        activeMarker: listActiveMarkers.get((m.id as bigint).toString()) ?? "none",
      }));
      return NextResponse.json({
        root: null, list, totalCount,
        message: "会員コードを入力すると個別ツリーを表示できます",
        targetMonth: currentMonth,
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
        upline: { select: { id: true, memberCode: true, companyName: true, user: { select: { name: true } } } },
        referrer: { select: { id: true, memberCode: true, companyName: true, user: { select: { name: true } } } },
      },
    });
    const rootUplineName = rootMemberFull?.upline
      ? (rootMemberFull.upline.companyName?.trim() || rootMemberFull.upline.user?.name || null)
      : null;
    const rootUplineCode = rootMemberFull?.upline?.memberCode ?? null;
    const rootReferrerName = rootMemberFull?.referrer
      ? (rootMemberFull.referrer.companyName?.trim() || rootMemberFull.referrer.user?.name || null)
      : null;
    const rootReferrerCode = rootMemberFull?.referrer?.memberCode ?? null;

    // ─── 対象月（当月）を特定 ───
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const targetMonth = `${nowJST.getUTCFullYear()}-${String(nowJST.getUTCMonth() + 1).padStart(2, "0")}`;

    // ─── 傘下全員の購入ポイント合計を取得（グループポイント）───
    // 翠彩（スミサイ）: 1個 = 150pt で流通ポイントを計算
    const descendantIds = allDescendants.map(m => BigInt(m.id));
    const purchaseSums = await prisma.mlmPurchase.groupBy({
      by: ["mlmMemberId"],
      where: { mlmMemberId: { in: descendantIds } },
      _sum: { totalPoints: true },
    });
    // mlmMemberId → 累積ポイント
    const memberPointMap = new Map<string, number>();
    for (const ps of purchaseSums) {
      memberPointMap.set(ps.mlmMemberId.toString(), ps._sum.totalPoints ?? 0);
    }

    // ─── アクティブマーカーを計算 ───
    const memberInfoMap = new Map<string, { contractDate: Date | null; forceActive: boolean; status: string; userId: bigint }>();
    const allUserIds: bigint[] = [];
    // allDescendants には contractDate が含まれていないので MlmMember から直接取得
    const descendantMemberData = await prisma.mlmMember.findMany({
      where: { id: { in: descendantIds } },
      select: { id: true, contractDate: true, forceActive: true, status: true, userId: true },
    });
    for (const m of descendantMemberData) {
      memberInfoMap.set(m.id.toString(), {
        contractDate: m.contractDate,
        forceActive: m.forceActive,
        status: m.status,
        userId: m.userId,
      });
      allUserIds.push(m.userId);
    }
    const activeMarkers = await calcActiveMarkers(descendantIds, allUserIds, memberInfoMap, targetMonth);

    const rootNode = buildTreeWithDepthLimit(
      targetMember.id, allDescendants, depthLimit, type,
      idToName, idToCode,
      rootUplineName, rootUplineCode, rootReferrerName, rootReferrerCode,
      memberPointMap,
      activeMarkers
    );
    const list = flattenTree(rootNode);

    return NextResponse.json({
      root: rootNode,
      list,
      totalDescendants: allDescendants.length - 1,
      targetMonth,
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
      companyName: true,
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
      // 表示名: 法人名 > ユーザー名 > 「未設定」
      const displayName = m.companyName?.trim() || m.user.name?.trim() || "未設定";
      return {
        id: m.id.toString(),
        memberCode: m.memberCode,
        name: displayName,
        companyName: m.companyName ?? null,
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
        activeMarker: "none" as ActiveMarker,  // 後でマーカーマップで上書き
      };
    });
}

// ─── 型定義 ───
type FlatMember = {
  id: string;
  memberCode: string;
  name: string;           // 表示名（法人名 or ユーザー名）
  companyName: string | null;  // 法人名元データ
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
  activeMarker: ActiveMarker;  // アクティブ判定マーカー
};

type TreeNode = FlatMember & {
  depth: number;
  directDownlines: TreeNode[];
  totalDescendants: number;
  groupPoints: number;      // 自身 + 傘下全員の累積購入ポイント合計
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
  memberPointMap: Map<string, number> = new Map(),
  activeMarkers: Map<string, ActiveMarker> = new Map(),
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
      groupPoints: memberPointMap.get(m.id) ?? 0, // 初期値は自身の購入ポイント
      hasMore: false,
      uplineName: upName,
      uplineCode: upCode,
      referrerName: refName,
      referrerCode: refCode,
      activeMarker: activeMarkers.get(m.id) ?? "none",
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

  // totalDescendants と groupPoints を集計
  const calcDescendantsAndPoints = (id: string): { count: number; points: number } => {
    const node = map.get(id);
    if (!node) return { count: 0, points: 0 };
    let totalCount  = node._allChildren.length;
    let totalPoints = memberPointMap.get(id) ?? 0; // 自身の購入ポイント
    for (const childId of node._allChildren) {
      const child = calcDescendantsAndPoints(childId);
      totalCount  += child.count;
      totalPoints += child.points;
    }
    node.totalDescendants = totalCount;
    node.groupPoints      = totalPoints;
    return { count: totalCount, points: totalPoints };
  };
  calcDescendantsAndPoints(rootIdStr);

  const root = map.get(rootIdStr);
  return root ?? {
    id: rootIdStr, memberCode: "", name: "不明", email: "", phone: null, nickname: null,
    companyName: null,
    level: 0, status: "unknown", parentId: null, uplineId: null, referrerId: null,
    position: 0, contractDate: null, createdAt: "",
    depth: 0, directDownlines: [], totalDescendants: 0, groupPoints: 0, hasMore: false,
    uplineName: null, uplineCode: null, referrerName: null, referrerCode: null,
    activeMarker: "none" as ActiveMarker,
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
