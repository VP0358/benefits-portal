#!/usr/bin/env python3
"""
db-grppt-analysis.py
=============================================
DB実データで grp_pt 差異の根本原因を特定する

目的:
  1. DB selfPt（2026-04 order有り）を全会員で取得
  2. bonusCSV self_pt と DB self_pt の差異を特定
  3. 5名のULBを完全計算して期待値と照合
  4. uplineツリーを用いた圧縮段数計算で差異会員を特定
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

FA_LEVEL = {
    "40431001": 3, "44504701": 5, "64150101": None,
    "82179501": 4, "82179502": None, "89248801": 5, "95446801": None,
}

# ─────────────────────────────────────────
def load_bonus_csv():
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {
                'active':    row['ｱｸﾃｨﾌﾞ'].strip(),
                'grp_act':   int(row['グループACT'] or 0),
                'grp_pt':    int(row['グループpt'] or 0),
                'self_pt':   int(row['自己購入pt'] or 0),
                'ulb':       int(row['ユニレベルB'] or 0),
                'sb':        int(row['シェアB'] or 0),
                'min_pt':    int(row['最小系列pt'] or 0),
                'level':     row['当月判定レベル'].strip(),
            }
    return bonus

# ─────────────────────────────────────────
def is_active_v1(status, self_pt, has_req, force_active):
    if force_active: return True
    if status in ('withdrawn','lapsed'): return False
    return has_req and self_pt > 0

def is_withdrawn_v1(status, force_active):
    if force_active: return False
    return status in ('withdrawn','lapsed')

def ulb_bonus(pt, rate):
    return math.floor(pt * (rate / 100) * POINT_RATE)

# ─────────────────────────────────────────
def calc_ulb_full(target_id, members_by_id, upline_children, level):
    """V1エンジンと同じULB計算（圧縮段数BFS）"""
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
        wd = is_withdrawn_v1(m['status'], m['force_active'])
        act = is_active_v1(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

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
            if depth <= len(rates):
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))
    return total, dict(detail)

def calc_grp_pt(target_id, members_by_id, upline_children):
    """grp_pt計算（V1と同じ、自分含む）"""
    me = members_by_id.get(target_id)
    if not me:
        return 0, []
    gp = me['self_pt_04']
    act_list = []  # (mc, depth, pt)

    stack = [(c, 1) for c in upline_children.get(target_id, [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m:
            continue
        wd  = is_withdrawn_v1(m['status'], m['force_active'])
        act = is_active_v1(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            if depth <= 7:
                gp += m['self_pt_04']
                act_list.append((m['member_code'], depth, m['self_pt_04']))
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth+1))
        else:
            if depth <= 7:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))
    return gp, act_list

def count_grp_act(target_id, members_by_id, upline_children):
    count = 0
    visited = set()
    stack = list(upline_children.get(target_id, []))
    while stack:
        cur_id = stack.pop()
        if cur_id in visited: continue
        visited.add(cur_id)
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn_v1(m['status'], m['force_active'])
        act = is_active_v1(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if not wd and act:
            count += 1
        for c in upline_children.get(cur_id, []):
            stack.append(c)
    return count

# ─────────────────────────────────────────
def main():
    bonus = load_bonus_csv()
    conn  = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding("UTF8")
    cur   = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print("=" * 80)
    print("DB実データ grp_pt 差異分析")
    print("=" * 80)

    # ── 全会員 + 購入データ取得 ──
    cur.execute("""
        SELECT
            m.id,
            m."memberCode",
            m.status,
            m."forceActive",
            m."forceLevel",
            m."uplineId",
            m."referrerId",
            COALESCE(SUM(CASE
                WHEN p."purchaseMonth" = %s
                 AND p."productCode" IN ('1000','2000')
                 AND p."order_id" IS NOT NULL
                THEN p."totalPoints" ELSE 0 END), 0)::int AS self_pt_04,
            COALESCE(SUM(CASE
                WHEN p."purchaseMonth" = %s
                 AND p."productCode" IN ('1000','2000')
                 AND p."order_id" IS NOT NULL
                THEN p."totalPoints" ELSE 0 END), 0)::int AS self_pt_05,
            BOOL_OR(p."purchaseMonth" = %s
                AND p."productCode" IN ('1000','2000')
                AND p."order_id" IS NOT NULL) AS has_req_04,
            BOOL_OR(p."purchaseMonth" = %s
                AND p."productCode" IN ('1000','2000')
                AND p."order_id" IS NOT NULL) AS has_req_05
        FROM "mlm_members" m
        LEFT JOIN "mlm_purchases" p ON p."mlmMemberId" = m.id
        GROUP BY m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
                 m."uplineId", m."referrerId"
    """, (BONUS_MONTH, CURRENT_MONTH, BONUS_MONTH, CURRENT_MONTH))

    rows = cur.fetchall()
    print(f"DB総会員数: {len(rows)}")

    members_by_id   = {}
    members_by_code = {}
    upline_children = defaultdict(list)   # uplineId -> [childId]

    for r in rows:
        m = {
            'id':          r['id'],
            'member_code': r['memberCode'],
            'status':      r['status'],
            'force_active':r['forceActive'],
            'force_level': r['forceLevel'],
            'upline_id':   r['uplineId'],
            'referrer_id': r['referrerId'],
            'self_pt_04':  r['self_pt_04'],
            'self_pt_05':  r['self_pt_05'],
            'has_req_04':  bool(r['has_req_04']),
            'has_req_05':  bool(r['has_req_05']),
        }
        members_by_id[m['id']]          = m
        members_by_code[m['member_code']] = m
        if m['upline_id']:
            upline_children[m['upline_id']].append(m['id'])

    # ── Step 1: DB self_pt vs bonus self_pt の全会員比較 ──
    print("\n【Step 1】DB self_pt vs bonusCSV self_pt 差異確認")
    print("-" * 60)
    mismatch = []
    for mc, m in members_by_code.items():
        b = bonus.get(mc, {})
        if not b:
            continue
        db_pt  = m['self_pt_04']
        bon_pt = b['self_pt']
        if db_pt != bon_pt:
            act_v1  = is_active_v1(m['status'], db_pt, m['has_req_04'], m['force_active'])
            act_bon = (b['active'] == '○')
            mismatch.append((mc, db_pt, bon_pt, act_v1, act_bon, m['status'], m['force_active']))

    print(f"self_pt不一致: {len(mismatch)} 名")
    if mismatch:
        print(f"{'会員コード':<12} {'DB_pt_04':>9} {'bonus_pt':>9} {'V1_act':>7} {'bon_act':>8} {'status'}")
        print("-"*70)
        for mc, dp, bp, va, ba, st, fa in sorted(mismatch):
            v = '○' if va else '×'
            b = '○' if ba else '×'
            fa_mark = '(FA)' if fa else ''
            print(f"{mc:<12} {dp:>9} {bp:>9} {v:>7} {b:>8}  {st}{fa_mark}")
    else:
        print("→ 全会員で DB_self_pt == bonus_self_pt（完全一致）")

    # ── Step 2: V1_04 vs bonusCSV ACT判定（DB版）──
    print("\n【Step 2】V1_04（DB）vs bonusCSV ACT判定 一致率")
    print("-" * 60)
    agree = 0
    disagree_list = []
    for mc, m in members_by_code.items():
        b = bonus.get(mc, {})
        if not b:
            continue
        v1_act  = is_active_v1(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        bon_act = (b['active'] == '○')
        if v1_act == bon_act:
            agree += 1
        else:
            disagree_list.append((mc, v1_act, bon_act, m['self_pt_04'], m['status'], m['force_active']))

    total_both = sum(1 for mc in members_by_code if mc in bonus)
    print(f"V1_04 vs bonusCSV 一致: {agree}/{total_both} ({agree/total_both*100:.1f}%)")
    if disagree_list:
        print(f"\n不一致 {len(disagree_list)} 名:")
        for mc, va, ba, pt, st, fa in sorted(disagree_list):
            print(f"  {mc}: V1={'+' if va else '-'}, bonus={'○' if ba else '×'}, pt={pt}, {st}, FA={fa}")

    # ── Step 3: 5名 self_pt 詳細 ──
    print("\n【Step 3】5名の self_pt 詳細確認")
    print("-" * 60)
    print(f"{'会員コード':<12} {'DB_04':>8} {'DB_05':>8} {'bonus_self':>11} {'一致':>5}")
    print("-" * 50)
    for mc in TARGET_5:
        m = members_by_code.get(mc, {})
        b = bonus.get(mc, {})
        if m:
            match = '✅' if m['self_pt_04'] == b.get('self_pt',0) else '❌'
            print(f"{mc:<12} {m['self_pt_04']:>8} {m['self_pt_05']:>8} {b.get('self_pt',0):>11} {match:>5}")

    # ── Step 4: 5名 ULB完全計算 ──
    print("\n【Step 4】5名 ULB完全計算（DB実ツリー）")
    print("=" * 80)
    for mc in TARGET_5:
        m = members_by_code.get(mc)
        if not m:
            print(f"{mc}: DBに存在しない")
            continue
        exp   = EXPECTED[mc]
        b     = bonus.get(mc, {})
        level = exp['level']
        mid   = m['id']

        ulb, ulb_detail = calc_ulb_full(mid, members_by_id, upline_children, level)
        grp_pt, act_list = calc_grp_pt(mid, members_by_id, upline_children)
        grp_act = count_grp_act(mid, members_by_id, upline_children)

        ulb_diff = ulb - exp['ulb']
        gp_diff  = grp_pt - b.get('grp_pt', 0)
        ga_diff  = grp_act - b.get('grp_act', 0)

        ok_ulb = '✅' if ulb_diff == 0 else '❌'
        ok_gp  = '✅' if gp_diff  == 0 else '❌'
        ok_ga  = '✅' if ga_diff  == 0 else '❌'

        print(f"\n{'='*60}")
        print(f"【{mc}】 LV{level}")
        print(f"  ULB:     V1={ulb:>8,}円  | 期待={exp['ulb']:>8,}円  | 差={ulb_diff:>+9,}円  {ok_ulb}")
        print(f"  grp_pt:  V1={grp_pt:>8}    | CSV={b.get('grp_pt',0):>8}    | 差={gp_diff:>+9}  {ok_gp}")
        print(f"  grp_act: V1={grp_act:>8}    | CSV={b.get('grp_act',0):>8}    | 差={ga_diff:>+9}  {ok_ga}")

        rates = UNILEVEL_RATES.get(level, [])
        print(f"  【段別内訳】")
        for d in range(1, len(rates)+1):
            info = ulb_detail.get(d, {'count':0,'pt':0,'bonus':0,'mcs':[]})
            r = rates[d-1]
            print(f"    段{d}: {info['count']:>3}名  pt={info['pt']:>7,}  rate={r:>2}%  bonus={info['bonus']:>8,}円")

        # ── 差異がある場合：grp_pt不一致の原因会員を特定 ──
        if gp_diff != 0:
            print(f"\n  ★ grp_pt差異={gp_diff:+} pt → 原因特定")
            print(f"     V1 act_list（段1-7）の各会員 vs bonusCSV self_pt:")
            for act_mc, depth, v1_pt in sorted(act_list[1:], key=lambda x: (x[1], x[0])):  # 自分除く
                b_mc = bonus.get(act_mc, {})
                b_pt = b_mc.get('self_pt', 0)
                if v1_pt != b_pt:
                    print(f"    ★差異: {act_mc}: 段{depth}, V1_pt={v1_pt}, bonus_pt={b_pt}")

        if ulb_diff != 0:
            # grp_pt一致でULB差 → 段分布の違いを詳細確認
            if gp_diff == 0:
                print(f"\n  ★ ULB差異={ulb_diff:+}円 (grp_pt一致) → 段分布の違い")
                # bonusCSVのgrp_ptとV1のULBの整合確認
                # ULBはgrp_ptそのものからは計算できない（段別が必要）
                print(f"     grp_pt={grp_pt}は一致しているがULBが違う")
                print(f"     → 特定会員の圧縮段数がV1とCSVで異なる可能性")

    # ── Step 5: 差異会員の段別分析（82と44に焦点）──
    print("\n\n【Step 5】82・44の差異会員を特定（段別ACT会員リスト）")
    print("=" * 80)

    for mc in ['82179501', '44504701']:
        m = members_by_code.get(mc)
        if not m:
            continue
        exp   = EXPECTED[mc]
        level = exp['level']
        mid   = m['id']

        ulb, ulb_detail = calc_ulb_full(mid, members_by_id, upline_children, level)
        grp_pt, act_list = calc_grp_pt(mid, members_by_id, upline_children)

        print(f"\n【{mc}】 LV{level} | ULB差={ulb-exp['ulb']:+,}円 | grp_pt差={grp_pt-bonus.get(mc,{}).get('grp_pt',0):+}")

        rates = UNILEVEL_RATES[level]
        for d in range(1, len(rates)+1):
            info = ulb_detail.get(d, {'count':0,'pt':0,'bonus':0,'mcs':[]})
            print(f"  段{d}: {info['count']}名, pt={info['pt']}")
            # bonusCSVでこの会員のself_ptを確認
            for act_mc in info['mcs']:
                b_mc = bonus.get(act_mc, {})
                b_pt = b_mc.get('self_pt', 0)
                db_pt = members_by_code.get(act_mc, {}).get('self_pt_04', 0)
                match = '' if db_pt == b_pt else f' ★DB={db_pt}≠BON={b_pt}'
                # statusとFA確認
                mdb = members_by_code.get(act_mc, {})
                fa_mark = '(FA)' if mdb.get('force_active') else ''
                print(f"    {act_mc}: db_pt={db_pt}, bon_pt={b_pt} {fa_mark}{match}")

    cur.close()
    conn.close()
    print("\n✅ 分析完了")

if __name__ == "__main__":
    main()
