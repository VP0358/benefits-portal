#!/usr/bin/env python3
"""
深さ計算の修正案を検証するスクリプト

問題の特定:
  現在のTypeScript実装:
    traverse(currentId, depth):
      if depth > maxDepth: return  ← これが問題！
      for child:
        if ACT: depthPoints[depth] += pt; traverse(child, depth+1)  
        else: traverse(child, depth)  # 透過

  問題: depth=7(maxDepth)のACTノードがtraverse(child, 8)を呼ぶが
        8 > 7でreturnするため、7段ACTの子は透過チェック不可

  修正案1: traverse(childId, depth)の再帰を、depth=maxDepthのACTの後も
            透過ノードが続けられるように変更:
    traverse(currentId, depth, isPassthrough=False):
      if not isPassthrough and depth > maxDepth: return
      for child:
        if WD: traverse(child, depth, isPassthrough=True if depth>maxDepth else False)
        if ACT and depth <= maxDepth: depthPoints[depth]++; traverse(child, depth+1)
        if ACT and depth > maxDepth: ... これは発生しない
        if 非ACT: traverse(child, depth, isPassthrough=True if depth>maxDepth else False)

  修正案2: 透過ノードの処理を変更 - traverse(child, depth)での再帰時にdepth > maxDepthでも継続:
    function traverse(currentId, depth):
      for child:
        if WD: traverse(child, depth)  # depth変わらず、チェックなし
        if ACT:
          if depth <= maxDepth: depthPoints[depth]++; traverse(child, depth+1)
          else: return  # ここには来ない (呼ばれる時点でdepth <= maxDepth)
        if 非ACT: traverse(child, depth)  # depth変わらず、チェックなし
    
    traverse(rootId, 1)
    
    ただし無限ループを防ぐため visited setが必要
    
  修正案3（最もシンプル）: 
    depth > maxDepth でreturnする前に、透過ノードの処理を行う
    = depth > maxDepth の時は「透過のみ継続」モード:
    
    traverse(currentId, depth):
      for child:
        if WD or 非ACT: traverse(child, depth)  # depth変わらず（無限ループ防止必要）
        if ACT:
          if depth <= maxDepth: depthPoints[depth]++; traverse(child, depth+1)
          elif depth > maxDepth: return/skip  # maxDepth超えたACTはカウントしない
    
    これで depth=7のACTの子の「透過→ACT」もd=7でカウントできる

  期待の動作:
    82938301(d=6) → traverse(82938301, 7)
    51556601(非ACT) → traverse(51556601, 7)  # depth変わらず
    10885801(ACT, d=7) → depthPoints[7]++; traverse(10885801, 8)
    10885802(WD) → traverse(10885802, 8)  # depth変わらず
    57251401(非ACT) → traverse(57251401, 8)  # depth変わらず
    14578101(ACT) → depth=8 > maxDepth=7 → スキップ or depthPoints[7]?

  問題: 14578101はd=8の透過後に到達するのにd=7でカウントすべきか？
  
  答え: 期待値CSVから逆算すると YES - 14578101はd=7でカウントされるべき

  これを実現するには: traverse(child, depth)の呼び出しで depth > maxDepth でも
  透過継続させ、その先のACTを depth=maxDepth でカウントする必要がある

  つまり:
    traverse(currentId, depth):
      ← depth > maxDepth チェックを削除！
      for child:
        if WD: traverse(child, depth)
        if ACT:
          if depth <= maxDepth:
            depthPoints[depth]++
            traverse(child, depth+1)
          else: # depth > maxDepth - ACTに到達したがカウントしない、子の探索も不要
            pass (return/continue/skip子の探索)
        if 非ACT: traverse(child, depth)
    
    ← 無限ループ防止のため visited set が必要！

  待って、この修正で不足7名がd=7でカウントされるか確認:
  14578101の経路: 82938301(d=6)→traverse(82938301,7)→51556601(非ACT)→traverse(51556601,7)
                  →10885801(ACT,d=7)→depthPoints[7]++; traverse(10885801,8)
                  →10885802(WD)→traverse(10885802,8)
                  →57251401(非ACT)→traverse(57251401,8)
                  →14578101(ACT,depth=8 > maxDepth=7) → スキップ ❌

  問題: 14578101 は depth=8 > maxDepth=7 なのでカウントされない
  
  つまり期待値は 14578101 が d=7 でカウントされるべきだが、
  実際のパスでは d=8 になってしまう。
  
  ならば修正案: depth > maxDepth でも ACT をカウントするか？
    → depth=maxDepth でカウント（クランプ）
  
  修正案4（クランプ版）:
    traverse(currentId, depth):
      effective_depth = min(depth, maxDepth)  ← effective_depth でカウント
      for child:
        if WD: traverse(child, effective_depth)
        if ACT:
          depthPoints[effective_depth]++
          traverse(child, effective_depth+1) ← effective_depth+1がmaxDepth超えたら透過のみ
        if 非ACT: traverse(child, effective_depth)
    
    これだと depth > maxDepth の時も ACT がカウントされてしまう問題
    
  修正案5（正確な修正）:
    "透過ノードが続いている間はdepthを増やさず、次のACTが来た時にdepthが
     maxDepthを超えていてもmaxDepth段としてカウントする"
    
    ただし実際には:
    - maxDepth段のACT後に透過が続き、その先のACTもmaxDepth段でカウント
    - maxDepth+1段以降のACTノードの後の透過→ACTはカウントしない
    
    → これは「ACT to ACT 最短距離」でのdepth計算と同等
      = 透過ノードがdepthを消費しない → ACT間でのみdepthがカウント

  ↑ この解釈（ACT間距離でのdepth計算）が正しいなら:
  
    traverse(currentId, actDepth):
      for child:
        if WD/非ACT: traverse(child, actDepth)  # 透過: depth変わらず
        if ACT:
          nextDepth = actDepth + 1
          if nextDepth <= maxDepth: depthPoints[nextDepth]++
          traverse(child, nextDepth)  # nextDepth > maxDepth でも探索継続（透過のため）
          ただしnextDepth > maxDepth のとき子ACTはカウントしないが透過は継続
    
    traverse(rootId, 0)  # rootは深さ0から始める
    
    この場合: traverse(root, 0)
      → 95446801(FA, ACT) → nextDepth=1; depthPoints[1]... (FA selfPt=0なので加算なし)
      → traverse(95446801, 1)
      → ... 
      → 82938301(ACT) → nextDepth=7; depthPoints[7]++; traverse(82938301, 7)
      → 51556601(非ACT) → traverse(51556601, 7)  # depth=7維持
      → 10885801(ACT) → nextDepth=8 > maxDepth → カウントしない; traverse(10885801, 8)
        ← 問題: nextDepth=8でtraveseが呼ばれるが、8>maxDepth なら stop？
           もし継続すると: 10885802(WD) → traverse(10885802, 8) → 57251401(非ACT) → traverse(57251401,8)
           → 14578101(ACT) → nextDepth=9 > maxDepth → カウントしない
    
    これでも 14578101 はカウントされない。
    
  結論: 14578101 が期待値でd=7にカウントされるためには、
  10885801がd=7でカウントされた後でも、その子孫の透過チェーンを経て
  到達するACTを「同じd=7」でカウントする必要がある。
  
  = maxDepth段のACTとその後の透過チェーンを通って到達するACTは全て同じmaxDepth段扱い
  
  修正案6（maxDepth段以降は全てmaxDepth段にクランプ）:
  
    traverse(currentId, depth):
      for child:
        if WD: traverse(child, depth)
        if ACT:
          effective = min(depth, maxDepth)  # maxDepth以降はクランプ
          if child.selfPt > 0: depthPoints[effective]++
          traverse(child, depth+1)  # depth+1(クランプなし)で探索継続
        if 非ACT: traverse(child, depth)
    
    traverse(rootId, 1)  # rootの子をd=1で処理（depth=1から始める）
    
    これで:
    - 82938301(d=6) → traverse(82938301, 7)
    - 51556601(非ACT) → traverse(51556601, 7)
    - 10885801(ACT) → effective=min(7,7)=7; depthPoints[7]++; traverse(10885801, 8)
    - 10885802(WD) → traverse(10885802, 8)
    - 57251401(非ACT) → traverse(57251401, 8)
    - 14578101(ACT) → effective=min(8,7)=7; depthPoints[7]++; traverse(14578101, 9)
      ← 14578101がd=7でカウント！✅
    
  但し問題: ACTノードの子の探索が maxDepth を超えても続くため、非常に深いツリーでは
  無限ループや過剰な計算が発生する可能性あり。visitedセットが必要。

  また: 68673603(非ACT)→48743401(ACT) のケースも確認:
    - 68673601(d=7) → traverse(68673601, 8)  
    - 68673603(非ACT) → traverse(68673603, 8)
    - 48743401(ACT) → effective=min(8,7)=7; depthPoints[7]++; ← ✅

  別検証: 64072801 のケース（非常に深いチェーン）
    22482301(d?)→22482302(d?)→45697201(d?)→WD×3→48743801(d?)→WD→64072801(d?)
    82(root)→40(1)→86B1(2)→86B4(3)→WD→WD→22482301(4→4→4)→22482302(5)→45697201(6)→WD→WD→WD→48743801(7)→WD→64072801
    → 48743801がd=7でカウントされ、WD透過後の64072801もd=7でカウント！✅
  
  実際のdepth計算を検証してみよう。

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

    # --- 修正版のcalcDepthPointsV1 ---
    def calc_depth_points_v1_fixed(root_id, achieved_level):
        """
        修正版: maxDepth段以降もクランプしてカウント
        
        変更点:
          現在: if depth > maxDepth: return (ACTノードのdepth+1で透過チェーンが打ち切られる)
          修正: ACTノードがmaxDepth超えのdepthで呼ばれた場合も、
                selfPtをmaxDepth段にクランプしてカウントし、子の透過を継続
                ただし effective_depth = min(depth, maxDepth)

        実際には:
          - WD/非ACT透過: depth消費なし
          - ACT: effective_depth = min(depth, maxDepth) でカウント
          - traverse(ACT, depth+1) で継続（depthはクランプしない）
          - 無限ループ防止: visitedセット
        """
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0:
            return {}
        
        depth_points = defaultdict(int)
        visited = set()  # 無限ループ防止
        
        # スタック: (cur_id, depth)
        # cur_id の子を depth で処理
        stack = [(root_id, 1)]
        
        while stack:
            cur_id, depth = stack.pop()
            
            if cur_id in visited:
                continue
            visited.add(cur_id)
            
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
                    # WD: depth消費なし、継続
                    stack.append((child_id, depth))
                else:
                    child_is_act = is_active(child_status, child_self_pt, child_purchased_required, child_force_active)
                    
                    if child_is_act:
                        # ACT: effective_depth = min(depth, maxDepth) でカウント
                        effective_depth = min(depth, max_depth)
                        if child_self_pt > 0:
                            depth_points[effective_depth] += child_self_pt
                        # 子は depth+1 で処理継続（クランプなし）
                        stack.append((child_id, depth + 1))
                    else:
                        # 非ACT: depth消費なし、継続
                        stack.append((child_id, depth))
        
        return dict(depth_points)

    # 元の実装（visited追加版）
    def calc_depth_points_v1_original(root_id, achieved_level):
        """元の実装にvisitedを追加（バグ修正なし）"""
        max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
        if max_depth == 0:
            return {}
        
        depth_points = defaultdict(int)
        
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

    # DAC計算（referrerベース）
    act_cache = {}
    def get_act(mid):
        if mid not in act_cache:
            m = member_map.get(mid, {})
            p = purchase_map.get(mid, {})
            act_cache[mid] = is_active(m.get("status",""), p.get("self_pt",0), p.get("purchased_required",False), m.get("force_active",False))
        return act_cache[mid]

    def calc_dac(root_id):
        return sum(1 for c in referrer_children_map.get(root_id, []) if get_act(c))

    print("=" * 70)
    print("修正案6の検証: maxDepth以降もクランプしてカウント")
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
        
        # 元の実装
        orig_ulb, orig_detail = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_depth_points_v1_original)
        # 修正版
        fix_ulb, fix_detail = calc_ulb(mid, self_pt, force_active, dac, achieved_level, calc_depth_points_v1_fixed)
        
        exp = EXPECTED.get(code, {})
        exp_ulb = exp.get("ulb", 0)
        
        orig_status = "✅" if orig_ulb == exp_ulb else f"❌({orig_ulb - exp_ulb:+d})"
        fix_status = "✅" if fix_ulb == exp_ulb else f"❌({fix_ulb - exp_ulb:+d})"
        
        print(f"【{code}】LV={achieved_level}, selfPt={self_pt}, FA={force_active}, DAC={dac}")
        print(f"  期待値: {exp_ulb:,}円")
        print(f"  現在実装: {orig_ulb:,}円 {orig_status}")
        print(f"  修正後:   {fix_ulb:,}円 {fix_status}")
        
        if fix_ulb != orig_ulb:
            print(f"  変化あり! 差={fix_ulb - orig_ulb:+d}円")
            max_depth = UNILEVEL_MAX_DEPTH.get(achieved_level, 0)
            orig_dp = calc_depth_points_v1_original(mid, achieved_level)
            fix_dp = calc_depth_points_v1_fixed(mid, achieved_level)
            rates = UNILEVEL_RATES.get(achieved_level, UNILEVEL_RATES[0])
            for d in range(1, max_depth + 1):
                orig_pt = orig_dp.get(d, 0)
                fix_pt = fix_dp.get(d, 0)
                rate = rates[d-1] if d-1 < len(rates) else 0
                if orig_pt != fix_pt or fix_pt > 0:
                    print(f"    d={d}: {orig_pt}pt → {fix_pt}pt (rate={rate}%)")
        print()

    print("=" * 70)
    print("完了")

if __name__ == "__main__":
    main()
