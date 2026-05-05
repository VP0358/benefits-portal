export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateJST } from "@/lib/japan-time";
import { hash } from "bcryptjs";

// ワンタイムトークン
const INTERNAL_TOKEN = "Xk9pQ2mRvL7nW4sJ8dY3cH6bE1fA5gT";

function parseCSVDate(raw: string): Date | null {
  if (!raw?.trim()) return null;
  const p = raw.trim().split("/");
  if (p.length !== 3) return null;
  const y = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  const d = parseInt(p[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return parseDateJST(iso);
}

function idToMemberCode(mid: string): string {
  mid = mid.trim();
  if (mid.length < 3) return mid;
  return `${mid.slice(0, mid.length - 2)}-${mid.slice(-2)}`;
}

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
      error: "商品コード1000が見つかりません",
      hint: "productCode='1000' のレコードが mlm_products テーブルに存在するか確認してください",
    });
  }
  results.push(`[商品確認] ${product.productCode} ${product.name} / ¥${product.price} / PV:${product.pv}`);

  // ── 2026年4月購入者2名（CSVから取得） ──
  const buyers = [
    {
      csvId:        "11494201",
      memberCode:   idToMemberCode("11494201"),
      name:         "田中　純子",
      nameKana:     "タナカ　ジュンコ",
      email:        "",
      password:     "0000",
      gender:       "female",
      birthDate:    "1972/11/12",
      contractDate: "2026/4/7",
      firstPayDate: "2026/4/7",
      mobile:       "080-1950-7666",
      postalCode:   "9392718",
      prefecture:   "富山県",
      city:         "富山市婦中町分田40-6",
      address2:     "",
      status:       "active" as const,
      disclosureDocNumber: "124807110",
      referrerCsvId: "86820603",
      uplineCsvId:   "86820603",
    },
    {
      csvId:        "89015501",
      memberCode:   idToMemberCode("89015501"),
      name:         "林　真一郎",
      nameKana:     "ハヤシ　シンイチロウ",
      email:        "joseph.hel.1007@gmail.com",
      password:     "0000",
      gender:       "male",
      birthDate:    "1983/10/7",
      contractDate: "2026/4/29",
      firstPayDate: "2026/4/29",
      mobile:       "090-2129-2119",
      postalCode:   "7100822",
      prefecture:   "岡山県",
      city:         "倉敷市稲荷町8-24",
      address2:     "ヴェルディ倉敷駅南1103",
      status:       "active" as const,
      disclosureDocNumber: "128635528",
      referrerCsvId: "93713604",
      uplineCsvId:   "93713604",
    },
  ];

  // 注文日: 2026年4月1日 JST
  const orderedAt = parseDateJST("2026-04-01") ?? new Date("2026-03-31T15:00:00Z");

  for (const buyer of buyers) {
    try {
      // ── 会員存在確認 ──
      let user = await prisma.user.findUnique({
        where: { memberCode: buyer.memberCode },
        select: { id: true, name: true, postalCode: true, address: true, phone: true },
      });

      // ── 会員が未登録なら新規作成 ──
      if (!user) {
        const finalEmail = buyer.email || `member-${buyer.csvId}@noemail.viola-pure.net`;

        // メール重複チェック
        const emailConflict = await prisma.user.findFirst({ where: { email: finalEmail } });
        if (emailConflict) {
          errors.push(`[エラー] ${buyer.memberCode} ${buyer.name}: メール重複 ${finalEmail}`);
          continue;
        }

        const passwordHash  = await hash(buyer.password, 10);
        const birthDate     = parseCSVDate(buyer.birthDate);
        const contractDate  = parseCSVDate(buyer.contractDate);
        const firstPayDate  = parseCSVDate(buyer.firstPayDate);
        const addressStr    = [buyer.prefecture, buyer.city, buyer.address2].filter(Boolean).join(" ");

        const newUser = await prisma.user.create({
          data: {
            memberCode:  buyer.memberCode,
            name:        buyer.name,
            nameKana:    buyer.nameKana || undefined,
            email:       finalEmail,
            passwordHash,
            status:      "active",
            phone:       buyer.mobile || undefined,
            postalCode:  buyer.postalCode || undefined,
            address:     addressStr || undefined,
          },
        });

        await prisma.mlmMember.create({
          data: {
            userId:       newUser.id,
            memberCode:   buyer.memberCode,
            memberType:   "business",
            status:       buyer.status,
            gender:       buyer.gender || undefined,
            birthDate:    birthDate ?? undefined,
            contractDate: contractDate ?? undefined,
            firstPayDate: firstPayDate ?? undefined,
            mobile:       buyer.mobile || undefined,
            prefecture:   buyer.prefecture || undefined,
            city:         buyer.city || undefined,
            paymentMethod: "credit_card",
            autoshipEnabled: false,
          },
        });

        await prisma.pointWallet.create({
          data: {
            userId:                 newUser.id,
            autoPointsBalance:      0,
            manualPointsBalance:    0,
            externalPointsBalance:  0,
            availablePointsBalance: 0,
          },
        });

        if (buyer.disclosureDocNumber) {
          await prisma.mlmRegistration.upsert({
            where:  { userId: newUser.id },
            create: { userId: newUser.id, disclosureDocNumber: buyer.disclosureDocNumber },
            update: { disclosureDocNumber: buyer.disclosureDocNumber },
          });
        }

        // 紹介者・直上者の紐づけ
        const toMC = (id: string) => idToMemberCode(id);
        const upd: Record<string, bigint> = {};
        if (buyer.referrerCsvId) {
          const ref = await prisma.mlmMember.findUnique({ where: { memberCode: toMC(buyer.referrerCsvId) }, select: { id: true } });
          if (ref) upd.referrerId = ref.id;
        }
        if (buyer.uplineCsvId) {
          const up = await prisma.mlmMember.findUnique({ where: { memberCode: toMC(buyer.uplineCsvId) }, select: { id: true } });
          if (up) upd.uplineId = up.id;
        }
        if (Object.keys(upd).length > 0) {
          await prisma.mlmMember.update({ where: { userId: newUser.id }, data: upd });
        }

        results.push(`[会員新規作成] ${buyer.memberCode} ${buyer.name}`);

        user = await prisma.user.findUnique({
          where: { memberCode: buyer.memberCode },
          select: { id: true, name: true, postalCode: true, address: true, phone: true },
        });
      }

      if (!user) {
        errors.push(`[エラー] ${buyer.memberCode} ${buyer.name}: 会員作成後も取得できません`);
        continue;
      }

      // ── 既存伝票チェック（2026年4月・同商品の二重登録防止） ──
      const existingOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          orderedAt: {
            gte: new Date("2026-03-31T15:00:00Z"),
            lt:  new Date("2026-04-30T15:00:00Z"),
          },
          items: { some: { productId: product.id } },
        },
      });

      if (existingOrder) {
        results.push(`[スキップ] ${buyer.memberCode} ${buyer.name}: 2026年4月の伝票が既に存在 (${existingOrder.orderNumber})`);
        continue;
      }

      const unitPrice      = product.price;
      const quantity       = 1;
      const subtotalAmount = unitPrice * quantity;
      const totalAmount    = subtotalAmount;

      const orderNumber = `ORD-APR2026-${buyer.memberCode.replace("-", "")}-${Date.now()}`;

      const mlmMember = await prisma.mlmMember.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      // ── Order 作成 ──
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
      const addressFull = [buyer.prefecture, buyer.city, buyer.address2].filter(Boolean).join(" ");
      await prisma.shippingLabel.create({
        data: {
          orderId:          order.id,
          orderNumber,
          carrier:          "yamato",
          status:           "shipped",
          recipientName:    user.name,
          recipientPhone:   user.phone || buyer.mobile || "",
          recipientPostal:  user.postalCode || buyer.postalCode || "",
          recipientAddress: user.address || addressFull || "",
          itemDescription:  product.name,
          itemCount:        1,
          shippedAt:        orderedAt,
        },
      });

      // ── MlmPurchase 作成（ポイント計算用） ──
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
        `[伝票作成完了] ${buyer.memberCode} ${buyer.name}` +
        ` / 注文番号: ${orderNumber}` +
        ` / ${product.name} ¥${unitPrice.toLocaleString()}` +
        ` / PV: ${product.pv}`
      );
    } catch (e) {
      errors.push(`[エラー] ${buyer.memberCode} ${buyer.name}: ${e}`);
    }
  }

  return NextResponse.json({
    success: true,
    product: {
      code:  product.productCode,
      name:  product.name,
      price: product.price,
      pv:    product.pv,
    },
    results,
    errors,
  });
}
