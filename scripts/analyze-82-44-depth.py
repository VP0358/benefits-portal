#!/usr/bin/env python3
"""
analyze-82-44-depth.py
=======================
82/44のULB残差の根本原因を特定するための詳細解析
- 非ACT透過ロジックを正しく実装
- 段別ACT会員リストを詳細出力
- 82/44に対して期待値との差分を特定
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

BONUS_MONTH   = "2026-04"
CURRENT_MONTH = "2026-05"
ACTIVE_REQUIRED_PRODUCTS = ["1000", "2000"]
POINT_RATE = 100
UNILEVEL_RATES = {4: [15, 9, 6, 5, 3, 2, 1], 5: [15, 10, 7, 6, 4, 3, 2]}

EXPECTED = {
    "82179501": {"ulb": 53850,  "sb": 35700,  "minPt": 10200, "level": 4},
    "44504701": {"ulb": 44850,  "sb": 122400, "minPt": 30600, "level": 5},
    "86820601": {"ulb": 98550,  "sb": 16200,  "minPt": 4050,  "level": 5},
    "93713601": {"ulb": 52650,  "sb": 4200,   "minPt": 1200,  "level": 4},
    "89248801": {"ulb": 19950,  "sb": 122400, "minPt": 30600, "level": 5},
}
TARGET_5 = list(EXPECTED.keys())

FA_CODES = {"40431001", "44504701", "64150101", "82179501", "82179502", "89248801", "95446801"}

def is_active(status, self_pt, has_req, force_active):
    if force_active: return True
    if status in ('withdrawn','lapsed'): return False
    return has_req and self_pt > 0

def is_withdrawn(status, force_active):
    if force_active: return False
    return status in ('withdrawn','lapsed')

def ulb_bonus(pt, rate):
    return math.floor(pt * (rate / 100) * POINT_RATE)


def calc_ulb_nonact_passthrough(target_id, members_by_id, upline_children, level):
    """
    非ACT透過ロジック（前セッションで86/93/89が一致した版）:
    - WD (withdrawn/lapsed): 透過（depth消費なし）
    - 非ACT (WDでない、ACT条件未達): 透過（depth消費なし） ← 修正点
    - ACT: depth+1消費、pt加算
    """
    if level not in UNILEVEL_RATES:
        return 0, {}
    rates = UNILEVEL_RATES[level]
    total = 0
    detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

    stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m:
            continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            # WD または 非ACT → 透過（depth消費なし）
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            # ACT → depth消費 + bonus
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


def calc_ulb_current_v1(target_id, members_by_id, upline_children, level):
    """
    現行V1ロジック（非ACT会員がdepth消費）:
    - WD: 透過
    - 非ACT: depth+1消費（バグ）
    - ACT: depth+1消費
    """
    if level not in UNILEVEL_RATES:
        return 0, {}
    rates = UNILEVEL_RATES[level]
    total = 0
    detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

    stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m:
            continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
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
        else:
            # 非ACT: depth消費（現行バグ）
            if depth <= len(rates):
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))
    return total, dict(detail)


def get_depth_distribution_detail(target_id, members_by_id, upline_children, level, passthrough_nonact=True):
    """
    各段のACT会員コードリストを返す（passthrough=True: 非ACT透過）
    返値: {depth: [{'mc', 'pt', 'act', 'wd', 'fa'}]}
    """
    if level not in UNILEVEL_RATES:
        return {}
    rates = UNILEVEL_RATES[level]
    depth_info = defaultdict(list)

    stack = [(child_id, 1) for child_id in upline_children.get(target_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m:
            continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            depth_info[depth].append({
                'mc': m['member_code'], 'pt': m['self_pt_04'], 'act': True, 'wd': False,
                'fa': m['force_active'], 'status': m['status']
            })
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            # 非ACT
            depth_info[depth].append({
                'mc': m['member_code'], 'pt': m['self_pt_04'], 'act': False, 'wd': False,
                'fa': m['force_active'], 'status': m['status']
            })
            if passthrough_nonact:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth))
            else:
                if depth <= len(rates):
                    for c in upline_children.get(cur_id, []):
                        stack.append((c, depth+1))
    return dict(depth_info)


def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── 全会員 + 購入データ取得 ──
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
    print(f"DB総会員数: {len(rows)}")

    members_by_id   = {}
    members_by_code = {}
    upline_children = defaultdict(list)

    for r in rows:
        m = {
            'id':           r['id'],
            'member_code':  r['memberCode'],
            'status':       r['status'],
            'force_active': r['forceActive'],
            'force_level':  r['forceLevel'],
            'upline_id':    r['uplineId'],
            'referrer_id':  r['referrerId'],
            'self_pt_04':   r['self_pt_04'],
            'has_req_04':   bool(r['has_req_04']),
        }
        members_by_id[m['id']]           = m
        members_by_code[m['member_code']] = m
        if m['upline_id']:
            upline_children[m['upline_id']].append(m['id'])

    cur.close(); conn.close()

    # ── bonusCSV読み込み ──
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {
                'active': row['ｱｸﾃｨﾌﾞ'].strip(),
                'grp_pt': int(row['グループpt'] or 0),
                'self_pt': int(row['自己購入pt'] or 0),
                'ulb': int(row['ユニレベルB'] or 0),
                'grp_act': int(row['グループACT'] or 0),
            }

    print("\n" + "=" * 80)
    print("【5名 ULB比較：現行V1 vs 非ACT透過 vs 期待値】")
    print("=" * 80)
    print(f"{'会員コード':<12} {'現行V1':>10} {'非ACT透過':>10} {'期待値':>10} {'V1差':>8} {'透過差':>8}")
    print("-" * 70)

    results = {}
    for mc in TARGET_5:
        m = members_by_code.get(mc)
        if not m:
            print(f"{mc}: DBに存在しない"); continue
        exp   = EXPECTED[mc]
        level = exp['level']
        mid   = m['id']

        ulb_v1, _   = calc_ulb_current_v1(mid, members_by_id, upline_children, level)
        ulb_pt, detail_pt = calc_ulb_nonact_passthrough(mid, members_by_id, upline_children, level)
        exp_ulb = exp['ulb']

        diff_v1 = ulb_v1 - exp_ulb
        diff_pt = ulb_pt - exp_ulb
        ok_pt = '✅' if diff_pt == 0 else '❌'

        print(f"{mc:<12} {ulb_v1:>10,} {ulb_pt:>10,} {exp_ulb:>10,} {diff_v1:>+8,} {diff_pt:>+8,} {ok_pt}")
        results[mc] = {'ulb_v1': ulb_v1, 'ulb_pt': ulb_pt, 'exp_ulb': exp_ulb,
                       'detail_pt': detail_pt, 'm': m, 'mid': mid, 'level': level}

    # ── 82/44の詳細 ──
    print("\n\n" + "=" * 80)
    print("【82/44の段別詳細比較（非ACT透過 vs 現行V1）】")
    print("=" * 80)

    for mc in ['82179501', '44504701']:
        r = results[mc]
        level = r['level']
        rates = UNILEVEL_RATES[level]
        mid = r['mid']

        print(f"\n{'='*60}")
        print(f"【{mc}】 LV{level} | 非ACT透過={r['ulb_pt']:,}円 | 期待={r['exp_ulb']:,}円 | 差={r['ulb_pt']-r['exp_ulb']:+,}円")

        # 非ACT透過版の段別
        detail_pt = r['detail_pt']
        print(f"\n  非ACT透過版 段別内訳:")
        for d in range(1, len(rates)+1):
            info = detail_pt.get(d, {'count':0,'pt':0,'bonus':0})
            rate = rates[d-1]
            print(f"    段{d}: {info['count']:>3}名  pt={info['pt']:>7,}  rate={rate:>2}%  bonus={info['bonus']:>8,}円")

        # 現行V1版の段別
        _, detail_v1 = calc_ulb_current_v1(mid, members_by_id, upline_children, level)
        print(f"\n  現行V1版 段別内訳:")
        for d in range(1, len(rates)+1):
            info = detail_v1.get(d, {'count':0,'pt':0,'bonus':0})
            rate = rates[d-1]
            print(f"    段{d}: {info['count']:>3}名  pt={info['pt']:>7,}  rate={rate:>2}%  bonus={info['bonus']:>8,}円")

        # 段7の会員を詳しく見る（非ACT透過版）
        print(f"\n  非ACT透過版の段7会員一覧:")
        info7 = detail_pt.get(len(rates), {'count':0,'pt':0,'bonus':0,'mcs':[]})
        for act_mc in info7.get('mcs', []):
            m_data = members_by_code.get(act_mc, {})
            print(f"    {act_mc}: pt={m_data.get('self_pt_04',0)}, status={m_data.get('status','?')}, FA={m_data.get('force_active',False)}")

    # ── 期待ULBから逆算して何が足りないかを特定 ──
    print("\n\n" + "=" * 80)
    print("【82/44: 期待ULBとの差分から必要な追加ptを算出】")
    print("=" * 80)

    for mc in ['82179501', '44504701']:
        r = results[mc]
        level = r['level']
        rates = UNILEVEL_RATES[level]
        exp_ulb = r['exp_ulb']
        ulb_pt  = r['ulb_pt']
        diff    = exp_ulb - ulb_pt

        detail_pt = r['detail_pt']
        print(f"\n【{mc}】 LV{level}")
        print(f"  非ACT透過ULB={ulb_pt:,}円, 期待={exp_ulb:,}円, 差={diff:+,}円")

        # 各段のptを確認
        for d in range(1, len(rates)+1):
            info = detail_pt.get(d, {'count':0,'pt':0,'bonus':0})
            rate = rates[d-1]
            # この段に何pt追加すれば差が埋まるか
            if rate > 0:
                needed_pt = math.ceil(diff / (rate / 100 * POINT_RATE))
                needed_members = math.ceil(needed_pt / 150)
                print(f"  段{d}(rate={rate}%): 現在{info['pt']:,}pt → あと{needed_pt:,}pt={needed_members}名分追加で+{math.floor(needed_pt*(rate/100)*POINT_RATE):,}円")

    # ── 非ACT透過版での段別分布（全ノード、ACT含む）──
    print("\n\n" + "=" * 80)
    print("【82179501: 非ACT透過版の詳細段別分布（ACT+非ACT全ノード）】")
    print("=" * 80)

    mc = '82179501'
    m = members_by_code.get(mc)
    level = EXPECTED[mc]['level']
    rates = UNILEVEL_RATES[level]
    mid = m['id']

    depth_all = get_depth_distribution_detail(mid, members_by_id, upline_children, level, passthrough_nonact=True)

    for d in range(1, len(rates)+2):
        nodes = depth_all.get(d, [])
        act_nodes = [n for n in nodes if n['act']]
        non_act_nodes = [n for n in nodes if not n['act']]
        if not nodes:
            continue
        rate_str = f"rate={rates[d-1]}%" if d <= len(rates) else "rate=超過"
        print(f"\n  段{d} ({rate_str}): ACT={len(act_nodes)}名, 非ACT={len(non_act_nodes)}名 (合計={len(nodes)}名)")
        if non_act_nodes:
            print(f"    非ACT会員（透過）:")
            for n in non_act_nodes:
                print(f"      {n['mc']}: status={n['status']}, pt={n['pt']}, FA={n['fa']}")
            print(f"    → 非ACT透過により、これらの会員の子が同じ段{d}でカウントされる")

    print("\n\n" + "=" * 80)
    print("【44504701: 非ACT透過版の詳細段別分布（ACT+非ACT全ノード）】")
    print("=" * 80)

    mc = '44504701'
    m = members_by_code.get(mc)
    level = EXPECTED[mc]['level']
    rates = UNILEVEL_RATES[level]
    mid = m['id']

    depth_all_44 = get_depth_distribution_detail(mid, members_by_id, upline_children, level, passthrough_nonact=True)

    for d in range(1, len(rates)+2):
        nodes = depth_all_44.get(d, [])
        act_nodes = [n for n in nodes if n['act']]
        non_act_nodes = [n for n in nodes if not n['act']]
        if not nodes:
            continue
        rate_str = f"rate={rates[d-1]}%" if d <= len(rates) else "rate=超過"
        print(f"\n  段{d} ({rate_str}): ACT={len(act_nodes)}名, 非ACT={len(non_act_nodes)}名 (合計={len(nodes)}名)")
        if non_act_nodes:
            print(f"    非ACT会員（透過）:")
            for n in non_act_nodes:
                print(f"      {n['mc']}: status={n['status']}, pt={n['pt']}, FA={n['fa']}")

    print("\n✅ 分析完了")


if __name__ == "__main__":
    main()
