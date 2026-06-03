#!/usr/bin/env python3
"""
「depth=max_depthのACT会員の子が、複数の非ACT会員を経由してACT会員に達する場合」を
カウントするには、max_depth以降でも探索を続ける必要がある。

仮説：ULBの段数制限はACT会員のdepthで制限されるが、
      ACT会員のdepthがmax_depth以内なら、その子以降の非ACT透過後の
      「最初のACT会員」は max_depth+1 段目としてカウント「しない」が、
      それより先の探索はmax_depthまで続ける。

つまり正しいロジックは：
  depth=dでACTなら → カウント + 子をdepth=d+1でstack
  depth=dで非ACT/WDなら → 透過 + 子をdepth=dでstack
  BUT: depth > max_depth でACTなら → カウントしない + 子をdepth=d+1でstack継続
      
これで82/44の差異が埋まるか確認する
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


def calc_ulb_variant1(target_id, members_by_id, upline_children, level):
    """
    バリアント1（現行非ACT透過）：
    - depth > max_depth で ACT → ストップ（子も探索しない）
    - depth <= max_depth で ACT → カウント + 子をdepth+1
    - WD/非ACT → 透過(depth変わらず)
    """
    if level not in UNILEVEL_RATES:
        return 0, {}
    rates = UNILEVEL_RATES[level]
    max_d = len(rates)
    total = 0
    detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0})

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
            if depth <= max_d:
                rate = rates[depth-1]
                b = ulb_bonus(m['self_pt_04'], rate)
                total += b
                detail[depth]['count'] += 1
                detail[depth]['pt']    += m['self_pt_04']
                detail[depth]['bonus'] += b
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
    return total, dict(detail)


def calc_ulb_variant2(target_id, members_by_id, upline_children, level):
    """
    バリアント2（depth超過でも透過を続ける）：
    - depth <= max_depth で ACT → カウント + 子をdepth+1
    - depth > max_depth で ACT → カウントしない + 子をdepth+1（ただし探索継続なし=ストップ）
    - WD/非ACT → 透過(depth変わらず)、探索継続
    
    つまりACTがmax_depthを超えたら終了、でも非ACT透過はmax_depth+N段でも続く
    """
    if level not in UNILEVEL_RATES:
        return 0, {}
    rates = UNILEVEL_RATES[level]
    max_d = len(rates)
    total = 0
    detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0})

    # maxdepthを超えてACTに達したらストップ
    stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            # 非ACT/WD: depth変わらず透過（制限なし）
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            # ACT
            if depth <= max_d:
                rate = rates[depth-1]
                b = ulb_bonus(m['self_pt_04'], rate)
                total += b
                detail[depth]['count'] += 1
                detail[depth]['pt']    += m['self_pt_04']
                detail[depth]['bonus'] += b
                # 子を depth+1 で継続（max_d超過で打ち切らない）
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))
            # depth > max_d でACTなら: 終了（子を探索しない）
    return total, dict(detail)


def calc_ulb_variant3(target_id, members_by_id, upline_children, level):
    """
    バリアント3（非ACT透過深度制限なし + ACT超過でも子を継続）：
    - ACT: depth+1消費 + depth<=max_dならカウント
    - 非ACT/WD: depth変わらず透過
    - 上限なし（ACTのdepthがmax_dを超えても子の探索は続ける）
    
    これは実質的に「7段を超えたACTはボーナスなし、でもその子も探索する」
    """
    if level not in UNILEVEL_RATES:
        return 0, {}
    rates = UNILEVEL_RATES[level]
    max_d = len(rates)
    total = 0
    detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0})

    stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
    visited = set()
    while stack:
        cur_id, depth = stack.pop()
        if cur_id in visited: continue
        visited.add(cur_id)
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            if depth <= max_d:
                rate = rates[depth-1]
                b = ulb_bonus(m['self_pt_04'], rate)
                total += b
                detail[depth]['count'] += 1
                detail[depth]['pt']    += m['self_pt_04']
                detail[depth]['bonus'] += b
            # ACTは常に子を探索（depth+1で）
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

    print("=" * 100)
    print("ULBバリアント比較")
    print("=" * 100)
    print(f"{'会員':12} {'V1(現行)':>10} {'V2(超過ストップ)':>16} {'V3(上限なし)':>12} {'期待値':>10}")
    print("-" * 70)

    for mc, exp in EXPECTED.items():
        m = members_by_code.get(mc)
        if not m:
            print(f"{mc}: 不在"); continue
        mid = m['id']
        level = exp['level']
        exp_ulb = exp['ulb']

        v1, _ = calc_ulb_variant1(mid, members_by_id, upline_children, level)
        v2, d2 = calc_ulb_variant2(mid, members_by_id, upline_children, level)
        v3, d3 = calc_ulb_variant3(mid, members_by_id, upline_children, level)

        v1_ok = '✅' if v1 == exp_ulb else f'❌{v1-exp_ulb:+,}'
        v2_ok = '✅' if v2 == exp_ulb else f'❌{v2-exp_ulb:+,}'
        v3_ok = '✅' if v3 == exp_ulb else f'❌{v3-exp_ulb:+,}'

        print(f"{mc:<12} {v1:>10,}{v1_ok:>6} {v2:>10,}{v2_ok:>6} {v3:>10,}{v3_ok:>6} {exp_ulb:>10,}")

    print("\n\n【V3 段別内訳確認（82/44）】")
    for mc in ['82179501', '44504701']:
        m = members_by_code.get(mc)
        exp = EXPECTED[mc]
        level = exp['level']
        rates = UNILEVEL_RATES[level]
        v3, d3 = calc_ulb_variant3(m['id'], members_by_id, upline_children, level)
        print(f"\n  {mc} LV{level}: V3={v3:,}円 vs 期待={exp['ulb']:,}円 (差={v3-exp['ulb']:+,})")
        for d in range(1, len(rates)+1):
            info = d3.get(d, {'count':0,'pt':0,'bonus':0})
            print(f"    段{d}: {info['count']}名, {info['pt']}pt → {info['bonus']:,}円")

    print("\n\n【V2 段別内訳確認（82/44）】")
    for mc in ['82179501', '44504701']:
        m = members_by_code.get(mc)
        exp = EXPECTED[mc]
        level = exp['level']
        rates = UNILEVEL_RATES[level]
        v2, d2 = calc_ulb_variant2(m['id'], members_by_id, upline_children, level)
        print(f"\n  {mc} LV{level}: V2={v2:,}円 vs 期待={exp['ulb']:,}円 (差={v2-exp['ulb']:+,})")
        for d in range(1, len(rates)+1):
            info = d2.get(d, {'count':0,'pt':0,'bonus':0})
            print(f"    段{d}: {info['count']}名, {info['pt']}pt → {info['bonus']:,}円")

    print("\n✅ 完了")

if __name__ == "__main__":
    main()
