#!/usr/bin/env python3
"""
bonusCSVのgrp_ptと一致させるための解析
grp_ptはmax_depth=7での全ACTポイント合計（自分含む）
bonusCSVのgrp_pt=22800、V1計算=18450（差-4350=29名分）

【重要】grp_ptは自分自身のptも含む
82179501の自分pt=0なので grp_pt = グループACTのptのみ

grp_pt差異: -4350pt = -29名分(4350/150)
ULB差異: -1050円

grp_ptがこれだけ違うということは、ULB段7の差（7名）だけではなく
grp_ptに含まれる全段(1-7)の差分が-29名分ある。

これは何かが根本的に違う。
→ bonusCSVのgrp_ptを計算しているロジックが
  「ULB段別の圧縮段数」と異なる可能性

確認すること：
1. bonusCSVのgrp_pt = 全段の全ACTポイント合計（deep search、depth制限あり）
2. bonusCSVの段数制限が「7段」ではなく別の基準の可能性
3. bonusCSVの段別ACT会員リストとV1の段別リストを比較
"""

import os, sys, math, csv
from collections import defaultdict

try:
    import psycopg2, psycopg2.extras
except ImportError:
    print("pip install psycopg2-binary"); sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: set DATABASE_URL"); sys.exit(1)

BONUS_MONTH = "2026-04"
POINT_RATE = 100
UNILEVEL_RATES = {4: [15, 9, 6, 5, 3, 2, 1], 5: [15, 10, 7, 6, 4, 3, 2]}

def is_active(status, self_pt, has_req, force_active):
    if force_active: return True
    if status in ('withdrawn','lapsed'): return False
    return has_req and self_pt > 0

