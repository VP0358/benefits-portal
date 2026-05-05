export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateJST } from "@/lib/japan-time";

// ワンタイムトークン
const INTERNAL_TOKEN = "Xk9pQ2mRvL7nW4sJ8dY3cH6bE1fA5gT";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  // ── 商品コード1000 の商品マスター取得 ──
  const product = await prisma.mlmProduct.findFirst({
    where: { productCode: "1000", isActive: true },
  });

  if (!product) {
    return NextResponse.json({
      success: false,
      error: "商品コード1000が見つかりません。商品マスターを確認してください。",
      hint: "productCode='1000' のレコードが mlm_products テーブルに存在するか確認してください",
    });
  }

  results.push(`[商品確認] ${product.productCode} ${product.name} / ¥${product.price} / PV:${product.pv}`);

  // ── 2026年4月購入者2名 ──
  const buyers = [
    { memberCode: "114942-01", name: "田中　純子" },
    { memberCode: "890155-01", name: "林　真一郎" },
  ];

  // 注文日: 2026年4月（JST 2026-04-01 00:00 = UTC 2026-03-31T15:00:00Z）
  const orderedAt = parseDateJST("2026-04-01") ?? new Date("2026-04-01T15:00:00Z");

  for (const buyer of buyers) {
    try {
      // 会員取得
      const user = await prisma.user.findUnique({
        where: { memberCode: buyer.memberCode },
        select: { id: true, name: true, postalCode: true, address: true, phone: true },
      });

      if (!user) {
        errors.push(`[エラー] ${buyer.memberCode} ${buyer.name}: 会員が見つかりません`);
        continue;
      }

      // 既存伝票チェック（同月・同商品の二重登録防止）
      const existingOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          orderedAt: {
            gte: new Date("2026-03-31T15:00:00Z"), // 2026-04-01 JST
            lt:  new Date("2026-04-30T15:00:00Z"), // 2026-04-30 JST
          },
          items: {
            some: { productId: product.id },
          },
        },
      });

      if (existingOrder) {
        results.push(`[スキップ] ${buyer.memberCode} ${buyer.name}: 2026年4月の伝票が既に存在 (${existingOrder.orderNumber})`);
        continue;
      }

      // 税込価格から小計・消費税計算（外税10%）
      // price は税込なので、税抜 = Math.round(price / 1.1)
      const unitPrice    = product.price;
      const quantity     = 1;
      const subtotal10   = unitPrice * quantity;           // 10%課税対象
      const tax10        = Math.floor(subtotal10 * 0.10 / 1.1); // 内税相当（税込価格から逆算）
      const subtotalAmount = subtotal10;
      const totalAmount    = subtotalAmount;               // price は税込なのでそのまま

      // 注文番号生成
      const orderNumber = `ORD-APR2026-${buyer.memberCode.replace("-", "")}-${Date.now()}`;

      // MlmMember 取得
      const mlmMember = await prisma.mlmMember.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      // ── Order 作成 ──
      const order = await prisma.order.create({
        data: {
          userId:        user.id,
          orderNumber,
          status:        "completed",
          slipType:      "one_time",
          paymentMethod: "credit_card",
          paymentStatus: "paid",
          shippingStatus: "shipped",
          outboxNo:      0,
          orderedAt,
          paidAt:        orderedAt,
          note:          "2026年4月 商品コード1000 購入（CSVインポート）",
          subtotalAmount,
          totalAmount,
          usedPoints:    0,
        },
      });

      // ── OrderItem 作成 ──
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

      // ── ShippingLabel 作成 ──
      await prisma.shippingLabel.create({
        data: {
          orderId:         order.id,
          orderNumber,
          carrier:         "yamato",
          status:          "shipped",
          recipientName:   user.name,
          recipientPhone:  user.phone || "",
          recipientPostal: user.postalCode || "",
          recipientAddress: user.address || "",
          itemDescription: product.name,
          itemCount:       1,
          shippedAt:       orderedAt,
        },
      });

      // ── MlmPurchase 作成（ポイント計算用） ──
      if (mlmMember && product.pv > 0) {
        await prisma.mlmPurchase.create({
          data: {
            mlmMemberId:   mlmMember.id,
            productCode:   product.productCode,
            productName:   product.name,
            quantity,
            unitPrice,
            points:        product.pv,
            totalPoints:   product.pv * quantity,
            purchaseStatus: "one_time",
            purchaseMonth:  "2026-04",
            purchasedAt:    orderedAt,
          },
        });
      }

      results.push(
        `[作成完了] ${buyer.memberCode} ${buyer.name} ` +
        `/ 注文番号: ${orderNumber} ` +
        `/ 商品: ${product.name} ¥${unitPrice.toLocaleString()} ` +
        `/ PV: ${product.pv}`
      );
    } catch (e) {
      errors.push(`[エラー] ${buyer.memberCode} ${buyer.name}: ${e}`);
    }
  }

  return NextResponse.json({ success: true, product: { code: product.productCode, name: product.name, price: product.price, pv: product.pv }, results, errors });
}
