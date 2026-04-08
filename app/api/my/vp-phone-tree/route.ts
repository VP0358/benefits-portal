import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/my/vp-phone-tree?rootId=xxx
 * VP未来phone紹介ツリーを返す
 * - rootId未指定 → ログイン会員を起点
 * - rootId指定   → 指定会員を起点（自分のツリー内の会員のみ許可）
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

  // VP未来phone申込情報を一括取得（ユーザーごとに最新1件）
  const userIdsBigInt = [...allIds].map((id) => BigInt(id));
  const vpApps = await prisma.vpPhoneApplication.findMany({
    where: { userId: { in: userIdsBigInt } },
    select: {
      id: true,
      userId: true,
      nameKanji: true,
      contractType: true,
      desiredPlan: true,
      status: true,
      contractedAt: true,
      createdAt: true,
      adminNote: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // userId → 最新のVP申込 のマップ
  const vpMap = new Map<string, (typeof vpApps)[0]>();
  for (const app of vpApps) {
    const uid = app.userId.toString();
    if (!vpMap.has(uid)) vpMap.set(uid, app);
  }

  // ユーザー情報を一括取得
  const users = await prisma.user.findMany({
    where: { id: { in: userIdsBigInt } },
    select: { id: true, name: true, memberCode: true },
  });
  const userMap = new Map(users.map((u) => [u.id.toString(), u]));

  // ツリーノード型
  type VpTreeNode = {
    id: string;
    name: string;
    memberCode: string;
    depth: number;
    vp: {
      id: string;
      nameKanji: string;
      contractType: string | null;
      desiredPlan: string | null;
      status: string;
      contractedAt: string | null;
      createdAt: string;
    } | null;
    children: VpTreeNode[];
    childCount: number;
  };

  function buildTree(userId: string, depth: number): VpTreeNode {
    const user = userMap.get(userId);
    const app = vpMap.get(userId) ?? null;
    const children = (childrenMap.get(userId) ?? [])
      .filter((cid) => allIds.has(cid))
      .map((cid) => buildTree(cid, depth + 1));

    return {
      id: userId,
      name: user?.name ?? "不明",
      memberCode: user?.memberCode ?? "",
      depth,
      vp: app
        ? {
            id: app.id.toString(),
            nameKanji: app.nameKanji,
            contractType: app.contractType,
            desiredPlan: app.desiredPlan,
            status: app.status,
            contractedAt: app.contractedAt?.toISOString() ?? null,
            createdAt: app.createdAt.toISOString(),
          }
        : null,
      children,
      childCount: children.length,
    };
  }

  const tree = buildTree(rootId.toString(), 0);

  // 統計
  const totalMembers = allIds.size - 1; // 自分除く
  const contracted = [...vpMap.values()].filter(
    (v) => v.status === "contracted"
  ).length;
  const pending = [...vpMap.values()].filter(
    (v) => v.status === "pending" || v.status === "reviewing"
  ).length;

  return NextResponse.json({
    root: {
      id: rootUser.id.toString(),
      name: rootUser.name,
      memberCode: rootUser.memberCode,
      isMe: rootId === myId,
    },
    tree,
    stats: { totalMembers, contracted, pending },
  });
}
