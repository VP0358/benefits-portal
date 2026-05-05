/**
 * バックフィルスクリプト
 * 1. OrderItemのproductCode/pointsをmlm_productsから補完
 * 2. mlm_purchasesが未作成の伝票に対してmlm_purchasesを作成
 */
const { Client } = require('../node_modules/pg' || '../../node_modules/pg');

const DB = 'postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

// slipType → purchaseStatus マッピング
const SLIP_TO_PURCHASE_STATUS = {
  autoship: 'autoship',
  new_member: 'new_member',
  cooling_off: 'cooling_off',
  cancel: 'canceled',
  return: 'canceled',
};

async function run() {
  const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log('DB connected');

  try {
    // STEP1: productCode/points が NULL or 0 の OrderItem を mlm_products で補完
    console.log('\n=== STEP1: OrderItemのproductCode/pointsバックフィル ===');
    const step1 = await c.query(`
      UPDATE "OrderItem" oi
      SET "productCode" = mp."productCode",
          "points"      = mp.pv
      FROM mlm_products mp
      WHERE oi."productId" = mp.id
        AND (oi."productCode" IS NULL OR oi."points" = 0)
      RETURNING oi.id::text, oi."productCode", oi."points", oi."productName"
    `);
    console.log(`更新件数: ${step1.rowCount}件`);
    step1.rows.forEach(r => console.log(`  id=${r.id} ${r.productName}: code=${r.productCode} points=${r.points}`));

    // STEP2: mlm_purchasesが存在しない伝票で、pointsあり・コード1000〜2999の商品を持つものを探す
    console.log('\n=== STEP2: mlm_purchases未作成伝票の特定 ===');
    const step2 = await c.query(`
      SELECT
        o.id::text          AS order_id,
        o."orderNumber",
        o."slipType",
        o."orderedAt",
        u.id::text          AS user_id,
        mm.id::text         AS mlm_member_id,
        oi.id::text         AS item_id,
        oi."productCode",
        oi."productName",
        oi.quantity,
        oi."unitPrice",
        oi."points"
      FROM "Order" o
      JOIN "User" u ON u.id = o."userId"
      JOIN mlm_members mm ON mm."userId" = u.id
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      WHERE oi."points" > 0
        AND (CAST(REGEXP_REPLACE(oi."productCode", '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1000 AND 2999)
        AND NOT EXISTS (
          SELECT 1 FROM mlm_purchases mp
          WHERE mp.order_id = o.id AND mp."mlmMemberId" = mm.id
        )
      ORDER BY o.id, oi.id
    `);
    console.log(`mlm_purchases未作成の商品行: ${step2.rowCount}件`);

    if (step2.rowCount === 0) {
      console.log('バックフィル不要（既に全件存在）');
      return;
    }

    step2.rows.forEach(r => console.log(
      `  Order#${r.order_id}(${r.orderNumber}) ${r.product_code} ${r.productName} pts=${r.points} qty=${r.quantity}`
    ));

    // STEP3: mlm_purchases を作成
    console.log('\n=== STEP3: mlm_purchases作成 ===');
    let created = 0;
    for (const row of step2.rows) {
      const purchaseStatus = SLIP_TO_PURCHASE_STATUS[row.sliptype] || 'one_time';
      const purchasedAt = row.orderedat || new Date();
      const purchaseMonth = (purchasedAt instanceof Date ? purchasedAt : new Date(purchasedAt))
        .toISOString().slice(0, 7);

      await c.query(`
        INSERT INTO mlm_purchases (
          "mlmMemberId", order_id, "productCode", "productName",
          quantity, "unitPrice", points, "totalPoints",
          "purchaseStatus", "purchaseMonth", "purchasedAt", "createdAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      `, [
        BigInt(row.mlm_member_id),
        BigInt(row.order_id),
        row.productcode,
        row.productname,
        row.quantity,
        row.unitprice,
        row.points,
        row.points * row.quantity,
        purchaseStatus,
        purchaseMonth,
        purchasedAt,
      ]);
      created++;
      console.log(`  created: Order#${row.order_id} ${row.productname} month=${purchaseMonth}`);
    }
    console.log(`\n合計${created}件のmlm_purchasesを作成しました`);

  } finally {
    await c.end();
    console.log('\nDone.');
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
