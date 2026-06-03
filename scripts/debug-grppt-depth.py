#!/usr/bin/env python3
"""
V1の calc_grp_pt が深度制限どおりに動いているかを確認
bonusCSV の grp_pt=22800(82) vs V1=30600
→ これは同じACT206名なのに全然違う

調査：grp_ptにおける「7段制限」の実装
  - bonusCSVはULBの圧縮段数（非ACT透過ありの7段）でのグループACT
  - V1のcalc_grp_ptも同じロジックのはずだが...

calc_grp_ptの実装を確認
  ※ db-grppt-analysis.pyの calc_grp_pt 関数を使って
    段1-7のACT会員リストとそのptを全部出す
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

    # bonusCSV読み込み
    bonus = {}
    with open('/home/user/uploaded_files/bonus_list_full.csv', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            mid = row['会員番号'].strip()
            bonus[mid] = {
                'active': row['ｱｸﾃｨﾌﾞ'].strip() == '○',
                'grp_pt': int(row['グループpt'] or 0),
                'grp_act': int(row['グループACT'] or 0),
                'ulb': int(row['ユニレベルB'] or 0),
            }

    print("=" * 80)
    print("grp_pt 深度別分析")
    print("=" * 80)

    for mc in ['82179501', '44504701']:
        m = members_by_code.get(mc)
        level = 4 if mc == '82179501' else 5
        rates = UNILEVEL_RATES[level]
        max_d = len(rates)
        mid = m['id']
        b = bonus.get(mc, {})

        print(f"\n{'='*60}")
        print(f"【{mc}】 bonusCSV grp_pt={b.get('grp_pt',0):,}")

        # 非ACT透過版での段別ACT会員リスト（depth制限あり=7段）
        depth_act = defaultdict(list)
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
                depth_act[depth].append({'mc': cm['member_code'], 'pt': cm['self_pt_04']})
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1))

        print(f"\n  段別ACT（非ACT透過版）: 段1-7のACT会員のみカウント")
        total_pt_7 = 0
        total_act_7 = 0
        total_pt_all = 0
        total_act_all = 0
        for d in range(1, 15):
            acts = depth_act.get(d, [])
            pts = sum(a['pt'] for a in acts)
            total_pt_all += pts
            total_act_all += len(acts)
            if d <= max_d:
                total_pt_7 += pts
                total_act_7 += len(acts)
            rate_str = f"rate={rates[d-1]}%" if d <= max_d else "超過"
            if acts:
                print(f"    段{d}({rate_str}): {len(acts)}名, pt={pts:,}")

        print(f"\n  段1-7合計: {total_act_7}名, {total_pt_7:,}pt")
        print(f"  全段合計: {total_act_all}名, {total_pt_all:,}pt")
        print(f"  bonusCSV grp_act: {b.get('grp_act',0)}名, grp_pt: {b.get('grp_pt',0):,}pt")
        print(f"  → 段1-7のgrp_pt={total_pt_7:,} vs bonus={b.get('grp_pt',0):,} (差={total_pt_7-b.get('grp_pt',0):+,})")
        print(f"  → 全段grp_pt={total_pt_all:,} vs bonus={b.get('grp_pt',0):,} (差={total_pt_all-b.get('grp_pt',0):+,})")

        # ULBを段1-7のACTのptで正確計算
        ulb_from_depth = 0
        for d in range(1, max_d+1):
            acts = depth_act.get(d, [])
            rate = rates[d-1]
            for a in acts:
                b_val = math.floor(a['pt'] * (rate/100) * POINT_RATE)
                ulb_from_depth += b_val

        print(f"\n  ULB（段1-7 ACT）: {ulb_from_depth:,}円 vs bonusCSV {b.get('ulb',0):,}円 (差={ulb_from_depth-b.get('ulb',0):+,})")

        # 期待のgrp_pt = bonusCSVのgrp_pt
        # これは何を意味するか？
        # bonusCSVの grp_pt = ULBの段1-7の全ACT ptなのか？
        # それとも別の制限（例えばgrp_pt計算は参照コード=(01)ending会員から見た段数で7段）？

        # 仮説: bonusCSVのgrp_ptはULBの段別分布とは完全に同じではなく
        # どこかで別途計算されている
        # → grp_ptとULBの関係を確認
        
        # ULB期待値から逆算
        exp_ulb = 53850 if mc == '82179501' else 44850
        exp_grp_pt = b.get('grp_pt', 0)
        
        # 期待ULBを段別に分解する（段7=47名のptが7050で確認）
        # 期待段7: 期待grp_pt=22800、実V1段1-7=18450（差4350）
        # 実V1の段7のptは何か？
        acts7 = depth_act.get(7, [])
        pt7 = sum(a['pt'] for a in acts7)
        print(f"\n  V1段7: {len(acts7)}名, pt={pt7:,}")
        
        # 期待では段7に何pt追加する必要があるか
        # ULB差=期待-V1
        ulb_diff = exp_ulb - ulb_from_depth
        print(f"\n  ULB差={ulb_diff:+,}円")
        if ulb_diff != 0:
            rate7 = rates[6]  # 段7のrate
            needed_pt7 = math.ceil(ulb_diff / (rate7/100 * POINT_RATE))
            print(f"  段7(rate={rate7}%)で補完: {needed_pt7}pt追加 → +{math.floor(needed_pt7*rate7/100*POINT_RATE)}円")
            print(f"  → 段7に{math.ceil(needed_pt7/150)}名(各150pt)追加が必要")

        # どの段に差があるか: ULBを段別比較
        # bonusCSVのULB期待値は既知（期待段別は不明）
        # V1の段別ULBを出力
        print(f"\n  V1の段別ULB:")
        v1_ulb_total = 0
        for d in range(1, max_d+1):
            acts = depth_act.get(d, [])
            rate = rates[d-1]
            pt = sum(a['pt'] for a in acts)
            ulb_d = math.floor(pt * (rate/100) * POINT_RATE)
            v1_ulb_total += ulb_d
            print(f"    段{d}(rate={rate}%): {len(acts)}名, pt={pt:,} → {ulb_d:,}円")
        print(f"    合計: {v1_ulb_total:,}円 vs 期待: {exp_ulb:,}円 (差={v1_ulb_total-exp_ulb:+,})")

    print("\n✅ 完了")

if __name__ == "__main__":
    main()
