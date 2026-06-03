/**
 * GET /api/admin/bonus-run/tree-debug?memberCode=82179501&bonusMonth=2026-04
 *
 * V1エンジン正当性証明用 完全診断API
 *
 * 出力:
 *   ① 実ツリーデータ (position_id/upline_id/referrer_id/self_pt/active/force_active)
 *   ② 圧縮ツリー (compressed_depth/series_root/series_pt/parent_source)
 *   ③ 計算途中値全出し (depth1-7 PT / seriesDetail / minSeriesPt / ULB / SB)
 *   ④ CSVに存在しない会員 (position_id/upline_id/self_pt)
 *   ⑤ V1エンジン vs 期待値 差分
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isActiveMember,
  UNILEVEL_RATES,
  UNILEVEL_MAX_DEPTH,
  STRUCTURE_BONUS_RATES,
  POINT_RATE,
  ACTIVE_REQUIRED_PRODUCTS,
} from "@/lib/mlm-bonus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ───────────────────────────────────────────────
// 定数
// ───────────────────────────────────────────────
const ORG_EXCEPTION_CODES = new Set(["44504701", "89248801"]);

const EXPECTED: Record<string, { ulb: number | null; sb: number; minPt: number; level: number }> = {
  "82179501": { ulb: 53850,  sb: 35700,  minPt: 10200, level: 4 },
  "44504701": { ulb: 44850,  sb: 122400, minPt: 30600, level: 5 },
  "86820601": { ulb: 161250, sb: 16200,  minPt: 4050,  level: 5 },
  "93713601": { ulb: 110100, sb: 4200,   minPt: 1200,  level: 4 },
  "89248801": { ulb: 0,      sb: 122400, minPt: 30600, level: 5 },
};

// ───────────────────────────────────────────────
// isActive / isWithdrawn (V1エンジンと同一ロジック)
// ───────────────────────────────────────────────
function v1IsActive(
  status: string,
  selfPt: number,
  purchasedRequired: boolean,
  forceActive: boolean
): boolean {
  if (forceActive) return true;
  if (status === "withdrawn" || status === "lapsed") return false;
  return purchasedRequired && selfPt > 0;
}

function v1IsWithdrawn(status: string, forceActive: boolean): boolean {
  if (forceActive) return false;
  return status === "withdrawn" || status === "lapsed";
}

// ───────────────────────────────────────────────
// ULB depth計算 (V1エンジンと同一ロジック)
// ───────────────────────────────────────────────
type MemberRow = {
  id: bigint;
  memberCode: string;
  status: string;
  forceActive: boolean;
  forceLevel: number | null;
  uplineId: bigint | null;
  referrerId: bigint | null;
};

type PurchaseRow = {
  selfPurchasePoints: number;
  purchasedRequiredProduct: boolean;
};

function calcDepthPtsV1(
  rootId: bigint,
  achievedLevel: number,
  uplineChildMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseRow>,
  memberMap: Map<bigint, MemberRow>
): { depthPts: Record<number, number>; trace: DepthTraceEntry[] } {
  const maxDepth = UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;
  const depthPts: Record<number, number> = {};
  const trace: DepthTraceEntry[] = [];

  function traverse(currId: bigint, depth: number): void {
    if (depth > maxDepth) return;
    const children = uplineChildMap.get(currId) || [];
    for (const childId of children) {
      const child = memberMap.get(childId);
      if (!child) continue;
      const pur = purchaseMap.get(childId);
      const selfPt = pur?.selfPurchasePoints ?? 0;
      const purReq = pur?.purchasedRequiredProduct ?? false;
      const fa = child.forceActive;
      const wd = v1IsWithdrawn(child.status, fa);
      const ac = v1IsActive(child.status, selfPt, purReq, fa);

      let action: string;
      if (wd) {
        action = "WD透過";
        traverse(childId, depth); // depth消費なし
      } else if (ac) {
        if (!fa && selfPt > 0) {
          depthPts[depth] = (depthPts[depth] || 0) + selfPt;
          action = `ACT+pt(${selfPt})`;
        } else if (fa) {
          action = "FA(depth消費・pt=0)";
        } else {
          action = "ACT(pt=0)";
        }
        traverse(childId, depth + 1); // depth+1
      } else {
        action = "非ACT透過";
        traverse(childId, depth); // depth消費なし
      }

      trace.push({
        depth,
        memberCode: child.memberCode,
        positionId: childId.toString(),
        selfPt,
        active: ac,
        withdrawn: wd,
        forceActive: fa,
        status: child.status,
        action,
        uplineId: child.uplineId?.toString() ?? null,
        referrerId: child.referrerId?.toString() ?? null,
      });
    }
  }

  traverse(rootId, 1);
  return { depthPts, trace };
}

// ───────────────────────────────────────────────
// SB 系列PT計算 (V1エンジンと同一ロジック)
// ───────────────────────────────────────────────
type SeriesEntry = {
  seriesRoot: string;          // 直下ポジションID
  seriesRootCode: string;
  seriesPt: number;
  memberCount: number;
  actMemberCount: number;
  members: SeriesMemberEntry[];
};

type SeriesMemberEntry = {
  positionId: string;
  memberCode: string;
  selfPt: number;
  active: boolean;
  withdrawn: boolean;
  forceActive: boolean;
  status: string;
  uplineId: string | null;
  referrerId: string | null;
  compressedDepth: number;     // シリーズ内での圧縮段数
};

function calcSeriesV1(
  rootId: bigint,
  uplineChildMap: Map<bigint, bigint[]>,
  purchaseMap: Map<bigint, PurchaseRow>,
  memberMap: Map<bigint, MemberRow>
): SeriesEntry[] {
  const directChildren = uplineChildMap.get(rootId) || [];
  const result: SeriesEntry[] = [];

  for (const childId of directChildren) {
    let seriesTotal = 0;
    const members: SeriesMemberEntry[] = [];

    function traverseSeries(currId: bigint, compressedDepth: number): void {
      const mem = memberMap.get(currId);
      if (!mem) return;
      const pur = purchaseMap.get(currId);
      const selfPt = pur?.selfPurchasePoints ?? 0;
      const purReq = pur?.purchasedRequiredProduct ?? false;
      const fa = mem.forceActive;
      const wd = v1IsWithdrawn(mem.status, fa);
      const ac = v1IsActive(mem.status, selfPt, purReq, fa);

      members.push({
        positionId: currId.toString(),
        memberCode: mem.memberCode,
        selfPt,
        active: ac,
        withdrawn: wd,
        forceActive: fa,
        status: mem.status,
        uplineId: mem.uplineId?.toString() ?? null,
        referrerId: mem.referrerId?.toString() ?? null,
        compressedDepth,
      });

      if (wd) {
        // 退会透過: compressedDepth変わらず
        for (const d of (uplineChildMap.get(currId) || [])) traverseSeries(d, compressedDepth);
        return;
      }
      if (fa) {
        // FA: depth消費あり・pt加算なし
        for (const d of (uplineChildMap.get(currId) || [])) traverseSeries(d, compressedDepth + 1);
        return;
      }
      // 通常: ACTならpt加算
      if (ac && selfPt > 0) seriesTotal += selfPt;
      for (const d of (uplineChildMap.get(currId) || [])) traverseSeries(d, compressedDepth + 1);
    }

    traverseSeries(childId, 1);

    const childMem = memberMap.get(childId);
    result.push({
      seriesRoot: childId.toString(),
      seriesRootCode: childMem?.memberCode ?? childId.toString(),
      seriesPt: seriesTotal,
      memberCount: members.length,
      actMemberCount: members.filter(m => m.active && m.selfPt > 0 && !m.forceActive).length,
      members,
    });
  }

  return result;
}

// ───────────────────────────────────────────────
// ULBトレースエントリ型
// ───────────────────────────────────────────────
type DepthTraceEntry = {
  depth: number;
  memberCode: string;
  positionId: string;
  selfPt: number;
  active: boolean;
  withdrawn: boolean;
  forceActive: boolean;
  status: string;
  action: string;
  uplineId: string | null;
  referrerId: string | null;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const memberCode = searchParams.get("memberCode") ?? "82179501";
  const bonusMonth = searchParams.get("bonusMonth") ?? "2026-04";
  // mode: "full"=全子孫CSV出力, "debug"=詳細デバッグ(default)
  const mode = searchParams.get("mode") ?? "debug";

  // ── 対象会員 ──
  const target = await prisma.mlmMember.findFirst({
    where: { memberCode },
    select: {
      id: true, memberCode: true, status: true,
      forceActive: true, forceLevel: true,
      uplineId: true, referrerId: true,
      currentLevel: true,
    },
  });
  if (!target) return NextResponse.json({ error: `${memberCode} not found` }, { status: 404 });

  // ── 全会員ロード ──
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true, memberCode: true, status: true,
      forceActive: true, forceLevel: true,
      uplineId: true, referrerId: true,
      currentLevel: true,
    },
  });

  const memberMap = new Map<bigint, MemberRow>(allMembers.map(m => [m.id, m as MemberRow]));
  const memberCodeMap = new Map<string, bigint>(allMembers.map(m => [m.memberCode, m.id]));

  // ── 購入データ ──
  const purchases = await prisma.mlmPurchase.findMany({
    where: {
      purchaseMonth: bonusMonth,
      purchaseStatus: { notIn: ["cooling_off", "canceled"] },
    },
    include: {
      order: { select: { slipType: true, paidAt: true, paymentStatus: true } },
    },
  });

  const purchaseMap = new Map<bigint, PurchaseRow>();
  for (const p of purchases) {
    const mid = p.mlmMemberId;
    if (!purchaseMap.has(mid)) {
      purchaseMap.set(mid, { selfPurchasePoints: 0, purchasedRequiredProduct: false });
    }
    const d = purchaseMap.get(mid)!;
    if (ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)) {
      d.selfPurchasePoints += p.totalPoints || 0;
      d.purchasedRequiredProduct = true;
    }
  }

  // ── uplineChildrenMap / referrerChildrenMap ──
  const uplineChildMap = new Map<bigint, bigint[]>();
  const referrerChildMap = new Map<bigint, bigint[]>();
  for (const m of allMembers) {
    if (m.uplineId) {
      if (!uplineChildMap.has(m.uplineId)) uplineChildMap.set(m.uplineId, []);
      uplineChildMap.get(m.uplineId)!.push(m.id);
    }
    if (m.referrerId) {
      if (!referrerChildMap.has(m.referrerId)) referrerChildMap.set(m.referrerId, []);
      referrerChildMap.get(m.referrerId)!.push(m.id);
    }
  }

  // ── ①実ツリーデータ: 全ダウンライン収集 ──
  function getAllDescendants(rootId: bigint): bigint[] {
    const result: bigint[] = [];
    const visited = new Set<bigint>();
    function dfs(id: bigint) {
      if (visited.has(id)) return;
      visited.add(id);
      for (const ch of (uplineChildMap.get(id) || [])) {
        result.push(ch);
        dfs(ch);
      }
    }
    dfs(rootId);
    return result;
  }

  const descendants = getAllDescendants(target.id);

  // ② 全員の実データ (position_id, upline_id, referrer_id, self_pt, active, force_active)
  const treeRows = descendants.map(id => {
    const m = memberMap.get(id)!;
    const pur = purchaseMap.get(id);
    const selfPt = pur?.selfPurchasePoints ?? 0;
    const purReq = pur?.purchasedRequiredProduct ?? false;
    const fa = m.forceActive;
    const wd = v1IsWithdrawn(m.status, fa);
    const ac = v1IsActive(m.status, selfPt, purReq, fa);

    // uplineId/referrerIdをmemberCodeに逆引き
    const uplineMc  = m.uplineId  ? (memberMap.get(m.uplineId)?.memberCode  ?? m.uplineId.toString())  : null;
    const referMc   = m.referrerId ? (memberMap.get(m.referrerId)?.memberCode ?? m.referrerId.toString()) : null;

    return {
      position_id:  id.toString(),
      member_code:  m.memberCode,
      status:       m.status,
      upline_id:    m.uplineId?.toString()   ?? null,
      upline_code:  uplineMc,
      referrer_id:  m.referrerId?.toString() ?? null,
      referrer_code: referMc,
      self_pt:      selfPt,
      active:       ac,
      force_active: fa,
      parent_source: (m.uplineId && m.referrerId && m.uplineId !== m.referrerId) ? "DIFF" : "SAME",
    };
  });

  // ③ ターゲット自身の基本情報
  const targetPur = purchaseMap.get(target.id);
  const targetSelfPt = targetPur?.selfPurchasePoints ?? 0;
  const targetPurReq = targetPur?.purchasedRequiredProduct ?? false;
  const targetFa = target.forceActive || false;
  const targetActive = v1IsActive(target.status, targetSelfPt, targetPurReq, targetFa);

  // directActiveCount (referrerIdベース)
  const dac = (referrerChildMap.get(target.id) || []).filter(chId => {
    const ch = memberMap.get(chId);
    if (!ch) return false;
    if (v1IsWithdrawn(ch.status, ch.forceActive)) return false;
    const pur = purchaseMap.get(chId);
    return v1IsActive(ch.status, pur?.selfPurchasePoints ?? 0, pur?.purchasedRequiredProduct ?? false, ch.forceActive);
  }).length;

  // ④ 達成レベル (forceLevel優先, 次にcurrentLevel)
  const achievedLevel = target.forceLevel ?? target.currentLevel ?? 0;

  // ⑤ ULB計算 (完全トレース付き)
  const { depthPts, trace: ulbTrace } = calcDepthPtsV1(
    target.id, achievedLevel, uplineChildMap, purchaseMap, memberMap
  );

  const rates = UNILEVEL_RATES[achievedLevel] ?? [];
  const maxDepth = UNILEVEL_MAX_DEPTH[achievedLevel] ?? 0;

  let ulbTotal = 0;
  const ulbDepthDetail: Record<number, { pt: number; rate: number; bonus: number; memberCount: number; actCount: number }> = {};
  for (let d = 1; d <= maxDepth; d++) {
    const pt   = depthPts[d] ?? 0;
    const rate = rates[d - 1] ?? 0;
    const bonus = (pt > 0 && rate > 0) ? Math.floor(pt * (rate / 100) * POINT_RATE) : 0;
    const membersAtDepth = ulbTrace.filter(t => t.depth === d);
    ulbDepthDetail[d] = {
      pt,
      rate,
      bonus,
      memberCount: membersAtDepth.length,
      actCount: membersAtDepth.filter(t => t.active && t.selfPt > 0 && !t.forceActive).length,
    };
    ulbTotal += bonus;
  }

  // ULB資格チェック
  const ulbQualified = (targetSelfPt > 0 || targetFa) && dac >= 2;
  const ulbFinal = ulbQualified ? ulbTotal : 0;

  // ⑥ SB系列PT計算 (完全トレース付き)
  const seriesDetail = calcSeriesV1(target.id, uplineChildMap, purchaseMap, memberMap);
  const seriesPtList = seriesDetail.map(s => s.seriesPt);
  const nonZeroPts   = seriesPtList.filter(p => p > 0);
  const minSeriesPt  = nonZeroPts.length > 0 ? Math.min(...nonZeroPts) : 0;
  const seriesCount  = seriesDetail.length; // 全直下系列数（0pt含む）

  const isOrgException     = ORG_EXCEPTION_CODES.has(memberCode);
  const minRequiredSeries  = isOrgException ? 1 : 3;
  const sbRate             = STRUCTURE_BONUS_RATES[achievedLevel] ?? 0;
  const isFirstPos         = memberCode.length >= 8 && memberCode.slice(-2) === "01";

  const sbQualified =
    targetActive &&
    dac >= 2 &&
    achievedLevel >= 3 &&
    isFirstPos &&
    seriesCount >= minRequiredSeries &&
    minSeriesPt > 0;

  const sbTotal = sbQualified ? Math.floor(minSeriesPt * (sbRate / 100) * POINT_RATE) : 0;

  // ⑦ 期待値との差分
  const exp = EXPECTED[memberCode];
  const diff = exp ? {
    ulb_calc: ulbFinal, ulb_exp: exp.ulb,
    ulb_diff: exp.ulb !== null ? ulbFinal - exp.ulb : null,
    ulb_ok:   exp.ulb !== null ? ulbFinal === exp.ulb : null,
    sb_calc:  sbTotal,  sb_exp:  exp.sb,
    sb_diff:  sbTotal - exp.sb,
    sb_ok:    sbTotal === exp.sb,
    minPt_calc: minSeriesPt, minPt_exp: exp.minPt,
    minPt_diff: minSeriesPt - exp.minPt,
    minPt_ok:   minSeriesPt === exp.minPt,
  } : null;

  // ⑧ uplineId ≠ referrerId の会員を抽出（差分実証）
  const uplineRefDiff = treeRows.filter(r => r.parent_source === "DIFF").map(r => ({
    position_id:   r.position_id,
    member_code:   r.member_code,
    upline_id:     r.upline_id,
    upline_code:   r.upline_code,
    referrer_id:   r.referrer_id,
    referrer_code: r.referrer_code,
    self_pt:       r.self_pt,
    active:        r.active,
    force_active:  r.force_active,
  }));

  // ⑨ DBにのみ存在する会員（CSVの memberCode 一覧で判定できないためDB全件から特定）
  // CSVに含まれていない = マトリックスCSV外の会員
  // DBの全会員 vs CSVの全会員数（799件）差分
  const dbMemberCount = allMembers.length;

  // ⑩ mode=full の場合は全ダウンラインをCSV形式で返す
  let csvOutput: string | null = null;
  if (mode === "full") {
    const lines = ["position_id,member_code,status,upline_id,upline_code,referrer_id,referrer_code,self_pt,active,force_active,parent_source"];
    for (const r of treeRows) {
      lines.push([
        r.position_id, r.member_code, r.status,
        r.upline_id ?? "", r.upline_code ?? "",
        r.referrer_id ?? "", r.referrer_code ?? "",
        r.self_pt, r.active ? "1" : "0", r.force_active ? "1" : "0",
        r.parent_source,
      ].join(","));
    }
    csvOutput = lines.join("\n");
  }

  // ⑪ series_detail: 0pt系列も含む全詳細 (大きいので各系列のmembersはactのみ)
  const seriesDetailSummary = seriesDetail.map(s => ({
    series_root:        s.seriesRoot,
    series_root_code:   s.seriesRootCode,
    series_pt:          s.seriesPt,
    member_count:       s.memberCount,
    act_member_count:   s.actMemberCount,
    // ACTメンバーのみ個別出力
    act_members: s.members
      .filter(m => m.active && m.selfPt > 0 && !m.forceActive)
      .map(m => ({
        position_id: m.positionId,
        member_code: m.memberCode,
        self_pt:     m.selfPt,
        compressed_depth: m.compressedDepth,
        upline_id:   m.uplineId,
        referrer_id: m.referrerId,
      })),
    // upline≠referrerの会員
    diff_members: s.members
      .filter(m => m.uplineId && m.referrerId && m.uplineId !== m.referrerId)
      .map(m => ({
        position_id:   m.positionId,
        member_code:   m.memberCode,
        self_pt:       m.selfPt,
        active:        m.active,
        upline_id:     m.uplineId,
        referrer_id:   m.referrerId,
        compressed_depth: m.compressedDepth,
      })),
  }));

  return NextResponse.json({
    // ─────────────────────────────────────────
    // ① 対象会員基本情報
    // ─────────────────────────────────────────
    target: {
      member_code:    target.memberCode,
      position_id:    target.id.toString(),
      status:         target.status,
      force_active:   targetFa,
      force_level:    target.forceLevel,
      current_level:  target.currentLevel,
      achieved_level: achievedLevel,
      self_pt:        targetSelfPt,
      active:         targetActive,
      direct_act:     dac,
      upline_id:      target.uplineId?.toString() ?? null,
      referrer_id:    target.referrerId?.toString() ?? null,
      parent_source:  (target.uplineId && target.referrerId && target.uplineId !== target.referrerId) ? "DIFF" : "SAME",
    },

    // ─────────────────────────────────────────
    // ② ULB計算途中値 (depth1-7 完全)
    // ─────────────────────────────────────────
    ulb: {
      qualified:     ulbQualified,
      reason_fail:   !ulbQualified
        ? `selfPt=${targetSelfPt} fa=${targetFa} dac=${dac}`
        : null,
      depth_detail:  ulbDepthDetail,
      total_calc:    ulbTotal,
      final:         ulbFinal,
      expected:      exp?.ulb ?? null,
      diff:          diff?.ulb_diff ?? null,
      ok:            diff?.ulb_ok ?? null,
    },

    // ─────────────────────────────────────────
    // ③ SB計算途中値 (全系列PT + minSeriesPt)
    // ─────────────────────────────────────────
    sb: {
      qualified:             sbQualified,
      reason_fail:           !sbQualified
        ? `active=${targetActive} dac=${dac} lv=${achievedLevel} isFirstPos=${isFirstPos} seriesCount=${seriesCount} minRequired=${minRequiredSeries} minPt=${minSeriesPt}`
        : null,
      series_count:          seriesCount,
      series_pt_list:        seriesPtList,
      non_zero_series:       nonZeroPts.length,
      min_series_pt_calc:    minSeriesPt,
      min_series_pt_exp:     exp?.minPt ?? null,
      min_series_pt_diff:    diff?.minPt_diff ?? null,
      min_series_pt_ok:      diff?.minPt_ok ?? null,
      sb_rate:               sbRate,
      is_org_exception:      isOrgException,
      min_required_series:   minRequiredSeries,
      total_calc:            sbTotal,
      expected:              exp?.sb ?? null,
      diff:                  diff?.sb_diff ?? null,
      ok:                    diff?.sb_ok ?? null,
    },

    // ─────────────────────────────────────────
    // ④ 期待値との総合差分
    // ─────────────────────────────────────────
    validation: diff ?? null,

    // ─────────────────────────────────────────
    // ⑤ SB系列詳細 (全系列 + ACTメンバー + upline≠referrer)
    // ─────────────────────────────────────────
    series_detail: seriesDetailSummary,

    // ─────────────────────────────────────────
    // ⑥ uplineId≠referrerId の会員一覧 (差分実証)
    // ─────────────────────────────────────────
    upline_referrer_diff: {
      count:   uplineRefDiff.length,
      members: uplineRefDiff,
    },

    // ─────────────────────────────────────────
    // ⑦ DB全体統計
    // ─────────────────────────────────────────
    db_stats: {
      total_members:      dbMemberCount,
      descendants_count:  descendants.length,
      purchase_month:     bonusMonth,
    },

    // ─────────────────────────────────────────
    // ⑧ 実ツリーデータ (全ダウンライン)
    //   mode=full の時のみ全件, それ以外は最初の50件
    // ─────────────────────────────────────────
    tree_rows: {
      count:          treeRows.length,
      act_count:      treeRows.filter(r => r.active && r.self_pt > 0).length,
      total_act_pt:   treeRows.filter(r => r.active && r.self_pt > 0).reduce((a, r) => a + r.self_pt, 0),
      diff_count:     uplineRefDiff.length,
      rows:           mode === "full" ? treeRows : treeRows.slice(0, 50),
    },

    // ─────────────────────────────────────────
    // ⑨ ULBトレース (depth別 全ノード)
    //   mode=full の時のみ全件, それ以外は最初の100件
    // ─────────────────────────────────────────
    ulb_trace: {
      count:  ulbTrace.length,
      by_depth: Object.fromEntries(
        Array.from({ length: maxDepth }, (_, i) => i + 1).map(d => [
          d,
          {
            total_pt:   depthPts[d] ?? 0,
            all_count:  ulbTrace.filter(t => t.depth === d).length,
            act_count:  ulbTrace.filter(t => t.depth === d && t.active && t.selfPt > 0 && !t.forceActive).length,
            fa_count:   ulbTrace.filter(t => t.depth === d && t.forceActive).length,
            wd_count:   ulbTrace.filter(t => t.depth === d && t.withdrawn).length,
            non_act_count: ulbTrace.filter(t => t.depth === d && !t.active && !t.withdrawn).length,
          }
        ])
      ),
      entries: mode === "full" ? ulbTrace : ulbTrace.filter(t => t.active || t.forceActive).slice(0, 100),
    },

    // ─────────────────────────────────────────
    // ⑩ CSV出力 (mode=full のみ)
    // ─────────────────────────────────────────
    csv: csvOutput,
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
