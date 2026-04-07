import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

type Params = { params: Promise<{ id: string }> };

function escCsv(val: string | null | undefined): string {
  const s = val ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(cols: (string | number | null | undefined)[]): string {
  return cols.map(c => escCsv(String(c ?? ""))).join(",");
}

/**
 * GET: ヤマトビジネスメンバーズ向け発送CSVを生成
 *
 * ヤマトビジネスメンバーズ「送り状発行システムB2クラウド」
 * 一括取込用CSV形式
 *
 * 参考: B2クラウド CSV仕様（主要項目）
 * お客様管理番号,送り状種類,クール区分,伝票番号,出荷予定日,お届け予定日,配達時間帯,
 * お届け先電話番号,お届け先電話番号枝番,お届け先郵便番号,お届け先住所,お届け先アパートマンション名,
 * お届け先会社・部門1,お届け先会社・部門2,お届け先名,お届け先名略称,
 * 敬称,ご依頼主電話番号,ご依頼主電話番号枝番,ご依頼主郵便番号,ご依頼主住所,
 * ご依頼主アパートマンション,ご依頼主会社・部門1,ご依頼主会社・部門2,ご依頼主名,
 * 品名,荷姿コード,重量,サイズ,請求先顧客コード,請求先分類コード,運賃管理番号
 */
export async function GET(_req: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;

  const run = await prisma.autoShipRun.findUnique({
    where: { id: BigInt(id) },
    include: {
      orders: {
        where: { status: "paid" },
        include: { deliveryNote: true },
        orderBy: { memberCode: "asc" },
      },
    },
  });
  if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const paidOrders = run.orders;
  if (paidOrders.length === 0) {
    return NextResponse.json({ error: "発送対象の決済済み注文がありません" }, { status: 400 });
  }

  const month = run.targetMonth.replace("-", ""); // "YYYYMM"

  // 差出人情報（会社固定値）
  const SENDER_NAME    = "CLAIRホールディングス株式会社";
  const SENDER_POSTAL  = "0200026"; // ハイフンなし
  const SENDER_ADDRESS = "岩手県盛岡市開運橋通5-6";
  const SENDER_DEPT    = "第五菱和ビル5F";
  const SENDER_PHONE   = "0196813667"; // ハイフンなし

  // ヤマトB2クラウド CSV ヘッダー
  const header = [
    "お客様管理番号",
    "送り状種類",
    "クール区分",
    "伝票番号",
    "出荷予定日",
    "お届け予定日",
    "配達時間帯",
    "お届け先電話番号",
    "お届け先電話番号枝番",
    "お届け先郵便番号",
    "お届け先住所",
    "お届け先アパートマンション名",
    "お届け先会社・部門1",
    "お届け先会社・部門2",
    "お届け先名",
    "お届け先名略称",
    "敬称",
    "ご依頼主電話番号",
    "ご依頼主電話番号枝番",
    "ご依頼主郵便番号",
    "ご依頼主住所",
    "ご依頼主アパートマンション",
    "ご依頼主会社・部門1",
    "ご依頼主会社・部門2",
    "ご依頼主名",
    "品名",
    "荷姿コード",
    "重量",
    "サイズ",
    "請求先顧客コード",
    "請求先分類コード",
    "運賃管理番号",
  ].join(",");

  const rows = paidOrders.map(o => {
    // 郵便番号のハイフン除去
    const deliveryPostal = (o.memberPostal ?? "").replace(/-/g, "").replace(/〒/g, "");
    // 電話番号のハイフン除去
    const deliveryPhone = (o.memberPhone ?? "").replace(/-/g, "");

    // 配送先（配送先住所があればそちらを優先）
    const address = o.memberAddress ?? "";
    // 住所を建物名で分割（簡易：「以降をアパート欄へ」は省略）
    const addressMain = address;
    const addressSub = "";

    // お客様管理番号 = 「月次-会員コード」
    const custNo = `${month}-${o.memberCode}`;

    // 納品書番号（備考欄にセット）
    const noteNumber = o.deliveryNote?.noteNumber ?? "";

    return toRow([
      custNo,          // お客様管理番号
      "0",             // 送り状種類: 0=発払い
      "0",             // クール区分: 0=通常
      "",              // 伝票番号（空=自動採番）
      "",              // 出荷予定日（空=当日）
      "",              // お届け予定日
      "0",             // 配達時間帯: 0=指定なし
      deliveryPhone,   // お届け先電話番号
      "",              // お届け先電話番号枝番
      deliveryPostal,  // お届け先郵便番号
      addressMain,     // お届け先住所
      addressSub,      // お届け先アパートマンション名
      "",              // お届け先会社・部門1
      "",              // お届け先会社・部門2
      o.memberName,    // お届け先名
      "",              // お届け先名略称
      "様",            // 敬称
      SENDER_PHONE,    // ご依頼主電話番号
      "",              // ご依頼主電話番号枝番
      SENDER_POSTAL,   // ご依頼主郵便番号
      SENDER_ADDRESS,  // ご依頼主住所
      SENDER_DEPT,     // ご依頼主アパートマンション
      SENDER_NAME,     // ご依頼主会社・部門1
      "",              // ご依頼主会社・部門2
      "",              // ご依頼主名
      o.productName,   // 品名
      "0",             // 荷姿コード: 0=箱
      "",              // 重量
      "60",            // サイズ（60サイズ）
      "",              // 請求先顧客コード
      "",              // 請求先分類コード
      noteNumber,      // 運賃管理番号（納品書番号）
    ]);
  });

  const csv = [header, ...rows].join("\r\n");
  const filename = `yamato_b2cloud_${month}.csv`;

  return new Response(
    "\uFEFF" + csv, // BOM付きUTF-8（Excel/B2クラウド対応）
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    }
  );
}
