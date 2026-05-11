// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNonPurchaseAlert } from "@/lib/mlm-bonus";
import { currentMonthJST, monthOffsetJST } from "@/lib/japan-time";

const ACTIVE_REQUIRED_PRODUCTS = ["1000", "1001", "1002", "2000"];

// ── 型定義 ──────────────────────────────────────────────────
export type NodeData = {
  id: string;
  name: string;
  companyName: string | null;
  memberCode: string;
  avatarUrl: string | null;
  mlmMemberCode: string;
  memberType: string;
  status: string;
  currentLevel: number;
  titleLevel: number;
  isActive: boolean;
  selfPoints: number;
  consecutiveNonPurchase: number;
  nonPurchaseAlert: string;
  depth: number;          // ルートからの段数（1始まり）
  totalDescendants: number; // 自分を起点にした全配下人数
  // 詳細ポップアップ用追加フィールド
  contractDate: string | null;   // ISO date string
  prefecture: string | null;
  directReferralCount: number;
  lastPointMonth: string | null; // 最終ポイント計上月 (YYYY-MM)
  children: NodeData[];
};

/** 段別アクティブ統計 */
export type DepthStat = {
  depth: number;
  total: number;
  active: number;
};

// ── Prisma select 定義 ──────────────────────────────────────
const userSelect = { id: true, name: true, memberCode: true, avatarUrl: true } as const;
const memberFields = {
  id: true, memberCode: true, memberType: true, status: true,
  currentLevel: true, titleLevel: true, contractDate: true, forceActive: true,
  companyName: true, uplineId: true, referrerId: true, matrixPosition: true,
  prefecture: true,
} as const;

