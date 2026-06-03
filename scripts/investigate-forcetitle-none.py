#!/usr/bin/env python3
"""
investigate-forcetitle-none.py
===================================
仮説: forceActive=True でも forceLevel=NULL (強制タイトル=—) の会員はdepth消費しない

現行V1:
  - forceActive=True → ACT扱い、depth+1消費
  
仮説:
  - forceActive=True AND forceLevel!=NULL → ACT扱い、depth+1消費（変更なし）
  - forceActive=True AND forceLevel=NULL → 透過（depth消費なし）
  
検証:
  82179501: forceLevel=NULL FA = {95446801, 64150101, 82179502}
  44504701: forceLevel=NULL FA = {95446801, 64150101, 82179502}
  
期待:
  82179501: V1=52800円 → 仮説=53850円(+1050円)
  44504701: V1=44550円 → 仮説=44850円(+300円)
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
            "force_level":m["forceLevel"],  # NULLの場合もある
            "current_level":m["currentLevel"] or 0,
        }
        id_to_code[mid] = m["memberCode"]
        code_to_id[m["memberCode"]] = mid

    upline_ch = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_ch[m["upline_id"]].append(mid)

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

    # ── forceLevel=NULLのFA会員を確認 ──
    fa_null_force_level = {
        mid: m for mid, m in member_map.items()
        if m["force_active"] and m["force_level"] is None
    }
    print(f"forceActive=True AND forceLevel=NULL の会員: {len(fa_null_force_level)}名")
    for mid, m in sorted(fa_null_force_level.items(), key=lambda x: x[1]["member_code"]):
        print(f"  {m['member_code']} status={m['status']} upline={id_to_code.get(m['upline_id'],'?')}")

    fa_with_force_level = {
        mid: m for mid, m in member_map.items()
        if m["force_active"] and m["force_level"] is not None
    }
    print(f"\nforceActive=True AND forceLevel!=NULL の会員: {len(fa_with_force_level)}名")
    for mid, m in sorted(fa_with_force_level.items(), key=lambda x: x[1]["member_code"]):
        print(f"  {m['member_code']} forceLevel={m['force_level']} status={m['status']}")

    # ── 仮説: forceLevel=NULL FA → 透過のULB計算 ──
    def calc_ulb_hypothesis(root_id, level, null_fa_transparent=False):
        """
        null_fa_transparent=True: forceLevel=NULL の FA会員は透過
        null_fa_transparent=False: 全FA会員がdepth消費（現行V1）
        """
        max_d = UNILEVEL_MAX_DEPTH[level]
        rates = UNILEVEL_RATES[level]
        depth_pts = defaultdict(int)
        depth_members = defaultdict(list)

        def traverse(curr_id, depth):
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                force_level = m["force_level"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)

                # 透過仮説の対象かどうか
                is_null_fa = fa and force_level is None

                if wd:
                    traverse(child_id, depth)
                elif is_null_fa and null_fa_transparent:
                    # forceLevel=NULL のFA → 透過
                    traverse(child_id, depth)
                elif ac:
                    if depth <= max_d:
                        depth_members[depth].append({
                            "id":child_id, "code":m["member_code"],
                            "self_pt":self_pt, "fa":fa, "force_level":force_level,
                        })
                        if not fa and self_pt > 0:
                            depth_pts[depth] += self_pt
                    traverse(child_id, depth+1)
                else:
                    traverse(child_id, depth)

        traverse(root_id, 1)

        v1_pts = {d: depth_pts[d] for d in range(1, max_d+1)}
        ulb = sum(int(v1_pts.get(d,0) * rates[d-1] / 100 * POINT_RATE) for d in range(1, max_d+1))
        total_pt = sum(v1_pts.values())
        return v1_pts, depth_members, ulb, total_pt

    TARGET_CONFIGS = [
        {"code":"82179501", "level":4, "csv_grp_pt":22800, "csv_ulb":53850},
        {"code":"44504701", "level":5, "csv_grp_pt":16050, "csv_ulb":44850},
        {"code":"86820601", "level":5, "csv_grp_pt":None,  "csv_ulb":98550},
        {"code":"93713601", "level":4, "csv_grp_pt":None,  "csv_ulb":52650},
        {"code":"89248801", "level":5, "csv_grp_pt":None,  "csv_ulb":19950},
    ]

    print(f"\n{'='*80}")
    print("仮説検証: forceLevel=NULL FA → 透過 vs 現行V1")
    print(f"{'='*80}")

    for cfg in TARGET_CONFIGS:
        mc = cfg["code"]
        mid = code_to_id[mc]
        level = cfg["level"]
        rates = UNILEVEL_RATES[level]
        max_d = UNILEVEL_MAX_DEPTH[level]

        # 現行V1
        pts_v1, mem_v1, ulb_v1, total_v1 = calc_ulb_hypothesis(mid, level, null_fa_transparent=False)
        # 仮説
        pts_h, mem_h, ulb_h, total_h = calc_ulb_hypothesis(mid, level, null_fa_transparent=True)

        print(f"\n{'─'*70}")
        print(f"【{mc}】 LV{level}")
        v1_mark = "OK" if ulb_v1==cfg['csv_ulb'] else f"NG diff={ulb_v1-cfg['csv_ulb']:+}"
        h_mark  = "OK" if ulb_h ==cfg['csv_ulb'] else f"NG diff={ulb_h -cfg['csv_ulb']:+}"
        print(f"  CSV期待: grpPt={cfg.get('csv_grp_pt','?')}, ULB={cfg['csv_ulb']:,}円")
        print(f"  現行V1:  grpPt={total_v1:,}pt, ULB={ulb_v1:,}円  [{v1_mark}]")
        print(f"  仮説:    grpPt={total_h:,}pt, ULB={ulb_h:,}円  [{h_mark}]")

        if total_v1 != total_h or ulb_v1 != ulb_h:
            print(f"\n  段別比較:")
            print(f"  {'段':>2} {'V1 pt':>8} {'V1 bonus':>10} | {'仮説 pt':>8} {'仮説 bonus':>10} {'diff':>8}")
            for d in range(1, max_d+1):
                v1_pt = pts_v1.get(d,0)
                h_pt  = pts_h.get(d,0)
                v1_b  = int(v1_pt * rates[d-1] / 100 * POINT_RATE)
                h_b   = int(h_pt  * rates[d-1] / 100 * POINT_RATE)
                diff_p = h_pt - v1_pt
                mark = " ←" if diff_p != 0 else ""
                print(f"  {d:>2}段 {v1_pt:>8,}pt {v1_b:>10,}円 | {h_pt:>8,}pt {h_b:>10,}円 {diff_p:>+8}{mark}")

    print(f"\n{'='*80}")
    print("結論")
    print(f"{'='*80}")

    # 全5名の仮説検証結果を再表示
    all_ok_v1 = True
    all_ok_h = True
    for cfg in TARGET_CONFIGS:
        mc = cfg["code"]
        mid = code_to_id[mc]
        level = cfg["level"]
        _, _, ulb_v1, _ = calc_ulb_hypothesis(mid, level, null_fa_transparent=False)
        _, _, ulb_h, _  = calc_ulb_hypothesis(mid, level, null_fa_transparent=True)
        ok_v1 = ulb_v1 == cfg['csv_ulb']
        ok_h  = ulb_h  == cfg['csv_ulb']
        if not ok_v1: all_ok_v1 = False
        if not ok_h:  all_ok_h = False
        print(f"  {mc}: V1={'✅' if ok_v1 else f'❌({ulb_v1})'} 仮説={'✅' if ok_h else f'❌({ulb_h})'} 期待={cfg['csv_ulb']}")

    print()
    print(f"  現行V1: {'✅ 全員一致' if all_ok_v1 else '❌ 一部不一致'}")
    print(f"  仮説:   {'✅ 全員一致' if all_ok_h else '❌ 一部不一致'}")

if __name__ == "__main__":
    main()
