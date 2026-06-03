#!/usr/bin/env python3
"""
【決定的検証】depth+1のタイミングの違い

発見:
  V1現行: ACTが子を探索するとき、全ての子（ACT/非ACT/WD）をdepth+1でキューに追加
  bonusCSV仮説: ACT自身に「到達」したときdepth+1する
    = ACTからの子を探索するとき、非ACTの子は「depth」(ACT本人と同じ)でキューに追加
    = ACTの子がACTなら次はdepth+1、非ACTなら次はdepth(透過)

  つまり「depth+1するのは次のACTへのカウント」
  = ACTノードに到達したときにdepthをインクリメント

  実装:
  「到達時」にdepthを決定する:
    - ACTに到達 → depth = 前のACTのdepth + 1
    - 非ACT/WDに到達 → depth = 前のACT/非ACT/WDと同じ

  これはDFSでいうと:
    スタック: (cur_id, depth_when_act_reached_here)
    where depth_when_act_reached_here = 直近の上流ACTのdepth

  具体的実装:
    - 誰かの子をキューに追加するとき:
      - 自分(cur)がACT → 子のdepth = cur_depth + 1
      - 自分(cur)が非ACT/WD → 子のdepth = cur_depth (透過)

  これはV1と同じ...

  WAIT: V1の問題点を再確認。
  
  V1現行コード:
    if (wd or not act):
        for c in children:
            stack.append((c, depth))  # 透過: depth変わらず
    else:  # ACT
        if depth <= max_d:
            ... # ボーナス加算
        for c in children:
            stack.append((c, depth+1))  # ACT: 次はdepth+1

  この場合:
    82938301(ACT,d=6) → 子51556601をd=7でキュー ← depth+1!
    51556601(非ACT,d=7) → 子10885801をd=7でキュー ← 透過
    10885801(ACT,d=7) → ボーナス加算(段7) → 子10885802をd=8でキュー ← depth+1!
    10885802(WD,d=8) → 子57251401をd=8でキュー ← 透過
    57251401(非ACT,d=8) → 子14578101をd=8でキュー ← 透過
    14578101(ACT,d=8) → d=8 > max_d(7) → ボーナス非加算 ✗

  bonusCSV期待:
    14578101がdepth=7でカウントされる
    → 10885801がdepth=6でカウントされる必要がある
    → 51556601への到達depth=6が必要
    → 82938301がdepth=5のときに51556601を探索してdepth=5(透過)

  では82938301のdepthが5になるケースは？
  → 82938301のdepth=5 → 76348702がdepth=4 → ... → 82がdepth=0
  → 82から82938301まで5段のACT

  82からの上流チェーン:
    82(d=0) → 95446801(ACT,d=1) → 64150101(ACT,d=2) → 42845501(ACT,d=3) → 76348701(ACT,d=4) → 76348702(ACT,d=5) → 82938301(ACT,d=6)
  → 82938301はd=6

  なぜbonusCSVで14578101がd=7になるか...
  実際には10885801がd=6、14578101がd=7になるはず

  再計算:
  14578101のACT先祖チェーン（82含む）: 82, 95446801, 64150101, 42845501, 76348701, 76348702, 82938301, 10885801 = 8名
  82除く: 7名 = 82から見て7段目

  bonusCSVでは10885801がd=6？ではなくd=7？
  いや待って: 82を「d=0」ならその直接ACT子が「d=1」
  → 95446801(d=1), 64150101(d=2), 42845501(d=3), 76348701(d=4), 76348702(d=5), 82938301(d=6), [非ACTスキップ], 10885801(d=7)
  → 10885801はd=7 → その子は全部d=8 → 14578101はd=8 ✗

  でもbonusCSVでは14578101がd=7!
  → 10885801がd=7 → 14578101がd=7? 同じdepth?
  これは「非ACT透過」のルールでは不可能...

  もしかして: bonusCSVでは10885801が「計算対象外」扱いで、
  10885801の直接子14578101が「10885801の上位ACTのdepth+1」になる?
  = 10885801がFA(forceActive)じゃないのにd=7でACTカウントされつつ、
    子を探索するときはd+1=8でなくd=7のまま?

  まさかの仮説: 非ACT透過 + ACTでもdepth+1しない（常に透過）+ ACT会員の「段」は
  「自身のupline方向のACT先祖数」で決まる?

  もしくは全く異なるアプローチ:
  bonusCSVのdepthは「uplineツリーではなくreferrerツリーベース」？

  referrerIdが違う場合:
    10885801のreferrerId != 51556601
    もし10885801のreferrerId = 82938301(直接) や 10885802(WD) だとしたら?

  実際にreferrerIdを確認する必要がある
"""
import os, sys, math
from collections import defaultdict, deque

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
    upline_parent   = {}
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
            upline_parent[m['id']] = m['upline_id']
        if m['referrer_id']:
            referrer_children[m['referrer_id']].append(m['id'])

    cur.close(); conn.close()

    m82 = members_by_code['82179501']
    m82_id = m82['id']

    print("=" * 80)
    print("【uplineId vs referrerId】不足7名の先祖両ツリーを確認")
    print("=" * 80)

    MISSING_82 = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']
    key_members = ['10885801', '10885802', '57251401', '14578101', '51556601', '82938301', '68673601', '68673602', '68673603', '48743401']

    print(f"\n  {'会員':12s} {'upline親':12s} {'referrer':12s} {'upline=ref?'}")
    for mc in key_members:
        m = members_by_code.get(mc)
        if not m: continue
        up_id = m['upline_id']
        ref_id = m['referrer_id']
        up_m   = members_by_id.get(up_id)
        ref_m  = members_by_id.get(ref_id)
        up_mc  = up_m['member_code'] if up_m else 'ROOT'
        ref_mc = ref_m['member_code'] if ref_m else 'ROOT'
        same   = "✅同じ" if up_id == ref_id else f"❌違う"
        print(f"  {mc:12s} {up_mc:12s} {ref_mc:12s} {same}")

    print("\n" + "=" * 80)
    print("【referrerIdベースのツリーでULB計算】")
    print("referrer_children を使ってdepth計算する")
    print("=" * 80)

    def calc_ulb_referrer(target_id, members_by_id, referrer_children, level):
        """referrerIdベースで非ACT透過ULB計算"""
        rates = UNILEVEL_RATES[level]
        total = 0
        detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

        stack = [(child_id, 1) for child_id in referrer_children.get(target_id, [])]
        while stack:
            cur_id, depth = stack.pop()
            m = members_by_id.get(cur_id)
            if not m: continue
            wd  = is_withdrawn(m['status'], m['force_active'])
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

            if wd or not act:
                for c in referrer_children.get(cur_id, []):
                    stack.append((c, depth))
            else:
                if depth <= len(rates):
                    rate = rates[depth-1]
                    b = math.floor(m['self_pt_04'] * (rate/100) * POINT_RATE)
                    total += b
                    detail[depth]['count'] += 1
                    detail[depth]['pt'] += m['self_pt_04']
                    detail[depth]['bonus'] += b
                    detail[depth]['mcs'].append(m['member_code'])
                for c in referrer_children.get(cur_id, []):
                    stack.append((c, depth+1))

        return total, dict(detail)

    EXPECTED = {
        '82179501': {'ulb': 53850, 'level': 4},
        '44504701': {'ulb': 44850, 'level': 5},
        '86820601': {'ulb': 98550, 'level': 5},
        '93713601': {'ulb': 52650, 'level': 4},
        '89248801': {'ulb': 19950, 'level': 5},
    }

    print(f"\n  referrer ツリーULB計算:")
    print(f"  {'会員':12s} {'計算値':>12s} {'期待値':>10s} {'差':>8s} {'判定'}")
    for mc, exp in EXPECTED.items():
        m = members_by_code.get(mc)
        if not m: continue
        ulb, detail = calc_ulb_referrer(m['id'], members_by_id, referrer_children, exp['level'])
        diff = ulb - exp['ulb']
        judge = "✅" if diff == 0 else f"❌({diff:+,})"
        print(f"  {mc:12s} {ulb:>12,} {exp['ulb']:>10,} {diff:>+8,} {judge}")

    print("\n" + "=" * 80)
    print("【uplineツリーで「到達したACTの段数」を計算する別実装】")
    print("仮説: depthカウントのタイミングが違う")
    print("")
    print("V1: 「ACTの子を探索するとき depth+1」")
    print("bonusCSV仮説: 「ACTに到達したとき depth+1」")
    print("")
    print("= 非ACTの下のACTを探索するとき、「直近のACT祖先+1」になる")
    print("= DFSで直近のACT祖先のdepthを追跡し、ACTに到達したら depth=last_act_depth+1")
    print("=" * 80)

    def calc_ulb_act_to_act(target_id, members_by_id, upline_children, level):
        """
        ACT-to-ACT depth計算:
        depthはACT会員に到達したときにカウントアップ
        非ACT/WDを通過しても直近のACT祖先のdepthが伝わる
        
        スタック: (cur_id, last_act_depth)
        ACTに到達: depth = last_act_depth + 1 → bonus加算 → 子は(c, depth)で追加
        非ACT/WDに到達: depth変わらず → 子は(c, last_act_depth)で追加
        """
        rates = UNILEVEL_RATES[level]
        total = 0
        detail = defaultdict(lambda: {'count':0,'pt':0,'bonus':0,'mcs':[]})

        # 初期: target自身がACT(d=0), 子を(c, 0)でスタート
        stack = [(child_id, 0) for child_id in upline_children.get(target_id, [])]
        while stack:
            cur_id, last_act_depth = stack.pop()
            m = members_by_id.get(cur_id)
            if not m: continue
            wd  = is_withdrawn(m['status'], m['force_active'])
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

            if wd or not act:
                # 非ACT/WDは透過: 直近ACT depth変わらず
                for c in upline_children.get(cur_id, []):
                    stack.append((c, last_act_depth))
            else:
                # ACTに到達: depth = last_act_depth + 1
                depth = last_act_depth + 1
                if depth <= len(rates):
                    rate = rates[depth-1]
                    b = math.floor(m['self_pt_04'] * (rate/100) * POINT_RATE)
                    total += b
                    detail[depth]['count'] += 1
                    detail[depth]['pt'] += m['self_pt_04']
                    detail[depth]['bonus'] += b
                    detail[depth]['mcs'].append(m['member_code'])
                # 子は this ACTのdepthを伝達
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth))

        return total, dict(detail)

    print(f"\n  ACT-to-ACT depth計算:")
    print(f"  {'会員':12s} {'計算値':>12s} {'期待値':>10s} {'差':>8s} {'判定'}")
    all_ok = True
    for mc, exp in EXPECTED.items():
        m = members_by_code.get(mc)
        if not m: continue
        ulb, detail = calc_ulb_act_to_act(m['id'], members_by_id, upline_children, exp['level'])
        diff = ulb - exp['ulb']
        judge = "✅" if diff == 0 else f"❌({diff:+,})"
        if diff != 0: all_ok = False
        print(f"  {mc:12s} {ulb:>12,} {exp['ulb']:>10,} {diff:>+8,} {judge}")

    if all_ok:
        print(f"\n  🎉 全5名 完全一致！ → ACT-to-ACT depth計算がbonusCSVのロジック！")
    else:
        print(f"\n  一部不一致")

    # ACT-to-ACT版の段別詳細（82）
    print(f"\n  82179501のACT-to-ACT 段別詳細:")
    m82 = members_by_code['82179501']
    ulb, detail = calc_ulb_act_to_act(m82['id'], members_by_id, upline_children, 4)
    rates = UNILEVEL_RATES[4]
    for d in sorted(detail.keys()):
        dd = detail[d]
        rate = rates[d-1] if d <= len(rates) else 0
        miss = [mc for mc in MISSING_82 if mc in dd['mcs']]
        print(f"    段{d}(rate={rate}%): {dd['count']}名, pt={dd['pt']:,} bonus={dd['bonus']:,} {('← 不足7名: '+str(miss)) if miss else ''}")

    print(f"\n    ULB合計: {ulb:,}円 vs 期待: 53,850円")

    # 14578101のACT-to-ACT depth確認
    print(f"\n  14578101のACT-to-ACT depth 確認:")
    print(f"  82(ACT,d=0) → 95446801(ACT,d=1) → 64150101(ACT,d=2) → 42845501(ACT,d=3)")
    print(f"  → 76348701(ACT,d=4) → 76348702(ACT,d=5) → 82938301(ACT,d=6)")
    print(f"  → 51556601(非ACT,last_act=6) → 10885801(ACT,d=7)")
    print(f"  → 10885802(WD,last_act=7) → 57251401(非ACT,last_act=7) → 14578101(ACT,d=8???)")
    print(f"")
    print(f"  まだdepth=8になる... ACT-to-ACTでも同じ結果?")

    print("\n✅ 完了")

if __name__ == "__main__":
    main()
