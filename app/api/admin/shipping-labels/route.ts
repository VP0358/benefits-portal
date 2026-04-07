import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/** GET: 発送伝票一覧取得 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending | printed | shipped | canceled
  const carrier = searchParams.get("carrier"); // yamato | sagawa | japan_post

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (carrier) where.carrier = carrier;

  const labels = await prisma.shippingLabel.findMany({
    where,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderedAt: true,
          user: { select: { id: true, memberCode: true, name: true, phone: true } },
          items: { select: { productName: true, quantity: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    labels.map(l => ({
      id: l.id.toString(),
      orderId: l.orderId.toString(),
      orderNumber: l.orderNumber,
      carrier: l.carrier,
      trackingNumber: l.trackingNumber,
      status: l.status,
      recipientName: l.recipientName,
      recipientPhone: l.recipientPhone,
      recipientPostal: l.recipientPostal,
      recipientAddress: l.recipientAddress,
      senderName: l.senderName,
      senderPostal: l.senderPostal,
      senderAddress: l.senderAddress,
      senderPhone: l.senderPhone,
      itemDescription: l.itemDescription,
      itemCount: l.itemCount,
      printedAt: l.printedAt,
      shippedAt: l.shippedAt,
      note: l.note,
      createdAt: l.createdAt,
      order: {
        id: l.order.id.toString(),
        orderNumber: l.order.orderNumber,
        status: l.order.status,
        orderedAt: l.order.orderedAt,
        user: {
          id: l.order.user.id.toString(),
          memberCode: l.order.user.memberCode,
          name: l.order.user.name,
          phone: l.order.user.phone,
        },
        items: l.order.items,
      },
    }))
  );
}

/** POST: 注文から発送伝票を自動作成 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await request.json();
  const { orderId, carrier = "yamato", note } = body;

  if (!orderId) {
    return NextResponse.json({ error: "orderId は必須です" }, { status: 400 });
  }

  // 注文情報を取得
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: {
      user: { select: { name: true, phone: true, postalCode: true, address: true } },
      items: { select: { productName: true, quantity: true } },
      shippingLabel: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
  }
  if (order.shippingLabel) {
    return NextResponse.json({ error: "この注文にはすでに発送伝票が存在します" }, { status: 409 });
  }

  // 配送先を注文者情報から設定
  const label = await prisma.shippingLabel.create({
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      carrier,
      recipientName: order.user.name,
      recipientPhone: order.user.phone ?? "",
      recipientPostal: order.user.postalCode ?? "",
      recipientAddress: order.user.address ?? "",
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      note: note ?? null,
    },
  });

  return NextResponse.json({ id: label.id.toString(), orderNumber: label.orderNumber }, { status: 201 });
}
