#!/usr/bin/env python3
"""
非ACT透過版で段7超過（段8以降）のACT会員について
「もし段7の非ACT会員を通して（透過して）その子が段7に来た場合」と
「現行の段7打ち切り」を比較する

82の差異の仮説：
  非ACT透過後の段7 = 40名(6000pt)
  期待 = 47名(7050pt)
  差 = 7名(1050pt)
  
  段8のACT会員 = 27名
  
  もし「段7でdepth制限終わり→でも非ACT透過で段8になった子はいない」
  実は問題は「段7にいる非ACT39名の子が段8で計算対象外」ではなく
  段7の非ACT会員の子たちの中に、depth制限が段8だから計算されていないACT会員がいる...
  
  これは非ACT透過ロジックの根本的な問題：
  段7でdepth=7のとき、非ACT会員に出会うと→透過してdepth=7で子を探索
  子がACTなら→depth=7なので计算される→OK
  
  待った。段7の非ACT39名の子（段8のACT27名）は：
  → 段7の非ACT: depth=7のまま透過
  → その子: depth=7でstack追加
  → ACTなら: depth=7<=7なのでボーナス計算される！
  
  つまり段7の非ACT透過後の子は段7のACTとしてカウントされるはず...
  
  段8のACT27名が計算されていないなら、それはdepth=7の非ACT39名から来ていない？
  実際にどこから来ているか確認する
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

    cur.close(); conn.close()

    # 82の解析
    mc = '82179501'
    m82 = members_by_code[mc]
    mid = m82['id']
    level = 4
    rates = UNILEVEL_RATES[level]
    max_depth = len(rates)  # 7

    print("=" * 80)
    print(f"【{mc}】 非ACT透過ロジックで段8になったACT会員の追跡")
    print("=" * 80)

    # 段8のACT会員がどの親（段7の非ACT）から来ているかを追跡
    act_at_d8 = []
    
    stack = [(child_id, 1, [mc]) for child_id in upline_children.get(mid, [])]
    while stack:
        cur_id, depth, path = stack.pop()
        m = members_by_id.get(cur_id)
        if not m:
            continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        new_path = path + [m['member_code']]

        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth, new_path))
        elif act:
            if depth == max_depth + 1:  # 段8
                act_at_d8.append({
                    'mc': m['member_code'], 'pt': m['self_pt_04'],
                    'depth': depth, 'path': new_path
                })
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1, new_path))
        else:
            # 非ACT透過
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth, new_path))  # depth変わらず

    print(f"\n段8のACT会員（非ACT透過後のdepth=8）: {len(act_at_d8)}名")
    print(f"  ※これらは非ACT透過ロジックで 'depth=8' に来た会員")
    print(f"  ※期待値では段7にカウントされるべき会員が含まれる可能性")
    
    for info in act_at_d8[:10]:
        parent_mc = info['path'][-2] if len(info['path']) >= 2 else '?'
        parent_m = members_by_code.get(parent_mc, {})
        parent_act = is_active(parent_m.get('status',''), parent_m.get('self_pt_04',0), parent_m.get('has_req_04',False), parent_m.get('force_active',False))
        parent_wd  = is_withdrawn(parent_m.get('status',''), parent_m.get('force_active',False))
        print(f"  {info['mc']}: pt={info['pt']}, 親={parent_mc}(ACT={parent_act},WD={parent_wd},status={parent_m.get('status','?')})")
    
    if len(act_at_d8) > 10:
        print(f"  ... (以降 {len(act_at_d8)-10}名省略)")

    # 段7の非ACT39名の親を確認
    print(f"\n【段7の非ACT39名の親会員（段6）を確認】")
    depth7_nonact = []
    stack = [(child_id, 1) for child_id in upline_children.get(mid, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            if depth == 7:
                # 段7の非ACT
                # この会員の子を調べる
                children = upline_children.get(cur_id, [])
                depth7_nonact.append({
                    'mc': m['member_code'], 'status': m['status'],
                    'children': [members_by_id.get(c, {}).get('member_code','?') for c in children]
                })
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))

    print(f"段7の非ACT会員数: {len(depth7_nonact)}名")
    for na in depth7_nonact[:5]:
        print(f"  {na['mc']}: status={na['status']}, 子={na['children']}")
    if len(depth7_nonact) > 5:
        print(f"  ... (以降 {len(depth7_nonact)-5}名省略)")

    # 段7の非ACTの子（段8になるはず）を確認
    print(f"\n【段7の非ACT会員の子（depth=7で透過後）をstack確認】")
    # 段7の非ACT会員の子がどう扱われるか：
    # 非ACT → depth消費なし → 子がdepth=7でstackに追加
    # 子がACT → depth=7 <= max_depth=7 → ボーナス計算 OK
    # 子が非ACT → depth=7で透過 → さらに子がdepth=7...
    # 
    # つまり段7の非ACTの子は段7でカウントされるはず！
    # → 段8のACT27名は「段7のACT会員の子」のはず？
    
    # 段7のACT40名の子（段8）を確認
    act_at_d7 = []
    stack = [(child_id, 1) for child_id in upline_children.get(mid, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            if depth == 7:
                act_at_d7.append(m['member_code'])
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))

    print(f"段7 ACT会員: {len(act_at_d7)}名")
    
    # 段7 ACT会員の子がどの段（8）にいるかを確認
    print(f"\n【段7 ACT40名の直下の子（depth=8のACT/非ACT）】")
    act8_from_act7 = []
    for act7_mc in act_at_d7:
        act7_m = members_by_code[act7_mc]
        act7_id = act7_m['id']
        for child_id in upline_children.get(act7_id, []):
            cm = members_by_id.get(child_id)
            if not cm: continue
            cm_act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
            cm_wd  = is_withdrawn(cm['status'], cm['force_active'])
            if not cm_wd and cm_act:
                act8_from_act7.append({'mc': cm['member_code'], 'pt': cm['self_pt_04'], 'parent': act7_mc})

    print(f"段7ACT会員の子でACTなもの（depth=8）: {len(act8_from_act7)}名")
    for x in act8_from_act7[:5]:
        print(f"  {x['mc']}: pt={x['pt']}, 親={x['parent']}")
    if len(act8_from_act7) > 5:
        print(f"  ... ({len(act8_from_act7)-5}名省略)")

    # 段8のACT27名 vs 段7ACT会員の子（段8）ACT
    act8_mcs = {x['mc'] for x in act_at_d8}
    act8_from_act7_mcs = {x['mc'] for x in act8_from_act7}
    print(f"\n段8のACT27名: {len(act8_mcs)}名")
    print(f"段7ACT会員の子のACT: {len(act8_from_act7_mcs)}名")
    print(f"重複: {len(act8_mcs & act8_from_act7_mcs)}名")
    
    # 段8のACT27名が段7ACTの子である = 段7ACTの子段8ACT
    print(f"\n→ 段8のACT({len(act8_mcs)}名)のうち段7ACTから来た数: {len(act8_mcs & act8_from_act7_mcs)}名")
    print(f"→ 残り {len(act8_mcs - act8_from_act7_mcs)}名が段7非ACT会員の子（段7に来るべき）？")

    extra_from_nonact7 = act8_mcs - act8_from_act7_mcs
    if extra_from_nonact7:
        print(f"\n段7非ACTから来た段8ACT会員（本来段7にいるべき）:")
        total_pt = 0
        for mc_extra in sorted(extra_from_nonact7):
            m_extra = members_by_code.get(mc_extra, {})
            pt = m_extra.get('self_pt_04', 0)
            total_pt += pt
            print(f"  {mc_extra}: pt={pt}")
        print(f"  合計: {total_pt}pt → {len(extra_from_nonact7)}名×rate=1% → {math.floor(total_pt*1/100*POINT_RATE)}円")

    # ── 同じ解析を44504701にも適用 ──
    print("\n" + "=" * 80)
    print("【44504701: 段8のACT会員追跡（非ACT透過後）】")
    print("=" * 80)

    mc44 = '44504701'
    m44 = members_by_code[mc44]
    mid44 = m44['id']
    level44 = 5
    rates44 = UNILEVEL_RATES[level44]
    max_d44 = len(rates44)

    act_at_d8_44 = []
    stack = [(child_id, 1) for child_id in upline_children.get(mid44, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            if depth == max_d44 + 1:
                act_at_d8_44.append({'mc': m['member_code'], 'pt': m['self_pt_04'], 'depth': depth})
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))

    print(f"\n44504701の段8 ACT: {len(act_at_d8_44)}名, pt合計={sum(x['pt'] for x in act_at_d8_44)}")

    # 44の段7ACTの子（段8）
    act7_44 = []
    stack = [(child_id, 1) for child_id in upline_children.get(mid44, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            if depth == max_d44:
                act7_44.append(m['member_code'])
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))

    act8_from_act7_44 = set()
    for act7_mc in act7_44:
        act7_m = members_by_code[act7_mc]
        for child_id in upline_children.get(act7_m['id'], []):
            cm = members_by_id.get(child_id)
            if not cm: continue
            cm_act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
            cm_wd  = is_withdrawn(cm['status'], cm['force_active'])
            if not cm_wd and cm_act:
                act8_from_act7_44.add(cm['member_code'])

    act8_44_mcs = {x['mc'] for x in act_at_d8_44}
    extra_from_nonact7_44 = act8_44_mcs - act8_from_act7_44
    print(f"段8のACT: {len(act8_44_mcs)}名")
    print(f"段7ACTの子: {len(act8_from_act7_44)}名")
    print(f"段7非ACT由来（本来段7にいるべき）: {len(extra_from_nonact7_44)}名")
    if extra_from_nonact7_44:
        total_pt44 = sum(members_by_code.get(mc,'').get('self_pt_04',0) if members_by_code.get(mc) else 0 for mc in extra_from_nonact7_44)
        print(f"  pt合計={total_pt44}pt → rate=2% → {math.floor(total_pt44*2/100*POINT_RATE)}円")

    print("\n✅ 分析完了")

if __name__ == "__main__":
    main()
