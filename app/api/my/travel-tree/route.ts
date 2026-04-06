import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/travel-tree?rootId=xxx
 * 旅行サブスク紹介ツリーを返す
 * - rootId未指定 → ログイン会員を起点
 * - rootId指定   → 指定会員を起点
 * 段数無制限でユニレベル展開
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const myId = BigInt(session.user.id);
  const rootIdParam = req.nextUrl.searchParams.get("rootId");
  const rootId = rootIdParam ? BigInt(rootIdParam) : myId;

  // 起点ユーザー情報
  const rootUser = await prisma.user.findUnique({
    where: { id: rootId },
    select: { id: true, name: true, memberCode: true },
  });
  if (!rootUser) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // 全紹介関係を一括取得
  const allReferrals = await prisma.userReferral.findMany({
    where: { isActive: true },
    select: { userId: true, referrerUserId: true },
  });

  // referrerUserId → userId[] のマップ
  const childrenMap = new Map<string, string[]>();
  for (const r of allReferrals) {
    const pid = r.referrerUserId.toString();
    const cid = r.userId.toString();
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(cid);
  }

  // 起点から辿れる全ユーザーIDをBFSで収集
  const allIds = new Set<string>();
  const queue = [rootId.toString()];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    allIds.add(cur);
    const children = childrenMap.get(cur) ?? [];
    for (const c of children) {
      if (!allIds.has(c)) queue.push(c);
    }
  }

  // 旅行サブスク情報を一括取得
  const userIdsBigInt = [...allIds].map(id => BigInt(id));
  const travelSubs = await prisma.travelSubscription.findMany({
    where: { userId: { in: userIdsBigInt } },
    select: {
      id: true,
      userId: true,
      planName: true,
      level: true,
      pricingTier: true,
      monthlyFee: true,
      status: true,
      forceStatus: true,
      startedAt: true,
      confirmedAt: true,
      createdAt: true,
      note: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // userId → 最新の旅行サブスク のマップ
  const travelMap = new Map<string, typeof travelSubs[0]>();
  for (const sub of travelSubs) {
    const uid = sub.userId.toString();
    if (!travelMap.has(uid)) travelMap.set(uid, sub);
  }

  // ユーザー情報を一括取得
  const users = await prisma.user.findMany({
    where: { id: { in: userIdsBigInt } },
    select: { id: true, name: true, memberCode: true },
  });
  const userMap = new Map(users.map(u => [u.id.toString(), u]));

  // ツリーノード型
  type TreeNode = {
    id: string;
    name: string;
    memberCode: string;
    depth: number;
    travel: {
      id: string;
      planName: string;
      level: number;
      pricingTier: string;
      monthlyFee: number;
      status: string;
      forceStatus: string;
      startedAt: string | null;
      confirmedAt: string | null;
      createdAt: string;
    } | null;
    children: TreeNode[];
    childCount: number;
  };

  function buildTree(userId: string, depth: number): TreeNode {
    const user = userMap.get(userId);
    const sub = travelMap.get(userId) ?? null;
    const children = (childrenMap.get(userId) ?? [])
      .filter(cid => allIds.has(cid))
      .map(cid => buildTree(cid, depth + 1));

    return {
      id: userId,
      name: user?.name ?? "不明",
      memberCode: user?.memberCode ?? "",
      depth,
      travel: sub ? {
        id: sub.id.toString(),
        planName: sub.planName,
        level: sub.level,
        pricingTier: sub.pricingTier,
        monthlyFee: Number(sub.monthlyFee),
        status: sub.status,
        forceStatus: sub.forceStatus,
        startedAt: sub.startedAt?.toISOString() ?? null,
        confirmedAt: sub.confirmedAt?.toISOString() ?? null,
        createdAt: sub.createdAt.toISOString(),
      } : null,
      children,
      childCount: children.length,
    };
  }

  const tree = buildTree(rootId.toString(), 0);

  // 統計
  const totalMembers = allIds.size - 1;
  const active    = [...travelMap.values()].filter(v => v.status === "active").length;
  const pending   = [...travelMap.values()].filter(v => v.status === "pending").length;

  return NextResponse.json({
    root: {
      id: rootUser.id.toString(),
      name: rootUser.name,
      memberCode: rootUser.memberCode,
      isMe: rootId === myId,
    },
    tree,
    stats: { totalMembers, active, pending },
  });
}
