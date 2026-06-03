#!/usr/bin/env python3
"""
仮説検証: FA会員（forceActive=true）がdepthを消費しない（透過扱い）なら
不足7名がd=7でカウントされる

現在のコード:
  if childIsActive:
    depthPoints[depth] += selfPt  (selfPt=0ならば加算なし)
    traverse(child, depth+1)  ← FA会員もdepth+1！

修正仮説:
  if forceActive AND selfPt == 0:
    # FA会員でselfPt=0 → 透過扱い（depth消費なし）
    traverse(child, depth)
  else if childIsActive:
    depthPoints[depth] += selfPt
    traverse(child, depth+1)
"""

import psycopg2
from collections import defaultdict
import sys

sys.setrecursionlimit(50000)

DB_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

BONUS_MONTH = "2026-04"
POINT_RATE = 100

UNILEVEL_MAX_DEPTH = {0: 0, 1: 3, 2: 5, 3: 7, 4: 7, 5: 7}
UNILEVEL_RATES = {
    0: [15, 7, 3, 0, 0, 0, 0],
    1: [15, 7, 3, 0, 0, 0, 0],
    2: [15, 7, 4, 3, 1, 0, 0],
    3: [15, 8, 5, 4, 2, 2, 1],
    4: [15, 9, 6, 5, 3, 2, 1],
    5: [15, 10, 7, 6, 4, 3, 2],
}

EXPECTED = {
    "82179501": {"ulb": 53850, "sb": 35700, "min_pt": 10200},
    "44504701": {"ulb": 44850, "sb": 122400, "min_pt": 30600},
    "86820601": {"ulb": 98550, "sb": 16200, "min_pt": 4050},
    "93713601": {"ulb": 52650, "sb": 4200, "min_pt": 1200},
    "89248801": {"ulb": 19950, "sb": 122400, "min_pt": 30600},
}

TARGET_CODES = list(EXPECTED.keys())

def is_withdrawn(status: str, force_active: bool) -> bool:
    if force_active:
        return False
    return status in ("withdrawn", "lapsed")

def is_active(status: str, self_pt: int, purchased_required: bool, force_active: bool) -> bool:
    if force_active:
        return True
    if status in ("withdrawn", "lapsed"):
        return False
    return purchased_required and self_pt > 0


