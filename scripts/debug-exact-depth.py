#!/usr/bin/env python3
"""
不足7名の実際のdepth（TypeScript実装で計算される深さ）を詳細確認
"""

import psycopg2
from collections import defaultdict
import sys

sys.setrecursionlimit(50000)

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

    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId", 
               "currentLevel", "forceActive", "forceLevel"
        FROM mlm_members WHERE "memberCode" IS NOT NULL
    """)
    
    member_map = {}
    code_to_id = {}
    id_to_code = {}
    for row in cur.fetchall():
        mid, code, status, upline_id, referrer_id, current_level, force_active, force_level = row
        member_map[mid] = {
            "id": mid, "code": code, "status": status,
            "upline_id": upline_id, "referrer_id": referrer_id,
            "current_level": current_level or 0,
            "force_active": bool(force_active), "force_level": force_level,
        }
        code_to_id[code] = mid
        id_to_code[mid] = code

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
    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_children_map[m["upline_id"]].append(mid)

    cur.close()
    conn.close()

    root_code = "82179501"
    root_id = code_to_id[root_code]
    max_depth = 7  # LV4のmaxDepth

    # TypeScript実装の正確な再現 - 再帰版（TypeScriptのtraverseに忠実）
    def traverse_ts(current_id, depth, depth_points, visited=None):
        """TypeScriptのtraverse関数を完全に再現"""
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
                traverse_ts(child_id, depth, depth_points)
            else:
                child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                if child_is_act:
                    if child_self_pt > 0:
                        depth_points[depth] = depth_points.get(depth, 0) + child_self_pt
                    traverse_ts(child_id, depth + 1, depth_points)
                else:
                    traverse_ts(child_id, depth, depth_points)

    # 再帰版で計算
    depth_points = {}
    traverse_ts(root_id, 1, depth_points)
    
    print("=== 再帰版（TypeScript完全再現）の段別ポイント ===")
    for d in range(1, 8):
        pt = depth_points.get(d, 0)
        if pt > 0:
            print(f"  d={d}: {pt}pt")
    print(f"  合計: {sum(depth_points.values())}pt")
    
    # 不足7名の確認
    missing_7 = ["14578101", "32647101", "48743401", "54619301", "61225401", "64072801", "92993201"]
    
    print("\n=== 不足7名の確認（再帰traverse内部トレース） ===")
    
    # 各不足会員への経路でtraverseが到達するか確認
    # 経路上のACTカウントを確認

    for target_code in missing_7:
        target_id = code_to_id.get(target_code)
        if not target_id:
            continue
        
        # upline経路を辿る
        path = []
        cur_id = target_id
        found_root = False
        while cur_id:
            m = member_map.get(cur_id, {})
            p = purchase_map.get(cur_id, {})
            self_pt = p.get("self_pt", 0)
            fa = m.get("force_active", False)
            status = m.get("status", "?")
            purchased_required = p.get("purchased_required", False)
            act = is_active(status, self_pt, purchased_required, fa)
            wd = is_withdrawn(status, fa)
            path.append({
                "id": cur_id,
                "code": m.get("code", "?"),
                "status": status,
                "self_pt": self_pt,
                "act": act,
                "wd": wd,
                "fa": fa,
            })
            if cur_id == root_id:
                found_root = True
                break
            cur_id = m.get("upline_id")
        
        path.reverse()
        
        # パス上のACT深さを計算（TypeScript方式）
        act_depth = 0  # rootの子から始まる
        depth_consumed = 0
        
        print(f"\n【{target_code}】の経路:")
        for i, node in enumerate(path):
            if i == 0:
                print(f"  root({node['code']}) ← 起点")
                continue
            
            prev = path[i-1]
            prev_act = prev["act"]
            prev_wd = prev["wd"]
            
            if node["wd"]:
                print(f"  → {node['code']}: WD/透過 depth変わらず={act_depth+1}")
            elif node["act"]:
                act_depth += 1
                print(f"  → {node['code']}: ACT, selfPt={node['self_pt']}, depth={act_depth}")
            else:
                print(f"  → {node['code']}: 非ACT/透過 depth変わらず={act_depth+1}")
        
        if found_root:
            final_depth = act_depth + 1  # target自身の深さ
            print(f"  {target_code}: ACT, selfPt=150, depth計算値={final_depth}")
            
            # なぜこのdepthか再確認
            # TypeScript: traverse(parent, actual_depth) で parent の子として処理される
            # 親がACTの場合: traverse(parent, parent_depth+1)
            # 親が非ACT/WDの場合: traverse(parent, parent_depth)
            
            # 実際のTypeScriptでの処理深さを計算
            ts_depth = 0
            for i, node in enumerate(path):
                if i == 0:
                    continue  # root自身はカウントしない
                
                # この時点での「traverse呼び出し時のdepth」を計算
                # traverse(root, 1) → rootの子がdepth=1で処理される
                # 「depth」= この node が処理される時の traverse の depth引数
                
            # TypeScript方式での深さを正確に計算
            traverse_depth = 1  # rootからの子はdepth=1
            for i, node in enumerate(path):
                if i == 0:
                    continue  # root
                
                prev = path[i-1]
                if prev["act"] and not prev["wd"]:
                    # ACTの子はdepth+1
                    if i > 1:  # prev自身がどのdepthで処理されたか
                        pass
                
            # 最もシンプルな方法: path上の ACT の数を数える（root除く、target含まない）
            act_count_before_target = sum(1 for node in path[1:-1] if node["act"])
            ts_processing_depth = act_count_before_target + 1  # target自身はdepth=act_count+1
            
            print(f"  TypeScript処理深さ（ACT間距離）: {ts_processing_depth}")
            
            if ts_processing_depth > max_depth:
                print(f"  ❌ depth={ts_processing_depth} > maxDepth={max_depth} → カウントされない！")
            else:
                print(f"  ✅ depth={ts_processing_depth} <= maxDepth={max_depth}")
        else:
            print(f"  root ({root_code}) が見つからない！")

    print("\n\n=== 不足7名のTS処理深さまとめ ===")
    for target_code in missing_7:
        target_id = code_to_id.get(target_code)
        if not target_id:
            continue
        
        path = []
        cur_id = target_id
        while cur_id:
            m = member_map.get(cur_id, {})
            p = purchase_map.get(cur_id, {})
            self_pt = p.get("self_pt", 0)
            fa = m.get("force_active", False)
            status = m.get("status", "?")
            purchased_required = p.get("purchased_required", False)
            act = is_active(status, self_pt, purchased_required, fa)
            wd = is_withdrawn(status, fa)
            path.append({"id": cur_id, "code": m.get("code","?"), "act": act, "wd": wd, "fa": fa, "self_pt": self_pt})
            if cur_id == root_id:
                break
            cur_id = m.get("upline_id")
        
        path.reverse()
        
        # target自身を除いたpath上のACT数
        act_in_path = sum(1 for node in path[1:] if node["act"])
        ts_depth = act_in_path  # target自身の処理depth
        # ただしこれはtarget自身がACTとして処理される深さ
        # traverse(parent, d) → childがACTならdepthPoints[d]+= child.pt
        # なのでtargetがカウントされるのはd = (target手前のACT数) + 1
        act_before_target = sum(1 for node in path[1:-1] if node["act"])
        ts_processing_depth = act_before_target + 1
        
        status_str = "✅" if ts_processing_depth <= max_depth else f"❌(depth={ts_processing_depth})"
        print(f"  {target_code}: {status_str}, ACT前={act_before_target}個, TS深さ={ts_processing_depth}")
        
        # FA会員（透過扱いなら）のケース
        act_before_target_no_fa = sum(1 for node in path[1:-1] if node["act"] and not node["fa"])
        ts_depth_no_fa = act_before_target_no_fa + 1
        status_str_no_fa = "✅" if ts_depth_no_fa <= max_depth else f"❌(depth={ts_depth_no_fa})"
        print(f"    FA透過の場合: ACT前(FA除)={act_before_target_no_fa}個, 深さ={ts_depth_no_fa} {status_str_no_fa}")


if __name__ == "__main__":
    main()
