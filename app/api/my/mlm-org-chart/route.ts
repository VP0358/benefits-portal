// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNonPurchaseAlert } from "@/lib/mlm-bonus";
import { currentMonthJST } from "@/lib/japan-time";

const ACTIVE_REQUIRED_PRODUCTS = ["1000", "1001", "1002", "2000"];

/** 直近N ヶ月のスミサイ未購入連続月数を計算 */
async function calcConsecutiveNonPurchase(
  mlmMemberId: bigint,
  targetMonth: string
): Promise<number> {
  let consecutive = 0;
  const [y, m] = targetMonth.split("-").map(Number);
  for (let i = 0; i < 6; i++) {
    const d = new Date(y, m - 1 - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const purchases = await prisma.mlmPurchase.findMany({
      where: { mlmMemberId, purchaseMonth: ym, productCode: { in: ACTIVE_REQUIRED_PRODUCTS } },
    });
    if (purchases.length > 0) break;
    consecutive++;
  }
  return consecutive;
}

/** 当月購入pt取得とアクティブ判定 */
async function getMemberStats(
  mlmMemberId: bigint,
  currentMonth: string,
  memberType: string,
  contractDate: Date | null,
  forceActive: boolean
) {
  const purchases = await prisma.mlmPurchase.findMany({
    where: { mlmMemberId, purchaseMonth: currentMonth },
  });
  const selfPoints = purchases.reduce((s, p) => s + p.totalPoints, 0);
  const hasRequired = purchases.some((p) => ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode));
  const isActive =
    forceActive ||
    (memberType === "business" && contractDate != null && selfPoints >= 150 && hasRequired);
  return { selfPoints, isActive };
}

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