def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId", 
               "currentLevel", "forceActive", "forceLevel"
        FROM mlm_members WHERE "memberCode" IS NOT NULL
    """)
    
    member_map = {}
    code_to_id = {}
    for row in cur.fetchall():
        mid, code, status, upline_id, referrer_id, current_level, force_active, force_level = row
        member_map[mid] = {
            "id": mid, "code": code, "status": status,
            "upline_id": upline_id, "referrer_id": referrer_id,
            "current_level": current_level or 0,
            "force_active": bool(force_active), "force_level": force_level,
        }
        code_to_id[code] = mid

    cur.execute("""
        SELECT p."mlmMemberId",
            SUM(CASE WHEN p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL THEN p."totalPoints" ELSE 0 END) as self_pt,
            BOOL_OR(p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL) as purchased_required
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s AND p."purchaseStatus" NOT IN ('cooling_off', 'canceled')
        GROUP BY p."mlmMemberId"
    """, (BONUS_MONTH,))

    purchase_map = {}
    for row in cur.fetchall():
        mid, self_pt, purchased_required = row
        purchase_map[mid] = {"self_pt": int(self_pt or 0), "purchased_required": bool(purchased_required)}

    upline_children_map = defaultdict(list)
    referrer_children_map = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_children_map[m["upline_id"]].append(mid)
        if m["referrer_id"]:
            referrer_children_map[m["referrer_id"]].append(mid)

    cur.close()
    conn.close()

    # 元の実装
    def calc_depth_points_original(root_id, achieved_level):
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0:
            return {}
        depth_points = defaultdict(int)
        stack = [(root_id, 1)]
        while stack:
            cur_id, depth = stack.pop()
            if depth > max_depth:
                continue
            for child_id in upline_children_map.get(cur_id, []):
                child = member_map.get(child_id)
                if not child:
                    continue
                p = purchase_map.get(child_id, {})
                child_self_pt = p.get("self_pt", 0)
                child_force_active = child["force_active"]
                child_purchased_required = p.get("purchased_required", False)
                child_status = child["status"]
                if is_withdrawn(child_status, child_force_active):
                    stack.append((child_id, depth))
                else:
                    child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                    if child_is_act:
                        if child_self_pt > 0:
                            depth_points[depth] += child_self_pt
                        stack.append((child_id, depth + 1))
                    else:
                        stack.append((child_id, depth))
        return dict(depth_points)

    # 修正案A: FA会員のselfPt=0の場合は透過
    def calc_depth_points_fa_passthrough(root_id, achieved_level):
        """
        FA会員(forceActive=true)かつselfPt=0の場合はWD/非ACTと同様に透過
        """
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0:
            return {}
        depth_points = defaultdict(int)
        stack = [(root_id, 1)]
        while stack:
            cur_id, depth = stack.pop()
            if depth > max_depth:
                continue
            for child_id in upline_children_map.get(cur_id, []):
                child = member_map.get(child_id)
                if not child:
                    continue
                p = purchase_map.get(child_id, {})
                child_self_pt = p.get("self_pt", 0)
                child_force_active = child["force_active"]
                child_purchased_required = p.get("purchased_required", False)
                child_status = child["status"]
                if is_withdrawn(child_status, child_force_active):
                    stack.append((child_id, depth))
                else:
                    child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                    if child_is_act:
                        # 修正: FA会員でselfPt=0の場合は透過
                        if child_force_active and child_self_pt == 0:
                            # FA透過: depth消費なし
                            stack.append((child_id, depth))
                        else:
                            if child_self_pt > 0:
                                depth_points[depth] += child_self_pt
                            stack.append((child_id, depth + 1))
                    else:
                        stack.append((child_id, depth))
        return dict(depth_points)

    # 修正案B: 全FA会員を常に透過
    def calc_depth_points_fa_always_passthrough(root_id, achieved_level):
        """
        FA会員(forceActive=true)は全て透過
        """
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0:
            return {}
        depth_points = defaultdict(int)
        stack = [(root_id, 1)]
        while stack:
            cur_id, depth = stack.pop()
            if depth > max_depth:
                continue
            for child_id in upline_children_map.get(cur_id, []):
                child = member_map.get(child_id)
                if not child:
                    continue
                p = purchase_map.get(child_id, {})
                child_self_pt = p.get("self_pt", 0)
                child_force_active = child["force_active"]
                child_purchased_required = p.get("purchased_required", False)
                child_status = child["status"]
                if is_withdrawn(child_status, child_force_active):
                    stack.append((child_id, depth))
                elif child_force_active:
                    # FA会員は常に透過
                    stack.append((child_id, depth))
                else:
                    child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                    if child_is_act:
                        if child_self_pt > 0:
                            depth_points[depth] += child_self_pt
                        stack.append((child_id, depth + 1))
                    else:
                        stack.append((child_id, depth))
        return dict(depth_points)

    def calc_ulb(root_id, self_pt, force_active, dac, achieved_level, depth_func):
        if dac < 2:
            return 0, {}
        if self_pt == 0 and not force_active:
            return 0, {}
        depth_points = depth_func(root_id, achieved_level)
        rates = UNILEVEL_RATES.get(achieved_level, UNILEVEL_RATES[0])
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        total = 0
        detail = {}
        for d in range(1, max_depth + 1):
            pt = depth_points.get(d, 0)
            rate = rates[d - 1] if d - 1 < len(rates) else 0
            if pt > 0 and rate > 0:
                bonus = int(pt * (rate / 100) * POINT_RATE)
                detail[d] = bonus
                total += bonus
        return total, detail

    act_cache = {}
    def get_act(mid):
        if mid not in act_cache:
            m = member_map.get(mid, {})
            p = purchase_map.get(mid, {})
            act_cache[mid] = is_active(m.get("status",""), p.get("self_pt",0), p.get("purchased_required",False), m.get("force_active",False))
        return act_cache[mid]

    def calc_dac(root_id):
        return sum(1 for c in referrer_children_map.get(root_id, []) if get_act(c))

    # 検証用FA情報
    fa_codes = {"40431001", "44504701", "64150101", "82179501", "82179502", "89248801", "95446801"}
    
    print("=" * 70)
    print("3種の実装比較")
    print("(A) 現在の実装  (B) FA透過(selfPt=0のみ)  (C) FA常時透過")
    print("=" * 70)
    print()

    for code in TARGET_CODES:
        mid = code_to_id.get(code)
        if not mid:
            continue
        
        m = member_map[mid]
        p = purchase_map.get(mid, {})
        self_pt = p.get("self_pt", 0)
        force_active = m["force_active"]
        force_level = m["force_level"]
        current_level = m["current_level"]
        achieved_level = force_level if force_level is not None else current_level
        dac = calc_dac(mid)
        
        # 3種の計算
        orig_ulb, _ = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_depth_points_original)
        fa_pt0_ulb, _ = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_depth_points_fa_passthrough)
        fa_all_ulb, _ = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_depth_points_fa_always_passthrough)
        
        exp = EXPECTED.get(code, {})
        exp_ulb = exp.get("ulb", 0)
        
        def s(v, e):
            if v == e: return "✅"
            return f"❌({v-e:+d})"
        
        print(f"【{code}】LV={achieved_level}, FA={force_active}, selfPt={self_pt}, DAC={dac}")
        print(f"  期待値: {exp_ulb:,}円")
        print(f"  (A)現在: {orig_ulb:,}円 {s(orig_ulb, exp_ulb)}")
        print(f"  (B)FA透過(pt=0): {fa_pt0_ulb:,}円 {s(fa_pt0_ulb, exp_ulb)}")
        print(f"  (C)FA常時透過: {fa_all_ulb:,}円 {s(fa_all_ulb, exp_ulb)}")
        
        # 深さ別のポイント確認（Bが一致した場合のみ）
        if fa_pt0_ulb == exp_ulb or fa_all_ulb == exp_ulb:
            if fa_pt0_ulb == exp_ulb:
                dp = calc_depth_points_fa_passthrough(mid, achieved_level)
                label = "B"
            else:
                dp = calc_depth_points_fa_always_passthrough(mid, achieved_level)
                label = "C"
            max_d = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
            rates = UNILEVEL_RATES.get(achieved_level, UNILEVEL_RATES[0])
            print(f"  ({label})の詳細:")
            for d in range(1, max_d + 1):
                pt = dp.get(d, 0)
                if pt > 0:
                    rate = rates[d-1] if d-1 < len(rates) else 0
                    bonus = int(pt * (rate/100) * POINT_RATE)
                    print(f"    d={d}: {pt}pt × {rate}% = {bonus}円")
        print()

    # 44504701の詳細分析
    print("=" * 70)
    print("44504701の詳細分析")
    print("=" * 70)
    code = "44504701"
    mid = code_to_id[code]
    m = member_map[mid]
    achieved_level = m["force_level"] if m["force_level"] is not None else m["current_level"]
    dac = calc_dac(mid)
    
    dp_orig = calc_depth_points_original(mid, achieved_level)
    dp_fa_pt0 = calc_depth_points_fa_passthrough(mid, achieved_level)
    dp_fa_all = calc_depth_points_fa_always_passthrough(mid, achieved_level)
    
    max_d = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
    print(f"LV={achieved_level}, maxDepth={max_d}, FA={m['force_active']}")
    print(f"\n深さ別ポイント比較:")
    for d in range(1, max_d + 1):
        po = dp_orig.get(d, 0)
        pb = dp_fa_pt0.get(d, 0)
        pc = dp_fa_all.get(d, 0)
        print(f"  d={d}: (A){po}pt (B){pb}pt (C){pc}pt")
    
    print(f"\n44504701 のdirectChildren (referrer):")
    for cid in referrer_children_map.get(mid, []):
        cm = member_map.get(cid, {})
        cp = purchase_map.get(cid, {})
        cact = get_act(cid)
        print(f"  {cm.get('code','?')}: ACT={cact}, selfPt={cp.get('self_pt',0)}, FA={cm.get('force_active',False)}, status={cm.get('status','?')}")

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
