#!/usr/bin/env python3
"""
【決定的検証】bonusCSVのdepthはACT圧縮depth

発見:
  不足7名の先祖チェーンをACT会員のみカウントすると全員が「depth=7」になる
  （82179501自身を除く先祖ACT数=7、つまり82から見て7段目）

仮説: bonusCSVはACT会員同士の距離でdepth計算
  = WDも非ACTも完全スキップ（透過）し、ACT同士の「代数的距離」でdepthを計算

  具体的には:
    14578101のchainを82から逆順に:
    82(ACT,d=0) → 95446801(ACT,d=1) → 64150101(ACT,d=2) → 42845501(ACT,d=3)
    → 76348701(ACT,d=4) → 76348702(ACT,d=5) → 82938301(ACT,d=6)
    → [51556601非ACT,スキップ] → [10885802WD,スキップ] → 10885801(ACT,d=7)
    → [57251401非ACT,スキップ] → 14578101(ACT,d=8???)

  あれ、14578101のACT count=8ということはdepth=8?
  でも期待では段7...

  再計算: 82を「0」とすると、82の次のACTが「1段」
  82からACT 7段目 = ACT ancestor数は7 (82含まない)
  さっきの出力では「チェーン内ACT先祖数（82を含む）: 8」= 82含む
  つまり82を除くと7段目 → ✅ 正解！

  V1の現行ロジック（非ACT透過）でこれらが段8になる理由:
    V1では depth は「非ACT/WD含む全会員をスキップ後の段数」
    14578101の場合:
      82の子: 95446801(ACT,d=1), 64150101(ACT,d=2), ...
      10885801(ACT,d=7)の子: 57251401(非ACT,透過→d=7維持), そこから10885802(WD,透過→d=7維持)
      ... でも10885801の子に直接57251401が来るなら、57251401はd=7のまま
      次: 10885802(WD)はd=7透過、その子57251401もd=7(実はWDの子なので...)

  要するに: V1では非ACT/WDの連鎖後のACTはdepth=7(変わらず透過)になるが
    連鎖の間にACTが挟まるとそこでdepth+1消費されてしまう

    14578101のchain逆順（82→14578101方向）:
    82(d=0) → 95446801(ACT→d=1の子探索) → ... → 10885801(ACT,d=7の子探索)
    10885801の子: 57251401(非ACT,d=7透過) → 10885802(WD,d=7透過) → 14578101(ACT,d=7+...?)

    待って。57251401 → 10885802 → ... の方向はupline方向じゃなくてdown方向
    先祖チェーンは 14578101 → 57251401 → 10885802 → 10885801 (upline方向)
    なのでdownツリーは: 10885801が親、その子が10885802か57251401か?

  ここで重要な疑問: 10885801の子は10885802とそれ以外?
  chainでは 14578101→57251401→10885802→10885801(ACT) の順
  = upline方向なので: 14578101のupline=57251401, 57251401のupline=10885802, 10885802のupline=10885801

  つまりdownツリーでは:
  10885801の子: [10885802, ...]
  10885802の子: [57251401, ...]
  57251401の子: [14578101, ...]

  V1の非ACT透過ロジック（下降方向でdepth計算）:
    10885801が段7(depth=7)に配置される
    その子10885802はWD → 透過(depth=7のまま)
    10885802の子57251401は非ACT → 透過(depth=7のまま)
    57251401の子14578101はACT → depth=7でカウント ← これが正しい！

  あれ？これで段7になるはず...なのに前の調査では段8になっていた？

  もしかして前セッションの調査で誤りがあったのか？
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
MISSING_82 = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']

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

    cur.close(); conn.close()

    m82 = members_by_code['82179501']
    m82_id = m82['id']

    print("=" * 80)
    print("【決定的調査】14578101のdownツリー構造を確認")
    print("10885801 → 10885802 → 57251401 → 14578101 の直接downチェーンを確認")
    print("=" * 80)

    check_chain = ['10885801', '10885802', '57251401', '14578101']
    for mc in check_chain:
        m = members_by_code.get(mc)
        if not m:
            print(f"  {mc}: NOT FOUND")
            continue
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        wd  = is_withdrawn(m['status'], m['force_active'])
        par_id = upline_parent.get(m['id'])
        par_m = members_by_id.get(par_id)
        par_mc = par_m['member_code'] if par_m else "ROOT"
        children_mc = [members_by_id[c]['member_code'] for c in upline_children.get(m['id'], []) if c in members_by_id]
        print(f"\n  {mc}: {'ACT' if act else 'WD' if wd else '非ACT'} pt={m['self_pt_04']} status={m['status']}")
        print(f"    upline(親): {par_mc}")
        print(f"    下流(子): {children_mc[:10]}")

    print("\n" + "=" * 80)
    print("【14578101の実際のdepthをDFS追跡】")
    print("82179501を起点に非ACT透過でDFSして14578101に何段目で到達するか")
    print("=" * 80)

    # DFSで14578101に到達したときのdepthを記録
    target_mc = '14578101'
    target_m = members_by_code.get(target_mc)
    target_id = target_m['id']

    found_depths = []

    # 非ACT透過DFS (depth制限なし)
    stack = [(child_id, 1, []) for child_id in upline_children.get(m82_id, [])]
    while stack:
        cur_id, depth, path = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue

        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if cur_id == target_id:
            found_depths.append({'depth': depth, 'path': path + [m['member_code']]})
            # 見つかったので続けない
            continue

        if wd or not act:
            # 透過（depth変わらず）
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth, path + [m['member_code'] + '(透過)']))
        else:
            # ACT (depth+1)
            if depth < 15:  # 無限ループ防止
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth+1, path + [m['member_code']]))

    if found_depths:
        for info in found_depths[:5]:
            print(f"\n  {target_mc}に到達 depth={info['depth']}")
            print(f"  path: {' → '.join(info['path'][-15:])}")
    else:
        print(f"  {target_mc}に到達できなかった")

    print("\n" + "=" * 80)
    print("【非ACT透過DFSでの段別配置（depth=7,8付近）を表示】")
    print("82179501視点での段7,8のACT会員を全て表示")
    print("=" * 80)

    depth_members = defaultdict(list)
    stack = [(child_id, 1) for child_id in upline_children.get(m82_id, [])]
    visited = {}  # id -> first_seen_depth (最初に到達したdepthを記録)

    while stack:
        cur_id, depth = stack.pop()
        if cur_id in visited and visited[cur_id] <= depth:
            continue  # すでに小さいdepthで訪問済みならスキップ
        visited[cur_id] = depth

        m = members_by_id.get(cur_id)
        if not m: continue

        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            for c in upline_children.get(cur_id, []):
                if c not in visited or visited[c] > depth:
                    stack.append((c, depth))
        else:
            depth_members[depth].append(m['member_code'])
            if depth < 15:
                for c in upline_children.get(cur_id, []):
                    if c not in visited or visited[c] > depth+1:
                        stack.append((c, depth+1))

    for d in range(1, 12):
        mcs = depth_members.get(d, [])
        missing_found = [mc for mc in MISSING_82 if mc in mcs]
        print(f"  段{d}: {len(mcs)}名 {('← ' + str(missing_found) + ' ✅') if missing_found else ''}")

    # 不足7名のdepth確認
    print(f"\n  不足7名のdepth:")
    for mc in MISSING_82:
        found_d = None
        for d, mcs in depth_members.items():
            if mc in mcs:
                found_d = d
                break
        print(f"    {mc}: depth={found_d}")

    # ===== visited方式の問題: DFSでは最初に到達したパスでdepthが決まるが
    #       最短経路（最小depth）が正しいとは限らない
    # ===== BFSで最小depthを計算すれば確実

    print("\n" + "=" * 80)
    print("【BFS（幅優先探索）で最小depthを計算】")
    print("非ACT透過BFS: 各会員に到達する最小depthを確定")
    print("=" * 80)

    from collections import deque

    # BFS版: 各ノードへの最小depth
    min_depth = {}
    # BFSキュー: (id, depth)
    # ただし非ACTは透過するので「同じdepthで複数パス」を扱う必要がある
    # → 最小depthを追跡

    # アルゴリズム:
    # 1. 82の子を depth=1 でキューに追加
    # 2. キューから取り出し:
    #    a. すでにより小さいdepthで訪問済みならスキップ
    #    b. ACT → depth_members[depth]に追加、子をdepth+1でキュー
    #    c. 非ACT/WD → 子を同じdepthでキュー

    queue = deque()
    for child_id in upline_children.get(m82_id, []):
        queue.append((child_id, 1))

    bfs_depth = {}  # id -> min_depth (最小到達depth)

    while queue:
        cur_id, depth = queue.popleft()
        if cur_id in bfs_depth and bfs_depth[cur_id] <= depth:
            continue  # すでに小さいdepthで訪問済み
        bfs_depth[cur_id] = depth

        m = members_by_id.get(cur_id)
        if not m: continue

        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            for c in upline_children.get(cur_id, []):
                next_d = depth
                if c not in bfs_depth or bfs_depth[c] > next_d:
                    queue.append((c, next_d))
        else:
            for c in upline_children.get(cur_id, []):
                next_d = depth + 1
                if c not in bfs_depth or bfs_depth[c] > next_d:
                    queue.append((c, next_d))

    # BFSでのdepth分布
    bfs_depth_members = defaultdict(list)
    for cid, d in bfs_depth.items():
        m = members_by_id.get(cid)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if act:
            bfs_depth_members[d].append(m['member_code'])

    print(f"  BFS段別ACT分布:")
    total_ulb_bfs = 0
    rates = UNILEVEL_RATES[4]  # 82はLV4
    for d in range(1, 12):
        mcs = bfs_depth_members.get(d, [])
        missing_found = [mc for mc in MISSING_82 if mc in mcs]
        rate = rates[d-1] if d <= len(rates) else 0
        pt = sum(members_by_code[mc]['self_pt_04'] for mc in mcs if mc in members_by_code)
        bonus = math.floor(pt * (rate/100) * POINT_RATE) if d <= len(rates) else 0
        if d <= len(rates):
            total_ulb_bfs += bonus
        marker = f"← {missing_found} ✅" if missing_found else ""
        print(f"    段{d}(rate={rate}%): {len(mcs)}名 pt={pt:,} bonus={bonus:,} {marker}")

    print(f"\n  BFS ULB合計: {total_ulb_bfs:,}円 vs 期待: 53,850円 (差={total_ulb_bfs-53850:+,})")

    # 不足7名のBFS depth
    print(f"\n  不足7名のBFS depth:")
    for mc in MISSING_82:
        m = members_by_code.get(mc)
        if m:
            d = bfs_depth.get(m['id'], 'NOT FOUND')
            print(f"    {mc}: BFS depth={d}")

    # 44504701のBFS計算
    print("\n" + "=" * 80)
    print("【44504701のBFS計算】")
    print("=" * 80)

    m44 = members_by_code.get('44504701')
    m44_id = m44['id']

    queue44 = deque()
    for child_id in upline_children.get(m44_id, []):
        queue44.append((child_id, 1))

    bfs_depth_44 = {}

    while queue44:
        cur_id, depth = queue44.popleft()
        if cur_id in bfs_depth_44 and bfs_depth_44[cur_id] <= depth:
            continue
        bfs_depth_44[cur_id] = depth

        m = members_by_id.get(cur_id)
        if not m: continue

        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

        if wd or not act:
            for c in upline_children.get(cur_id, []):
                next_d = depth
                if c not in bfs_depth_44 or bfs_depth_44[c] > next_d:
                    queue44.append((c, next_d))
        else:
            for c in upline_children.get(cur_id, []):
                next_d = depth + 1
                if c not in bfs_depth_44 or bfs_depth_44[c] > next_d:
                    queue44.append((c, next_d))

    bfs_depth_members_44 = defaultdict(list)
    for cid, d in bfs_depth_44.items():
        m = members_by_id.get(cid)
        if not m: continue
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        if act:
            bfs_depth_members_44[d].append(m['member_code'])

    total_ulb_bfs_44 = 0
    rates_lv5 = UNILEVEL_RATES[5]
    for d in range(1, 12):
        mcs = bfs_depth_members_44.get(d, [])
        rate = rates_lv5[d-1] if d <= len(rates_lv5) else 0
        pt = sum(members_by_code[mc]['self_pt_04'] for mc in mcs if mc in members_by_code)
        bonus = math.floor(pt * (rate/100) * POINT_RATE) if d <= len(rates_lv5) else 0
        if d <= len(rates_lv5):
            total_ulb_bfs_44 += bonus
        if mcs:
            print(f"    段{d}(rate={rate}%): {len(mcs)}名 pt={pt:,} bonus={bonus:,}")

    print(f"\n  BFS ULB 44504701: {total_ulb_bfs_44:,}円 vs 期待: 44,850円 (差={total_ulb_bfs_44-44850:+,})")

    # 全5名でBFS計算
    print("\n" + "=" * 80)
    print("【全5名のBFS ULB計算】")
    print("=" * 80)

    EXPECTED = {
        '82179501': {'ulb': 53850, 'level': 4},
        '44504701': {'ulb': 44850, 'level': 5},
        '86820601': {'ulb': 98550, 'level': 5},
        '93713601': {'ulb': 52650, 'level': 4},
        '89248801': {'ulb': 19950, 'level': 5},
    }

    def calc_ulb_bfs(target_id, members_by_id, upline_children, level):
        rates = UNILEVEL_RATES[level]
        queue = deque()
        for child_id in upline_children.get(target_id, []):
            queue.append((child_id, 1))

        bfs_depth = {}

        while queue:
            cur_id, depth = queue.popleft()
            if cur_id in bfs_depth and bfs_depth[cur_id] <= depth:
                continue
            bfs_depth[cur_id] = depth

            m = members_by_id.get(cur_id)
            if not m: continue

            wd  = is_withdrawn(m['status'], m['force_active'])
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])

            if wd or not act:
                for c in upline_children.get(cur_id, []):
                    next_d = depth
                    if c not in bfs_depth or bfs_depth[c] > next_d:
                        queue.append((c, next_d))
            else:
                for c in upline_children.get(cur_id, []):
                    next_d = depth + 1
                    if c not in bfs_depth or bfs_depth[c] > next_d:
                        queue.append((c, next_d))

        total = 0
        for cid, d in bfs_depth.items():
            if d > len(rates):
                continue
            m = members_by_id.get(cid)
            if not m: continue
            act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
            if act:
                rate = rates[d-1]
                b = math.floor(m['self_pt_04'] * (rate/100) * POINT_RATE)
                total += b

        return total

    print(f"  {'会員':12s} {'BFS計算値':>12s} {'期待値':>10s} {'差':>8s} {'判定'}")
    all_ok = True
    for mc, exp in EXPECTED.items():
        m = members_by_code.get(mc)
        if not m: continue
        ulb = calc_ulb_bfs(m['id'], members_by_id, upline_children, exp['level'])
        diff = ulb - exp['ulb']
        judge = "✅" if diff == 0 else f"❌({diff:+,})"
        if diff != 0:
            all_ok = False
        print(f"  {mc:12s} {ulb:>12,} {exp['ulb']:>10,} {diff:>+8,} {judge}")

    if all_ok:
        print(f"\n  🎉 全5名 BFS計算値 = 期待値 完全一致！")
        print(f"  → BFS（幅優先探索）= bonusCSVのdepth計算ロジック")
    else:
        print(f"\n  ⚠️ 一部不一致あり")

    print("\n✅ 検証完了")

if __name__ == "__main__":
    main()
