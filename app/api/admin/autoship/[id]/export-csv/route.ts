// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

/** GET: 決済会社向けCSVを生成してダウンロード */
export async function GET(_req: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;

  const run = await prisma.autoShipRun.findUnique({
    where: { id: BigInt(id) },
    include: { orders: { where: { status: { not: "canceled" } }, orderBy: { memberCode: "asc" } } },
  });
  if (!run) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const month = run.targetMonth.replace("-", ""); // "YYYYMM"
  let csv = "";
  let filename = "";

  if (run.paymentMethod === "credit_card") {
    // ━━━ クレディックス形式 ━━━
    // ヘッダー行（クレディックス継続課金CSV仕様に準拠）
    const header = [
      "顧客ID", "会員コード", "氏名", "氏名カナ", "電話番号",
      "メールアドレス", "郵便番号", "住所",
      "商品コード", "商品名", "数量", "単価", "合計金額",
      "処理年月", "備考",
    ].join(",");

    const rows = run.orders.map(o =>
      toRow([
        o.creditCardId ?? o.memberCode,  // 顧客ID（クレディックス登録ID or 会員コード）
        o.memberCode,
        o.memberName,
        o.memberNameKana ?? "",
        o.memberPhone ?? "",
        o.memberEmail ?? "",
        o.memberPostal ?? "",
        o.memberAddress ?? "",
        o.productCode,
        o.productName,
        o.quantity,
        o.unitPrice,
        o.totalAmount,
        run.targetMonth,
        "オートシップ",
      ])
    );
    csv = [header, ...rows].join("\r\n");
    filename = `creditx_autoship_${month}.csv`;

  } else {
    // ━━━ 三菱UFJファクター 口座振替形式 ━━━
    // 全銀協フォーマット準拠の口座振替依頼ファイル
    // ヘッダーレコード
    const BANK_CODE    = "0005"; // 三菱UFJ銀行コード
    const CONSIGNER_CODE = "1234567890"; // 委託者コード（10桁・要設定）
    const CONSIGNER_NAME = "ｸﾚｱｰﾎｰﾙﾃﾞｲﾝｸﾞｽ"; // 委託者名（半角カナ20文字）
    const now = new Date();
    const transferDate = `${month}26`.padEnd(8, "0").slice(0, 8); // 振替日（末尾26日）

    // 全銀協テキスト形式
    const lines: string[] = [];

    // ヘッダーレコード（1行目）
    lines.push([
      "1",                          // データ区分（1=ヘッダー）
      "91",                         // 種別コード（口座振替）
      "0",                          // コード区分
      CONSIGNER_CODE,               // 委託者コード
      CONSIGNER_NAME.padEnd(40),    // 委託者名（40桁）
      transferDate,                 // 引落日
      BANK_CODE,                    // 仕向銀行番号
      "".padEnd(15),                // 仕向銀行名（15桁）
      "0".padEnd(4, "0"),           // 仕向支店番号
      "".padEnd(15),                // 仕向支店名
      "1".padEnd(1),                // 預金種目（1=普通）
      "".padEnd(7),                 // 口座番号
      "".padEnd(17),                // ダミー
    ].join(""));

    // データレコード（会員ごと）
    run.orders.forEach((o, idx) => {
      const seqNo = String(idx + 1).padStart(4, "0");
      const bankCode   = (o.bankCode ?? "0000").padEnd(4);
      const branchCode = (o.branchCode ?? "000").padEnd(3);
      const acType     = o.accountType === "当座" ? "2" : "1";
      const acNum      = (o.accountNumber ?? "").padStart(7, "0");
      const acHolder   = (o.accountHolder ?? "").padEnd(30).slice(0, 30);
      const amount     = String(o.totalAmount).padStart(10, "0");
      const newCode    = "0"; // 新規コード（0=既存）

      lines.push([
        "2",        // データ区分（2=データ）
        bankCode,
        "".padEnd(15),   // 銀行名（省略可）
        branchCode,
        "".padEnd(15),   // 支店名（省略可）
        "".padEnd(4),    // ダミー
        acType,
        acNum,
        acHolder,
        amount,
        newCode,
        seqNo,
        "".padEnd(8),    // 顧客番号
      ].join(""));
    });

    // トレーラレコード
    const totalAmount = run.orders.reduce((s, o) => s + o.totalAmount, 0);
    lines.push([
      "8",
      String(run.orders.length).padStart(6, "0"),
      String(totalAmount).padStart(12, "0"),
      "".padEnd(101),
    ].join(""));

    // エンドレコード
    lines.push("9" + "".padEnd(119));

    // 全銀CSVラッパー（管理用）
    const csvHeader = [
      "SEQ", "銀行コード", "銀行名", "支店コード", "支店名",
      "口座種別", "口座番号", "口座名義", "引落金額",
      "会員コード", "氏名", "電話番号", "処理年月",
    ].join(",");
    const csvRows = run.orders.map((o, idx) =>
      toRow([
        idx + 1,
        o.bankCode ?? "",
        o.bankName ?? "",
        o.branchCode ?? "",
        o.branchName ?? "",
        o.accountType ?? "普通",
        o.accountNumber ?? "",
        o.accountHolder ?? "",
        o.totalAmount,
        o.memberCode,
        o.memberName,
        o.memberPhone ?? "",
        run.targetMonth,
      ])
    );
    csv = [csvHeader, ...csvRows].join("\r\n");
    filename = `mufg_autoship_${month}.csv`;
  }

  // exportedAt を更新
  await prisma.autoShipRun.update({
    where: { id: BigInt(id) },
    data: { status: "exported", exportedAt: new Date() },
  });

  return new Response(
    "\uFEFF" + csv, // BOM付きUTF-8（Excel対応）
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    }
  );
}
