#!/usr/bin/env python3
"""
investigate-ulb-exact-diff.py
=============================================
db-82179501-tree.csv を使った完全ULB計算

目的:
  1. 5名全員のULBをdb-82179501-tree.csvのデータで完全再現
  2. bonusCSV との grp_pt / ULB差異の原因を特定
  3. 「V1のselfPtとbonusCSVのselfPtが異なる会員」を特定する

【前提】
  - db-82179501-tree.csvは82179501ツリー内の全791名のDBデータ
  - columns: position_id, member_code, status, upline_id, upline_code,
             referrer_id, referrer_code, self_pt, active, force_active, parent_source
  - activeはorder_id=NULL除外済みの2026-04基準
  - self_ptはorder_id=NULLを除いた2026-04購入pt

※ 82179501自身のposition_id=1418 は含まれていない可能性
   ルートノードとして手動で追加する
"""

import csv
from collections import defaultdict

BONUS_MONTH = "2026-04"
POINT_RATE = 100
UNILEVEL_RATES = {4: [15, 9, 6, 5, 3, 2, 1], 5: [15, 10, 7, 6, 4, 3, 2]}

EXPECTED = {
    "82179501": {"ulb": 53850, "sb": 35700, "minPt": 10200, "level": 4},
    "44504701": {"ulb": 44850, "sb": 122400, "minPt": 30600, "level": 5},
    "86820601": {"ulb": 98550, "sb": 16200, "minPt": 4050, "level": 5},
    "93713601": {"ulb": 52650, "sb": 4200, "minPt": 1200, "level": 4},
    "89248801": {"ulb": 19950, "sb": 122400, "minPt": 30600, "level": 5},
}

FA_MEMBERS = {
    "40431001": 3,
    "44504701": 5,
    "64150101": None,
    "82179501": 4,
    "82179502": None,
    "89248801": 5,
    "95446801": None,
}

