#!/usr/bin/env python3
"""
不足7名のuplineチェーンを確認
82179501のツリーに属しているか確認
"""

import psycopg2
from collections import defaultdict

DB_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

BONUS_MONTH = "2026-04"

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

    missing_7 = ["14578101", "32647101", "48743401", "54619301", "61225401", "64072801", "92993201"]
    
    root_code = "82179501"
    root_id = code_to_id[root_code]

    print("=== 不足7名のuplineチェーン（82179501まで） ===\n")

    for code in missing_7:
        mid = code_to_id.get(code)
        if not mid:
            print(f"{code}: IDなし")
            continue
        
        # uplineを辿って82179501まで
        chain = []
        cur_id = mid
        visited = set()
        found_root = False
        
        while cur_id and cur_id not in visited:
            visited.add(cur_id)
            m = member_map.get(cur_id, {})
            p = purchase_map.get(cur_id, {})
            self_pt = p.get("self_pt", 0)
            fa = m.get("force_active", False)
            status = m.get("status", "?")
            act = is_active(status, self_pt, p.get("purchased_required", False), fa)
            wd = is_withdrawn(status, fa)
            node_type = "ACT" if act else ("WD" if wd else "非ACT")
            chain.append((m.get("code", "?"), node_type, self_pt, fa, status))
            
            if cur_id == root_id:
                found_root = True
                break
            cur_id = m.get("upline_id")
        
        chain.reverse()
        
        print(f"【{code}】(root→target, found_root={found_root}):")
        for i, (c, ntype, spt, fa, status) in enumerate(chain):
            print(f"  {'→' if i > 0 else ' '} [{i}] {c}: {ntype}, selfPt={spt}, FA={fa}, status={status}")
        print()

    # 不足7名の直接のupline（非ACT透過）チェーン確認
    print("=== 不足7名の直前の透過チェーン ===\n")
    
    for code in missing_7:
        mid = code_to_id.get(code)
        if not mid:
            continue
        
        # 直接のuplineを辿って最初のACT/WDノードを見つける
        print(f"【{code}】の直前:")
        cur_id = mid
        for _ in range(10):
            m = member_map.get(cur_id, {})
            p = purchase_map.get(cur_id, {})
            self_pt = p.get("self_pt", 0)
            fa = m.get("force_active", False)
            status = m.get("status", "?")
            act = is_active(status, self_pt, p.get("purchased_required", False), fa)
            wd = is_withdrawn(status, fa)
            node_type = "ACT" if act else ("WD" if wd else "非ACT")
            print(f"  {m.get('code','?')}: {node_type}, status={status}, selfPt={self_pt}, FA={fa}")
            
            parent_id = m.get("upline_id")
            if parent_id == root_id:
                print(f"  ↑ 直接 root({root_code})")
                break
            cur_id = parent_id
            if not cur_id:
                break
        print()

    cur.close()
    conn.close()
    print("\n=== 完了 ===")

if __name__ == "__main__":
    main()
