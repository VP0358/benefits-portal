// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNonPurchaseAlert } from "@/lib/mlm-bonus";
import { currentMonthJST, monthOffsetJST } from "@/lib/japan-time";

const ACTIVE_REQUIRED_PRODUCTS = ["1000", "1001", "1002", "2000"];

export type NodeData = {
  id: string;
  name: string;
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
  children: NodeData[];
};

// Prismaのネストselect用フィールド定義
const userSelect = { id: true, name: true, memberCode: true, avatarUrl: true } as const;
const memberFields = {
  id: true, memberCode: true, memberType: true, status: true,
  currentLevel: true, titleLevel: true, contractDate: true, forceActive: true,
  companyName: true,
} as const;

// ────────────────────────────────────────────────────────────
// 購入データを一括取得してMapに変換するユーティリティ
// ────────────────────────────────────────────────────────────

/** 対象メンバーIDリストの当月購入データを一括取得 */
async function fetchPurchasesForMembers(
  memberIds: bigint[],
  months: string[] // ["2026-05", "2026-04", ...] 直近6ヶ月
): Promise<Map<string, { totalPoints: number; productCode: string }[]>> {
  if (memberIds.length === 0) return new Map();

  const purchases = await prisma.mlmPurchase.findMany({
    where: {
      mlmMemberId: { in: memberIds },
      purchaseMonth: { in: months },
    },
    select: {
      mlmMemberId: true,
      purchaseMonth: true,
      totalPoints: true,
      productCode: true,
    },
  });

  // Map key: `${mlmMemberId}-${purchaseMonth}`
  const map = new Map<string, { totalPoints: number; productCode: string }[]>();
  for (const p of purchases) {
    const key = `${p.mlmMemberId}-${p.purchaseMonth}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ totalPoints: p.totalPoints, productCode: p.productCode });
  }
  return map;
}

/** 購入Mapからアクティブ判定とポイントを計算 */
function calcStats(
  mlmMemberId: bigint,
  currentMonth: string,
  memberType: string,
  contractDate: Date | null,
  forceActive: boolean,
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): { selfPoints: number; isActive: boolean } {
  const key = `${mlmMemberId}-${currentMonth}`;
  const purchases = purchaseMap.get(key) ?? [];
  const selfPoints = purchases.reduce((s, p) => s + p.totalPoints, 0);
  const hasRequired = purchases.some((p) => ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode));
  const isActive =
    forceActive ||
    (memberType === "business" && contractDate != null && selfPoints >= 150 && hasRequired);
  return { selfPoints, isActive };
}

/** 購入Mapから連続未購入月数を計算（当月から過去に向かって連続チェック） */
function calcConsecutive(
  mlmMemberId: bigint,
  _currentMonth: string,
  months: string[], // [currentMonth, 1ヶ月前, 2ヶ月前, ...]
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): number {
  let cnt = 0;
  for (const ym of months) {
    const key = `${mlmMemberId}-${ym}`;
    const purchases = purchaseMap.get(key) ?? [];
    const hasRequired = purchases.some((p) => ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode));
    if (hasRequired) break;
    cnt++;
  }
  return cnt;
}

// ────────────────────────────────────────────────────────────
// ツリー再帰構築（全購入データはキャッシュ済み）
// ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMatrixNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any,
  depth: number,
  currentMonth: string,
  months: string[],
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): NodeData {
  const { selfPoints, isActive } = calcStats(
    m.id, currentMonth, m.memberType, m.contractDate, m.forceActive, purchaseMap
  );
  const consecutive = calcConsecutive(m.id, currentMonth, months, purchaseMap);
  const alert = getNonPurchaseAlert(consecutive);

  let children: NodeData[] = [];
  if (depth < 5 && m.downlines && m.downlines.length > 0) {
    children = m.downlines.map((child: any) =>
      buildMatrixNode(child, depth + 1, currentMonth, months, purchaseMap)
    );
  }

  return {
    id: m.user.id.toString(),
    name: m.companyName || m.user.name,
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
    children,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUniNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: any,
  depth: number,
  currentMonth: string,
  months: string[],
  purchaseMap: Map<string, { totalPoints: number; productCode: string }[]>
): NodeData {
  const { selfPoints, isActive } = calcStats(
    m.id, currentMonth, m.memberType, m.contractDate, m.forceActive, purchaseMap
  );
  const consecutive = calcConsecutive(m.id, currentMonth, months, purchaseMap);
  const alert = getNonPurchaseAlert(consecutive);

  let children: NodeData[] = [];
  if (depth < 5 && m.referrals && m.referrals.length > 0) {
    children = m.referrals.map((child: any) =>
      buildUniNode(child, depth + 1, currentMonth, months, purchaseMap)
    );
  }

  return {
    id: m.user.id.toString(),
    name: m.companyName || m.user.name,
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
    children,
  };
}

/** ツリーから全メンバーのIDを収集 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectIds(nodes: any[], relation: "downlines" | "referrals", depth: number): bigint[] {
  if (depth <= 0) return [];
  const ids: bigint[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    const children = n[relation] ?? [];
    ids.push(...collectIds(children, relation, depth - 1));
  }
  return ids;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id ?? "0");
  const currentMonth = currentMonthJST();

  // 直近6ヶ月リスト（連続未購入判定用）
  const months = Array.from({ length: 6 }, (_, i) => monthOffsetJST(currentMonth, -i));

  try {
    // ── 1. 自分のMLM会員情報（ツリー構造を一括取得）
    const me = await prisma.mlmMember.findUnique({
      where: { userId },
      select: {
        ...memberFields,
        user: { select: userSelect },
        upline: {
          select: { ...memberFields, user: { select: userSelect } },
        },
        referrer: {
          select: { ...memberFields, user: { select: userSelect } },
        },
        // マトリックス配下（5段）
        downlines: {
          select: {
            ...memberFields, user: { select: userSelect },
            downlines: {
              select: {
                ...memberFields, user: { select: userSelect },
                downlines: {
                  select: {
                    ...memberFields, user: { select: userSelect },
                    downlines: {
                      select: {
                        ...memberFields, user: { select: userSelect },
                        downlines: {
                          select: { ...memberFields, user: { select: userSelect } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // ユニレベル配下（5段）
        referrals: {
          select: {
            ...memberFields, user: { select: userSelect },
            referrals: {
              select: {
                ...memberFields, user: { select: userSelect },
                referrals: {
                  select: {
                    ...memberFields, user: { select: userSelect },
                    referrals: {
                      select: {
                        ...memberFields, user: { select: userSelect },
                        referrals: {
                          select: { ...memberFields, user: { select: userSelect } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!me) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // ── 2. 全メンバーIDを収集して購入データを一括取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matrixIds = collectIds(me.downlines as any[], "downlines", 5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniIds    = collectIds(me.referrals as any[], "referrals", 5);
    const allIds    = [me.id, ...new Set([...matrixIds, ...uniIds])];

    const purchaseMap = await fetchPurchasesForMembers(allIds, months);

    // ── 3. 自分のアクティブ・ポイント
    const { selfPoints: mySelfPoints, isActive: myIsActive } = calcStats(
      me.id, currentMonth, me.memberType, me.contractDate, me.forceActive, purchaseMap
    );

    // ── 4. ツリー構築（同期処理・DBクエリ不要）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matrixDownlines = (me.downlines as any[]).map((d) =>
      buildMatrixNode(d, 1, currentMonth, months, purchaseMap)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniDownlines = (me.referrals as any[]).map((d) =>
      buildUniNode(d, 1, currentMonth, months, purchaseMap)
    );

    const meInfo = {
      id: me.user.id.toString(),
      name: me.companyName || me.user.name,
      memberCode: me.user.memberCode,
      avatarUrl: me.user.avatarUrl,
      mlmMemberCode: me.memberCode,
      memberType: me.memberType,
      currentLevel: me.currentLevel,
      titleLevel: me.titleLevel,
      isActive: myIsActive,
      selfPoints: mySelfPoints,
      upline: me.upline ? {
        name: (me.upline as { companyName?: string | null; user: { name: string }; memberCode: string }).companyName || me.upline.user.name,
        memberCode: me.upline.memberCode,
      } : null,
      referrer: me.referrer ? {
        name: (me.referrer as { companyName?: string | null; user: { name: string }; memberCode: string }).companyName || me.referrer.user.name,
        memberCode: me.referrer.memberCode,
      } : null,
    };

    return NextResponse.json({
      month: currentMonth,
      me: meInfo,
      matrixDownlines,
      uniDownlines,
      downlines: matrixDownlines, // 後方互換
    });

  } catch (e) {
    console.error("mlm-org-chart error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
