export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateJST } from "@/lib/japan-time";

const TOKEN = "FixMlm2026-Viola1000";

function parseDateFromCSV(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [y, mo, d] = parts;
  const pad = (n: string) => n.padStart(2, "0");
  return parseDateJST(`${y}-${pad(mo)}-${pad(d)}`);
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode") ?? "check";
  const results: string[] = [];
  const errors: string[] = [];

  // ── 対象会員データ（CSVより） ──
  const members = [
    {
      csvId:        "11494201",
      memberCode:   "114942-01",
      name:         "田中　純子",
      birthDate:    "1972/11/12",
      gender:       "female",
      status:       "active" as const,
      contractDate: "2026/4/7",
      firstPayDate: "2026/4/7",
      phone:        "080-1950-7666",
      prefecture:   "富山県",
      address1:     "富山市婦中町分田40-6",
      address2:     null as string | null,
      referrerId:   "86820603",
      uplineId:     "86820603",
      purchaseDate: "2026/4/7",
    },
    {
      csvId:        "89015501",
      memberCode:   "890155-01",
      name:         "林　真一郎",
      birthDate:    "1983/10/7",
      gender:       "male",
      status:       "active" as const,
      contractDate: "2026/4/29",
      firstPayDate: "2026/4/29",
      phone:        "090-2129-2119",
      prefecture:   "岡山県",
      address1:     "倉敷市稲荷町8-24",
      address2:     "ヴェルディ倉敷駅南1103",
      referrerId:   "93713604",
      uplineId:     "93713604",
      purchaseDate: "2026/4/29",
    },
  ];

  // ── 商品コード1000 ──
  const product = await prisma.mlmProduct.findFirst({
    where: { productCode: "1000", isActive: true },
  });

  // ─────────────────────────────────────────
  // mode=check
  // ─────────────────────────────────────────
  if (mode === "check") {
    results.push("=== DB状態確認 ===");

    if (!product) {
      errors.push("商品コード1000が見つかりません");
    } else {
      results.push(`[商品OK] ${product.productCode} ${product.name} ¥${product.price} PV:${product.pv}`);
    }

    for (const m of members) {
      const user = await prisma.user.findUnique({
        where: { memberCode: m.memberCode },
        select: {
          id: true, name: true,
          mlmMember: { select: { id: true, status: true, purchases: { select: { purchaseMonth: true, productCode: true } } } },
          orders: { select: { orderNumber: true, orderedAt: true, items: { select: { productName: true } } } },
        },
      });
      if (!user) {
        results.push(`[存在しない] ${m.memberCode}`);
        continue;
      }
      results.push(`[存在] ${m.memberCode} ${user.name}`);
      results.push(`  MlmMember: ${user.mlmMember ? `ID:${user.mlmMember.id} status:${user.mlmMember.status}` : "未作成"}`);
      results.push(`  伝票数: ${user.orders.length}`);
      for (const o of user.orders) {
        const items = o.items.map(i => i.productName).join(", ");
        results.push(`    ${o.orderNumber} | ${o.orderedAt.toISOString().slice(0,10)} | ${items}`);
      }
      if (user.mlmMember) {
        results.push(`  購入履歴: ${user.mlmMember.purchases.length}件`);
        for (const p of user.mlmMember.purchases) {
          results.push(`    ${p.purchaseMonth} ${p.productCode}`);
        }
      }
    }
    return NextResponse.json({ mode, results, errors });
  }

  // ─────────────────────────────────────────
  // mode=fix: MlmMember作成 + MlmPurchase追加
  // ─────────────────────────────────────────
  if (mode === "fix") {
    if (!product) {
      errors.push("商品コード1000が見つかりません");
      return NextResponse.json({ mode, results, errors });
    }
    results.push(`[商品] ${product.productCode} ${product.name} ¥${product.price} PV:${product.pv}`);
    results.push("");

    for (const m of members) {
      results.push(`=== ${m.memberCode} ${m.name} ===`);
      try {
        const user = await prisma.user.findUnique({
          where: { memberCode: m.memberCode },
          select: {
            id: true, name: true,
            mlmMember: { select: { id: true } },
            orders: {
              select: {
                id: true, orderNumber: true, orderedAt: true,
                items: { select: { productId: true } },
              },
            },
          },
        });

        if (!user) {
          errors.push(`[エラー] ${m.memberCode}: Userが見つかりません`);
          continue;
        }

        // ── Step1: MlmMember 作成（なければ） ──
        let mlmMemberId = user.mlmMember?.id ?? null;

        if (!user.mlmMember) {
          const contractDate = parseDateFromCSV(m.contractDate);
          const firstPayDate  = parseDateFromCSV(m.firstPayDate);
          const birthDate     = parseDateFromCSV(m.birthDate);

          // 紹介者・直上者 を memberCode経由で検索
          const refCode = m.referrerId
            ? m.referrerId.slice(0, -2) + "-" + m.referrerId.slice(-2)
            : null;
          const referrerMlm = refCode
            ? await prisma.mlmMember.findFirst({
                where: { memberCode: refCode },
                select: { id: true },
              })
            : null;

          const mlmMember = await prisma.mlmMember.create({
            data: {
              userId:       user.id,
              memberCode:   m.memberCode,
              status:       m.status,
              contractDate,
              firstPayDate,
              birthDate,
              gender:       m.gender,
              mobile:       m.phone,
              prefecture:   m.prefecture,
              address1:     m.address1,
              address2:     m.address2,
              referrerId:   referrerMlm?.id ?? null,
              uplineId:     referrerMlm?.id ?? null,
            },
          });
          mlmMemberId = mlmMember.id;
          results.push(`  [MlmMember作成] ID:${mlmMember.id} status:${mlmMember.status}`);
        } else {
          results.push(`  [MlmMemberスキップ] 既に存在 ID:${mlmMemberId}`);
        }

        // ── Step2: MlmPurchase 作成（2026-04分がなければ） ──
        const existingPurchase = await prisma.mlmPurchase.findFirst({
          where: {
            mlmMemberId: mlmMemberId!,
            purchaseMonth: "2026-04",
            productCode: product.productCode,
          },
        });

        if (existingPurchase) {
          results.push(`  [MlmPurchaseスキップ] 2026-04分が既に存在`);
        } else {
          const purchasedAt = parseDateFromCSV(m.purchaseDate)
            ?? new Date("2026-03-31T15:00:00Z");

          await prisma.mlmPurchase.create({
            data: {
              mlmMemberId:    mlmMemberId!,
              productCode:    product.productCode,
              productName:    product.name,
              quantity:       1,
              unitPrice:      product.price,
              points:         product.pv,
              totalPoints:    product.pv,
              purchaseStatus: "new_member",
              purchaseMonth:  "2026-04",
              purchasedAt,
            },
          });
          results.push(`  [MlmPurchase作成] 2026-04 ${product.productCode} ${product.name} PV:${product.pv}`);
        }

        // ── Step3: 既存Order の userId を確認（念のため） ──
        const aprOrder = user.orders.find(o => {
          const d = o.orderedAt;
          // 2026-04-01 JST = 2026-03-31T15:00:00Z 〜 2026-04-30T15:00:00Z
          return d >= new Date("2026-03-31T15:00:00Z") && d < new Date("2026-04-30T15:00:00Z");
        });
        if (aprOrder) {
          results.push(`  [伝票確認OK] ${aprOrder.orderNumber}`);
        } else {
          results.push(`  [警告] 2026年4月の伝票が見つかりません`);
        }

      } catch (e) {
        errors.push(`[エラー] ${m.memberCode}: ${String(e)}`);
      }
      results.push("");
    }

    return NextResponse.json({ mode, results, errors });
  }

  return NextResponse.json({
    error: "mode=check または mode=fix を指定してください",
  }, { status: 400 });
}
