#!/usr/bin/env python3
"""
investigate-fa-depth-logic.py
================================
FAノードのdepth消費ロジックの違いを徹底調査

現行V1ロジック:
  - FA → ACT扱いでdepth+1消費（ptは加算しない）
  - WD → 透過（depth消費なし）
  - 非ACT → 透過（depth消費なし）

CSVとの差分:
  82179501: V1段1-7=21900pt vs CSV grpPt=22800pt (差-900pt = 6人×150pt)
  44504701: V1段1-7=15900pt vs CSV grpPt=16050pt (差-150pt = 1人×150pt)

仮説: FAノードがdepth消費しない（透過）として計算するとどうなるか？
      つまり、FAをWDと同様に透過扱いにした場合。

調査:
  1. FA透過バージョンでULBを再計算
  2. V1（FA=depth消費）vs FA透過（FA=透過）の段別比較
  3. 44504701のCSV直ACT=5の内訳確認（referrerか？uplineか？）
  4. 82179501ツリー内のFA会員の直下のACT会員たちがどの深度にいるか
"""

import os, sys
from collections import defaultdict

try:
    import psycopg2, psycopg2.extras
except ImportError:
    print("pip install psycopg2-binary"); sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL","")
if not DATABASE_URL:
    print("ERROR: set DATABASE_URL"); sys.exit(1)

BONUS_MONTH = "2026-04"
ACTIVE_REQUIRED_PRODUCTS = ["1000","2000"]
POINT_RATE = 100
UNILEVEL_RATES = {4:[15,9,6,5,3,2,1], 5:[15,10,7,6,4,3,2]}
UNILEVEL_MAX_DEPTH = {4:7, 5:7}

def v1_is_active(status, self_pt, purchased_required, force_active):
    if force_active: return True
    if status in ("withdrawn","lapsed"): return False
    return purchased_required and self_pt > 0

