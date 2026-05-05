export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// 支払方法ラベル
const PM_LABELS: Record<string, string> = {
  bank_transfer: "振替(銀行)",
  postal_transfer: "振替(郵便)",
  bank_payment: "銀行振込",
  cod: "代引き",
  card: "カード",
  cash: "現金",
  convenience: "コンビニ",
  other: "その他",
  accounts_receivable: "売掛",
  cod_ng: "代引NG",
  stop_shipping: "発送停止",
  refund: "返金",
  points_payment: "ポイント",
};

// 伝票種別ラベル
const SLIP_LABELS: Record<string, string> = {
  autoship: "オートシップ",
  new_member: "新規",
  one_time: "都度払い",
  cooling_off: "クーリングオフ",
  return: "返品",
  normal: "通常",
  next_month: "翌月分",
  additional: "追加",
  exchange: "交換",
  cancel: "キャンセル",
  other: "その他",
  redelivery: "再配送",
  refund_target: "返金対象",
  refund: "返金",
  partial: "分納",
  defective: "商品不良",
  shortage: "過不足",
  web: "Web",
  present: "プレゼント",
  mid_cancel: "中途解約",
  subscription: "定期購入",
  mypage: "MyPage",
};

// slipType → purchaseStatus マッピング（共通）
const SLIP_TO_PURCHASE_STATUS: Record<string, string> = {
  autoship: "autoship",
  new_member: "new_member",
  cooling_off: "cooling_off",
  cancel: "canceled",
  return: "canceled",
};