# ─────────────────────────────────────────
# CSVデータ読み込み
# ─────────────────────────────────────────
def load_tree_csv():
    """db-82179501-tree.csvの読み込み"""
    members = {}
    with open('/home/user/webapp/scripts/db-82179501-tree.csv', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            mc = row['member_code']
            members[mc] = {
                'position_id': int(row['position_id']),
                'status': row['status'],
                'upline_id': int(row['upline_id']) if row['upline_id'] else None,
                'upline_code': row['upline_code'],
                'referrer_id': int(row['referrer_id']) if row['referrer_id'] else None,
                'referrer_code': row['referrer_code'],
                'self_pt': int(row['self_pt'] or 0),
                'active': row['active'] == '1',
                'force_active': row['force_active'] == '1',
            }
    return members

def load_bonus_csv():
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {
                'active': row['ｱｸﾃｨﾌﾞ'].strip(),
                'grp_act': int(row['グループACT'] or 0),
                'grp_pt': int(row['グループpt'] or 0),
                'self_pt': int(row['自己購入pt'] or 0),
                'ulb': int(row['ユニレベルB'] or 0),
                'sb': int(row['シェアB'] or 0),
                'min_pt': int(row['最小系列pt'] or 0),
            }
    return bonus

# ─────────────────────────────────────────
# ACT/WD判定
# ─────────────────────────────────────────
def is_active(mc, status, self_pt, force_active):
    if force_active:
        return True
    if status in ('withdrawn', 'lapsed', '退会', '失効'):
        return False
    return self_pt > 0

def is_withdrawn(mc, status, force_active):
    if force_active:
        return False
    return status in ('withdrawn', 'lapsed', '退会', '失効')

# ─────────────────────────────────────────
# uplineツリー構築
# ─────────────────────────────────────────
def build_upline_tree(members):
    """position_idでuplineChildrenMapを構築"""
    # pid → member_code
    pid_to_mc = {m['position_id']: mc for mc, m in members.items()}
    
    # upline_id（pid） → children pid のマップ
    upline_children_pid = defaultdict(list)
    for mc, m in members.items():
        if m['upline_id'] is not None:
            upline_children_pid[m['upline_id']].append(m['position_id'])
    
    return upline_children_pid, pid_to_mc

# ─────────────────────────────────────────
# calcGroupPointsV1の再現
# ─────────────────────────────────────────
def calc_group_points(root_mc, members, upline_children_pid, pid_to_mc, max_depth=7):
    """V1エンジンのcalcGroupPointsV1を再現（BFS版）"""
    root_m = members.get(root_mc)
    if not root_m:
        return 0, {}, []
    
    root_pid = root_m['position_id']
    root_self_pt = root_m['self_pt']
    
    gp = root_self_pt
    depth_detail = defaultdict(lambda: {'count': 0, 'pt': 0, 'members': []})
    act_members_in_range = []
    
    # スタック: (pid, compressed_depth)
    stack = []
    for child_pid in upline_children_pid.get(root_pid, []):
        stack.append((child_pid, 1))
    
    while stack:
        current_pid, depth = stack.pop()
        current_mc = pid_to_mc.get(current_pid)
        if not current_mc:
            continue
        
        m = members.get(current_mc, {})
        self_pt = m.get('self_pt', 0)
        act = m.get('active', False)
        fa = m.get('force_active', False)
        status = m.get('status', '')
        
        wd = is_withdrawn(current_mc, status, fa)
        
        if wd:
            # WD → 透過（depth消費なし）
            for child_pid in upline_children_pid.get(current_pid, []):
                stack.append((child_pid, depth))
        elif act:
            # ACT → depth+1消費, pt加算
            if depth <= max_depth:
                gp += self_pt
                depth_detail[depth]['count'] += 1
                depth_detail[depth]['pt'] += self_pt
                depth_detail[depth]['members'].append((current_mc, self_pt))
                act_members_in_range.append((current_mc, depth, self_pt))
                for child_pid in upline_children_pid.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
            # depth > max_depth: 打ち切り
        else:
            # 非ACT（FA含む）→ depth+1消費、pt不加算
            if depth <= max_depth:
                # FA会員のpt=0なので加算しない
                for child_pid in upline_children_pid.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
    
    return gp, dict(depth_detail), act_members_in_range

# ─────────────────────────────────────────
# ULB計算
# ─────────────────────────────────────────
def calc_ulb(root_mc, members, upline_children_pid, pid_to_mc, level):
    """V1エンジンのULB計算を再現"""
    if level not in UNILEVEL_RATES:
        return 0, {}
    
    rates = UNILEVEL_RATES[level]
    root_m = members.get(root_mc)
    if not root_m:
        return 0, {}
    
    root_pid = root_m['position_id']
    total_ulb = 0
    depth_detail = defaultdict(lambda: {'count': 0, 'pt': 0, 'bonus': 0, 'members': []})
    
    stack = []
    for child_pid in upline_children_pid.get(root_pid, []):
        stack.append((child_pid, 1))
    
    while stack:
        current_pid, depth = stack.pop()
        current_mc = pid_to_mc.get(current_pid)
        if not current_mc:
            continue
        
        m = members.get(current_mc, {})
        self_pt = m.get('self_pt', 0)
        act = m.get('active', False)
        fa = m.get('force_active', False)
        status = m.get('status', '')
        
        wd = is_withdrawn(current_mc, status, fa)
        
        if wd:
            # WD → 透過
            for child_pid in upline_children_pid.get(current_pid, []):
                stack.append((child_pid, depth))
        elif act:
            # ACT
            if depth <= len(rates):
                rate = rates[depth - 1]
                bonus = self_pt * rate // 100 * POINT_RATE
                total_ulb += bonus
                depth_detail[depth]['count'] += 1
                depth_detail[depth]['pt'] += self_pt
                depth_detail[depth]['bonus'] += bonus
                depth_detail[depth]['members'].append((current_mc, self_pt, rate, bonus))
                for child_pid in upline_children_pid.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
        else:
            # 非ACT（FA含む）→ depth消費あり
            if depth <= len(rates):
                for child_pid in upline_children_pid.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
    
    return total_ulb, dict(depth_detail)

# ─────────────────────────────────────────
# ACT人数カウント（全ツリー）
# ─────────────────────────────────────────
def count_group_act(root_mc, members, upline_children_pid, pid_to_mc):
    """全ツリーのACT人数（深さ制限なし）"""
    root_m = members.get(root_mc)
    if not root_m:
        return 0
    
    root_pid = root_m['position_id']
    count = 0
    
    stack = list(upline_children_pid.get(root_pid, []))
    visited = set()
    
    while stack:
        current_pid = stack.pop()
        if current_pid in visited:
            continue
        visited.add(current_pid)
        
        current_mc = pid_to_mc.get(current_pid)
        if not current_mc:
            continue
        
        m = members.get(current_mc, {})
        act = m.get('active', False)
        fa = m.get('force_active', False)
        status = m.get('status', '')
        
        wd = is_withdrawn(current_mc, status, fa)
        
        if not wd:
            if act:
                count += 1
        
        for child_pid in upline_children_pid.get(current_pid, []):
            stack.append(child_pid)
    
    return count

# ─────────────────────────────────────────
# メイン分析
# ─────────────────────────────────────────
def main():
    print("=" * 80)
    print("db-82179501-tree.csv を使った完全ULB計算")
    print("=" * 80)
    
    members = load_tree_csv()
    bonus = load_bonus_csv()
    
    print(f"tree CSV: {len(members)} 名")
    print()
    
    # 82179501はtree.csvに含まれているか確認
    root_82 = members.get('82179501')
    print(f"82179501 in tree: {root_82 is not None}")
    if root_82:
        print(f"  position_id={root_82['position_id']}, self_pt={root_82['self_pt']}, "
              f"active={root_82['active']}, force_active={root_82['force_active']}")
    
    # uplineツリー構築
    upline_children_pid, pid_to_mc = build_upline_tree(members)
    
    # 5名のルートノードを確認
    print("\n5名のルートノード:")
    for mc in ['82179501', '44504701', '86820601', '93713601', '89248801']:
        m = members.get(mc, {})
        b = bonus.get(mc, {})
        if m:
            direct_children = upline_children_pid.get(m['position_id'], [])
            print(f"  {mc}: pid={m['position_id']}, self_pt={m['self_pt']}, "
                  f"active={m['active']}, fa={m['force_active']}, "
                  f"直下子={len(direct_children)}名")
        else:
            print(f"  {mc}: ツリーCSVに存在しない")
    
    print()
    print("=" * 80)
    print("ULB 完全計算結果")
    print("=" * 80)
    
    for mc in ['82179501', '44504701', '86820601', '93713601', '89248801']:
        exp = EXPECTED[mc]
        b = bonus.get(mc, {})
        m = members.get(mc, {})
        
        if not m:
            print(f"{mc}: ツリーCSVに存在しないためスキップ")
            continue
        
        level = exp['level']
        
        # ULB計算
        ulb, ulb_detail = calc_ulb(mc, members, upline_children_pid, pid_to_mc, level)
        
        # grp_pt計算
        gp, gp_detail, act_in_range = calc_group_points(mc, members, upline_children_pid, pid_to_mc)
        
        # ACT人数（全ツリー）
        grp_act = count_group_act(mc, members, upline_children_pid, pid_to_mc)
        
        print(f"\n{'='*60}")
        print(f"【{mc}】 LV{level}")
        print(f"  ULB計算:  {ulb:>8,}円  |  期待値:  {exp['ulb']:>8,}円  |  差: {ulb-exp['ulb']:>+8,}円  {'✅' if ulb==exp['ulb'] else '❌'}")
        print(f"  grp_pt:   {gp:>8}    |  CSV:     {b.get('grp_pt',0):>8}    |  差: {gp-b.get('grp_pt',0):>+8}")
        print(f"  grp_act:  {grp_act:>8}    |  CSV:     {b.get('grp_act',0):>8}    |  差: {grp_act-b.get('grp_act',0):>+8}")
        
        print(f"\n  【段別ULB内訳】")
        rates = UNILEVEL_RATES.get(level, [])
        for d in range(1, len(rates)+1):
            info = ulb_detail.get(d, {'count': 0, 'pt': 0, 'bonus': 0})
            rate = rates[d-1]
            print(f"    段{d}: {info['count']:>3}名, pt={info['pt']:>7,}, rate={rate:>2}%, bonus={info['bonus']:>8,}円")
        
        total_ulb_check = sum(info['bonus'] for info in ulb_detail.values())
        print(f"    合計: {total_ulb_check:>8,}円")
    
    # ── bonusCSVとの差異分析 ──
    print()
    print("=" * 80)
    print("差異詳細分析 (82179501, 44504701)")
    print("=" * 80)
    
    for target_mc in ['82179501', '44504701']:
        exp = EXPECTED[target_mc]
        b = bonus.get(target_mc, {})
        m = members.get(target_mc, {})
        if not m:
            continue
        
        level = exp['level']
        _, ulb_detail, _ = calc_ulb(target_mc, members, upline_children_pid, pid_to_mc, level), {}, None
        ulb, ulb_detail = calc_ulb(target_mc, members, upline_children_pid, pid_to_mc, level)
        _, gp_detail, act_in_range = calc_group_points(target_mc, members, upline_children_pid, pid_to_mc)
        
        ulb_diff = ulb - exp['ulb']
        
        print(f"\n{target_mc}: ULB差異 = {ulb_diff:+,}円")
        
        if ulb_diff != 0:
            print(f"差異の原因を探る...")
            
            # 段別に bonus CSV のデータと比較
            # bonusCSVには段別のデータがないので推定
            # 差異を逆算して、どの段で何pt不足/超過しているか推定
            
            rates = UNILEVEL_RATES.get(level, [])
            expected_ulb = exp['ulb']
            v1_ulb = ulb
            
            print(f"  V1 ULB={v1_ulb:,}円, 期待ULB={expected_ulb:,}円, 差={ulb_diff:+,}円")
            
            # ツリー内のACT会員と bonus の self_pt を比較
            bonus_act = [mc for mc, b_data in bonus.items() if b_data['active'] == '○']
            
            print(f"\n  V1のACT会員（段1-7）のself_pt vs bonusCSVのself_pt 差異確認:")
            
            # act_in_rangeの各会員のbonusCSVでの扱いを確認
            v1_in_range_mcs = set()
            for mc_r, depth, pt in act_in_range:
                v1_in_range_mcs.add(mc_r)
                b_mc = bonus.get(mc_r, {})
                b_self_pt = b_mc.get('self_pt', 0)
                b_act = b_mc.get('active', '?')
                if pt != b_self_pt or b_act != '○':
                    print(f"    ★差異: {mc_r}: 段{depth}, V1_self_pt={pt}, bonus_self_pt={b_self_pt}, bonus_act={b_act}")
            
            # bonusCSVでACTだが V1のact_in_rangeに含まれていない会員（圧縮段数での違い）
            from_89_tree = [mc for mc in bonus_act if mc in members and mc != target_mc]
            print(f"\n  V1で段1-7のACT会員数: {len(act_in_range)}")
            
            # self_pt の合計比較
            v1_gp_total = sum(pt for _, _, pt in act_in_range)
            csv_grp_pt = b.get('grp_pt', 0) - m.get('self_pt', 0)  # 自分のptを除いた合計
            print(f"  V1 段1-7のACT会員self_pt合計: {v1_gp_total}")
            print(f"  bonusCSV grp_pt - self_pt: {csv_grp_pt}")
            print(f"  差: {v1_gp_total - csv_grp_pt}")
            
            # self_ptが違うわけではないので、会員の集合（ACT範囲）が違う可能性
            # act_in_rangeに含まれる会員リストと、bonusCSVのACT会員で
            # 89248801ツリー（段1-7）に相当する会員の比較
            
            print(f"\n  bonusCSV grp_act vs V1 grp_act 比較:")
            v1_grp_act = count_group_act(target_mc, members, upline_children_pid, pid_to_mc)
            csv_grp_act = b.get('grp_act', 0)
            print(f"  V1 grp_act={v1_grp_act}, CSV grp_act={csv_grp_act}, 差={v1_grp_act-csv_grp_act}")

if __name__ == "__main__":
    main()
