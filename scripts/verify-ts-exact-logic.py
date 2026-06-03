#!/usr/bin/env python3
"""
TypeScript V1エンジンの calcDepthPointsV1 を正確に再現した検証スクリプト。

重要: TypeScript実装:
  traverse(currentId, depth):
    - childIsActive → depthPoints[depth] += childSelfPt; traverse(child, depth+1)
    - WD/非ACT        → traverse(child, depth)  # depth消費なし
  traverse(rootId, 1)  # rootの子をd=1で処理

これはPythonの以前のスクリプトとは異なる:
  - Python旧実装: stack = [(child, 1) for child in root_children]
    → cur_id自身がdepthにいる → cur_idをdepthポイントとして加算
  - TypeScript実装: traverse(root, 1) → rootの子をdepth=1で処理
    → cur_idの子にdepthを適用 → childがdepth段にカウントされる

つまり両者は同じ！
問題はおそらく他の場所にある。

このスクリプトでは:
1. DBから全データを取得
2. TypeScript V1の traverse を正確にPythonで再現
3. 5名のULBを計算して期待値と比較
"""

import psycopg2
import sys
from collections import defaultdict

DB_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

BONUS_MONTH = "2026-04"
CURRENT_MONTH = "2026-05"
POINT_RATE = 100
ACTIVE_REQUIRED_PRODUCTS = {"1000", "2000"}

UNILEVEL_MAX_DEPTH = {0: 0, 1: 3, 2: 5, 3: 7, 4: 7, 5: 7}
UNILEVEL_RATES = {
    0: [15, 7, 3, 0, 0, 0, 0],
    1: [15, 7, 3, 0, 0, 0, 0],
    2: [15, 7, 4, 3, 1, 0, 0],
    3: [15, 8, 5, 4, 2, 2, 1],
    4: [15, 9, 6, 5, 3, 2, 1],
    5: [15, 10, 7, 6, 4, 3, 2],
}

# FA会員リスト
FA_CODES = {"40431001", "44504701", "64150101", "82179501", "82179502", "89248801", "95446801"}

