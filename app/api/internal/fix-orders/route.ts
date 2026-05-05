export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateJST } from "@/lib/japan-time";
import bcrypt from "bcryptjs";

const INTERNAL_TOKEN = "Fx3Qp7Yz2Wv9Rk5Ns1Jd8Ub4Lm6Ct0A";

// idToMemberCode: 末尾2桁を枝番とする
function idToMemberCode(csvId: string): string {
  const s = csvId.replace(/\D/g, "");
  if (s.length < 3) return s;
  const base = s.slice(0, s.length - 2);
  const branch = s.slice(-2);
  return `${base}-${branch}`;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode") ?? "check";
  const results: string[] = [];
  const errors: string[] = [];

  // ── 対象会員データ（CSVより取得済み） ──
  const members = [
    {
      csvId: "11494201",
      memberCode: "114942-01",
      name: "田中　純子",
      nameKana: "タナカ　ジュンコ",
      nickname: "タナカ　ジュンコ",
      birthDate: "1972/11/12",
      gender: "女性",
      password: "0000",          // CSVのパスワードが"0"のため初期値
      status: "活動中",
      email: null,               // メールアドレスなし
      phone: "080-1950-7666",
      postalCode: "9392718",
      prefecture: "富山県",
      addressLine: "富山市婦中町分田40-6",
      building: "",
      contractDate: "2026/4/7",
      firstPayDate: "2026/4/7",
      referrerId: "86820603",
      uplineId: "86820603",
      disclosureNo: "124807110",
    },
    {
      csvId: "89015501",
      memberCode: "890155-01",
      name: "林　真一郎",
      nameKana: "ハヤシ　シンイチロウ",
      nickname: "ハヤシ　シンイチロウ",
      birthDate: "1983/10/7",
      gender: "男性",
      password: "hirotoyaokamakiuta01",
      status: "活動中",
      email: "joseph.hel.1007@gmail.com",
      phone: "090-2129-2119",
      postalCode: "7100822",
      prefecture: "岡山県",
      addressLine: "倉敷市稲荷町8-24",
      building: "ヴェルディ倉敷駅南1103",
      contractDate: "2026/4/29",
      firstPayDate: "2026/4/29",
      referrerId: "93713604",
      uplineId: "93713604",
      disclosureNo: "128635528",
    },
  ];

  // ─────────────────────────────────────────
  // mode=check: DB状態確認のみ
  // ─────────────────────────────────────────
  if (mode === "check") {
    results.push("=== DB状態確認 ===");

    for (const m of members) {
      const user = await prisma.user.findUnique({
        where: { memberCode: m.memberCode },
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
        results.push(`[存在] ${m.memberCode} ${user.name} (email: ${user.email ?? "なし"})`);
        results.push(`  作成日時: ${user.createdAt.toISOString()}`);
        for (const o of user.orders) {
          results.push(`  伝票: ${o.orderNumber} | ${o.slipType} | ${o.orderedAt.toISOString().slice(0,10)} | ${o.note ?? ""}`);
        }
      } else {
        results.push(`[存在しない] ${m.memberCode}`);
      }
    }

    return NextResponse.json({ mode, results, errors });
  }

  // ─────────────────────────────────────────
  // mode=delete: 誤作成データのみ削除（伝票・MLM含む）
  // ─────────────────────────────────────────
  if (mode === "delete") {
    results.push("=== 誤作成データ削除 ===");

    for (const m of members) {
      try {
        const user = await prisma.user.findUnique({
          where: { memberCode: m.memberCode },
          select: {
            id: true, name: true, email: true, createdAt: true,
            orders: { select: { id: true, orderNumber: true } },
          },
        });

        if (!user) {
          results.push(`[スキップ] ${m.memberCode}: DBに存在しません`);
          continue;
        }

        results.push(`[削除対象] ${m.memberCode} ${user.name} (作成: ${user.createdAt.toISOString()})`);
        results.push(`  伝票数: ${user.orders.length}件`);
        for (const o of user.orders) {
          results.push(`    - ${o.orderNumber}`);
        }

        // カスケード削除: User削除でMlmMember/Orders/PointWallet/etc.も削除
        await prisma.user.delete({ where: { id: user.id } });
        results.push(`[削除完了] ${m.memberCode} ${user.name}`);

      } catch (e) {
        errors.push(`[削除エラー] ${m.memberCode}: ${String(e)}`);
      }
    }

    return NextResponse.json({ mode, results, errors });
  }

  // ─────────────────────────────────────────
  // mode=register: 正しいデータで会員登録
  // ─────────────────────────────────────────
  if (mode === "register") {
    results.push("=== 会員登録（正しいデータ） ===");

    for (const m of members) {
      try {
        // 既に存在するかチェック
        const existing = await prisma.user.findUnique({
          where: { memberCode: m.memberCode },
          select: { id: true, name: true },
        });
        if (existing) {
          results.push(`[スキップ] ${m.memberCode} ${existing.name}: 既に存在します`);
          continue;
        }

        // 日付パース
        const parseDateFromCSV = (s: string) => {
          if (!s) return null;
          const [y, mo, d] = s.split("/");
          if (!y || !mo || !d) return null;
          const pad = (n: string) => n.padStart(2, "0");
          return parseDateJST(`${y}-${pad(mo)}-${pad(d)}`);
        };

        const birthDate    = parseDateFromCSV(m.birthDate);
        const contractDate = parseDateFromCSV(m.contractDate);
        const firstPayDate = parseDateFromCSV(m.firstPayDate);

        // 性別変換
        const genderMap: Record<string, string> = { "男性": "male", "女性": "female" };
        const gender = genderMap[m.gender] ?? "other";

        // ステイタス変換
        const statusMap: Record<string, string> = {
          "活動中": "active",
          "オートシップ": "autoship",
          "休止中": "suspended",
          "退会": "withdrawn",
        };
        const status = statusMap[m.status] ?? "active";

        // パスワードハッシュ
        const hashedPassword = await bcrypt.hash(m.password, 10);

        // 住所結合
        const fullAddress = [m.prefecture, m.addressLine, m.building].filter(Boolean).join(" ");

        // メールアドレス: なければダミー（@noemail形式）
        const email = m.email || `member-${m.csvId}@noemail.viola-pure.net`;

        // 紹介者・直上者のmemberCodeに変換して検索
        const referrerCode = m.referrerId ? idToMemberCode(m.referrerId) : null;
        const uplineCode   = m.uplineId   ? idToMemberCode(m.uplineId)   : null;

        const referrerMlm = referrerCode
          ? await prisma.mlmMember.findFirst({
              where: { user: { memberCode: referrerCode } },
              select: { id: true },
            })
          : null;
        const uplineMlm = uplineCode
          ? await prisma.mlmMember.findFirst({
              where: { user: { memberCode: uplineCode } },
              select: { id: true },
            })
          : null;

        // User 作成
        const user = await prisma.user.create({
          data: {
            memberCode:   m.memberCode,
            name:         m.name,
            nameKana:     m.nameKana,
            email,
            passwordHash: hashedPassword,
            phone:        m.phone,
            postalCode:   m.postalCode,
            address:      fullAddress,
          },
        });

        // MlmMember 作成
        const mlmMember = await prisma.mlmMember.create({
          data: {
            userId:              user.id,
            memberCode:          m.memberCode,
            status,
            contractDate,
            firstPayDate,
            disclosureDocNumber: m.disclosureNo,
            referrerId:          referrerMlm?.id ?? null,
            uplineId:            uplineMlm?.id   ?? null,
            birthDate,
            gender,
            mobile:              m.phone,
            prefecture:          m.prefecture,
            address1:            m.addressLine,
            address2:            m.building || null,
          },
        });

        // PointWallet 作成
        await prisma.pointWallet.create({
          data: {
            userId:      user.id,
            totalPoints: 0,
            usedPoints:  0,
          },
        });

        results.push(
          `[登録完了] ${m.memberCode} ${m.name}` +
          ` / email: ${email}` +
          ` / 契約: ${m.contractDate}` +
          (referrerMlm ? ` / 紹介者: ${referrerCode}` : " / 紹介者: 未登録")
        );

      } catch (e) {
        errors.push(`[登録エラー] ${m.memberCode}: ${String(e)}`);
      }
    }

    return NextResponse.json({ mode, results, errors });
  }

  // ─────────────────────────────────────────
  // mode=create-orders: 既存会員に伝票作成
  // ─────────────────────────────────────────
  if (mode === "create-orders") {
    results.push("=== 伝票・購入履歴作成 ===");

    // 商品コード1000取得
    const product = await prisma.mlmProduct.findFirst({
      where: { productCode: "1000", isActive: true },
    });
    if (!product) {
      errors.push("商品コード1000が見つかりません");
      return NextResponse.json({ mode, results, errors });
    }
    results.push(`[商品] ${product.productCode} ${product.name} / ¥${product.price} / PV:${product.pv}`);

    for (const m of members) {
      try {
        const user = await prisma.user.findUnique({
          where: { memberCode: m.memberCode },
          select: { id: true, name: true, postalCode: true, address: true, phone: true },
        });

        if (!user) {
          errors.push(`[エラー] ${m.memberCode}: 会員がDBに見つかりません（先にregisterを実行してください）`);
          continue;
        }

        // 購入日: 契約締結日をJSTで使用
        const parseDateFromCSV = (s: string) => {
          if (!s) return null;
          const [y, mo, d] = s.split("/");
          if (!y || !mo || !d) return null;
          const pad = (n: string) => n.padStart(2, "0");
          return parseDateJST(`${y}-${pad(mo)}-${pad(d)}`);
        };
        const orderedAt = parseDateFromCSV(m.contractDate) ?? new Date("2026-03-31T15:00:00Z");

        // 二重登録防止チェック（4月分の商品コード1000）
        const aprilStart = new Date("2026-03-31T15:00:00Z"); // JST 2026-04-01 00:00
        const aprilEnd   = new Date("2026-04-30T15:00:00Z"); // JST 2026-05-01 00:00
        const existing = await prisma.order.findFirst({
          where: {
            userId: user.id,
            orderedAt: { gte: aprilStart, lt: aprilEnd },
            items: { some: { productId: product.id } },
          },
          select: { orderNumber: true },
        });
        if (existing) {
          results.push(`[スキップ] ${m.memberCode} ${user.name}: 2026年4月の伝票が既に存在 (${existing.orderNumber})`);
          continue;
        }

        const unitPrice      = product.price;
        const quantity       = 1;
        const subtotalAmount = unitPrice * quantity;
        const totalAmount    = subtotalAmount;
        const orderNumber    = `ORD-APR2026-${m.csvId}-${Date.now()}`;

        const mlmMember = await prisma.mlmMember.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });

        // Order 作成
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
            note:           "2026年4月 商品コード1000 [新規]VIOLA Pure 翠彩-SUMISAI- 購入",
            subtotalAmount,
            totalAmount,
            usedPoints:     0,
          },
        });

        // OrderItem 作成
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

        // ShippingLabel 作成
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

        // MlmPurchase 作成
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
          `[伝票作成完了] ${m.memberCode} ${user.name}` +
          ` / 注文番号: ${orderNumber}` +
          ` / ${product.name} ¥${unitPrice.toLocaleString()}` +
          ` / PV: ${product.pv}` +
          ` / 購入日: ${orderedAt.toISOString().slice(0,10)}`
        );

      } catch (e) {
        errors.push(`[エラー] ${m.memberCode}: ${String(e)}`);
      }
    }

    return NextResponse.json({ mode, results, errors });
  }

  return NextResponse.json({
    error: "mode を指定してください",
    modes: ["check", "delete", "register", "create-orders"],
  }, { status: 400 });
}
