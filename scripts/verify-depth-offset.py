#!/usr/bin/env python3
"""
深さのオフセット検証
traverse(rootId, 0) にした場合（root自身をd=0として子をd=0で処理開始）の検証

現在: traverse(rootId, 1) → rootの子がd=1でカウント
テスト: traverse(rootId, 0) → rootの子がd=0でカウント、でもd=0はRATEがないので実質d=1からカウント

または: traverse(rootId, 0) で「直下のACTをd=0でカウント」するが RATES[0]は存在するので加算される
  でも通常のULBは「1段目から」なのでd=0はRATE=0...

別案: traverse(child, depth) ではなく traverse(child, depth+1) で始まる場合
  つまり現在と全く同じだが深さの「解釈」が違う
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

def is_withdrawn(status, force_active):
    if force_active: return False
    return status in ("withdrawn", "lapsed")

def is_active(status, self_pt, purchased_required, force_active):
    if force_active: return True
    if status in ("withdrawn", "lapsed"): return False
    return purchased_required and self_pt > 0

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""SELECT id, "memberCode", status, "uplineId", "referrerId", 
                         "currentLevel", "forceActive", "forceLevel"
                   FROM mlm_members WHERE "memberCode" IS NOT NULL""")
    member_map = {}
    code_to_id = {}
    for row in cur.fetchall():
        mid, code, status, upline_id, referrer_id, current_level, force_active, force_level = row
        member_map[mid] = {"id": mid, "code": code, "status": status, "upline_id": upline_id,
                           "referrer_id": referrer_id, "current_level": current_level or 0,
                           "force_active": bool(force_active), "force_level": force_level}
        code_to_id[code] = mid

    cur.execute("""SELECT p."mlmMemberId",
            SUM(CASE WHEN p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL THEN p."totalPoints" ELSE 0 END) as self_pt,
            BOOL_OR(p."productCode" IN ('1000','2000') AND p."order_id" IS NOT NULL) as purchased_required
        FROM mlm_purchases p WHERE p."purchaseMonth" = %s AND p."purchaseStatus" NOT IN ('cooling_off', 'canceled')
        GROUP BY p."mlmMemberId" """, (BONUS_MONTH,))
    purchase_map = {}
    for row in cur.fetchall():
        mid, self_pt, purchased_required = row
        purchase_map[mid] = {"self_pt": int(self_pt or 0), "purchased_required": bool(purchased_required)}

    upline_children_map = defaultdict(list)
    referrer_children_map = defaultdict(list)
    for mid, m in member_map.items():
        if m["upline_id"]: upline_children_map[m["upline_id"]].append(mid)
        if m["referrer_id"]: referrer_children_map[m["referrer_id"]].append(mid)

    cur.close()
    conn.close()

    def get_child_info(child_id):
        child = member_map.get(child_id)
        if not child: return None
        p = purchase_map.get(child_id, {})
        return {
            "self_pt": p.get("self_pt", 0),
            "force_active": child["force_active"],
            "purchased_required": p.get("purchased_required", False),
            "status": child["status"],
        }

    # 現在の実装
    def calc_dp_current(root_id, achieved_level):
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0: return {}
        dp = defaultdict(int)
        stack = [(root_id, 1)]
        while stack:
            cur_id, depth = stack.pop()
            if depth > max_depth: continue
            for child_id in upline_children_map.get(cur_id, []):
                info = get_child_info(child_id)
                if not info: continue
                if is_withdrawn(info["status"], info["force_active"]):
                    stack.append((child_id, depth))
                else:
                    act = is_active(info["status"], info["self_pt"], info["purchased_required"], info["force_active"])
                    if act:
                        if info["self_pt"] > 0: dp[depth] += info["self_pt"]
                        stack.append((child_id, depth + 1))
                    else:
                        stack.append((child_id, depth))
        return dict(dp)

    # 修正: 「ACT → depth カウント時に depth+1 ではなく depth のまま再帰」
    # つまり depthPoints[depth] += selfPt; traverse(child, depth)
    # これは逆に depth が増えなくなるのでおかしい
    # → 別の考え: root自身がd=1、その子がd=2から始まる
    # → traverse(rootId, 0)から始め、childのACTをdepth=1でカウント
    
    # 修正案: traverse(rootId, 0)
    def calc_dp_start_from_0(root_id, achieved_level):
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0: return {}
        dp = defaultdict(int)
        # traverse(rootId, 0): rootの子をdepth=0で処理 → ACTのchildren.selfPtがdepth=0にカウント
        # これは意味がない（d=0のrateはなし）
        # 実は「d=0→root直下をd=1でカウント」のためにtraverse(root, 1)と同等
        # 別の解釈: 「traverse(root, 0)でrootの子をd=0で処理、でもd=0はない」→同じ
        # 
        # 正確な修正案:
        # 現在: traverse(root, 1) → 直下ACTをd=1でカウント
        # 変更: traverse(root, 1) → 直下ACTをd=1でカウント（変わらない）
        # 
        # 何が変わるべきか？不足7名の経路では「ACT数=7（FA2名含む）→depth=8」
        # FAを除くと「ACT数=5〜6→depth=6〜7」
        # → FAをdepth消費なしにすると7名が7段以内に入る
        # → でもFA透過すると他の計算が変わりすぎる
        #
        # 別案: 問題の会員（82/44）自身がFA会員のため、
        # 82179501のルートから見たFAは「自身」と「ツリー内の他のFA会員」
        # 82のツリー内FA: 95446801(d=1消費), 64150101(d=2消費)
        # これらがdepth消費しなければ不足7名がd=6/7に入る
        
        stack = [(root_id, 0)]  # d=0から開始
        while stack:
            cur_id, depth = stack.pop()
            if depth > max_depth: continue
            for child_id in upline_children_map.get(cur_id, []):
                info = get_child_info(child_id)
                if not info: continue
                if is_withdrawn(info["status"], info["force_active"]):
                    stack.append((child_id, depth))
                else:
                    act = is_active(info["status"], info["self_pt"], info["purchased_required"], info["force_active"])
                    if act:
                        next_depth = depth + 1
                        if next_depth <= max_depth and info["self_pt"] > 0:
                            dp[next_depth] += info["self_pt"]
                        if next_depth <= max_depth:
                            stack.append((child_id, next_depth))
                    else:
                        stack.append((child_id, depth))
        return dict(dp)

    # もう一つの試み: traverse自体は変えないが、
    # FA会員のulineChildrenMapに含まれる子を直接 root の子として扱う
    # つまり FA会員を「仮想的に root に統合」
    
    # これは複雑になるのでシンプルに: 
    # ACT判定の変更: FA会員はACTとしての「depth消費」はなく「pt加算のみ」
    # 要するに: childForceActive && selfPt == 0 の場合は traverse(child, depth) (透過)
    # childForceActive && selfPt > 0 の場合は depthPoints[depth]++ && traverse(child, depth+1)
    
    # ← これはverify-fa-passthrough.pyで試した修正案A
    # 結果: 82=-47550大きい, 44=-82500大きい → ダメ
    
    # 根本的に別の視点: 
    # 期待値CSVが別のツリー（referrerIdベース）で計算されているかもしれない
    # referrerツリーで82→40→86→93→93604→48344001→48344003→WD→32647101
    # 82 referrerChildren: 40431001, 82179502, 95446801
    # 40 referrerChildren: 86820601, 44504701, ...
    
    print("=== referrerIdツリーでのULB計算テスト ===")
    print("(82179501のreferrerベースツリーで段別ポイント計算)")
    
    def calc_dp_referrer(root_id, achieved_level):
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0: return {}
        dp = defaultdict(int)
        stack = [(root_id, 1)]
        while stack:
            cur_id, depth = stack.pop()
            if depth > max_depth: continue
            for child_id in referrer_children_map.get(cur_id, []):
                info = get_child_info(child_id)
                if not info: continue
                if is_withdrawn(info["status"], info["force_active"]):
                    stack.append((child_id, depth))
                else:
                    act = is_active(info["status"], info["self_pt"], info["purchased_required"], info["force_active"])
                    if act:
                        if info["self_pt"] > 0: dp[depth] += info["self_pt"]
                        stack.append((child_id, depth + 1))
                    else:
                        stack.append((child_id, depth))
        return dict(dp)

    def calc_ulb(root_id, self_pt, force_active, dac, achieved_level, depth_func):
        if dac < 2: return 0, {}
        if self_pt == 0 and not force_active: return 0, {}
        dp = depth_func(root_id, achieved_level)
        rates = UNILEVEL_RATES.get(achieved_level, UNILEVEL_RATES[0])
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        total = 0
        detail = {}
        for d in range(1, max_depth + 1):
            pt = dp.get(d, 0)
            rate = rates[d-1] if d-1 < len(rates) else 0
            if pt > 0 and rate > 0:
                bonus = int(pt * (rate/100) * POINT_RATE)
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

    print("\n各実装の比較:")
    print(f"{'会員':^12} {'期待':>8} {'現在(UL)':>10} {'referrer':>10} {'UL+0start':>10}")
    
    for code, exp in EXPECTED.items():
        mid = code_to_id.get(code)
        if not mid: continue
        m = member_map[mid]
        p = purchase_map.get(mid, {})
        self_pt = p.get("self_pt", 0)
        force_active = m["force_active"]
        achieved_level = m["force_level"] if m["force_level"] is not None else m["current_level"]
        dac = calc_dac(mid)
        
        exp_ulb = exp["ulb"]
        curr_ulb, _ = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_dp_current)
        ref_ulb, _ = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_dp_referrer)
        start0_ulb, _ = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_dp_start_from_0)
        
        def f(v, e): return f"{v:,}✅" if v == e else f"{v:,}({v-e:+d})"
        
        print(f"{code:^12} {exp_ulb:>8,} {f(curr_ulb,exp_ulb):>16} {f(ref_ulb,exp_ulb):>16} {f(start0_ulb,exp_ulb):>16}")

    print()
    
    # 44504701の詳細
    print("=== 44504701の詳細 ===")
    code = "44504701"
    mid = code_to_id[code]
    m = member_map[mid]
    achieved_level = m["force_level"] if m["force_level"] is not None else m["current_level"]
    
    dp_curr = calc_dp_current(mid, achieved_level)
    dp_ref = calc_dp_referrer(mid, achieved_level)
    dp_s0 = calc_dp_start_from_0(mid, achieved_level)
    max_d = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
    
    print(f"LV={achieved_level}, maxDepth={max_d}")
    for d in range(1, max_d+1):
        pc = dp_curr.get(d, 0)
        pr = dp_ref.get(d, 0)
        ps = dp_s0.get(d, 0)
        if pc > 0 or pr > 0 or ps > 0:
            print(f"  d={d}: current={pc}pt, referrer={pr}pt, start0={ps}pt")
    
    # 44504701のreferrer直下確認
    print(f"\n44504701のreferrer直下:")
    for cid in referrer_children_map.get(mid, [])[:10]:
        cm = member_map.get(cid, {})
        cp = purchase_map.get(cid, {})
        cact = get_act(cid)
        print(f"  {cm.get('code','?')}: ACT={cact}, selfPt={cp.get('self_pt',0)}, FA={cm.get('force_active',False)}")
    
    # 44504701のupline直下確認
    print(f"\n44504701のupline直下:")
    for cid in upline_children_map.get(mid, [])[:10]:
        cm = member_map.get(cid, {})
        cp = purchase_map.get(cid, {})
        cact = get_act(cid)
        print(f"  {cm.get('code','?')}: ACT={cact}, selfPt={cp.get('self_pt',0)}, FA={cm.get('force_active',False)}")

    print("\n=== 完了 ===")

if __name__ == "__main__":
    main()