/** マトリックスツリーノード構築（downlines=直上者配下） */
async function buildMatrixNode(
  m: {
    id: bigint; memberCode: string; memberType: string; status: string;
    currentLevel: number; titleLevel: number; contractDate: Date | null;
    forceActive: boolean;
    user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
    downlines: {
      id: bigint; memberCode: string; memberType: string; status: string;
      currentLevel: number; titleLevel: number; contractDate: Date | null;
      forceActive: boolean;
      user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
      downlines: {
        id: bigint; memberCode: string; memberType: string; status: string;
        currentLevel: number; titleLevel: number; contractDate: Date | null;
        forceActive: boolean;
        user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
        downlines: {
          id: bigint; memberCode: string; memberType: string; status: string;
          currentLevel: number; titleLevel: number; contractDate: Date | null;
          forceActive: boolean;
          user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          downlines: any[];
        }[];
      }[];
    }[];
  },
  depth: number,
  currentMonth: string
): Promise<NodeData> {
  const { selfPoints, isActive } = await getMemberStats(
    m.id, currentMonth, m.memberType, m.contractDate, m.forceActive
  );
  const consecutive = await calcConsecutiveNonPurchase(m.id, currentMonth);
  const alert = getNonPurchaseAlert(consecutive);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let children: NodeData[] = [];
  if (depth < 5 && m.downlines && m.downlines.length > 0) {
    children = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.downlines.map((child: any) => buildMatrixNode(child, depth + 1, currentMonth))
    );
  }

  return {
    id: m.user.id.toString(),
    name: (m as { companyName?: string | null }).companyName || m.user.name,
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

/** ユニレベルツリーノード構築（referrals=自分が紹介した人） */
async function buildUniNode(
  m: {
    id: bigint; memberCode: string; memberType: string; status: string;
    currentLevel: number; titleLevel: number; contractDate: Date | null;
    forceActive: boolean;
    user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
    referrals: {
      id: bigint; memberCode: string; memberType: string; status: string;
      currentLevel: number; titleLevel: number; contractDate: Date | null;
      forceActive: boolean;
      user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
      referrals: {
        id: bigint; memberCode: string; memberType: string; status: string;
        currentLevel: number; titleLevel: number; contractDate: Date | null;
        forceActive: boolean;
        user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
        referrals: {
          id: bigint; memberCode: string; memberType: string; status: string;
          currentLevel: number; titleLevel: number; contractDate: Date | null;
          forceActive: boolean;
          user: { id: bigint; name: string; memberCode: string; avatarUrl: string | null };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          referrals: any[];
        }[];
      }[];
    }[];
  },
  depth: number,
  currentMonth: string
): Promise<NodeData> {
  const { selfPoints, isActive } = await getMemberStats(
    m.id, currentMonth, m.memberType, m.contractDate, m.forceActive
  );
  const consecutive = await calcConsecutiveNonPurchase(m.id, currentMonth);
  const alert = getNonPurchaseAlert(consecutive);

  let children: NodeData[] = [];
  if (depth < 5 && m.referrals && m.referrals.length > 0) {
    children = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.referrals.map((child: any) => buildUniNode(child, depth + 1, currentMonth))
    );
  }

  return {
    id: m.user.id.toString(),
    name: (m as { companyName?: string | null }).companyName || m.user.name,
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

// Prismaのネスト include ヘルパー
const userSelect = { id: true, name: true, memberCode: true, avatarUrl: true } as const;
const memberFields = {
  id: true, memberCode: true, memberType: true, status: true,
  currentLevel: true, titleLevel: true, contractDate: true, forceActive: true,
  companyName: true,
} as const;

function buildDownlineInclude(depth: number): object {
  if (depth <= 0) return {};
  return {
    include: {
      user: { select: userSelect },
      downlines: buildDownlineInclude(depth - 1),
    },
  };
}

function buildReferralsInclude(depth: number): object {
  if (depth <= 0) return {};
  return {
    include: {
      user: { select: userSelect },
      referrals: buildReferralsInclude(depth - 1),
    },
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id ?? "0");
  const currentMonth = currentMonthJST();

  try {
    // 自分のMLM会員情報（マトリックス5段 + ユニレベル5段）
    const me = await prisma.mlmMember.findUnique({
      where: { userId },
      select: {
        ...memberFields,
        user: { select: userSelect },
        upline: {
          select: {
            ...memberFields,
            user: { select: userSelect },
          },
        },
        referrer: {
          select: {
            ...memberFields,
            user: { select: userSelect },
          },
        },
        // マトリックス配下（5段）
        downlines: {
          select: {
            ...memberFields,
            user: { select: userSelect },
            downlines: {
              select: {
                ...memberFields,
                user: { select: userSelect },
                downlines: {
                  select: {
                    ...memberFields,
                    user: { select: userSelect },
                    downlines: {
                      select: {
                        ...memberFields,
                        user: { select: userSelect },
                        downlines: {
                          select: {
                            ...memberFields,
                            user: { select: userSelect },
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
        // ユニレベル配下（5段）
        referrals: {
          select: {
            ...memberFields,
            user: { select: userSelect },
            referrals: {
              select: {
                ...memberFields,
                user: { select: userSelect },
                referrals: {
                  select: {
                    ...memberFields,
                    user: { select: userSelect },
                    referrals: {
                      select: {
                        ...memberFields,
                        user: { select: userSelect },
                        referrals: {
                          select: {
                            ...memberFields,
                            user: { select: userSelect },
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
      },
    });

    if (!me) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // 自分のアクティブ・ポイント
    const { selfPoints: mySelfPoints, isActive: myIsActive } = await getMemberStats(
      me.id, currentMonth, me.memberType, me.contractDate, me.forceActive
    );

    // マトリックスダウンライン構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matrixDownlines = await Promise.all((me.downlines as any[]).map((d) => buildMatrixNode(d, 1, currentMonth)));

    // ユニレベルダウンライン構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniDownlines = await Promise.all((me.referrals as any[]).map((d) => buildUniNode(d, 1, currentMonth)));

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
      // 直上者（マトリックス）
      upline: me.upline ? {
        name: me.upline.companyName || me.upline.user.name,
        memberCode: me.upline.memberCode,
      } : null,
      // 紹介者（ユニレベル）
      referrer: me.referrer ? {
        name: me.referrer.companyName || me.referrer.user.name,
        memberCode: me.referrer.memberCode,
      } : null,
    };

    return NextResponse.json({
      month: currentMonth,
      me: meInfo,
      // マトリックス（直上者=uplineId系配下）
      matrixDownlines,
      // ユニレベル（紹介者=referrerId系配下）
      uniDownlines,
      // 後方互換
      downlines: matrixDownlines,
    });
  } catch (e) {
    console.error("mlm-org-chart error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