// ── GET: 会員の伝票一覧取得 ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberCode = searchParams.get("memberCode");

    if (!memberCode) {
      return NextResponse.json({ error: "会員コードは必須項目です" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { memberCode },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: { mlmProduct: true },
        },
        shippingLabel: true,
      },
      orderBy: { orderedAt: "desc" },
    });

    const formatted = orders.map((o) => ({
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      slipType: o.slipType,
      slipTypeLabel: SLIP_LABELS[o.slipType] || o.slipType,
      paymentMethod: o.paymentMethod || "",
      paymentMethodLabel: PM_LABELS[o.paymentMethod || ""] || o.paymentMethod || "",
      paymentStatus: o.paymentStatus,
      shippingStatus: o.shippingStatus,
      outboxNo: o.outboxNo,
      orderedAt: o.orderedAt.toISOString(),
      paidAt: o.paidAt?.toISOString() || null,
      note: o.note || "",
      noteSlip: o.noteSlip || "",
      subtotalAmount: o.subtotalAmount,
      totalAmount: o.totalAmount,
      items: o.items.map((item) => ({
        id: item.id.toString(),
        productId: item.productId?.toString() ?? "",
        productName: item.productName,
        productCode: item.mlmProduct?.productCode || "",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineAmount: item.lineAmount,
        points: item.mlmProduct?.pv || 0,
      })),
      shippingLabel: o.shippingLabel
        ? {
            id: o.shippingLabel.id.toString(),
            recipientName: o.shippingLabel.recipientName,
            recipientPhone: o.shippingLabel.recipientPhone,
            recipientPostal: o.shippingLabel.recipientPostal,
            recipientAddress: o.shippingLabel.recipientAddress,
            recipientCompany: o.shippingLabel.recipientCompany || "",
            deliveryTime: o.shippingLabel.deliveryTime || "",
            shippedAt: o.shippingLabel.shippedAt?.toISOString() || null,
            trackingNumber: o.shippingLabel.trackingNumber || "",
          }
        : null,
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error) {
    console.error("❌ MLM member orders GET error:", error);
    return NextResponse.json({ error: "伝票一覧の取得に失敗しました" }, { status: 500 });
  }
}

// ── POST: 伝票作成 ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberCode,
      orderedAt,
      shippedAt,
      paidAt,
      slipType,
      paymentMethod,
      deliveryDate,
      deliveryTime,
      bundleTargetId,
      autoshipNo,
      deliverySlipNo,
      taxMethod,
      paymentHolder,
      // 注文者情報
      ordererMemberId,
      ordererCompany,
      ordererName,
      ordererPostal,
      ordererPrefecture,
      ordererCity,
      ordererBuilding,
      ordererPhone,
      ordererNote,
      ordererNoteSlip,
      detailName,
      // 配送先
      recipientCompany,
      recipientName,
      recipientPostal,
      recipientPrefecture,
      recipientCity,
      recipientBuilding,
      recipientPhone,
      deliveryCenter,
      // 商品
      items,
      // 作成後BOX
      afterCreateOutbox,
    } = body;

    if (!memberCode) {
      return NextResponse.json({ error: "会員コードは必須項目です" }, { status: 400 });
    }

    // 会員取得
    const user = await prisma.user.findUnique({
      where: { memberCode },
      select: { id: true, name: true, postalCode: true, address: true, phone: true },
    });
    if (!user) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    // 注文番号生成
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 商品合計計算
    let subtotal8 = 0;
    let subtotal10 = 0;
    let totalPoints = 0;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const lineAmt = (item.unitPrice || 0) * (item.quantity || 1);
        if (item.taxRate === 8) {
          subtotal8 += lineAmt;
        } else {
          subtotal10 += lineAmt;
        }
        totalPoints += (item.points || 0) * (item.quantity || 1);
      }
    }

    const tax8 = Math.floor(subtotal8 * 0.08);
    const tax10 = Math.floor(subtotal10 * 0.10);
    const subtotalAmount = subtotal8 + subtotal10;
    const totalAmount = subtotalAmount + tax8 + tax10;

    // Order作成
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNumber,
        status: "pending",
        slipType: slipType || "one_time",
        paymentMethod: paymentMethod || "other",
        paymentStatus: paidAt ? "paid" : "unpaid",
        shippingStatus: shippedAt ? "shipped" : "unshipped",
        outboxNo: afterCreateOutbox ? Number(afterCreateOutbox) : 0,
        orderedAt: orderedAt ? new Date(orderedAt) : new Date(),
        paidAt: paidAt ? new Date(paidAt) : null,
        note: ordererNote || null,
        noteSlip: ordererNoteSlip || null,
        subtotalAmount,
        totalAmount,
        usedPoints: 0,
      },
    });

    // OrderItems作成
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.productName && !item.productId) continue;
        const lineAmount = (item.unitPrice || 0) * (item.quantity || 1);
        if (item.productId) {
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: BigInt(item.productId),
              productName: item.productName || "",
              unitPrice: item.unitPrice || 0,
              quantity: item.quantity || 1,
              lineAmount,
            },
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.orderItem as any).create({
            data: {
              orderId: order.id,
              productName: item.productName || "",
              unitPrice: item.unitPrice || 0,
              quantity: item.quantity || 1,
              lineAmount,
            },
          });
        }
      }
    }

    // ShippingLabel作成
    const fullRecipientAddress = [recipientPrefecture || "", recipientCity || "", recipientBuilding || ""]
      .filter(Boolean).join(" ");
    const fullOrdererAddress = [ordererPrefecture || "", ordererCity || "", ordererBuilding || ""]
      .filter(Boolean).join(" ");

    await prisma.shippingLabel.create({
      data: {
        orderId: order.id,
        orderNumber,
        carrier: "yamato",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (shippedAt ? "shipped" : "pending") as any,
        ordererName: ordererName || user.name,
        legalEntityName: ordererCompany || null,
        ordererPhone: ordererPhone || user.phone || null,
        recipientName: recipientName || ordererName || user.name,
        recipientPhone: recipientPhone || ordererPhone || user.phone || "",
        recipientPostal: recipientPostal || ordererPostal || user.postalCode || "",
        recipientAddress: fullRecipientAddress || fullOrdererAddress || user.address || "",
        recipientCompany: recipientCompany || null,
        deliveryTime: deliveryTime || null,
        deliveryCenter: deliveryCenter || null,
        desiredDeliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        autoshipNo: autoshipNo || null,
        shippedAt: shippedAt ? new Date(shippedAt) : null,
        itemDescription: items?.map((i: { productName: string }) => i.productName).join(", ") || "",
        itemCount: items?.length || 0,
      },
    });

    // MlmPurchase記録（ポイント対象商品コード1000〜2999のみ）
    if (items && Array.isArray(items)) {
      const mlmMember = await prisma.mlmMember.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (mlmMember) {
        const purchaseStatus = SLIP_TO_PURCHASE_STATUS[slipType || ""] || "one_time";
        const purchasedAt = orderedAt ? new Date(orderedAt) : new Date();

        for (const item of items) {
          if (!item.points || item.points <= 0) continue;
          const code = item.productCode || "";
          const codeNum = parseInt(code.replace(/[^0-9]/g, ""));
          if (codeNum >= 1000 && codeNum <= 2999) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma.mlmPurchase as any).create({
              data: {
                mlmMemberId: mlmMember.id,
                orderId: order.id,          // 伝票IDで一意に紐付け
                productCode: code,
                productName: item.productName || "",
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                points: item.points || 0,
                totalPoints: (item.points || 0) * (item.quantity || 1),
                purchaseStatus: purchaseStatus as any,
                purchaseMonth: (orderedAt || new Date().toISOString()).slice(0, 7),
                purchasedAt,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id.toString(),
      orderNumber,
      totalAmount,
      totalPoints,
    });
  } catch (error) {
    console.error("❌ MLM member orders POST error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("Foreign key constraint") || errMsg.includes("OrderItem_productId_fkey")) {
      return NextResponse.json(
        { error: "商品マスターに存在しない商品IDが指定されています。商品を選択し直してください。" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: `伝票作成に失敗しました: ${errMsg}` }, { status: 500 });
  }
}

// ── PUT: 伝票更新 ────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      memberCode,
      orderedAt,
      shippedAt,
      paidAt,
      slipType,
      paymentMethod,
      deliveryDate,
      deliveryTime,
      bundleTargetId,
      autoshipNo,
      deliverySlipNo,
      taxMethod,
      paymentHolder,
      ordererMemberId,
      ordererCompany,
      ordererName,
      ordererPostal,
      ordererPrefecture,
      ordererCity,
      ordererBuilding,
      ordererPhone,
      ordererNote,
      ordererNoteSlip,
      detailName,
      recipientCompany,
      recipientName,
      recipientPostal,
      recipientPrefecture,
      recipientCity,
      recipientBuilding,
      recipientPhone,
      deliveryCenter,
      items,
      afterCreateOutbox,
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: "伝票IDは必須項目です" }, { status: 400 });
    }

    const orderIdBig = BigInt(orderId);

    // 商品合計計算
    let subtotal8 = 0;
    let subtotal10 = 0;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const lineAmt = (item.unitPrice || 0) * (item.quantity || 1);
        if (item.taxRate === 8) {
          subtotal8 += lineAmt;
        } else {
          subtotal10 += lineAmt;
        }
      }
    }

    const tax8 = Math.floor(subtotal8 * 0.08);
    const tax10 = Math.floor(subtotal10 * 0.10);
    const subtotalAmount = subtotal8 + subtotal10;
    const totalAmount = subtotalAmount + tax8 + tax10;

    // Order更新
    await prisma.order.update({
      where: { id: orderIdBig },
      data: {
        slipType: slipType || "one_time",
        paymentMethod: paymentMethod || "other",
        paymentStatus: paidAt ? "paid" : "unpaid",
        shippingStatus: shippedAt ? "shipped" : "unshipped",
        outboxNo: afterCreateOutbox != null ? Number(afterCreateOutbox) : undefined,
        orderedAt: orderedAt ? new Date(orderedAt) : undefined,
        paidAt: paidAt ? new Date(paidAt) : null,
        note: ordererNote ?? undefined,
        noteSlip: ordererNoteSlip ?? undefined,
        subtotalAmount,
        totalAmount,
      },
    });

    // OrderItems削除→再作成
    if (items && Array.isArray(items)) {
      await prisma.orderItem.deleteMany({ where: { orderId: orderIdBig } });
      for (const item of items) {
        if (!item.productName && !item.productId) continue;
        const lineAmount = (item.unitPrice || 0) * (item.quantity || 1);
        if (item.productId) {
          await prisma.orderItem.create({
            data: {
              orderId: orderIdBig,
              productId: BigInt(item.productId),
              productName: item.productName || "",
              unitPrice: item.unitPrice || 0,
              quantity: item.quantity || 1,
              lineAmount,
            },
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.orderItem as any).create({
            data: {
              orderId: orderIdBig,
              productName: item.productName || "",
              unitPrice: item.unitPrice || 0,
              quantity: item.quantity || 1,
              lineAmount,
            },
          });
        }
      }
    }

    // ShippingLabel更新
    const fullRecipientAddress = [recipientPrefecture || "", recipientCity || "", recipientBuilding || ""]
      .filter(Boolean).join(" ");
    const fullOrdererAddress = [ordererPrefecture || "", ordererCity || "", ordererBuilding || ""]
      .filter(Boolean).join(" ");

    const existingLabel = await prisma.shippingLabel.findUnique({ where: { orderId: orderIdBig } });
    if (existingLabel) {
      await prisma.shippingLabel.update({
        where: { orderId: orderIdBig },
        data: {
          ordererName: ordererName || undefined,
          legalEntityName: ordererCompany || null,
          ordererPhone: ordererPhone || null,
          recipientName: recipientName || ordererName || undefined,
          recipientPhone: recipientPhone || ordererPhone || "",
          recipientPostal: recipientPostal || ordererPostal || "",
          recipientAddress: fullRecipientAddress || fullOrdererAddress || "",
          recipientCompany: recipientCompany || null,
          deliveryTime: deliveryTime || null,
          deliveryCenter: deliveryCenter || null,
          desiredDeliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          autoshipNo: autoshipNo || null,
          shippedAt: shippedAt ? new Date(shippedAt) : null,
          itemDescription: items?.map((i: { productName: string }) => i.productName).join(", ") || "",
          itemCount: items?.length || 0,
        },
      });
    }

    // ─── MlmPurchase 同期 ────────────────────────────────────────
    // orderId で紐付いているレコードを削除→再作成（完全置換）
    const orderForSync = await prisma.order.findUnique({
      where: { id: orderIdBig },
      select: {
        orderNumber: true,
        orderedAt: true,
        user: {
          select: {
            mlmMember: { select: { id: true } },
          },
        },
      },
    });

    if (orderForSync?.user?.mlmMember) {
      const syncMlmMemberId = orderForSync.user.mlmMember.id;
      const originalOrderedAt = orderForSync.orderedAt;

      // 更新後の注文月を決定
      const newPurchaseMonth = orderedAt
        ? (orderedAt as string).slice(0, 7)
        : (originalOrderedAt?.toISOString() ?? new Date().toISOString()).slice(0, 7);

      // ── この伝票（orderId）に紐付くMlmPurchaseをすべて削除
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.mlmPurchase as any).deleteMany({
        where: {
          mlmMemberId: syncMlmMemberId,
          orderId: orderIdBig,
        },
      });

      // ── 新しい商品情報で再作成
      const purchaseStatus = SLIP_TO_PURCHASE_STATUS[slipType || ""] || "one_time";
      const purchasedAt = orderedAt ? new Date(orderedAt) : (originalOrderedAt ?? new Date());

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (!item.points || item.points <= 0) continue;
          const code = item.productCode || "";
          const codeNum = parseInt(code.replace(/[^0-9]/g, ""));
          if (codeNum >= 1000 && codeNum <= 2999) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma.mlmPurchase as any).create({
              data: {
                mlmMemberId: syncMlmMemberId,
                orderId: orderIdBig,            // 伝票IDで一意に紐付け
                productCode: code,
                productName: item.productName || "",
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                points: item.points || 0,
                totalPoints: (item.points || 0) * (item.quantity || 1),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                purchaseStatus: purchaseStatus as any,
                purchaseMonth: newPurchaseMonth,
                purchasedAt,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, orderId, totalAmount });
  } catch (error) {
    console.error("❌ MLM member orders PUT error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `伝票更新に失敗しました: ${errMsg}` }, { status: 500 });
  }
}

// ── DELETE: 伝票削除 ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "伝票IDは必須項目です" }, { status: 400 });
    }

    const orderIdBig = BigInt(orderId);

    // 存在確認
    const order = await prisma.order.findUnique({ where: { id: orderIdBig } });
    if (!order) {
      return NextResponse.json({ error: "伝票が見つかりません" }, { status: 404 });
    }

    // 削除（CASCADEで関連データも削除）
    await prisma.order.delete({ where: { id: orderIdBig } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ MLM member orders DELETE error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `伝票削除に失敗しました: ${errMsg}` }, { status: 500 });
  }
}
