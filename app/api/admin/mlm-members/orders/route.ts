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

// ── GET: 会員の伝票一覧取得 ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberCode = searchParams.get("memberCode");

    if (!memberCode) {
      return NextResponse.json({ error: "memberCode is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { memberCode },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: { product: true },
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
        productId: item.productId.toString(),
        productName: item.productName,
        productCode: (item.product as { productCode?: string })?.productCode || "",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineAmount: item.lineAmount,
        points: (item.product as { pv?: number })?.pv || 0,
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
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
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
      return NextResponse.json({ error: "memberCode is required" }, { status: 400 });
    }

    // 会員取得
    const user = await prisma.user.findUnique({
      where: { memberCode },
      select: { id: true, name: true, postalCode: true, address: true, phone: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
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
        if (!item.productId) continue;
        const lineAmount = (item.unitPrice || 0) * (item.quantity || 1);
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

    // slipType → purchaseStatus マッピング
    const slipToPurchaseStatus: Record<string, string> = {
      autoship: "autoship",
      new_member: "new_member",
      cooling_off: "cooling_off",
      cancel: "canceled",
      return: "canceled",
    };
    const purchaseStatus = slipToPurchaseStatus[slipType || ""] || "one_time";

    // MlmPurchase記録（ポイント対象商品のみ）
    if (items && Array.isArray(items)) {
      const mlmMember = await prisma.mlmMember.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (mlmMember) {
        for (const item of items) {
          if (!item.productId || !item.points || item.points <= 0) continue;
          const code = item.productCode || "";
          const codeNum = parseInt(code.replace(/[^0-9]/g, ""));
          if (codeNum >= 1000 && codeNum <= 2999) {
            await prisma.mlmPurchase.create({
              data: {
                mlmMemberId: mlmMember.id,
                productCode: code,
                productName: item.productName || "",
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                points: item.points || 0,
                totalPoints: (item.points || 0) * (item.quantity || 1),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                purchaseStatus: purchaseStatus as any,
                purchaseMonth: (orderedAt || new Date().toISOString()).slice(0, 7),
                purchasedAt: orderedAt ? new Date(orderedAt) : new Date(),
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ── PUT: 伝票更新 ────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
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
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
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
        if (!item.productId) continue;
        const lineAmount = (item.unitPrice || 0) * (item.quantity || 1);
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

    return NextResponse.json({ success: true, orderId, totalAmount });
  } catch (error) {
    console.error("❌ MLM member orders PUT error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ── DELETE: 伝票削除 ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const orderIdBig = BigInt(orderId);

    // 存在確認
    const order = await prisma.order.findUnique({ where: { id: orderIdBig } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 削除（CASCADEで関連データも削除）
    await prisma.order.delete({ where: { id: orderIdBig } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ MLM member orders DELETE error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