// ── 購入データ一括取得 ──────────────────────────────────────
async function fetchPurchasesForMembers(
  memberIds: bigint[],
  months: string[]
): Promise<Map<string, { totalPoints: number; productCode: string }[]>> {
  if (memberIds.length === 0) return new Map();
  const purchases = await prisma.mlmPurchase.findMany({
    where: { mlmMemberId: { in: memberIds }, purchaseMonth: { in: months } },
    select: { mlmMemberId: true, purchaseMonth: true, totalPoints: true, productCode: true },
  });
  const map = new Map<string, { totalPoints: number; productCode: string }[]>();
  for (const p of purchases) {
    const key = `${p.mlmMemberId}-${p.purchaseMonth}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ totalPoints: p.totalPoints, productCode: p.productCode });
  }
  return map;
}

// 全購入データ（最終ポイント月算出用）— memberIds に対して全期間取得
async function fetchAllPurchasesForLastPoint(
  memberIds: bigint[]
): Promise<Map<string, string>> {
  if (memberIds.length === 0) return new Map();
  const purchases = await prisma.mlmPurchase.findMany({
    where: { mlmMemberId: { in: memberIds } },
    select: { mlmMemberId: true, purchaseMonth: true },
    orderBy: { purchaseMonth: "desc" },
  });
  const map = new Map<string, string>(); // memberId → 最新purchaseMonth
  for (const p of purchases) {
    const key = p.mlmMemberId.toString();
    if (!map.has(key)) map.set(key, p.purchaseMonth);
  }
  return map;
}

function calcStats(
  mlmMemberId: bigint, currentMonth: string, memberType: string,
  contractDate: Date | null, forceActive: boolean,
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): { selfPoints: number; isActive: boolean } {
  const key = `${mlmMemberId}-${currentMonth}`;
  const purchases = purchaseMap.get(key) ?? [];
  const selfPoints = purchases.reduce((s, p) => s + p.totalPoints, 0);
  const hasRequired = purchases.some(p => ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode));
  const isActive = forceActive ||
    (memberType === "business" && contractDate != null && selfPoints >= 150 && hasRequired);
  return { selfPoints, isActive };
}

function calcConsecutive(
  mlmMemberId: bigint, months: string[],
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): number {
  let cnt = 0;
  for (const ym of months) {
    const key = `${mlmMemberId}-${ym}`;
    const purchases = purchaseMap.get(key) ?? [];
    if (purchases.some(p => ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode))) break;
    cnt++;
  }
  return cnt;
}

// ── BFS で全配下メンバーをフラットに取得 ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllDescendantsBFS(
  rootId: bigint,
  parentField: "uplineId" | "referrerId"
): Promise<{ id: bigint; parentId: bigint | null; position: number; memberCode: string; memberType: string; status: string; currentLevel: number; titleLevel: number; contractDate: Date | null; forceActive: boolean; companyName: string | null; prefecture: string | null; user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null } }[]> {
  // 全MLM会員を一括取得してメモリでBFS（管理ページの fetchAllDescendants と同ロジック）
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true, memberCode: true, memberType: true, status: true,
      currentLevel: true, titleLevel: true, contractDate: true, forceActive: true,
      companyName: true, uplineId: true, referrerId: true, matrixPosition: true,
      prefecture: true,
      user: { select: userSelect },
    },
    orderBy: parentField === "uplineId" ? { matrixPosition: "asc" } : { createdAt: "asc" },
  });

  // BFS: rootId 配下のみ抽出
  const idSet = new Set<string>([rootId.toString()]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of allMembers) {
      const pid = (parentField === "uplineId" ? m.uplineId : m.referrerId);
      if (pid && idSet.has(pid.toString()) && !idSet.has(m.id.toString())) {
        idSet.add(m.id.toString());
        changed = true;
      }
    }
  }

  return allMembers
    .filter(m => idSet.has(m.id.toString()))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => ({
      id: m.id as bigint,
      parentId: (parentField === "uplineId" ? m.uplineId : m.referrerId) as bigint | null,
      position: m.matrixPosition as number,
      memberCode: m.memberCode as string,
      memberType: m.memberType as string,
      status: m.status as string,
      currentLevel: m.currentLevel as number,
      titleLevel: m.titleLevel as number,
      contractDate: m.contractDate as Date | null,
      forceActive: m.forceActive as boolean,
      companyName: m.companyName as string | null,
      prefecture: m.prefecture as string | null,
      user: {
        id: m.user.id as bigint,
        name: m.user.name as string,
        memberCode: m.user.memberCode as string,
        avatarUrl: m.user.avatarUrl as string | null,
      },
    }));
}

// ── フラットリスト → ツリー構築 ──────────────────────────────
function buildTree(
  rootId: bigint,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flatMembers: any[],
  depthLimit: number,
  currentMonth: string,
  months: string[],
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>,
  lastPointMap: Map<string, string>,
  // referrerId → count map (直接紹介数)
  directReferralCountMap: Map<string, number>
): NodeData {
  // id → member のマップ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>();
  for (const m of flatMembers) map.set(m.id.toString(), m);

  // 親子関係マップ（parentId → children[]）
  const childrenMap = new Map<string, string[]>();
  for (const m of flatMembers) {
    const pid = m.parentId?.toString();
    if (pid) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(m.id.toString());
    }
  }

  // 子リストをpositionでソート
  for (const [, children] of childrenMap) {
    children.sort((a, b) => {
      const ma = map.get(a), mb = map.get(b);
      return (ma?.position ?? 0) - (mb?.position ?? 0) || (ma?.memberCode ?? "").localeCompare(mb?.memberCode ?? "");
    });
  }

  // BFSで depth を設定
  const depthMap = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [{ id: rootId.toString(), depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    depthMap.set(id, depth);
    for (const cid of (childrenMap.get(id) ?? [])) {
      queue.push({ id: cid, depth: depth + 1 });
    }
  }

  // 再帰でNodeData構築
  const buildNode = (id: string, depth: number): NodeData => {
    const m = map.get(id)!;
    const { selfPoints, isActive } = calcStats(
      m.id, currentMonth, m.memberType, m.contractDate, m.forceActive, purchaseMap
    );
    const consecutive = calcConsecutive(m.id, months, purchaseMap);
    const alert = getNonPurchaseAlert(consecutive);

    const rawChildren = childrenMap.get(id) ?? [];
    const children: NodeData[] =
      depth < depthLimit
        ? rawChildren.map(cid => buildNode(cid, depth + 1))
        : [];

    // 全配下人数（depthLimit関係なく全て数える）
    const countAll = (nid: string): number => {
      const cs = childrenMap.get(nid) ?? [];
      return cs.reduce((sum, cid) => sum + 1 + countAll(cid), 0);
    };
    const totalDescendants = countAll(id);

    return {
      id: m.user.id.toString(),
      name: m.companyName?.trim() || m.user.name,
      companyName: m.companyName ?? null,
      memberCode: m.user.memberCode,
      avatarUrl: m.user.avatarUrl,
      mlmMemberCode: m.memberCode,
      memberType: m.memberType,
      status: m.status,
      currentLevel: m.currentLevel,
      titleLevel: m.titleLevel,
      isActive,
      selfPoints,
      consecutiveNonPurchase: consecutive,
      nonPurchaseAlert: alert,
      depth,
      totalDescendants,
      contractDate: m.contractDate ? (m.contractDate as Date).toISOString().split("T")[0] : null,
      prefecture: m.prefecture ?? null,
      directReferralCount: directReferralCountMap.get(m.id.toString()) ?? 0,
      lastPointMonth: lastPointMap.get(m.id.toString()) ?? null,
      children,
    };
  };

  return buildNode(rootId.toString(), 0);
}

// ── 段別統計計算 ─────────────────────────────────────────────
function calcDepthStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flatMembers: any[],
  rootId: bigint,
  currentMonth: string,
  months: string[],
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): DepthStat[] {
  // BFSで depth を設定
  const childrenMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>();
  for (const m of flatMembers) {
    map.set(m.id.toString(), m);
    const pid = m.parentId?.toString();
    if (pid) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(m.id.toString());
    }
  }
  const depthMap = new Map<string, number>();
  const q: { id: string; depth: number }[] = [{ id: rootId.toString(), depth: 0 }];
  while (q.length > 0) {
    const { id, depth } = q.shift()!;
    depthMap.set(id, depth);
    for (const cid of (childrenMap.get(id) ?? [])) q.push({ id: cid, depth: depth + 1 });
  }

  // 段別集計（rootは除く、depth >= 1）
  const statsMap = new Map<number, { total: number; active: number }>();
  for (const m of flatMembers) {
    const id = m.id.toString();
    if (id === rootId.toString()) continue;
    const depth = depthMap.get(id) ?? 0;
    if (!statsMap.has(depth)) statsMap.set(depth, { total: 0, active: 0 });
    const { isActive } = calcStats(m.id, currentMonth, m.memberType, m.contractDate, m.forceActive, purchaseMap);
    statsMap.get(depth)!.total++;
    if (isActive) statsMap.get(depth)!.active++;
  }

  const result: DepthStat[] = [];
  const maxDepth = Math.max(...Array.from(statsMap.keys()), 0);
  for (let d = 1; d <= maxDepth; d++) {
    const s = statsMap.get(d) ?? { total: 0, active: 0 };
    result.push({ depth: d, total: s.total, active: s.active });
  }
  return result;
}

// ── GET ─────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id ?? "0");
  const currentMonth = currentMonthJST();
  const months = Array.from({ length: 6 }, (_, i) => monthOffsetJST(currentMonth, -i));

  try {
    // 自分のMLM会員情報
    const me = await prisma.mlmMember.findUnique({
      where: { userId },
      select: {
        ...memberFields,
        user: { select: userSelect },
        upline:   { select: { ...memberFields, user: { select: userSelect } } },
        referrer: { select: { ...memberFields, user: { select: userSelect } } },
      },
    });

    if (!me) return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });

    // ── マトリックス: BFSで全段取得 ──
    const matrixFlat = await fetchAllDescendantsBFS(me.id, "uplineId");
    const matrixIds  = matrixFlat.map(m => m.id);
    const matrixPurchaseMap = await fetchPurchasesForMembers(matrixIds, months);
    const matrixLastPointMap = await fetchAllPurchasesForLastPoint(matrixIds);

    // 直接紹介数マップ（referrerId → count）— matrix向け（マトリックスは直上関係なので参照用）
    const matrixDirectRefMap = new Map<string, number>();
    for (const m of matrixFlat) {
      const pid = m.parentId?.toString();
      if (pid) {
        matrixDirectRefMap.set(pid, (matrixDirectRefMap.get(pid) ?? 0) + 1);
      }
    }

    // マトリックスツリー（段数無制限で内部保持、表示は5段ずつFE側で制御）
    const matrixRoot = buildTree(me.id, matrixFlat, 999, currentMonth, months, matrixPurchaseMap, matrixLastPointMap, matrixDirectRefMap);
    const matrixDepthStats = calcDepthStats(matrixFlat, me.id, currentMonth, months, matrixPurchaseMap);

    // 自分の直接配下（children）だけをレスポンスに渡す
    const matrixDownlines = matrixRoot.children;

    // 合計・アクティブ（全段）
    const matrixTotalCount  = matrixFlat.length - 1; // 自分を除く
    const matrixActiveCount = matrixFlat.filter(m => {
      if (m.id.toString() === me.id.toString()) return false;
      return calcStats(m.id, currentMonth, m.memberType, m.contractDate, m.forceActive, matrixPurchaseMap).isActive;
    }).length;

    // ── ユニレベル: 7段まで ──
    const uniFlat = await fetchAllDescendantsBFS(me.id, "referrerId");
    const uniIds  = uniFlat.map(m => m.id);
    const uniPurchaseMap = await fetchPurchasesForMembers(uniIds, months);
    const uniLastPointMap = await fetchAllPurchasesForLastPoint(uniIds);

    const uniDirectRefMap = new Map<string, number>();
    for (const m of uniFlat) {
      const pid = m.parentId?.toString();
      if (pid) {
        uniDirectRefMap.set(pid, (uniDirectRefMap.get(pid) ?? 0) + 1);
      }
    }

    const uniRoot = buildTree(me.id, uniFlat, 7, currentMonth, months, uniPurchaseMap, uniLastPointMap, uniDirectRefMap);
    const uniDownlines = uniRoot.children;

    const uniTotalCount  = uniFlat.filter(m => {
      // 7段以内のみカウント
      const childrenMap2 = new Map<string, string[]>();
      for (const mm of uniFlat) {
        const pid = mm.parentId?.toString();
        if (pid) {
          if (!childrenMap2.has(pid)) childrenMap2.set(pid, []);
          childrenMap2.get(pid)!.push(mm.id.toString());
        }
      }
      // BFSで depth 計算
      const depthMap2 = new Map<string, number>();
      const q2: { id: string; depth: number }[] = [{ id: me.id.toString(), depth: 0 }];
      while (q2.length > 0) {
        const { id, depth } = q2.shift()!;
        depthMap2.set(id, depth);
        for (const cid of (childrenMap2.get(id) ?? [])) q2.push({ id: cid, depth: depth + 1 });
      }
      const d = depthMap2.get(m.id.toString()) ?? 0;
      return d >= 1 && d <= 7;
    }).length;

    const uniActiveCount = uniFlat.filter(m => {
      if (m.id.toString() === me.id.toString()) return false;
      return calcStats(m.id, currentMonth, m.memberType, m.contractDate, m.forceActive, uniPurchaseMap).isActive;
    }).length;

    // 自分のアクティブ判定
    const { selfPoints: mySelfPoints, isActive: myIsActive } = calcStats(
      me.id, currentMonth, me.memberType, me.contractDate, me.forceActive,
      matrixPurchaseMap
    );

    const meInfo = {
      id: me.user.id.toString(),
      name: me.companyName?.trim() || me.user.name,
      memberCode: me.user.memberCode,
      avatarUrl: me.user.avatarUrl,
      mlmMemberCode: me.memberCode,
      memberType: me.memberType,
      currentLevel: me.currentLevel,
      titleLevel: me.titleLevel,
      isActive: myIsActive,
      selfPoints: mySelfPoints,
      upline: me.upline ? {
        name: (me.upline as { companyName?: string | null; user: { name: string }; memberCode: string }).companyName?.trim() || me.upline.user.name,
        memberCode: me.upline.memberCode,
      } : null,
      referrer: me.referrer ? {
        name: (me.referrer as { companyName?: string | null; user: { name: string }; memberCode: string }).companyName?.trim() || me.referrer.user.name,
        memberCode: me.referrer.memberCode,
      } : null,
    };

    return NextResponse.json({
      month: currentMonth,
      me: meInfo,
      matrixDownlines,
      matrixTotalCount,
      matrixActiveCount,
      matrixDepthStats,
      uniDownlines,
      uniTotalCount,
      uniActiveCount,
      downlines: matrixDownlines, // 後方互換
    });

  } catch (e) {
    console.error("mlm-org-chart error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
