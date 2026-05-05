// バックフィルスクリプト: mlm_purchasesにorder_idが未設定の伝票を補完
const { Client } = require('../../node_modules/pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SLIP_TO_STATUS = {
  autoship: 'autoship',
  new_member: 'new_member',
  cooling_off: 'cooling_off',
  cancel: 'canceled',
  return: 'canceled',
};

async function main() {
  const c = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log('DB接続OK');

  // mlm_purchasesにorder_idが存在しない伝票のうち、pv>0の商品コード1000-2999を持つものを対象
  const { rows } = await c.query(`
    SELECT
      o.id::text AS order_id,
      o."slipType",
      o."orderedAt",
      m.id::text AS mlm_member_id,
      oi."productName",
      oi."unitPrice",
      oi.quantity,
      mp."productCode",
      mp.pv
    FROM "Order" o
    JOIN mlm_members m ON m."userId" = o."userId"
    JOIN "OrderItem" oi ON oi."orderId" = o.id
    JOIN mlm_products mp ON mp.id = oi."productId"
    WHERE mp.pv > 0
      AND CAST(regexp_replace(mp."productCode", '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1000 AND 2999
      AND NOT EXISTS (
        SELECT 1 FROM mlm_purchases p2
        WHERE p2."mlmMemberId" = m.id
          AND p2.order_id = o.id
      )
    ORDER BY o.id
  `);

  console.log('バックフィル対象:', rows.length, '件');

  let inserted = 0;
  for (const row of rows) {
    const codeNum = parseInt(row.productCode.replace(/[^0-9]/g, ''));
    if (isNaN(codeNum) || codeNum < 1000 || codeNum > 2999) continue;

    const purchaseStatus = SLIP_TO_STATUS[row.slipType] || 'one_time';
    const purchaseMonth = row.orderedAt.toISOString().slice(0, 7);

    try {
      await c.query(
        `INSERT INTO mlm_purchases
          ("mlmMemberId", order_id, "productCode", "productName", quantity, "unitPrice", points, "totalPoints", "purchaseStatus", "purchaseMonth", "purchasedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          row.mlm_member_id,
          row.order_id,
          row.productCode,
          row.productName,
          row.quantity,
          row.unitPrice,
          row.pv,
          row.pv * row.quantity,
          purchaseStatus,
          purchaseMonth,
          row.orderedAt,
        ]
      );
      inserted++;
      console.log(`  挿入: order_id=${row.order_id} ${row.productCode} pv=${row.pv}`);
    } catch (e) {
      console.error(`  エラー (order_id=${row.order_id}):`, e.message);
    }
  }

  console.log(`\n完了: ${inserted}/${rows.length} 件挿入`);
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
