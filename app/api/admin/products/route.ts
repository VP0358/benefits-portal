import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

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
    const products = await sql`
      SELECT 
        id,
        product_code,
        name,
        description,
        price,
        cost,
        pv,
        status,
        created_at,
        updated_at
      FROM mlm_products
      ORDER BY product_code ASC
    `;

    return NextResponse.json({ products });
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
    const existing = await sql`
      SELECT id FROM mlm_products WHERE product_code = ${product_code}
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "この商品コードは既に使用されています" },
        { status: 400 }
      );
    }

    // 商品追加
    const result = await sql`
      INSERT INTO mlm_products (product_code, name, description, price, cost, pv, status)
      VALUES (
        ${product_code},
        ${name},
        ${description || null},
        ${price},
        ${cost || 0},
        ${pv || 0},
        ${status || 'active'}
      )
      RETURNING *
    `;

    return NextResponse.json({ product: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error("❌ 商品追加エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
