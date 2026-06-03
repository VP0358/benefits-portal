#!/usr/bin/env python3
"""
investigate-ulb-exact-v2.py
=============================================
db-82179501-tree.csv を正しく使ったULB完全計算 v2

【修正点】
  - tree.csvには82/44/89が含まれていない（ルートノードの上位会員）
  - 82179501をルート（pid=1418）として手動追加
  - 44504701(pid=1134)と89248801もtree.csvの外
  → 対象: 86820601と93713601のみをtree.csvで計算可能
  → 82・44・89はDB接続なしでは計算不可

【grp_pt計算方式の確認】
  - 86820601（自分を含む圧縮段0-7）のgrp_ptをV1で再現
  - bonusCSVとの差を1pt単位で特定する

【新仮説: tree.csvのself_ptは正しいのか？】
  - tree.csvはorder_id=NULL修正前のスクリプトで作成の可能性あり
  - bonusCSVのself_ptとtree.csvのself_ptが一致するか確認する
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

def load_tree_csv():
    members = {}
    with open('/home/user/webapp/scripts/db-82179501-tree.csv', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            mc = row['member_code']
            members[mc] = {
                'position_id': int(row['position_id']),
                'status': row['status'],
                'upline_id': int(row['upline_id']) if row['upline_id'] else None,
                'upline_code': row['upline_code'],
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

def is_withdrawn(status, force_active):
    if force_active:
        return False
    return status in ('withdrawn', 'lapsed')

def build_upline_tree(members):
    pid_to_mc = {m['position_id']: mc for mc, m in members.items()}
    upline_children = defaultdict(list)
    for mc, m in members.items():
        if m['upline_id'] is not None:
            upline_children[m['upline_id']].append(m['position_id'])
    return upline_children, pid_to_mc

def calc_ulb_recursive(root_mc, members, upline_children, pid_to_mc, level):
    """ULB計算（V1再現）"""
    if level not in UNILEVEL_RATES:
        return 0, {}
    
    rates = UNILEVEL_RATES[level]
    root_m = members.get(root_mc)
    if not root_m:
        return 0, {}
    
    root_pid = root_m['position_id']
    total_ulb = 0
    depth_detail = defaultdict(lambda: {'count': 0, 'pt': 0, 'bonus': 0, 'members': []})
    
    # 再帰的BFS
    stack = [(pid, 1) for pid in upline_children.get(root_pid, [])]
    
    while stack:
        current_pid, depth = stack.pop()
        current_mc = pid_to_mc.get(current_pid)
        if not current_mc:
            continue
        
        m = members[current_mc]
        self_pt = m['self_pt']
        act = m['active']
        fa = m['force_active']
        status = m['status']
        wd = is_withdrawn(status, fa)
        
        if wd:
            # 透過
            for child_pid in upline_children.get(current_pid, []):
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
                depth_detail[depth]['members'].append((current_mc, self_pt))
                for child_pid in upline_children.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
            # depth > max: 打ち切り
        else:
            # 非ACT (FA含む): depth消費
            if depth <= len(rates):
                for child_pid in upline_children.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
    
    return total_ulb, dict(depth_detail)

def calc_grp_pt(root_mc, members, upline_children, pid_to_mc):
    """グループpt計算（自分のpt含む）"""
    root_m = members.get(root_mc)
    if not root_m:
        return 0, []
    
    root_pid = root_m['position_id']
    root_self_pt = root_m['self_pt']
    gp = root_self_pt
    act_in_range = [(root_mc, 0, root_self_pt)]
    
    stack = [(pid, 1) for pid in upline_children.get(root_pid, [])]
    
    while stack:
        current_pid, depth = stack.pop()
        current_mc = pid_to_mc.get(current_pid)
        if not current_mc:
            continue
        
        m = members[current_mc]
        self_pt = m['self_pt']
        act = m['active']
        fa = m['force_active']
        status = m['status']
        wd = is_withdrawn(status, fa)
        
        if wd:
            for child_pid in upline_children.get(current_pid, []):
                stack.append((child_pid, depth))
        elif act:
            if depth <= 7:
                gp += self_pt
                act_in_range.append((current_mc, depth, self_pt))
                for child_pid in upline_children.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
        else:
            if depth <= 7:
                for child_pid in upline_children.get(current_pid, []):
                    stack.append((child_pid, depth + 1))
    
    return gp, act_in_range

def count_grp_act(root_mc, members, upline_children, pid_to_mc):
    """全ツリーのACT人数（深さ制限なし）"""
    root_m = members.get(root_mc)
    if not root_m:
        return 0
    
    root_pid = root_m['position_id']
    count = 0
    visited = set()
    stack = list(upline_children.get(root_pid, []))
    
    while stack:
        pid = stack.pop()
        if pid in visited:
            continue
        visited.add(pid)
        
        mc = pid_to_mc.get(pid)
        if not mc:
            continue
        
        m = members[mc]
        act = m['active']
        fa = m['force_active']
        status = m['status']
        wd = is_withdrawn(status, fa)
        
        if not wd and act:
            count += 1
        
        for child_pid in upline_children.get(pid, []):
            stack.append(child_pid)
    
    return count

def main():
    print("=" * 80)
    print("db-82179501-tree.csv を使った ULB完全計算 v2")
    print("=" * 80)
    
    members = load_tree_csv()
    bonus = load_bonus_csv()
    
    # ── self_pt の整合性確認 ──
    print("\n【Step 1】tree.csvのself_pt vs bonusCSVのself_pt 確認")
    print("-" * 60)
    
    mismatch_self_pt = []
    for mc in members:
        t_pt = members[mc]['self_pt']
        b_pt = bonus.get(mc, {}).get('self_pt', -1)
        t_act = members[mc]['active']
        b_act = bonus.get(mc, {}).get('active', '?')
        if b_pt == -1:
            continue  # bonusCSVに存在しない
        if t_pt != b_pt:
            mismatch_self_pt.append((mc, t_pt, b_pt, t_act, b_act))
    
    print(f"self_pt不一致: {len(mismatch_self_pt)} 名")
    if mismatch_self_pt:
        print(f"{'会員ID':<12} {'tree_pt':>8} {'bonus_pt':>9} {'tree_act':>9} {'bonus_act':>10}")
        for mc, tp, bp, ta, ba in sorted(mismatch_self_pt)[:20]:
            print(f"{mc:<12} {tp:>8} {bp:>9} {str(ta):>9} {ba:>10}")
    else:
        print("→ 全会員でself_pt一致（tree.csvのデータは正しい）")
    
    # ── 82179501をルートとして手動追加 ──
    print("\n【Step 2】82179501をルートとして手動追加")
    ROOT_82_PID = 1418
    if '82179501' not in members:
        members['82179501'] = {
            'position_id': ROOT_82_PID,
            'status': 'autoship',
            'upline_id': None,  # ルートなのでNone
            'upline_code': '',
            'self_pt': bonus.get('82179501', {}).get('self_pt', 0),
            'active': True,  # FA会員
            'force_active': True,
        }
        print(f"82179501を追加: pid={ROOT_82_PID}, self_pt={members['82179501']['self_pt']}, active=True(FA)")
    else:
        print("82179501は既にtree.csvに存在")
    
    # uplineツリー構築（82179501追加後）
    upline_children, pid_to_mc = build_upline_tree(members)
    
    # ── 5名のルートノード確認 ──
    print("\n【Step 3】5名のルートノード確認")
    for mc in ['82179501', '44504701', '86820601', '93713601', '89248801']:
        m = members.get(mc, {})
        if m:
            direct = upline_children.get(m['position_id'], [])
            print(f"  {mc}: pid={m['position_id']}, self_pt={m['self_pt']}, "
                  f"active={m['active']}, 直下={len(direct)}名")
        else:
            print(f"  {mc}: 存在しない → スキップ")
    
    # ── ULB計算 ──
    print("\n【Step 4】ULB完全計算")
    print("=" * 80)
    
    calculable = [mc for mc in ['82179501', '86820601', '93713601'] if mc in members]
    # 44504701, 89248801はtree.csvに存在しないのでスキップ
    
    for mc in calculable:
        exp = EXPECTED[mc]
        b = bonus.get(mc, {})
        level = exp['level']
        
        ulb, ulb_detail = calc_ulb_recursive(mc, members, upline_children, pid_to_mc, level)
        grp_pt, act_in_range = calc_grp_pt(mc, members, upline_children, pid_to_mc)
        grp_act = count_grp_act(mc, members, upline_children, pid_to_mc)
        
        ulb_diff = ulb - exp['ulb']
        gp_diff = grp_pt - b.get('grp_pt', 0)
        ga_diff = grp_act - b.get('grp_act', 0)
        
        print(f"\n{'='*60}")
        print(f"【{mc}】 LV{level}")
        print(f"  ULB:     V1={ulb:>8,}円  |  期待={exp['ulb']:>8,}円  |  差={ulb_diff:>+9,}円  {'✅' if ulb_diff==0 else '❌'}")
        print(f"  grp_pt:  V1={grp_pt:>8}    |  CSV={b.get('grp_pt',0):>8}    |  差={gp_diff:>+9}  {'✅' if gp_diff==0 else '❌'}")
        print(f"  grp_act: V1={grp_act:>8}    |  CSV={b.get('grp_act',0):>8}    |  差={ga_diff:>+9}  {'✅' if ga_diff==0 else '❌'}")
        
        print(f"\n  【段別ULB内訳】")
        rates = UNILEVEL_RATES.get(level, [])
        for d in range(1, len(rates)+1):
            info = ulb_detail.get(d, {'count': 0, 'pt': 0, 'bonus': 0})
            rate = rates[d-1]
            marker = ''
            print(f"    段{d}: {info['count']:>3}名, pt={info['pt']:>7,}, rate={rate:>2}%, bonus={info['bonus']:>8,}円 {marker}")
    
    # ── 86820601の詳細差異分析 ──
    print("\n【Step 5】86820601 差異詳細分析")
    print("=" * 60)
    mc = '86820601'
    if mc not in members:
        print("スキップ（存在しない）")
        return
    
    level = 5
    exp = EXPECTED[mc]
    b = bonus.get(mc, {})
    ulb, ulb_detail = calc_ulb_recursive(mc, members, upline_children, pid_to_mc, level)
    
    print(f"ULB差異: {ulb-exp['ulb']:+,}円")
    print()
    
    # 差異の会員を特定
    # bonusCSVのULB=98550, V1=90400（差-8150円）
    # LV5 rates=[15,10,7,6,4,3,2]
    # 差-8150円は何pt分の差に相当するか？
    print("差異の内訳推定:")
    print(f"  差 = {ulb - exp['ulb']:+,}円")
    
    # 段別差異確認
    # bonusCSVには段別データがないが、V1の段別と比較可能なのは89248801だけ（一致確認済み）
    # 86の差異は別の原因

    # 考えられる原因: tree.csvのself_ptがorder_id=NULL修正前のデータかもしれない
    # → tree.csvのself_pt 合計 vs bonus grp_pt 合計 比較
    
    grp_pt, act_in_range = calc_grp_pt(mc, members, upline_children, pid_to_mc)
    v1_grp_pt_exclude_self = grp_pt - members[mc]['self_pt']
    csv_grp_pt_exclude_self = b.get('grp_pt', 0) - b.get('self_pt', 0)
    
    print(f"\n  grp_pt（自分除く）: V1={v1_grp_pt_exclude_self}, CSV={csv_grp_pt_exclude_self}, 差={v1_grp_pt_exclude_self-csv_grp_pt_exclude_self}")
    
    # 差-600pt → 4人分（150pt）
    if v1_grp_pt_exclude_self != csv_grp_pt_exclude_self:
        diff_pt = v1_grp_pt_exclude_self - csv_grp_pt_exclude_self
        print(f"  pt差 = {diff_pt}pt → {abs(diff_pt)//150} 人分（150pt/人）")
    
    # ── bonusCSVとtree.csvのself_ptが全員一致していれば差はself_ptでない ──
    # → 差の原因は「圧縮段数の算出方法が違う」か「特定会員がV1ではACTでbonusでは非ACT」
    
    print("\n【仮説検証】tree.csvのself_ptデータが古い可能性")
    print("  tree.csvのself_pt合計（ACT会員）:")
    tree_act_pt_sum = sum(m['self_pt'] for m in members.values() if m['active'])
    print(f"    = {tree_act_pt_sum} pt")
    print(f"  bonusCSV の 全ACT会員 self_pt合計:")
    
    matrix = {}
    with open('/home/user/uploaded_files/matrix_892488_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員ID'].strip()
            matrix[mid] = {
                'mae_pt': int(row['前月ポイント'] or 0),
            }
    
    bonus_act_pt_sum = sum(bonus[mc]['self_pt'] for mc in bonus 
                            if bonus[mc]['active'] == '○')
    print(f"    = {bonus_act_pt_sum} pt")
    
    print()
    if tree_act_pt_sum == bonus_act_pt_sum:
        print("  → self_pt合計が一致: tree.csvのデータは正しい（古くない）")
    else:
        print(f"  → 差 = {tree_act_pt_sum - bonus_act_pt_sum} pt: tree.csvのデータが古い可能性あり！")
        print("  → tree.csvは order_id=NULL修正前のスクリプトで作成された可能性")
    
    # DB接続必要性の確認
    print()
    print("【結論】")
    print(f"  tree.csv ACT会員数: {sum(1 for m in members.values() if m['active'])} 名")
    print(f"  bonusCSV ACT会員数: {sum(1 for b in bonus.values() if b['active']=='○')} 名")
    print(f"  差: {sum(1 for m in members.values() if m['active']) - sum(1 for b in bonus.values() if b['active']=='○')} 名")
    print()
    print("  tree.csvには 82/44/89 の3名が欠落（ルート上位会員）")
    print("  86/93 の計算はtree.csvで試みたが期待値と一致しない")
    print()
    print("  差異原因の特定にはDB接続が必要:")
    print("  - order_id=NULL修正後の実際のselfPtデータ")
    print("  - 82/44/89のuplineツリー構造（tree.csvにない）")

if __name__ == "__main__":
    main()
