/**
 * 診断用エンドポイント: CSV照合デバッグ
 *
 * GET /api/admin/autoship/diagnose-matching?csvNormIds=id1,id2,...
 *
 * DBに登録されている全会員のcreditCardId①②③と、
 * 指定されたCSV normIdリストをクロスチェックして
 * 未照合の原因を特定するための診断データを返す。
 *
 * ⚠️ このエンドポイントは診断完了後に削除すること
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

function toHalfWidth(s: string): string {
  return s
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30))
    .replace(/Ｗ/g, "W").replace(/Ｃ/g, "C").replace(/ｗ/g, "w").replace(/ｃ/g, "c");
}

function normalizeCardId(raw: string): string {
  const s = toHalfWidth(raw.replace(/[\u3000\t\r\n]/g, " ").trim());
  if (!s || s === "-") return "";
  let digits: string;
  const wcStrict   = s.match(/^WC(\d+)$/i);
  const wcTolerant = s.match(/^WC[\s\-_]+(\d+)$/i);
  if (wcStrict)    { digits = wcStrict[1]; }
  else if (wcTolerant) { digits = wcTolerant[1]; }
  else             { digits = s; }
  if (!/^\d+$/.test(digits)) return "";
  return digits.replace(/^0+/, "") || "0";
}

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const csvNormIdsParam = searchParams.get("csvNormIds") ?? "";

    // CSVのnormIdリスト（カンマ区切り）
    const csvNormIds = csvNormIdsParam
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const csvNormIdSet = new Set(csvNormIds);

    // DB全会員のcreditCardId①②③を取得
    const allMlmMembers = await prisma.mlmMember.findMany({
      where: {
        OR: [
          { creditCardId:  { not: null } },
          { creditCardId2: { not: null } },
          { creditCardId3: { not: null } },
        ],
      },
      select: {
        id: true,
        memberCode: true,
        status: true,
        creditCardId:  true,
        creditCardId2: true,
        creditCardId3: true,
        user: {
          select: { name: true },
        },
      },
    });

    // normId → 会員マップ構築（route.tsと同一ロジック）
    const cardIdToMembers = new Map<string, typeof allMlmMembers>();
    const invalidCidList: { memberCode: string; name: string; rawCid: string }[] = [];

    for (const m of allMlmMembers) {
      for (const cid of [m.creditCardId, m.creditCardId2, m.creditCardId3]) {
        if (!cid) continue;
        const normCid = normalizeCardId(cid);
        if (!normCid) {
          invalidCidList.push({
            memberCode: m.memberCode,
            name: m.user.name ?? "",
            rawCid: cid,
          });
          continue;
        }
        if (!cardIdToMembers.has(normCid)) cardIdToMembers.set(normCid, []);
        const list = cardIdToMembers.get(normCid)!;
        if (!list.some(x => x.memberCode === m.memberCode)) list.push(m);
      }
    }

    // ① 未照合: CSVにあるがDBにマッチなし
    const unmatchedInCsv = csvNormIds
      .filter(id => !cardIdToMembers.has(id))
      .map(normId => ({ normId, reason: "DBにこのnormIdのcreditCardIdを持つ会員が存在しない" }));

    // ② DB側の全normIdとCSV normIdの差分
    const dbNormIds = [...cardIdToMembers.keys()];
    const csvOnlyIds = csvNormIds.filter(id => !cardIdToMembers.has(id));
    const dbOnlyIds  = dbNormIds.filter(id => !csvNormIdSet.has(id));

    // ③ 全会員のcreditCardId情報（照合デバッグ用）
    const allMemberCards = allMlmMembers.map(m => {
      const cards = [m.creditCardId, m.creditCardId2, m.creditCardId3].filter(Boolean) as string[];
      const normCards = cards.map(cid => ({
        raw: cid,
        norm: normalizeCardId(cid),
        matchesCsv: csvNormIdSet.has(normalizeCardId(cid)),
      }));
      return {
        memberCode: m.memberCode,
        name: m.user.name ?? "",
        status: m.status,
        cards: normCards,
        anyMatch: normCards.some(c => c.matchesCsv),
      };
    });

    // ④ CSV normIdに対応するDB会員の詳細
    const csvMatchDetails = csvNormIds.map(normId => {
      const members = cardIdToMembers.get(normId) ?? [];
      return {
        csvNormId: normId,
        matched: members.length > 0,
        matchedMembers: members.map(m => ({
          memberCode: m.memberCode,
          name: m.user.name ?? "",
          status: m.status,
          creditCardId:  m.creditCardId,
          creditCardId2: m.creditCardId2,
          creditCardId3: m.creditCardId3,
        })),
      };
    });

    return NextResponse.json({
      summary: {
        csvNormIdCount:     csvNormIds.length,
        dbMemberCount:      allMlmMembers.length,
        dbNormIdCount:      dbNormIds.length,
        matchedCount:       csvNormIds.length - unmatchedInCsv.length,
        unmatchedCount:     unmatchedInCsv.length,
        invalidCidCount:    invalidCidList.length,
      },
      unmatchedInCsv,          // ★ 未照合ID一覧（根本原因分析用）
      csvOnlyIds,              // CSVにあるがDBにないnormId
      invalidCidList,          // DB側の正規化不可creditCardId
      csvMatchDetails: csvMatchDetails.filter(d => !d.matched), // ★ マッチしなかった詳細
      // 全会員カード情報（照合できなかった会員の確認用）
      allMemberCards: allMemberCards.filter(m => !m.anyMatch).slice(0, 50),
    }, { status: 200 });

  } catch (err) {
    console.error("[diagnose-matching] エラー:", err);
    return NextResponse.json(
      { error: `診断エラー: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
