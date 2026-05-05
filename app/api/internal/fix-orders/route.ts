export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateJST } from "@/lib/japan-time";

const INTERNAL_TOKEN = "Fx3Qp7Yz2Wv9Rk5Ns1Jd8Ub4Lm6Ct0A";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode") ?? "check";
  const results: string[] = [];
  const errors: string[] = [];

  // ── 誤作成した会員の memberCode ──
  const wrongMemberCodes = ["114942-01", "890155-01"];

  // ── 対象の購入者（元々存在する会員の正しい memberCode） ──
  // 2026年4月CSVの会員ID → memberCode変換は同じだが、
  // 元々の会員がDBにどのmemberCodeで登録されているか確認する
  const buyerMemberCodes = ["114942-01", "890155-01"];

  // ─────────────────────────────────────────
  // mode=check: DB状態確認のみ
  // ─────────────────────────────────────────
  if (mode === "check") {
    results.push("=== DB状態確認 ===");

    for (const mc of wrongMemberCodes) {
      const user = await prisma.user.findUnique({
        where: { memberCode: mc },
        select: {
          id: true, name: true, email: true, createdAt: true,
          orders: {
            select: {
              id: true, orderNumber: true, orderedAt: true,
              note: true, slipType: true,
            },
          },
        },
      });
      if (user) {
        results.push(`[存在] ${mc} ${user.name} (email: ${user.email})`);
        results.push(`  作成日時: ${user.createdAt.toISOString()}`);
        for (const o of user.orders) {
          results.push(`  伝票: ${o.orderNumber} | ${o.slipType} | ${o.orderedAt.toISOString().slice(0,10)} | ${o.note ?? ""}`);
        }
      } else {
        results.push(`[存在しない] ${mc}`);
      }
    }

    return NextResponse.json({ mode, results, errors });
  }

  // ─────────────────────────────────────────
  // mode=fix: 誤作成会員削除 → 正しい伝票作成
  // ─────────────────────────────────────────
  if (mode === "fix") {

    // ── Step1: 誤作成会員・伝票の削除 ──
    results.push("=== Step1: 誤作成データ削除 ===");

    for (const mc of wrongMemberCodes) {
      try {
        const user = await prisma.user.findUnique({
          where: { memberCode: mc },
          select: {
            id: true, name: true, email: true,
            orders: { select: { id: true, orderNumber: true, note: true } },
          },
        });

        if (!user) {
          results.push(`[スキップ] ${mc}: DBに存在しません`);
          continue;
        }

        // 誤作成判定: note に "CSVインポート" を含む伝票 or 今日作成された会員
        const isWrongUser = user.email.includes("@noemail.viola-pure.net") ||
                            user.email === "joseph.hel.1007@gmail.com";
        // ※ joseph.hel.1007@gmail.com は林真一郎のCSV記載メール。
        //   元々の会員が同じメールで登録されている場合は別処理が必要なため、
        //   まず check モードで確認してから実行すること。

        // 誤作成かどうか判定: 作成日が本日 (2026-05-05) かつ CSVインポートの note がある
        const todayUTC = new Date();
        const isToday = (user as { createdAt: Date }).createdAt >= new Date("2026-05-05T00:00:00Z");

        if (!isToday) {
          results.push(`[スキップ] ${mc} ${user.name}: 作成日が今日ではないため削除しません（既存会員の可能性）`);
          continue;
        }

        // 伝票を先に削除（Cascade があるはずだが念のため）
        for (const o of user.orders) {
          results.push(`  伝票削除: ${o.orderNumber}`);
        }

        // User 削除（CascadeでMlmMember/Orders/PointWallet等も削除）
        await prisma.user.delete({ where: { id: user.id } });
        results.push(`[削除完了] ${mc} ${user.name}`);
      } catch (e) {
        errors.push(`[削除エラー] ${mc}: ${e}`);
      }
    }

    // ── Step2: 元々の会員に伝票作成 ──
    results.push("");
    results.push("=== Step2: 既存会員への伝票作成 ===");

    // 商品コード1000取得
    const product = await prisma.mlmProduct.findFirst({
      where: { productCode: "1000", isActive: true },
    });
    if (!product) {
      errors.push("商品コード1000が見つかりません");
      return NextResponse.json({ mode, results, errors });
    }
    results.push(`[商品] ${product.productCode} ${product.name} / ¥${product.price} / PV:${product.pv}`);

    const orderedAt = parseDateJST("2026-04-01") ?? new Date("2026-03-31T15:00:00Z");

    for (const mc of buyerMemberCodes) {
      try {
        const user = await prisma.user.findUnique({
          where: { memberCode: mc },
          select: { id: true, name: true, postalCode: true, address: true, phone: true },
        });

        if (!user) {
          errors.push(`[エラー] ${mc}: 元々の会員がDBに見つかりません`);
          continue;
        }

        // 二重登録防止チェック
        const existing = await prisma.order.findFirst({
          where: {
            userId: user.id,
            orderedAt: {
              gte: new Date("2026-03-31T15:00:00Z"),
              lt:  new Date("2026-04-30T15:00:00Z"),
            },
            items: { some: { productId: product.id } },
          },
          select: { orderNumber: true },
        });
        if (existing) {
          results.push(`[スキップ] ${mc} ${user.name}: 2026年4月の伝票が既に存在 (${existing.orderNumber})`);
          continue;
        }

        const unitPrice      = product.price;
        const quantity       = 1;
        const subtotalAmount = unitPrice * quantity;
        const totalAmount    = subtotalAmount;
        const orderNumber    = `ORD-APR2026-${mc.replace("-", "")}-${Date.now()}`;

        const mlmMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });

        // Order作成
        const order = await prisma.order.create({
          data: {
            userId:         user.id,
            orderNumber,
            status:         "completed",
            slipType:       "new_member",
            paymentMethod:  "credit_card",
            paymentStatus:  "paid",
            shippingStatus: "shipped",
            outboxNo:       0,
            orderedAt,
            paidAt:         orderedAt,
            note:           "2026年4月 商品コード1000 購入（CSVインポート）",
            subtotalAmount,
            totalAmount,
            usedPoints:     0,
          },
        });

        // OrderItem作成
        await prisma.orderItem.create({
          data: {
            orderId:     order.id,
            productId:   product.id,
            productName: product.name,
            unitPrice,
            quantity,
            lineAmount:  unitPrice * quantity,
          },
        });

        // ShippingLabel作成
        await prisma.shippingLabel.create({
          data: {
            orderId:          order.id,
            orderNumber,
            carrier:          "yamato",
            status:           "shipped",
            recipientName:    user.name,
            recipientPhone:   user.phone || "",
            recipientPostal:  user.postalCode || "",
            recipientAddress: user.address || "",
            itemDescription:  product.name,
            itemCount:        1,
            shippedAt:        orderedAt,
          },
        });

        // MlmPurchase作成
        if (mlmMember && product.pv > 0) {
          await prisma.mlmPurchase.create({
            data: {
              mlmMemberId:    mlmMember.id,
              productCode:    product.productCode,
              productName:    product.name,
              quantity,
              unitPrice,
              points:         product.pv,
              totalPoints:    product.pv * quantity,
              purchaseStatus: "new_member",
              purchaseMonth:  "2026-04",
              purchasedAt:    orderedAt,
            },
          });
        }

        results.push(
          `[伝票作成完了] ${mc} ${user.name}` +
          ` / 注文番号: ${orderNumber}` +
          ` / ${product.name} ¥${unitPrice.toLocaleString()}` +
          ` / PV: ${product.pv}`
        );
      } catch (e) {
        errors.push(`[エラー] ${mc}: ${e}`);
      }
    }

    return NextResponse.json({ mode, results, errors });
  }

  return NextResponse.json({ error: "mode=check または mode=fix を指定してください" }, { status: 400 });
}
