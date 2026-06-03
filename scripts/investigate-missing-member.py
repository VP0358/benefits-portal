#!/usr/bin/env python3
"""
investigate-missing-member.py
===============================
44504701の段7不足1人（150pt）を特定する

アプローチ:
1. 44504701のV1段8の全会員を列挙
2. 各会員のuplineチェーンを調べ、なぜ段8になったかを確認
3. CSVのグループpt=16050 = V1段1-7合計(15900) + 150pt
   → どこかに1人(150pt)が「V1段8」だが「CSV段7」の会員がいる

また、82179501の段6+1人(150pt) + 段7+5人(750pt) = 900ptについても
同様の分析を行う

特に注目: 
- V1では段8+だが、CSVでは段7に計上されるような「別ルートで段7到達できる会員」
- uplineが段7のACT会員の、さらにその子の会員（段8になる普通の会員）と区別される何か

新しい仮説: CSVは「ポジション別」ではなく「会員コード別」でユニーク化しているかもしれない
（同じ会員が複数のポジションを持つ場合、最も浅い段数が使用される）
"""

import os, sys, csv
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
            "force_level":m["forceLevel"],
            "current_level":m["currentLevel"] or 0,
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

    # ── referrerツリーでのdepthも計算して比較 ──
    print("="*80)
    print("referrerIdベースのツリーでのULB計算（比較用）")
    print("="*80)

    for mc, level, csv_ulb in [
        ("82179501", 4, 53850),
        ("44504701", 5, 44850),
    ]:
        mid = code_to_id[mc]
        max_d = UNILEVEL_MAX_DEPTH[level]
        rates = UNILEVEL_RATES[level]

        # uplineIdベース（現行V1）
        depth_pts_upline = defaultdict(int)
        def traverse_upline(curr_id, depth):
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)
                if wd: traverse_upline(child_id, depth)
                elif ac:
                    if depth <= max_d and not fa and self_pt > 0:
                        depth_pts_upline[depth] += self_pt
                    traverse_upline(child_id, depth+1)
                else: traverse_upline(child_id, depth)

        depth_pts_upline.clear()
        traverse_upline(mid, 1)
        ulb_upline = sum(int(depth_pts_upline.get(d,0)*rates[d-1]/100*POINT_RATE) for d in range(1,max_d+1))

        # referrerIdベース
        depth_pts_ref = defaultdict(int)
        def traverse_referrer(curr_id, depth):
            for child_id in referrer_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                wd = v1_is_withdrawn(m["status"], fa)
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)
                if wd: traverse_referrer(child_id, depth)
                elif ac:
                    if depth <= max_d and not fa and self_pt > 0:
                        depth_pts_ref[depth] += self_pt
                    traverse_referrer(child_id, depth+1)
                else: traverse_referrer(child_id, depth)

        depth_pts_ref.clear()
        traverse_referrer(mid, 1)
        ulb_ref = sum(int(depth_pts_ref.get(d,0)*rates[d-1]/100*POINT_RATE) for d in range(1,max_d+1))

        print(f"\n【{mc}】 LV{level}  CSV ULB={csv_ulb:,}")
        print(f"  uplineベース ULB: {ulb_upline:,}円  (差={ulb_upline-csv_ulb:+,})")
        print(f"  referrerベース ULB: {ulb_ref:,}円  (差={ulb_ref-csv_ulb:+,})")

    # ── 44504701の段8会員を詳細確認 ──
    print(f"\n{'='*80}")
    print("44504701の段8会員の詳細（どのACTの子か）")
    print(f"{'='*80}")

    mid_44 = code_to_id["44504701"]
    depth_members_44 = defaultdict(list)
    exceeded_44 = []

    def traverse_44(curr_id, depth):
        for child_id in upline_ch.get(curr_id, []):
            m = member_map.get(child_id)
            if not m: continue
            pur = purchase_map.get(child_id, {})
            self_pt = pur.get("self_pt", 0)
            pur_req = pur.get("purchased_required", False)
            fa = m["force_active"]
            wd = v1_is_withdrawn(m["status"], fa)
            ac = v1_is_active(m["status"], self_pt, pur_req, fa)
            if wd: traverse_44(child_id, depth)
            elif ac:
                info = {"id":child_id, "code":m["member_code"], "depth":depth,
                        "self_pt":self_pt, "fa":fa, "upline_id":m["upline_id"]}
                if depth <= 7:
                    depth_members_44[depth].append(info)
                else:
                    if self_pt>0 and not fa:
                        exceeded_44.append(info)
                traverse_44(child_id, depth+1)
            else: traverse_44(child_id, depth)

    traverse_44(mid_44, 1)

    # 段8の会員のupline（段7のACT）を確認
    depth7_ids = {m["id"] for m in depth_members_44.get(7,[]) if m["self_pt"]>0 and not m["fa"]}
    depth8_with_act_upline = [m for m in exceeded_44 if m["upline_id"] in depth7_ids]

    print(f"\n段8超過会員数: {len(exceeded_44)}名")
    print(f"段8でuplineが段7ACT会員: {len(depth8_with_act_upline)}名")

    print(f"\n段8超過会員のuplineを追跡:")
    for m8 in exceeded_44[:20]:
        up = member_map.get(m8["upline_id"],{})
        up_code = id_to_code.get(m8["upline_id"],"?")
        up_fa = up.get("force_active",False)
        up_sp = purchase_map.get(m8["upline_id"],{}).get("self_pt",0)
        # そのuplineの upline も確認
        up2_id = up.get("upline_id")
        up2 = member_map.get(up2_id,{}) if up2_id else {}
        up2_code = id_to_code.get(up2_id,"?") if up2_id else "?"
        up2_fa = up2.get("force_active",False)
        print(f"  {m8['code']}(depth={m8['depth']}): "
              f"upline={up_code}(fa={up_fa},sp={up_sp}) → "
              f"upline.upline={up2_code}(fa={up2_fa})")

    # ── 「同一コードが複数ポジション」の可能性を確認 ──
    print(f"\n{'='*80}")
    print("同一memberCodeが複数positionIdを持つか確認")
    print(f"{'='*80}")
    code_positions = defaultdict(list)
    for mid, m in member_map.items():
        code_positions[m["member_code"]].append(mid)
    multi_pos = {code: pids for code, pids in code_positions.items() if len(pids) > 1}
    print(f"複数positionを持つ会員コード: {len(multi_pos)}件")
    for code, pids in sorted(multi_pos.items()):
        print(f"  {code}: {pids}")

    # ── 「bonus_list_full.csvのACT判定とV1の差」 ──
    # CSVに存在するのに非ACT（V1）な会員がいるか
    print(f"\n{'='*80}")
    print("bonus_list_full.csvのアクティブ列との照合")
    print(f"{'='*80}")
    bonus_csv_active = {}
    try:
        with open("/home/user/uploaded_files/bonus_list_full.csv","r",encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                code = row["会員番号"].strip()
                bonus_csv_active[code] = row["ｱｸﾃｨﾌﾞ"].strip()
    except:
        print("CSVなし")

    # 82179501と44504701のツリー内で、CSV active=○ だがV1 active=False の会員
    def get_tree_members(root_id):
        visited = set()
        result = []
        def go(curr_id):
            if curr_id in visited: return
            visited.add(curr_id)
            for child_id in upline_ch.get(curr_id, []):
                m = member_map.get(child_id)
                if not m: continue
                pur = purchase_map.get(child_id, {})
                self_pt = pur.get("self_pt", 0)
                pur_req = pur.get("purchased_required", False)
                fa = m["force_active"]
                ac = v1_is_active(m["status"], self_pt, pur_req, fa)
                result.append({"id":child_id, "code":m["member_code"], "active_v1":ac,
                                "self_pt":self_pt, "fa":fa, "status":m["status"]})
                go(child_id)
        go(root_id)
        return result

    for mc, root_id in [("82179501", code_to_id["82179501"]),
                         ("44504701", code_to_id["44504701"])]:
        tree_members = get_tree_members(root_id)
        # CSVでactive=○ だがV1では非activeの会員
        csv_active_but_v1_inactive = [
            m for m in tree_members
            if bonus_csv_active.get(m["code"],"×") == "○"
            and not m["active_v1"]
        ]
        # V1でactive=True だがCSVでactive=×の会員（購入あり）
        v1_active_but_csv_inactive = [
            m for m in tree_members
            if bonus_csv_active.get(m["code"],"×") == "×"
            and m["active_v1"] and m["self_pt"] > 0
        ]
        print(f"\n【{mc}】ツリー:")
        print(f"  CSV active=○ だが V1 active=False: {len(csv_active_but_v1_inactive)}名")
        for m in csv_active_but_v1_inactive[:10]:
            print(f"    {m['code']} sp={m['self_pt']} fa={m['fa']} status={m['status']}")
        print(f"  V1 active=True だが CSV active=×: {len(v1_active_but_csv_inactive)}名")
        for m in v1_active_but_csv_inactive[:10]:
            print(f"    {m['code']} sp={m['self_pt']} fa={m['fa']} status={m['status']}")

    print(f"\n{'='*80}")
    print("調査完了")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
