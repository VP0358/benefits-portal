#!/usr/bin/env python3
"""
82/44のULB差異の最終根本原因を特定する
仮説：段7の非ACT会員の直下ACT子（depth=8）が計算から漏れている
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

EXPECTED = {
    "82179501": {"ulb": 53850, "level": 4},
    "44504701": {"ulb": 44850, "level": 5},
    "86820601": {"ulb": 98550, "level": 5},
    "93713601": {"ulb": 52650, "level": 4},
    "89248801": {"ulb": 19950, "level": 5},
}

def is_active(status, self_pt, has_req, force_active):
    if force_active: return True
    if status in ('withdrawn','lapsed'): return False
    return has_req and self_pt > 0

def is_withdrawn(status, force_active):
    if force_active: return False
    return status in ('withdrawn','lapsed')

def ulb_bonus(pt, rate):
    return math.floor(pt * (rate / 100) * POINT_RATE)

def calc_ulb_v1_inact_passthrough(target_id, members_by_id, upline_children, level):
    """非ACT透過ロジック（現行）: 非ACT会員もdepth消費なし"""
    if level not in UNILEVEL_RATES:
        return 0, {}
    rates = UNILEVEL_RATES[level]
    total = 0
    detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

    stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            if depth <= len(rates):
                rate = rates[depth-1]
                b = ulb_bonus(m['self_pt_04'], rate)
                total += b
                detail[depth]['count'] += 1
                detail[depth]['pt']    += m['self_pt_04']
                detail[depth]['bonus'] += b
                detail[depth]['mcs'].append(m['member_code'])
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
    return total, dict(detail)


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

    # bonusCSV読み込み
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {'ulb': int(row['ユニレベルB'] or 0), 'grp_pt': int(row['グループpt'] or 0)}

    print("=" * 80)
    print("最終根本原因分析")
    print("=" * 80)

    # 全5名の非ACT透過ULB計算
    print("\n【全5名 非ACT透過版ULB】")
    print(f"{'会員':12} {'非ACT透過':>12} {'期待値':>10} {'差':>8}")
    print("-" * 50)
    all_results = {}
    for mc, exp in EXPECTED.items():
        m = members_by_code.get(mc)
        if not m:
            print(f"{mc}: 不在"); continue
        ulb, detail = calc_ulb_v1_inact_passthrough(m['id'], members_by_id, upline_children, exp['level'])
        diff = ulb - exp['ulb']
        ok = '✅' if diff == 0 else f'❌ {diff:+,}'
        print(f"{mc:<12} {ulb:>12,} {exp['ulb']:>10,} {ok}")
        all_results[mc] = {'ulb': ulb, 'detail': detail, 'level': exp['level']}

    # 82の詳細解析
    print("\n\n" + "=" * 80)
    print("【82179501: 段7の非ACT会員の子（本来段7にカウントされるべき7名）】")
    print("=" * 80)

    # 段7の非ACT会員のうち「子を持つもの」のみに注目
    mc = '82179501'
    m82 = members_by_code[mc]
    mid = m82['id']
    level = 4
    rates = UNILEVEL_RATES[level]
    max_depth = len(rates)

    # 段7の非ACT会員を列挙
    depth7_nonact_with_children = []
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
            if depth == max_depth:  # 段7の非ACT
                children = upline_children.get(cur_id, [])
                if children:
                    depth7_nonact_with_children.append({
                        'mc': m['member_code'], 'status': m['status'], 'id': cur_id,
                        'children': children
                    })
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))

    print(f"\n段7の非ACT会員のうち子を持つもの: {len(depth7_nonact_with_children)}名")
    for na in depth7_nonact_with_children:
        print(f"\n  {na['mc']} (status={na['status']}): 子={len(na['children'])}名")
        for child_id in na['children']:
            cm = members_by_id.get(child_id)
            if not cm: continue
            cm_act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
            cm_wd  = is_withdrawn(cm['status'], cm['force_active'])
            print(f"    → {cm['member_code']}: ACT={cm_act}, WD={cm_wd}, status={cm['status']}, pt={cm['self_pt_04']}")

    # 44の詳細解析
    print("\n\n" + "=" * 80)
    print("【44504701: 段7の非ACT会員の子（本来段7にカウントされるべき会員）】")
    print("=" * 80)

    mc44 = '44504701'
    m44 = members_by_code[mc44]
    mid44 = m44['id']
    level44 = 5
    rates44 = UNILEVEL_RATES[level44]
    max_d44 = len(rates44)

    depth7_nonact_44 = []
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
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            if depth == max_d44:  # 段7の非ACT
                children = upline_children.get(cur_id, [])
                if children:
                    depth7_nonact_44.append({
                        'mc': m['member_code'], 'status': m['status'], 'id': cur_id,
                        'children': children
                    })
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))

    print(f"\n段7の非ACT会員のうち子を持つもの: {len(depth7_nonact_44)}名")
    total_act_children = 0
    total_pt_children  = 0
    for na in depth7_nonact_44:
        print(f"\n  {na['mc']} (status={na['status']}): 子={len(na['children'])}名")
        for child_id in na['children']:
            cm = members_by_id.get(child_id)
            if not cm: continue
            cm_act = is_active(cm['status'], cm['self_pt_04'], cm['has_req_04'], cm['force_active'])
            cm_wd  = is_withdrawn(cm['status'], cm['force_active'])
            if not cm_wd and cm_act:
                total_act_children += 1
                total_pt_children  += cm['self_pt_04']
            print(f"    → {cm['member_code']}: ACT={cm_act}, WD={cm_wd}, status={cm['status']}, pt={cm['self_pt_04']}")

    print(f"\n  段7非ACTの子 ACT合計: {total_act_children}名, pt={total_pt_children}")
    print(f"  → rate=2%で計算: {math.floor(total_pt_children*2/100*POINT_RATE)}円")
    print(f"  ※ 期待差異=-300円 ← これは1名×150pt×2%=300円")

    # ── 仮説確認：段7の打ち切りを max_depth+1 にした場合 ──
    print("\n\n" + "=" * 80)
    print("【仮説検証：段7の非ACT透過後の子を段8扱いにするのではなく、max_depth+1まで見る】")
    print("=" * 80)

    # 現行の非ACT透過では:
    # 段7の非ACT → depth=7のまま透過 → 子をdepth=7でstack
    # 子がACT → depth=7 <= max_depth=7 → カウント ✅
    # これは正しいはず
    
    # 実際に段7の非ACTの子がACTなのにカウントされていない理由を調べる
    
    # ロジック再確認:
    # stack.append((c, depth))  ← 非ACT透過時
    # そのcがACTなら depth=7 ≤ max_depth=7 → カウントされる
    # そのcが非ACTなら depth=7で透過 → さらにその子がdepth=7...
    # そのcがWDなら depth=7で透過...
    
    # 問題：段8のACT27名のうち7名は「段7非ACT」から来ているはずだが...
    # analyze-depth-cutoff.pyでは「段7非ACT由来の段8ACT7名」と示された
    # これらがなぜdepth=8になっているか？
    
    print("\n【段7非ACT由来の段8ACT7名の追跡（親関係を詳しく確認）】")
    
    # 問題の7名の会員コードを特定（analyze-depth-cutoff.pyの結果）
    problem_mcs = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']
    
    for pmc in problem_mcs:
        pm = members_by_code.get(pmc)
        if not pm: continue
        parent_id = pm['upline_id']
        parent_m = members_by_id.get(parent_id, {})
        parent_mc = parent_m.get('member_code', '?')
        parent_act = is_active(parent_m.get('status',''), parent_m.get('self_pt_04',0), parent_m.get('has_req_04',False), parent_m.get('force_active',False))
        parent_wd  = is_withdrawn(parent_m.get('status',''), parent_m.get('force_active',False))
        
        # 親の親（祖父）
        gp_id = parent_m.get('upline_id')
        gp_m = members_by_id.get(gp_id, {})
        gp_mc = gp_m.get('member_code', '?')
        gp_act = is_active(gp_m.get('status',''), gp_m.get('self_pt_04',0), gp_m.get('has_req_04',False), gp_m.get('force_active',False))
        gp_wd  = is_withdrawn(gp_m.get('status',''), gp_m.get('force_active',False))
        
        print(f"\n  {pmc} (pt={pm['self_pt_04']}, status={pm['status']}):")
        print(f"    親: {parent_mc} (ACT={parent_act}, WD={parent_wd}, status={parent_m.get('status','?')}, pt={parent_m.get('self_pt_04',0)})")
        print(f"    祖父: {gp_mc} (ACT={gp_act}, WD={gp_wd}, status={gp_m.get('status','?')}, pt={gp_m.get('self_pt_04',0)})")

    # ── 最終確認：段7の非ACT会員の親が非ACTでchain透過している場合 ──
    print("\n\n" + "=" * 80)
    print("【問題の7名の上流 非ACT chain 追跡】")
    print("=" * 80)
    print("問題の7名が段8になっている原因：")
    print("  → その親（段7の非ACT）の親が非ACTで、実際の圧縮段数が正しいか？")
    print("  → あるいはその親自体がACTで段7→子が段8？")
    print()

    for pmc in problem_mcs:
        pm = members_by_code.get(pmc)
        if not pm: continue
        
        # 上流5階層を追跡
        chain = []
        cur_id = pm['upline_id']
        for _ in range(10):
            if not cur_id: break
            m = members_by_id.get(cur_id)
            if not m: break
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
            wd  = is_withdrawn(m['status'], m['force_active'])
            chain.append({
                'mc': m['member_code'], 'act': act, 'wd': wd,
                'status': m['status'], 'pt': m['self_pt_04'], 'fa': m['force_active']
            })
            cur_id = m['upline_id']

        # 非ACT透過ロジックで上流からこの会員のdepthを計算
        # 82179501からの圧縮深度
        compressed_depth = None
        # 簡易計算：chainの中でACTな会員のみdepthを消費
        d = 1
        for i in range(len(chain)-1, -1, -1):
            anc = chain[i]
            if anc['mc'] == '82179501':
                compressed_depth = d
                break
            if anc['wd'] or not anc['act']:
                pass  # 透過=depth変化なし
            else:
                d += 1  # ACT=depth消費
        
        parent_m_data = members_by_id.get(pm['upline_id'], {})
        parent_act = is_active(parent_m_data.get('status',''), parent_m_data.get('self_pt_04',0), parent_m_data.get('has_req_04',False), parent_m_data.get('force_active',False))
        
        # 親がACTかどうかで判断
        print(f"  {pmc}: 親={chain[0]['mc'] if chain else '?'} ACT={chain[0]['act'] if chain else '?'}")
        for c in chain[:4]:
            print(f"    ← {c['mc']}: ACT={c['act']}, WD={c['wd']}, status={c['status']}, pt={c['pt']}")

    print("\n✅ 分析完了")

if __name__ == "__main__":
    main()
