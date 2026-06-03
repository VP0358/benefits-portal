#!/usr/bin/env python3
"""
82938301 がどのdepthにいるかのパストレース
82179501 → ... → 82938301 の経路を追跡
不足7名の完全な経路を確認
"""

import psycopg2
from collections import defaultdict, deque

DB_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

BONUS_MONTH = "2026-04"
POINT_RATE = 100
ACTIVE_REQUIRED_PRODUCTS = {"1000", "2000"}

UNILEVEL_MAX_DEPTH = {0: 0, 1: 3, 2: 5, 3: 7, 4: 7, 5: 7}

FA_CODES = {"40431001", "44504701", "64150101", "82179501", "82179502", "89248801", "95446801"}

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

    # 全会員データ
    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId", 
               "currentLevel", "forceActive", "forceLevel"
        FROM mlm_members
        WHERE "memberCode" IS NOT NULL
    """)
    rows = cur.fetchall()

    member_map = {}
    code_to_id = {}
    id_to_code = {}
    for row in rows:
        mid, code, status, upline_id, referrer_id, current_level, force_active, force_level = row
        member_map[mid] = {
            "id": mid,
            "code": code,
            "status": status,
            "upline_id": upline_id,
            "referrer_id": referrer_id,
            "current_level": current_level or 0,
            "force_active": bool(force_active),
            "force_level": force_level,
        }
        code_to_id[code] = mid
        id_to_code[mid] = code

    # 購入データ
    cur.execute("""
        SELECT 
            p."mlmMemberId",
            SUM(CASE 
                WHEN p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL 
                THEN p."totalPoints" 
                ELSE 0 
            END) as self_pt,
            BOOL_OR(p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL) as purchased_required
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off', 'canceled')
        GROUP BY p."mlmMemberId"
    """, (BONUS_MONTH,))

    purchase_map = {}
    for row in cur.fetchall():
        mid, self_pt, purchased_required = row
        purchase_map[mid] = {
            "self_pt": int(self_pt or 0),
            "purchased_required": bool(purchased_required),
        }

    # uplineChildrenMap
    upline_children_map = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_children_map[m["upline_id"]].append(mid)

    root_code = "82179501"
    root_id = code_to_id[root_code]

    # 不足7名
    missing_7 = ["14578101", "32647101", "48743401", "54619301", "61225401", "64072801", "92993201"]
    missing_ids = {code_to_id[c] for c in missing_7 if c in code_to_id}

    print(f"=== {root_code}からの探索 ===")
    print(f"不足7名のID: {[id_to_code.get(mid, '?') for mid in missing_ids]}")

    # TypeScript traverse実装で各ノードのdepthを記録
    # traverse(currentId, depth): currentIdの子をdepthで処理
    # traverse(rootId, 1): rootの子をd=1で処理

    node_depths = {}  # child_id → 実際のdepth (カウントされる深さ)
    max_depth = UNILEVEL_MAX_DEPTH[4]  # LV4 = 7

    def traverse(current_id, depth):
        """TypeScript実装の完全再現"""
        if depth > max_depth:
            return
        
        children = upline_children_map.get(current_id, [])
        for child_id in children:
            child = member_map.get(child_id)
            if not child:
                continue
            
            p = purchase_map.get(child_id, {})
            child_self_pt = p.get("self_pt", 0)
            child_force_active = child["force_active"]
            child_purchased_required = p.get("purchased_required", False)
            child_status = child["status"]
            
            if is_withdrawn(child_status, child_force_active):
                traverse(child_id, depth)
            else:
                child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                
                if child_is_act:
                    node_depths[child_id] = depth
                    traverse(child_id, depth + 1)
                else:
                    traverse(child_id, depth)

    import sys
    sys.setrecursionlimit(10000)
    traverse(root_id, 1)

    print(f"\n探索されたACTノード数: {len(node_depths)}")

    # 不足7名の深さを確認
    print(f"\n=== 不足7名の深さ ===")
    for code in missing_7:
        mid = code_to_id.get(code)
        if mid:
            d = node_depths.get(mid, "探索外")
            m = member_map[mid]
            p = purchase_map.get(mid, {})
            act = is_active(m["status"], p.get("self_pt", 0), p.get("purchased_required", False), m["force_active"])
            wd = is_withdrawn(m["status"], m["force_active"])
            print(f"  {code}: depth={d}, ACT={act}, WD={wd}, selfPt={p.get('self_pt',0)}, status={m['status']}, FA={m['force_active']}")
        else:
            print(f"  {code}: IDが見つかりません")

    # 82938301の深さも確認
    print(f"\n=== 82938301の深さ ===")
    mid_82938301 = code_to_id.get("82938301")
    if mid_82938301:
        d = node_depths.get(mid_82938301, "探索外")
        m = member_map[mid_82938301]
        p = purchase_map.get(mid_82938301, {})
        print(f"  82938301: depth={d}, selfPt={p.get('self_pt',0)}, ACT={is_active(m['status'], p.get('self_pt',0), p.get('purchased_required',False), m['force_active'])}")

    # 82179501→82938301のパスを確認
    print(f"\n=== 82179501 → 82938301 のパス ===")
    # BFSで82938301への経路を探す
    target_id = code_to_id.get("82938301")
    # 逆方向（uplineを辿る）
    if target_id:
        path = []
        cur_id = target_id
        while cur_id:
            m = member_map.get(cur_id, {})
            p = purchase_map.get(cur_id, {})
            self_pt = p.get("self_pt", 0)
            fa = m.get("force_active", False)
            status = m.get("status", "?")
            act = is_active(status, self_pt, p.get("purchased_required", False), fa)
            wd = is_withdrawn(status, fa)
            depth = node_depths.get(cur_id, "?")
            path.append((m.get("code", "?"), status, self_pt, act, wd, depth, fa))
            if cur_id == root_id:
                break
            cur_id = m.get("upline_id")
        
        path.reverse()
        print(f"  経路:")
        for code, status, self_pt, act, wd, depth, fa in path:
            node_type = "ACT" if act else ("WD" if wd else "非ACT")
            print(f"    {code}: {node_type} depth={depth} selfPt={self_pt} FA={fa}")

    # 82938301の直接の子を確認
    print(f"\n=== 82938301の直接の子 ===")
    if mid_82938301:
        children = upline_children_map.get(mid_82938301, [])
        for child_id in children:
            child = member_map.get(child_id, {})
            p = purchase_map.get(child_id, {})
            self_pt = p.get("self_pt", 0)
            status = child.get("status", "?")
            fa = child.get("force_active", False)
            act = is_active(status, self_pt, p.get("purchased_required", False), fa)
            wd = is_withdrawn(status, fa)
            d = node_depths.get(child_id, "探索外（不明）")
            print(f"  {child.get('code','?')}: {status}, selfPt={self_pt}, ACT={act}, WD={wd}, FA={fa}, depth={d}")
            # 更に子を確認
            for gc_id in upline_children_map.get(child_id, [])[:5]:
                gc = member_map.get(gc_id, {})
                gcp = purchase_map.get(gc_id, {})
                gc_self_pt = gcp.get("self_pt", 0)
                gc_status = gc.get("status", "?")
                gc_fa = gc.get("force_active", False)
                gc_act = is_active(gc_status, gc_self_pt, gcp.get("purchased_required", False), gc_fa)
                gc_wd = is_withdrawn(gc_status, gc_fa)
                gc_d = node_depths.get(gc_id, "探索外")
                print(f"    └{gc.get('code','?')}: {gc_status}, selfPt={gc_self_pt}, ACT={gc_act}, WD={gc_wd}, depth={gc_d}")

    cur.close()
    conn.close()
    print("\n=== 完了 ===")

if __name__ == "__main__":
    main()
