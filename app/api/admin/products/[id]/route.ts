import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

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
    const existing = await sql`
      SELECT id FROM mlm_products 
      WHERE product_code = ${product_code} AND id != ${id}
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "この商品コードは既に使用されています" },
        { status: 400 }
      );
    }

    // 商品更新
    const result = await sql`
      UPDATE mlm_products
      SET 
        product_code = ${product_code},
        name = ${name},
        description = ${description || null},
        price = ${price},
        cost = ${cost || 0},
        pv = ${pv || 0},
        status = ${status || 'active'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ product: result[0] });
  } catch (error: any) {
    console.error("❌ 商品更新エラー:", error);
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
    const result = await sql`
      DELETE FROM mlm_products
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ message: "商品を削除しました" });
  } catch (error: any) {
    console.error("❌ 商品削除エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
