import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/admin/products/[id]
 * 商品更新
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { product_code, name, description, price, cost, pv, status } = body;

    // バリデーション
    if (!product_code || !name || price == null) {
      return NextResponse.json(
        { error: "商品コード、商品名、価格は必須です" },
        { status: 400 }
      );
    }

    // 商品コード重複チェック（自分以外）
    const existing = await prisma.mlmProduct.findFirst({
      where: {
        productCode: product_code,
        id: { not: BigInt(id) },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この商品コードは既に使用されています" },
        { status: 400 }
      );
    }

    // 商品更新
    const product = await prisma.mlmProduct.update({
      where: { id: BigInt(id) },
      data: {
        productCode: product_code,
        name,
        description: description || null,
        price,
        cost: cost || 0,
        pv: pv || 0,
        status: status || "active",
      },
    });

    // BigIntをstringに変換
    const serializedProduct = {
      ...product,
      id: product.id.toString(),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    return NextResponse.json({ product: serializedProduct });
  } catch (error: any) {
    console.error("❌ 商品更新エラー:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 * 商品削除
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // 商品削除（物理削除）
    await prisma.mlmProduct.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ message: "商品を削除しました" });
  } catch (error: any) {
    console.error("❌ 商品削除エラー:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
