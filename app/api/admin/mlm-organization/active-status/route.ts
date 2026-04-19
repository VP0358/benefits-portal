// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

/**
 * アクティブ判定マーカーの種別
 * - "active"  : 当月アクティブ（商品1000/s1000 + 2000の入金済み伝票あり） → 黄色
 * - "warning" : 入金済み伝票なしで5ヶ月目 → 青色
 * - "danger"  : 入金済み伝票なしで6ヶ月目以上 → 赤色
 * - "none"    : 判定なし
 */
export type ActiveMarker = "active" | "warning" | "danger" | "none";

/**
 * 商品コード判定
 * - 1000系（新規）: "1000" or "s1000"
 * - 2000系（継続）: "2000"
 */
function isProduct1000(code: string): boolean {
  return code === "1000" || code === "s1000";
}
function isProduct2000(code: string): boolean {
  return code === "2000";
}

/**
 * 指定月（YYYY-MM）の範囲（JST）を返す
 */
function getMonthRange(yearMonth: string): { start: Date; end: Date } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end   = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * GET /api/admin/mlm-organization/active-status
 *   ?month=YYYY-MM  (省略時は当月)
 *   &memberIds=1,2,3  (省略時は全会員)
 *
 * 戻り値: { [memberId: string]: ActiveMarker }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // 対象月（デフォルト: 当月）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const defaultMonth = `${nowJST.getUTCFullYear()}-${String(nowJST.getUTCMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") || defaultMonth;

    // 対象会員ID（省略時は全会員）
    const memberIdsParam = searchParams.get("memberIds");
    const memberIdFilter = memberIdsParam
      ? memberIdsParam.split(",").filter(s => s.trim().length > 0).map((s) => BigInt(s.trim()))
      : null;

    // ────────────────────────────────────────────
    // 1. 全 MlmMember の contractDate を取得
    // ────────────────────────────────────────────
    const members = await prisma.mlmMember.findMany({
      where: memberIdFilter ? { id: { in: memberIdFilter } } : undefined,
      select: {
        id: true,
        memberCode: true,
        contractDate: true,
        forceActive: true,
        status: true,
        userId: true,
      },
    });

    if (members.length === 0) {
      return NextResponse.json({ markers: {}, month });
    }

    const userIds = members.map((m) => m.userId);

    // ────────────────────────────────────────────
    // 2. 当月の入金済み伝票を取得
    //    条件: paymentStatus = "paid"
    //          OrderItem に product code 1000/s1000 または 2000 が含まれる
    // ────────────────────────────────────────────
    const { start: monthStart, end: monthEnd } = getMonthRange(month);

    // 当月入金済み伝票（paidAt が当月内のもの）
    // paidAt が NULL でも orderedAt が当月内で paymentStatus=paid のものも対象
    const paidOrders = await prisma.order.findMany({
      where: {
        userId: { in: userIds },
        paymentStatus: "paid",
        OR: [
          { paidAt: { gte: monthStart, lte: monthEnd } },
          {
            paidAt: null,
            orderedAt: { gte: monthStart, lte: monthEnd },
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        paidAt: true,
        orderedAt: true,
        items: {
          select: {
            mlmProduct: {
              select: { productCode: true },
            },
            productName: true,
          },
        },
      },
    });

    // userId → memberID マップ
    const userIdToMemberId = new Map<string, string>();
    for (const m of members) {
      userIdToMemberId.set(m.userId.toString(), m.id.toString());
    }

    // 会員ごとに当月入金済み伝票の商品コードセットを構築
    const memberHas1000 = new Set<string>(); // 1000 or s1000 購入済み
    const memberHas2000 = new Set<string>(); // 2000 購入済み

    for (const order of paidOrders) {
      const memberId = userIdToMemberId.get(order.userId.toString());
      if (!memberId) continue;

      for (const item of order.items) {
        const code = item.mlmProduct?.productCode ?? "";
        if (isProduct1000(code)) {
          memberHas1000.add(memberId);
        }
        if (isProduct2000(code)) {
          memberHas2000.add(memberId);
        }
      }
    }

    // ────────────────────────────────────────────
    // 3. 過去の月別アクティブ履歴を計算（5/6ヶ月目判定用）
    //    contractDate から当月までの各月について入金済み伝票があるか確認
    // ────────────────────────────────────────────
    // 5ヶ月目 = contractDate から5ヶ月経過した月
    // 直近6ヶ月分の入金済み伝票（全月）を取得
    const sixMonthsAgo = new Date(monthStart);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicOrders = await prisma.order.findMany({
      where: {
        userId: { in: userIds },
        paymentStatus: "paid",
        OR: [
          { paidAt: { gte: sixMonthsAgo, lte: monthEnd } },
          {
            paidAt: null,
            orderedAt: { gte: sixMonthsAgo, lte: monthEnd },
          },
        ],
      },
      select: {
        userId: true,
        paidAt: true,
        orderedAt: true,
        items: {
          select: {
            mlmProduct: {
              select: { productCode: true },
            },
          },
        },
      },
    });

    // 会員ごとに入金済みの月セットを構築（YYYY-MM 形式）
    // 条件: 1000/s1000 または 2000 の商品が含まれている伝票
    const memberPaidMonths = new Map<string, Set<string>>();

    for (const order of historicOrders) {
      const memberId = userIdToMemberId.get(order.userId.toString());
      if (!memberId) continue;

      // この伝票に対象商品が含まれているか確認
      let hasTarget = false;
      for (const item of order.items) {
        const code = item.mlmProduct?.productCode ?? "";
        if (isProduct1000(code) || isProduct2000(code)) {
          hasTarget = true;
          break;
        }
      }
      if (!hasTarget) continue;

      // 入金月を特定
      const effectiveDate = order.paidAt ?? order.orderedAt;
      const ym = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, "0")}`;

      if (!memberPaidMonths.has(memberId)) {
        memberPaidMonths.set(memberId, new Set());
      }
      memberPaidMonths.get(memberId)!.add(ym);
    }

    // ────────────────────────────────────────────
    // 4. 各会員のマーカーを判定
    // ────────────────────────────────────────────
    const markers: Record<string, ActiveMarker> = {};

    const [targetYear, targetMonthNum] = month.split("-").map(Number);

    for (const member of members) {
      const mid = member.id.toString();

      // forceActive の会員は常にアクティブ扱い
      if (member.forceActive) {
        markers[mid] = "active";
        continue;
      }

      // 退会・失効・停止・中途解約は判定対象外
      if (["withdrawn", "lapsed", "suspended", "midCancel"].includes(member.status)) {
        markers[mid] = "none";
        continue;
      }

      // ① 当月アクティブ判定: 1000/s1000 AND 2000 どちらも入金済み
      const isActive = memberHas1000.has(mid) && memberHas2000.has(mid);
      if (isActive) {
        markers[mid] = "active";
        continue;
      }

      // ② 5/6ヶ月目判定
      // contractDate がない場合は判定対象外
      if (!member.contractDate) {
        markers[mid] = "none";
        continue;
      }

      // contractDate から何ヶ月経過しているか
      const cd = member.contractDate;
      const contractYear  = cd.getFullYear();
      const contractMonth = cd.getMonth() + 1;
      const monthsElapsed =
        (targetYear - contractYear) * 12 + (targetMonthNum - contractMonth);

      // 5ヶ月未満は判定対象外（まだ猶予あり）
      if (monthsElapsed < 4) {
        markers[mid] = "none";
        continue;
      }

      // 直近の入金済み月を確認
      const paidMonths = memberPaidMonths.get(mid) ?? new Set<string>();

      // 最後に入金があった月から何ヶ月経過しているか計算
      let lastPaidYear  = contractYear;
      let lastPaidMonth = contractMonth - 1; // contractDate の前月を初期値に

      // contractDate の月も対象に含める
      for (let offset = 0; offset <= monthsElapsed; offset++) {
        const checkYear  = contractYear + Math.floor((contractMonth - 1 + offset) / 12);
        const checkMonth = ((contractMonth - 1 + offset) % 12) + 1;
        const ym = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
        if (paidMonths.has(ym)) {
          lastPaidYear  = checkYear;
          lastPaidMonth = checkMonth;
        }
      }

      // 最後の入金月から対象月までの経過月数
      const monthsSinceLastPaid =
        (targetYear - lastPaidYear) * 12 + (targetMonthNum - lastPaidMonth);

      // 6ヶ月以上: 赤
      if (monthsSinceLastPaid >= 6) {
        markers[mid] = "danger";
      }
      // 5ヶ月目: 青
      else if (monthsSinceLastPaid >= 5) {
        markers[mid] = "warning";
      }
      else {
        markers[mid] = "none";
      }
    }

    return NextResponse.json({ markers, month }, { status: 200 });
  } catch (error) {
    console.error("Error calculating active status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
