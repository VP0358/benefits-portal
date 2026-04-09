import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/products
 * 商品マスター一覧取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await prisma.mlmProduct.findMany({
      orderBy: { productCode: "asc" },
    });

    // BigIntをstringに変換 & snake_caseに統一
    const serializedProducts = products.map((p) => ({
      id: p.id.toString(),
      product_code: p.productCode,
      name: p.name,
      description: p.description,
      price: p.price,
      cost: p.cost,
      pv: p.pv,
      status: p.status,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ products: serializedProducts });
  } catch (error: any) {
    console.error("❌ 商品一覧取得エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/products
 * 商品追加
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { product_code, name, description, price, cost, pv, status } = body;

    // バリデーション
    if (!product_code || !name || price == null) {
      return NextResponse.json(
        { error: "商品コード、商品名、価格は必須です" },
        { status: 400 }
      );
    }

    // 商品コード重複チェック
    const existing = await prisma.mlmProduct.findUnique({
      where: { productCode: product_code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この商品コードは既に使用されています" },
        { status: 400 }
      );
    }

    // 商品追加
    const product = await prisma.mlmProduct.create({
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

    // BigIntをstringに変換 & snake_caseに統一
    const serializedProduct = {
      id: product.id.toString(),
      product_code: product.productCode,
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost,
      pv: product.pv,
      status: product.status,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
    };

    return NextResponse.json({ product: serializedProduct }, { status: 201 });
  } catch (error: any) {
    console.error("❌ 商品追加エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