def is_withdrawn(status, force_active):
    if force_active: return False
    return status in ('withdrawn','lapsed')

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT
            m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
            m."uplineId", m."referrerId",
            COALESCE(SUM(CASE
                WHEN p."purchaseMonth" = %s
                 AND p."productCode" IN ('1000','2000')
                 AND p."order_id" IS NOT NULL
                THEN p."totalPoints" ELSE 0 END), 0)::int AS self_pt_04,
            BOOL_OR(p."purchaseMonth" = %s
                AND p."productCode" IN ('1000','2000')
                AND p."order_id" IS NOT NULL) AS has_req_04
        FROM "mlm_members" m
        LEFT JOIN "mlm_purchases" p ON p."mlmMemberId" = m.id
        GROUP BY m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
                 m."uplineId", m."referrerId"
    """, (BONUS_MONTH, BONUS_MONTH))

    rows = cur.fetchall()
    members_by_id   = {}
    members_by_code = {}
    upline_children = defaultdict(list)
    referrer_children = defaultdict(list)
    for r in rows:
        m = {
            'id': r['id'], 'member_code': r['memberCode'],
            'status': r['status'], 'force_active': r['forceActive'],
            'upline_id': r['uplineId'], 'referrer_id': r['referrerId'],
            'self_pt_04': r['self_pt_04'], 'has_req_04': bool(r['has_req_04']),
        }
        members_by_id[m['id']] = m
        members_by_code[m['member_code']] = m
        if m['upline_id']:
            upline_children[m['upline_id']].append(m['id'])
        if m['referrer_id']:
            referrer_children[m['referrer_id']].append(m['id'])

    cur.close(); conn.close()

    # bonusCSV読み込み
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {
                'active': row['ｱｸﾃｨﾌﾞ'].strip() == '○',
                'grp_pt': int(row['グループpt'] or 0),
                'self_pt': int(row['自己購入pt'] or 0),
                'ulb': int(row['ユニレベルB'] or 0),
                'grp_act': int(row['グループACT'] or 0),
                'direct_act': int(row['直ACT'] or 0),
            }

    print("=" * 80)
    print("bonusCSV grp_pt vs V1 grp_pt の詳細比較")
    print("=" * 80)

    # 82の詳細: bonusCSVに含まれるACT会員リストとV1のACT会員リストを比較
    for mc in ['82179501', '44504701']:
        m = members_by_code.get(mc)
        level = 4 if mc == '82179501' else 5
        rates = UNILEVEL_RATES[level]
        max_d = len(rates)  # 7
        mid = m['id']
        b = bonus.get(mc, {})

        print(f"\n{'='*60}")
        print(f"【{mc}】 LV{level}")
        print(f"  bonusCSV: grp_pt={b.get('grp_pt',0):,}pt, grp_act={b.get('grp_act',0)}名, ULB={b.get('ulb',0):,}円")

        # V1のグループACT会員（非ACT透過版）
        v1_act_set = set()
        v1_act_depth = {}  # mc -> depth
        stack = [(child_id, 1) for child_id in upline_children.get(mid, [])]
        while stack:
            cur_id, depth = stack.pop()
            cm = members_by_id.get(cur_id)
            if not cm: continue
            wd  = is_withdrawn(cm['status'], cm['force_active'])
            act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
            if wd or not act:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth))
            else:
                v1_act_set.add(cm['member_code'])
                v1_act_depth[cm['member_code']] = depth
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))

        # bonusCSVのグループACT会員（bonusCSV.active == '○'の全会員のうち、82のツリー内にいる）
        bonus_act_in_tree = set()
        for bonus_mc, bdata in bonus.items():
            if bdata['active']:
                bm = members_by_code.get(bonus_mc)
                if bm and bonus_mc != mc and bonus_mc in v1_act_set:
                    bonus_act_in_tree.add(bonus_mc)

        # bonusCSVにACTとして記載されているが、V1のツリーに含まれていない会員
        # （ツリー全探索）
        all_in_tree = set()
        stack = list(upline_children.get(mid, []))
        while stack:
            cur_id = stack.pop()
            if cur_id in all_in_tree: continue
            all_in_tree.add(cur_id)
            stack.extend(upline_children.get(cur_id, []))
        
        all_mc_in_tree = {members_by_id[i]['member_code'] for i in all_in_tree if i in members_by_id}
        bonus_act_in_tree_all = {bmc for bmc in all_mc_in_tree if bonus.get(bmc, {}).get('active', False)}

        v1_grp_pt = sum(members_by_code[mc2]['self_pt_04'] for mc2 in v1_act_set if mc2 in members_by_code)
        bonus_grp_pt = b.get('grp_pt', 0)

        print(f"\n  V1 グループACT: {len(v1_act_set)}名, grp_pt={v1_grp_pt:,}pt")
        print(f"  bonusCSV grp_pt: {bonus_grp_pt:,}pt (差={v1_grp_pt-bonus_grp_pt:+,})")
        print(f"  bonusCSV grp_act: {b.get('grp_act',0)}名")
        print(f"  ツリー内全会員: {len(all_mc_in_tree)}名")
        print(f"  ツリー内bonusACT: {len(bonus_act_in_tree_all)}名")

        # V1 ACTリストとbonusCSV ACTリストの差分
        bonus_act_set = set()
        for bmc in all_mc_in_tree:
            if bonus.get(bmc, {}).get('active', False):
                bonus_act_set.add(bmc)

        # V1にあってbonusにない
        only_in_v1 = v1_act_set - bonus_act_set
        # bonusにあってV1にない
        only_in_bonus = bonus_act_set - v1_act_set

        print(f"\n  V1のみACT (bonusには非ACT): {len(only_in_v1)}名")
        for act_mc in sorted(only_in_v1)[:10]:
            cm = members_by_code.get(act_mc, {})
            print(f"    {act_mc}: pt={cm.get('self_pt_04',0)}, status={cm.get('status','?')}, FA={cm.get('force_active',False)}, depth={v1_act_depth.get(act_mc,'?')}")

        print(f"\n  bonusのみACT (V1には非ACT): {len(only_in_bonus)}名")
        for act_mc in sorted(only_in_bonus)[:20]:
            cm = members_by_code.get(act_mc, {})
            # V1でのこの会員の段を確認
            # 非ACT透過でのdepthを計算
            print(f"    {act_mc}: pt={cm.get('self_pt_04',0)}, status={cm.get('status','?')}, FA={cm.get('force_active',False)}")

        # pt差分
        pt_only_v1 = sum(members_by_code.get(mc2, {}).get('self_pt_04', 0) for mc2 in only_in_v1)
        pt_only_bonus = sum(members_by_code.get(mc2, {}).get('self_pt_04', 0) for mc2 in only_in_bonus)
        print(f"\n  V1のみACTのpt合計: {pt_only_v1:,}pt")
        print(f"  bonusのみACTのpt合計: {pt_only_bonus:,}pt")
        print(f"  純差分: {pt_only_bonus - pt_only_v1:,}pt (→ bonusのgrp_ptがV1より{pt_only_bonus - pt_only_v1:+,}pt)")

    print("\n✅ 分析完了")

if __name__ == "__main__":
    main()