# 期待値
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

    print("=== DBデータ取得 ===")

    # 全会員データ取得
    cur.execute("""
        SELECT id, "memberCode", status, "uplineId", "referrerId", 
               "currentLevel", "forceActive", "forceLevel",
               "savingsPoints"
        FROM mlm_members
        WHERE "memberCode" IS NOT NULL
    """)
    rows = cur.fetchall()
    print(f"全会員数: {len(rows)}")

    member_map = {}
    for row in rows:
        mid, code, status, upline_id, referrer_id, current_level, force_active, force_level, savings_pt = row
        member_map[mid] = {
            "id": mid,
            "code": code,
            "status": status,
            "upline_id": upline_id,
            "referrer_id": referrer_id,
            "current_level": current_level or 0,
            "force_active": bool(force_active),
            "force_level": force_level,
            "savings_pt": savings_pt or 0,
        }

    # コード→IDマップ
    code_to_id = {m["code"]: mid for mid, m in member_map.items()}
    id_to_code = {mid: m["code"] for mid, m in member_map.items()}

    # 購入データ取得（BONUS_MONTH）
    # TypeScript V1エンジンのロジック:
    # - mlmPurchase で purchaseMonth = bonusMonth, purchaseStatus NOT IN (cooling_off, canceled)
    # - ACTIVE_REQUIRED_PRODUCTS (1000, 2000) かつ order が存在 → selfPurchasePoints += totalPoints
    # - order が NULL の購入はカウントしない
    cur.execute("""
        SELECT 
            p."mlmMemberId",
            SUM(CASE 
                WHEN p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL 
                THEN p."totalPoints" 
                ELSE 0 
            END) as self_pt,
            BOOL_OR(p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL) as purchased_required,
            BOOL_OR(p."productCode" = '1000') as has_product1000
        FROM mlm_purchases p
        WHERE p."purchaseMonth" = %s
          AND p."purchaseStatus" NOT IN ('cooling_off', 'canceled')
        GROUP BY p."mlmMemberId"
    """, (BONUS_MONTH,))

    purchase_map = {}
    for row in cur.fetchall():
        mid, self_pt, purchased_required, has_1000 = row
        purchase_map[mid] = {
            "self_pt": int(self_pt or 0),
            "purchased_required": bool(purchased_required),
            "has_1000": bool(has_1000),
        }

    print(f"購入データ件数: {len(purchase_map)}")

    # uplineChildrenMap構築
    upline_children_map = defaultdict(list)
    referrer_children_map = defaultdict(list)

    for mid, m in member_map.items():
        if m["upline_id"]:
            upline_children_map[m["upline_id"]].append(mid)
        if m["referrer_id"]:
            referrer_children_map[m["referrer_id"]].append(mid)

    # --- Pass1: achievedLevel計算 ---
    print("\n=== Pass1: achievedLevel計算 ===")
    
    # まずACT判定とselfPtを計算
    act_map = {}
    self_pt_map = {}
    
    for mid, m in member_map.items():
        p = purchase_map.get(mid, {})
        self_pt = p.get("self_pt", 0)
        force_active = m["force_active"]
        status = m["status"]
        purchased_required = p.get("purchased_required", False)
        
        act = is_active(status, self_pt, purchased_required, force_active)
        act_map[mid] = act
        self_pt_map[mid] = self_pt

    # groupPoints計算関数（uplineツリー、段数制限なし）
    def calc_group_points(root_id):
        """uplineツリー全体のselfPt合計（root自身 + 全ダウンライン）"""
        visited = set()
        stack = [root_id]
        total = 0
        while stack:
            cid = stack.pop()
            if cid in visited:
                continue
            visited.add(cid)
            m = member_map.get(cid)
            if not m:
                continue
            # selfPt加算
            p = purchase_map.get(cid, {})
            total += p.get("self_pt", 0)
            # 子を追加
            for child_id in upline_children_map.get(cid, []):
                if child_id not in visited:
                    stack.append(child_id)
        return total

    # 直接ACTカウント（referrerベース）
    def calc_direct_act_count(root_id):
        count = 0
        for child_id in referrer_children_map.get(root_id, []):
            if act_map.get(child_id, False):
                count += 1
        return count

    # series計算（uplineツリー、1直下の系列ごと）
    def calc_series_pts(root_id):
        """各直下の系列合計PTリスト（ACTのみ）"""
        series_list = []
        for child_id in upline_children_map.get(root_id, []):
            child = member_map.get(child_id)
            if not child:
                continue
            # WD/非ACTでも系列合計に含める（ACT会員のselfPtのみ）
            # calcSeriesPointsV1ロジック: 直下子ごとに全子孫のACT selfPt合計
            series_pt = calc_series_sub(child_id)
            series_list.append(series_pt)
        return series_list

    def calc_series_sub(root_id):
        """root_id以下のACT会員のselfPt合計"""
        visited = set()
        stack = [root_id]
        total = 0
        while stack:
            cid = stack.pop()
            if cid in visited:
                continue
            visited.add(cid)
            m = member_map.get(cid)
            if not m:
                continue
            if act_map.get(cid, False):
                p = purchase_map.get(cid, {})
                total += p.get("self_pt", 0)
            for child_id in upline_children_map.get(cid, []):
                if child_id not in visited:
                    stack.append(child_id)
        return total

    # achievedLevel計算（LEVEL_GP_RANGESとLEVEL_REQUIRED_SERIESに基づく）
    # mlm-bonus.tsから確認が必要
    # LEVEL_GP_RANGES
    LEVEL_GP_RANGES = {
        0: (0, 0),
        1: (1, 299),
        2: (300, 1499),
        3: (1500, 2999),
        4: (3000, 5999),
        5: (6000, 999999),
    }
    LEVEL_REQUIRED_SERIES = {0: 0, 1: 0, 2: 0, 3: 3, 4: 3, 5: 3}
    LEVEL_REQUIRED_ACHIEVER = {0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 2}
    LEVEL_SELF_PT_MIN = {0: 0, 1: 150, 2: 150, 3: 150, 4: 150, 5: 150}
    
    pass1_results = {}
    
    for mid, m in member_map.items():
        p = purchase_map.get(mid, {})
        self_pt = self_pt_map[mid]
        act = act_map[mid]
        force_active = m["force_active"]
        force_level = m["force_level"]
        
        gp = calc_group_points(mid)
        dac = calc_direct_act_count(mid)
        series_pts = calc_series_pts(mid)
        series_count = sum(1 for s in series_pts if s > 0)
        
        # levelを計算
        # currentLevelまたはforce_levelを使う
        current_lv = m["current_level"]
        if force_level is not None:
            achieved_lv = force_level
        else:
            achieved_lv = current_lv
        
        pass1_results[mid] = {
            "act": act,
            "achieved_level": achieved_lv,
            "self_pt": self_pt,
            "dac": dac,
            "gp": gp,
            "series_pts": series_pts,
            "series_count": series_count,
        }

    # --- TypeScript V1の traverse 完全再現 ---
    print("\n=== TypeScript V1 traverse完全再現 ===")

    def calc_depth_points_v1(root_id, achieved_level, verbose=False):
        """TypeScript calcDepthPointsV1 の完全再現"""
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0:
            return {}
        
        depth_points = defaultdict(int)
        
        # 再帰的なtraverse（スタック使用）
        # traverse(currentId, depth):
        #   for child in children:
        #     if WD: traverse(child, depth)
        #     elif ACT: depthPoints[depth] += child.selfPt; traverse(child, depth+1)
        #     else: traverse(child, depth)
        # traverse(rootId, 1)
        
        # 再帰制限を避けるためスタックで実装
        stack = [(root_id, 1)]
        
        while stack:
            cur_id, depth = stack.pop()
            
            if depth > max_depth:
                continue
            
            children = upline_children_map.get(cur_id, [])
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
                    # WD: depth消費なし
                    if verbose:
                        print(f"  WD透過: {child['code']} depth={depth}→{depth}")
                    stack.append((child_id, depth))
                else:
                    child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                    
                    if child_is_act:
                        if child_self_pt > 0:
                            depth_points[depth] += child_self_pt
                            if verbose:
                                print(f"  ACT加算: {child['code']} depth={depth} selfPt={child_self_pt}")
                        else:
                            if verbose:
                                print(f"  ACT(pt=0)透過不可: {child['code']} depth={depth}")
                        if depth + 1 <= max_depth:
                            stack.append((child_id, depth + 1))
                    else:
                        # 非ACT: depth消費なし
                        if verbose:
                            print(f"  非ACT透過: {child['code']} depth={depth}→{depth}")
                        stack.append((child_id, depth))
        
        return dict(depth_points)

    def calc_ulb_v1(member_id, self_pt, force_active, dac, achieved_level, verbose=False):
        """TypeScript calcUnilevelBonusV1 の完全再現"""
        if dac < 2:
            return 0, {}
        if self_pt == 0 and not force_active:
            return 0, {}
        
        depth_points = calc_depth_points_v1(member_id, achieved_level, verbose)
        
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

    # 5名の計算
    print("\n=== 5名のULB計算 ===")
    print("-" * 70)

    for code in TARGET_CODES:
        mid = code_to_id.get(code)
        if not mid:
            print(f"{code}: IDが見つかりません")
            continue
        
        p1 = pass1_results.get(mid, {})
        self_pt = p1.get("self_pt", 0)
        act = p1.get("act", False)
        achieved_level = p1.get("achieved_level", 0)
        dac = p1.get("dac", 0)
        force_active = member_map[mid]["force_active"]
        
        verbose = True  # 詳細出力
        
        print(f"\n【{code}】 LV={achieved_level}, selfPt={self_pt}, ACT={act}, DAC={dac}, FA={force_active}")
        
        # ULB計算
        ulb, detail = calc_ulb_v1(mid, self_pt, force_active, dac, achieved_level, verbose=False)
        
        exp = EXPECTED.get(code, {})
        exp_ulb = exp.get("ulb", 0)
        diff = ulb - exp_ulb
        status = "✅" if ulb == exp_ulb else f"❌ 差異={diff:+d}"
        
        print(f"  ULB計算値={ulb:,}円 | 期待値={exp_ulb:,}円 | {status}")
        
        # 段別詳細
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        depth_pts = calc_depth_points_v1(mid, achieved_level, verbose=False)
        rates = UNILEVEL_RATES.get(achieved_level, UNILEVEL_RATES[0])
        
        for d in range(1, max_depth + 1):
            pt = depth_pts.get(d, 0)
            rate = rates[d - 1] if d - 1 < len(rates) else 0
            bonus = int(pt * (rate / 100) * POINT_RATE) if pt > 0 and rate > 0 else 0
            if pt > 0:
                print(f"    d={d}: {pt:,}pt × {rate}% = {bonus:,}円")

    # 差異がある場合は詳細トレース
    print("\n\n=== 82179501の詳細トレース ===")
    code = "82179501"
    mid = code_to_id.get(code)
    p1 = pass1_results.get(mid, {})
    achieved_level = p1.get("achieved_level", 0)
    depth_pts = calc_depth_points_v1(mid, achieved_level, verbose=True)
    print(f"\n深さ別ポイント: {dict(depth_pts)}")
    
    print("\n\n=== 44504701の詳細トレース ===")
    code = "44504701"
    mid = code_to_id.get(code)
    p1 = pass1_results.get(mid, {})
    achieved_level = p1.get("achieved_level", 0)
    depth_pts = calc_depth_points_v1(mid, achieved_level, verbose=True)
    print(f"\n深さ別ポイント: {dict(depth_pts)}")

    cur.close()
    conn.close()
    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
