/**
 * 新規会員追加スクリプト (2026-5-5-15-2-46member_mst.csv)
 *
 * 処理内容:
 * 1. CSV の会員IDをmemberCode (XXXXXX-NN形式) に変換
 * 2. DBに存在しない会員 → 新規作成 (User + MlmMember + PointWallet)
 * 3. DBに存在する会員  → 各種フィールドを更新
 * 4. 紹介者・直上者の紐づけ更新
 *
 * 実行方法:
 *   npx tsx prisma/scripts/import-members-2026-05-05.ts
 *
 * 前提条件:
 *   - .env.local に DATABASE_URL が設定済みであること
 */

import { config } from "dotenv";
import { PrismaClient, MlmMemberStatus, MlmMemberType, PaymentMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";
import { join } from "path";
import * as fs from "fs";

// .env.local を明示的に読み込み
config({ path: join(process.cwd(), ".env.local") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ──────────────────────────────────────────────
// 定数・ヘルパー
// ──────────────────────────────────────────────

const CSV_PATH = join(process.cwd(), "../uploaded_files/2026-5-5-15-2-46member_mst.csv");
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** CSVの会員ID → memberCode (XXXXXX-NN) に変換 */
function idToMemberCode(mid: string): string {
  mid = mid.trim();
  if (mid.length < 3) return mid;
  const base = mid.slice(0, mid.length - 2);
  const pos  = mid.slice(-2);
  return `${base}-${pos}`;
}

/**
 * "YYYY/M/D" → Date (JST 00:00:00 を UTC に変換して保存)
 * parseDateJST と同等の処理をスクリプト内で実装
 */
function parseDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.trim().split("/");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  // JST 00:00:00 → UTC (前日 15:00:00)
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - JST_OFFSET_MS);
}

/** CSVステータス → MlmMemberStatus */
function toStatus(raw: string): MlmMemberStatus {
  switch (raw.trim()) {
    case "活動中":         return "active";
    case "オートシップ":  return "autoship";
    case "退会":          return "withdrawn";
    case "クーリングオフ": return "withdrawn";
    default:              return "active";
  }
}

/** 性別文字列 → male/female/other/null */
function toGender(raw: string): string | null {
  switch (raw.trim()) {
    case "男性": return "male";
    case "女性": return "female";
    case "法人": return "other";
    default:     return null;
  }
}

/** 強制レベル文字列 → number | null */
function toForceLevel(raw: string): number | null {
  const m = raw.match(/レベル(\d)/);
  return m ? parseInt(m[1], 10) : null;
}

/** CSV をパース (cp932/Shift-JIS 対応) */
async function readCsv(filePath: string): Promise<string[][]> {
  const iconv = await import("iconv-lite");
  const buf = fs.readFileSync(filePath);
  const text = iconv.decode(buf, "cp932");
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (c === "," && !inQuote) {
        cols.push(cur); cur = "";
      } else {
        cur += c;
      }
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

// ──────────────────────────────────────────────
// メイン処理
// ──────────────────────────────────────────────

async function main() {
  console.log("===========================================");
  console.log(" 新規会員追加スクリプト (2026-05-05)");
  console.log("===========================================\n");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSVファイルが見つかりません: ${CSV_PATH}`);
    process.exit(1);
  }

  const rows = await readCsv(CSV_PATH);
  const header = rows[0];
  const data = rows.slice(1);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { idx[h.trim()] = i; });

  const get = (row: string[], col: string) => (row[idx[col]] ?? "").trim();

  console.log(`CSV読み込み完了: ${data.length}件\n`);

  // DB から全 MlmMember を memberCode をキーにして取得
  const existingMembers = await prisma.mlmMember.findMany({
    select: { id: true, memberCode: true, userId: true },
  });
  const existingMap = new Map(existingMembers.map(m => [m.memberCode, m]));
  console.log(`DB既存会員: ${existingMembers.length}件\n`);

  let newCount    = 0;
  let updateCount = 0;
  let skipCount   = 0;
  const errors: string[] = [];

  // ────────────────────────────
  // 処理ループ
  // ────────────────────────────
  for (const row of data) {
    const csvMemberId = get(row, "会員ID");
    if (!csvMemberId) continue;

    const memberCode   = idToMemberCode(csvMemberId);
    const name         = get(row, "名前").replace(/\u3000/g, " ").trim();
    const nameKana     = get(row, "フリガナ").replace(/\u3000/g, " ").trim();
    const emailRaw     = get(row, "Eメールアドレス").toLowerCase();
    const status       = toStatus(get(row, "ステイタス"));
    const gender       = toGender(get(row, "性別"));
    const birthDate    = parseDate(get(row, "生年月日"));
    const contractDate = parseDate(get(row, "契約締結日"));
    const firstPayDate = parseDate(get(row, "初回入金日"));
    const forceLevel   = toForceLevel(get(row, "強制レベル"));
    const forceActive  = get(row, "強制ACT") === "有効";
    const mobile       = get(row, "主要連絡先") || get(row, "連絡先");
    const postalCode   = get(row, "郵便番号");
    const prefecture   = get(row, "都道府県");
    const city         = get(row, "市区町村番地");
    const address2     = get(row, "建物名・部屋番号");
    const companyName      = get(row, "法人名");
    const companyNameKana  = get(row, "法人名カナ");
    const bankName     = get(row, "コミ銀行名");
    const bankCode     = get(row, "コミ銀行番号");
    const branchName   = get(row, "コミ支店名");
    const branchCode   = get(row, "コミ支店番号");
    const accountType  = get(row, "コミ預金種目");
    const accountNumber = get(row, "コミ口座番号");
    const accountHolder = get(row, "コミ口座名義");
    const creditCardId = get(row, "決済情報(クレディックス)");
    const disclosureDocNumber = get(row, "概要書面No");
    const csvPassword  = get(row, "パスワード");

    // 支払い方法の推定
    let paymentMethod: PaymentMethod = "credit_card";
    if (creditCardId) {
      paymentMethod = "credit_card";
    } else if (bankCode && accountNumber) {
      paymentMethod = "bank_transfer";
    }

    const autoshipEnabled = status === "autoship";
    const addressStr = [prefecture, city, address2].filter(Boolean).join(" ").trim();

    // ────────────────────────────
    // 既存会員: 更新
    // ────────────────────────────
    const existing = existingMap.get(memberCode);
    if (existing) {
      try {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            name:       name || undefined,
            nameKana:   nameKana || undefined,
            ...(emailRaw ? { email: emailRaw } : {}),
            ...(postalCode ? { postalCode } : {}),
            ...(addressStr ? { address: addressStr } : {}),
            ...(mobile ? { phone: mobile } : {}),
          },
        });
        await prisma.mlmMember.update({
          where: { id: existing.id },
          data: {
            status,
            gender:          gender ?? undefined,
            birthDate:       birthDate ?? undefined,
            contractDate:    contractDate ?? undefined,
            firstPayDate:    firstPayDate ?? undefined,
            forceLevel:      forceLevel ?? undefined,
            forceActive,
            mobile:          mobile || undefined,
            prefecture:      prefecture || undefined,
            city:            city || undefined,
            companyName:     companyName || undefined,
            companyNameKana: companyNameKana || undefined,
            bankName:        bankName || undefined,
            bankCode:        bankCode || undefined,
            branchName:      branchName || undefined,
            branchCode:      branchCode || undefined,
            accountType:     accountType || undefined,
            accountNumber:   accountNumber || undefined,
            accountHolder:   accountHolder || undefined,
            creditCardId:    creditCardId || undefined,
            paymentMethod,
            autoshipEnabled,
          },
        });
        updateCount++;
        console.log(`  [更新] ${memberCode} ${name}`);
      } catch (e) {
        errors.push(`[更新エラー] ${memberCode} (${name}): ${e}`);
      }
      continue;
    }

    // ────────────────────────────
    // 新規会員: 作成
    // ────────────────────────────

    // メールアドレスがない場合はダミーメール生成
    const finalEmail = emailRaw || `member-${csvMemberId}@noemail.viola-pure.net`;

    // メールの重複チェック
    const existingUser = await prisma.user.findFirst({ where: { email: finalEmail } });
    if (existingUser) {
      const existingMlm = await prisma.mlmMember.findFirst({ where: { userId: existingUser.id } });
      if (existingMlm) {
        skipCount++;
        console.log(`  [スキップ] ${memberCode} ${name} (メール重複)`);
        continue;
      }
    }

    try {
      // パスワード: CSVに記載があればそれを使用、なければ "0000"
      const rawPassword = (csvPassword && csvPassword !== "0000" && csvPassword.length >= 4)
        ? csvPassword
        : "0000";
      const passwordHash = await hash(rawPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          memberCode,
          name:       name || memberCode,
          nameKana:   nameKana || undefined,
          email:      finalEmail,
          passwordHash,
          status:     "active",
          phone:      mobile || undefined,
          postalCode: postalCode || undefined,
          address:    addressStr || undefined,
        },
      });

      await prisma.mlmMember.create({
        data: {
          userId:          newUser.id,
          memberCode,
          memberType:      "business" as MlmMemberType,
          status,
          gender:          gender ?? undefined,
          birthDate:       birthDate ?? undefined,
          contractDate:    contractDate ?? undefined,
          firstPayDate:    firstPayDate ?? undefined,
          forceLevel:      forceLevel ?? undefined,
          forceActive,
          mobile:          mobile || undefined,
          prefecture:      prefecture || undefined,
          city:            city || undefined,
          address2:        address2 || undefined,
          companyName:     companyName || undefined,
          companyNameKana: companyNameKana || undefined,
          bankName:        bankName || undefined,
          bankCode:        bankCode || undefined,
          branchName:      branchName || undefined,
          branchCode:      branchCode || undefined,
          accountType:     accountType || undefined,
          accountNumber:   accountNumber || undefined,
          accountHolder:   accountHolder || undefined,
          creditCardId:    creditCardId || undefined,
          paymentMethod,
          autoshipEnabled,
          autoshipStartDate: autoshipEnabled ? contractDate ?? undefined : undefined,
        },
      });

      // 概要書面番号がある場合は MlmRegistration も作成
      if (disclosureDocNumber) {
        await prisma.mlmRegistration.upsert({
          where: { userId: newUser.id },
          create: { userId: newUser.id, disclosureDocNumber },
          update: { disclosureDocNumber },
        });
      }

      // PointWallet を作成
      await prisma.pointWallet.create({
        data: {
          userId:                 newUser.id,
          autoPointsBalance:      0,
          manualPointsBalance:    0,
          externalPointsBalance:  0,
          availablePointsBalance: 0,
        },
      });

      newCount++;
      console.log(`  [新規] ${memberCode} ${name}  (PW: ${rawPassword})`);
    } catch (e) {
      errors.push(`[新規作成エラー] ${memberCode} (${name}): ${e}`);
    }
  }

  // ────────────────────────────
  // 紹介者・直上者の紐づけ更新
  // ────────────────────────────
  console.log("\n紹介者・直上者の紐づけを更新中...");
  let linkCount  = 0;
  let linkErrors = 0;

  for (const row of data) {
    const csvMemberId   = get(row, "会員ID");
    if (!csvMemberId) continue;

    const memberCode    = idToMemberCode(csvMemberId);
    const referrerCsvId = get(row, "紹介者ID");
    const uplineCsvId   = get(row, "直上者ID");
    if (!referrerCsvId && !uplineCsvId) continue;

    const member = await prisma.mlmMember.findUnique({
      where: { memberCode },
      select: { id: true },
    });
    if (!member) continue;

    const updateData: Record<string, bigint | null> = {};

    if (referrerCsvId && referrerCsvId !== csvMemberId) {
      const refCode = idToMemberCode(referrerCsvId);
      const refMember = await prisma.mlmMember.findUnique({
        where: { memberCode: refCode },
        select: { id: true },
      });
      if (refMember) {
        updateData.referrerId = refMember.id;
      } else {
        console.log(`    [警告] 紹介者 ${refCode} がDBに存在しません (${memberCode})`);
      }
    }

    if (uplineCsvId && uplineCsvId !== csvMemberId) {
      const upCode = idToMemberCode(uplineCsvId);
      const upMember = await prisma.mlmMember.findUnique({
        where: { memberCode: upCode },
        select: { id: true },
      });
      if (upMember) {
        updateData.uplineId = upMember.id;
      } else {
        console.log(`    [警告] 直上者 ${upCode} がDBに存在しません (${memberCode})`);
      }
    }

    if (Object.keys(updateData).length > 0) {
      try {
        await prisma.mlmMember.update({ where: { id: member.id }, data: updateData });
        linkCount++;
        console.log(`  [紐づけ] ${memberCode}`);
      } catch (e) {
        linkErrors++;
        console.log(`  [紐づけエラー] ${memberCode}: ${e}`);
      }
    }
  }

  // ────────────────────────────
  // 結果サマリー
  // ────────────────────────────
  console.log("\n===========================================");
  console.log(" 処理結果");
  console.log("===========================================");
  console.log(`新規作成:   ${newCount}件`);
  console.log(`更新:       ${updateCount}件`);
  console.log(`スキップ:   ${skipCount}件`);
  console.log(`紐づけ更新: ${linkCount}件 (エラー: ${linkErrors}件)`);
  console.log(`エラー:     ${errors.length}件`);

  if (errors.length > 0) {
    console.log("\n--- エラー詳細 ---");
    errors.forEach(e => console.log(e));
  }

  await pool.end();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