def v1_is_withdrawn(status, force_active):
    if force_active: return False
    return status in ("withdrawn","lapsed")

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId",
               "forceActive", "forceLevel", "currentLevel"
        FROM mlm_members ORDER BY id
    """)
    member_map = {}
    id_to_code = {}
    code_to_id = {}
    for m in cur.fetchall():
        mid = int(m["id"])
        member_map[mid] = {
            "id":mid, "member_code":m["memberCode"], "status":m["status"],
            "upline_id":int(m["uplineId"]) if m["uplineId"] else None,
            "referrer_id":int(m["referrerId"]) if m["referrerId"] else None,
            "force_active":bool(m["forceActive"]),
            "force_level":m["forceLevel"], "current_level":m["currentLevel"] or 0,
        }
        id_to_code[mid] = m["memberCode"]
        code_to_id[m["memberCode"]] = mid

    upline_ch = defaultdict(list)
    referrer_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_ch[m["upline_id"]].append(mid)
        if m["referrer_id"]: referrer_ch[m["referrer_id"]].append(mid)

    cur.execute("""
        SELECT p."mlmMemberId", p."productCode", p."totalPoints",
               (p.order_id IS NOT NULL) as has_order
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off','canceled')
    """, (BONUS_MONTH,))
    purchase_map = {}
    for p in cur.fetchall():
        mid = int(p["mlmMemberId"])
        if mid not in purchase_map:
            purchase_map[mid] = {"self_pt":0, "purchased_required":False}
        if p["productCode"] in ACTIVE_REQUIRED_PRODUCTS and p["has_order"]:
            purchase_map[mid]["self_pt"] += (p["totalPoints"] or 0)
            purchase_map[mid]["purchased_required"] = True

    cur.close(); conn.close()

    TARGET_CONFIGS = [
        {"code":"82179501", "level":4, "csv_grp_pt":22800, "csv_ulb":53850},
        {"code":"44504701", "level":5, "csv_grp_pt":16050, "csv_ulb":44850},
    ]

    for cfg in TARGET_CONFIGS:
        mc = cfg["code"]
        mid = code_to_id[mc]
        level = cfg["level"]
        rates = UNILEVEL_RATES[level]
        max_d = UNILEVEL_MAX_DEPTH[level]

        print(f"\n{'='*80}")
        print(f"【{mc}】 LV{level} FAのdepth消費ロジック比較")
        print(f"  CSV: grpPt={cfg['csv_grp_pt']:,}pt, ULB={cfg['csv_ulb']:,}円")
        print(f"{'='*80}")

        # ── V1ロジック（FA=depth消費）でdepth別計算 ──
        def calc_ulb(root_id, fa_transparent=False):
            """
            fa_transparent=False: FA=ACT扱い（depth+1消費、pt加算なし）= 現行V1
            fa_transparent=True:  FA=透過扱い（depth消費なし）= 仮説
            """
            depth_pts = defaultdict(int)
            depth_members = defaultdict(list)
            depth8plus = []

            def traverse(curr_id, depth):
                for child_id in upline_ch.get(curr_id, []):
                    m = member_map.get(child_id)
                    if not m: continue
                    pur = purchase_map.get(child_id, {})
                    self_pt = pur.get("self_pt", 0)
                    pur_req = pur.get("purchased_required", False)
                    fa = m["force_active"]
                    wd = v1_is_withdrawn(m["status"], fa)
                    ac = v1_is_active(m["status"], self_pt, pur_req, fa)

                    if wd:
                        traverse(child_id, depth)
                    elif fa and fa_transparent:
                        # FA透過仮説
                        traverse(child_id, depth)  # depth消費なし
                    elif ac:
                        if depth <= max_d:
                            depth_members[depth].append({"id":child_id, "code":m["member_code"],
                                                          "self_pt":self_pt, "fa":fa})
                            if not fa and self_pt > 0:
                                depth_pts[depth] += self_pt
                        else:
                            if not fa and self_pt > 0:
                                depth8plus.append({"code":m["member_code"],"depth":depth,"sp":self_pt})
                        traverse(child_id, depth + 1)
                    else:
                        traverse(child_id, depth)

            traverse(root_id, 1)
            return depth_pts, depth_members, depth8plus

        # V1（現行）
        v1_pts, v1_members, v1_exceeded = calc_ulb(mid, fa_transparent=False)
        v1_ulb = sum(int(v1_pts[d] * rates[d-1] / 100 * POINT_RATE) for d in range(1, max_d+1))

        # FA透過仮説
        fa_pts, fa_members, fa_exceeded = calc_ulb(mid, fa_transparent=True)
        fa_ulb = sum(int(fa_pts[d] * rates[d-1] / 100 * POINT_RATE) for d in range(1, max_d+1))

        print(f"\n{'─'*60}")
        print(f"{'段':>3} {'V1 pt':>8} {'V1 bonus':>10} | {'FA透過 pt':>10} {'FA透過 bonus':>12}")
        print(f"{'─'*60}")
        for d in range(1, max_d+1):
            v1_pt = v1_pts.get(d, 0)
            fa_pt = fa_pts.get(d, 0)
            v1_b = int(v1_pt * rates[d-1] / 100 * POINT_RATE)
            fa_b = int(fa_pt * rates[d-1] / 100 * POINT_RATE)
            diff = fa_pt - v1_pt
            print(f"{d:>3}段 {v1_pt:>8,}pt {v1_b:>10,}円 | {fa_pt:>10,}pt {fa_b:>12,}円  diff={diff:+}")
        print(f"{'─'*60}")
        v1_total_pt = sum(v1_pts.values())
        fa_total_pt = sum(fa_pts.values())
        print(f"合計 {v1_total_pt:>8,}pt {v1_ulb:>10,}円 | {fa_total_pt:>10,}pt {fa_ulb:>12,}円")
        print(f"CSV     {cfg['csv_grp_pt']:>8,}pt {cfg['csv_ulb']:>10,}円")
        print(f"差(V1)  {v1_total_pt-cfg['csv_grp_pt']:>+8,}pt {v1_ulb-cfg['csv_ulb']:>+10,}円")
        print(f"差(FA透過) {fa_total_pt-cfg['csv_grp_pt']:>+5,}pt {fa_ulb-cfg['csv_ulb']:>+10,}円")

        # ── FA会員の位置とその直下のACT会員 ──
        print(f"\n[FA会員の位置と直下ACT]")
        fa_members_in_tree = []
        visited = set()
        def find_fa(curr_id, depth):
            if curr_id in visited: return
            visited.add(curr_id)
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)

                v1_depth = depth
                if fa:
                    fa_members_in_tree.append({
                        "id": child_id, "code": m["member_code"],
                        "v1_depth": v1_depth,  # FAがいる段
                        "status": m["status"],
                    })
                if wd:
                    find_fa(child_id, depth)
                elif ac:
                    find_fa(child_id, depth+1)
                else:
                    find_fa(child_id, depth)

        find_fa(mid, 1)

        for fa_m in fa_members_in_tree:
            fa_id = fa_m["id"]
            fa_depth = fa_m["v1_depth"]
            direct_act = []
            for child_id in upline_ch.get(fa_id, []):
                cm = member_map.get(child_id)
                if not cm: continue
                pur = purchase_map.get(child_id, {})
                sp = pur.get("self_pt", 0)
                pr = pur.get("purchased_required", False)
                cfa = cm["force_active"]
                cac = v1_is_active(cm["status"], sp, pr, cfa)
                if cac and sp > 0 and not cfa:
                    direct_act.append(cm["member_code"])
            print(f"  FA: {fa_m['code']} V1深度={fa_depth} → 直下ACT: {direct_act}")

        # ── 段7のACT会員が増える理由（FA透過時に段8→段7に移動する会員） ──
        print(f"\n[FA透過時に段8→段7へ移動するACT会員]")
        # V1では段8以降だが、FA透過なら段7以内になる会員
        v1_exceeded_codes = {m["code"] for m in v1_exceeded}
        fa_codes_at_7 = {m["code"] for m in fa_members.get(7,[]) if m["self_pt"]>0 and not m["fa"]}
        promoted = fa_codes_at_7 - {m["code"] for m in v1_members.get(7,[]) if m["self_pt"]>0}
        print(f"  FA透過で段7に新たに登場したACT会員: {len(promoted)}名")
        for code in sorted(promoted):
            print(f"    {code}")

        # FA透過で段7に到達した新規会員のV1での段数
        print(f"\n  それらのV1段数:")
        for code in sorted(promoted):
            pid = code_to_id.get(code)
            if pid:
                # V1深度を確認
                for d in range(1, 20):
                    for m in v1_exceeded:
                        if m.get("code") == code:
                            print(f"    {code}: V1段={m['depth']} → FA透過で段7")

        # grpPtの差分検証
        print(f"\n[grpPtの差分詳細]")
        diff_grp = cfg['csv_grp_pt'] - v1_total_pt
        diff_ulb = cfg['csv_ulb'] - v1_ulb
        print(f"  CSV grpPt - V1 grpPt = {diff_grp:+,}pt ({diff_grp//150:+}人分)")
        print(f"  CSV ULB - V1 ULB = {diff_ulb:+,}円")

        # もし段7に不足してる人数分を加えたら?
        rate7 = rates[6]  # 段7のrate
        extra_pt_needed = diff_grp
        extra_ulb_from_7 = int(extra_pt_needed * rate7 / 100 * POINT_RATE)
        print(f"  段7のrate={rate7}%、{extra_pt_needed}pt追加で: +{extra_ulb_from_7}円 (ULB差={diff_ulb}円{'✅' if extra_ulb_from_7==diff_ulb else '❌'})")

    print(f"\n{'='*80}")
    print("調査完了")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
