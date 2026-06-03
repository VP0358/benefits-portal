#!/usr/bin/env python3
"""
14578101がなぜdepth=8になるかを詳細に追跡する

チェーンから分かること（下→上方向）:
  14578101(ACT) upline= 57251401(非ACT) upline= 10885802(WD) upline= 10885801(ACT) upline= 51556601(非ACT) upline= 82938301(ACT) ...

82からdepthを数えると:
  82(d=0) → [ACT子たち] → ... → 82938301(ACT, d=?) → 51556601(非ACT, 透過, d=?) → 10885801(ACT, d=?)
  10885801(ACT, d=?) → 10885802(WD, 透過) → 57251401(非ACT, 透過) → 14578101(ACT, d=?)

問題: 82938301のdepthが6のはずだが、82938301に至るまでのパスが何段か?

82から82938301に至るパスを追跡:
  82 → 95446801(ACT,d=1) → 64150101(ACT,d=2) → 42845501(ACT,d=3) → 76348701(ACT,d=4) → 76348702(ACT,d=5) → 82938301(ACT,d=6)
  = 6段目

82938301(d=6)の子:
  51556601(非ACT) → 透過, d=6のまま
  51556601の子: 10885801(ACT) → d=6で到達
  10885801の子: 10885802(WD) → 透過, d=6のまま
  10885802の子: 57251401(非ACT) → 透過, d=6のまま
  57251401の子: 14578101(ACT) → d=6で到達 ← これが正しい動き!

なぜd=8になるのか?
  82938301の別のupline経路があるのではないか?
  10885801は82938301以外の親経路でもっと深い位置に到達するのでは?

チェーンでは82938301(d=6)→76348702(d=5)→76348701(d=4)→...
= 76348701が82938301の上流なのか？

待って: downツリーでは76348701→76348702→82938301が先祖の順
= 76348701がd=4、76348702がd=5、82938301がd=6
= 正しい

でも10885801のuplineは51556601で、51556601のuplineは82938301
= 82938301→51556601→10885801 (downツリー方向)

ということは82938301がd=6なら、
  51556601(非ACT)はd=6で透過
  10885801(ACT)はd=6から到達

なぜDFS結果でd=7になるの？

DFSのpathを見ると:
  95446801 → 64150101 → 42845501 → 76348701 → 76348702 → 82938301 → 51556601(透過) → 10885801 → 10885802(透過) → 57251401(透過) → 14578101
  depth progression:
  82からスタート(d=0)
  95446801(ACT,d=1)
  64150101(ACT,d=2)
  42845501(ACT,d=3)
  76348701(ACT,d=4)
  76348702(ACT,d=5)
  82938301(ACT,d=6)
  51556601(非ACT,d=6透過)
  10885801(ACT,d=6→次の子はd=7)  ← ここで10885801自身はd=6のACTとしてカウント
  10885802(WD,d=7透過)
  57251401(非ACT,d=7透過)
  14578101(ACT,d=7→カウント対象!) ← これで段7のはず!

でも実際はd=8になっている... なぜ?

パスの確認: 10885801は10885802の親ではなく子？
uplineチェーン:
  14578101 → 57251401 → 10885802 → 10885801 (upline方向)

downツリー（uplineIdの逆）:
  10885801の子: [30873401, 10885803, 10885802] ← 前回確認済み
  10885802の子: [67479101, 63636301, 57251401]
  57251401の子: [14578101, 54730301]

ということは downツリーでは:
  10885801(ACT) → 10885802(WD) → 57251401(非ACT) → 14578101(ACT)
  10885801が段7なら、10885802(透過d=7)→57251401(透過d=7)→14578101(d=7)のはず！

問題: 10885801のdepthが7ではなく8？

10885801のuplineは51556601。51556601のuplineは82938301。
82938301が段6なら、51556601(透過)はd=6、10885801(ACT)もd=6到達。
でもDFS結果ではd=7...

WAIT: DFSのpathに「10885801 → 10885802(透過) → 57251401(透過) → 14578101」と表示されており
depth=8。

10885801がdepth=7に配置されていれば、14578101はdepth=7になるはず。
でも14578101のpathは depth=8。

ということは10885801 自体がdepth=7 (ではなく7に加算されて8)?

実際の計算:
82938301(ACT,d=6)の処理: 子をd=7でキューに追加
  子は: upline_children[82938301.id] に含まれるもの
  → 51556601はupline_children[82938301.id]に含まれるか？
  → 51556601.upline_id == 82938301.id ならYES

確認が必要: 51556601のuplineIdが本当に82938301なのか
  または upline_children[82938301.id] = ?

この確認スクリプトを実行する
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
    print("【詳細追跡】82938301 → 51556601 → 10885801 の構造")
    print("=" * 80)

    check_list = ['82179501', '95446801', '64150101', '42845501', '76348701', '76348702', '82938301', '51556601', '10885801', '10885802', '57251401', '14578101']

    for mc in check_list:
        m = members_by_code.get(mc)
        if not m: continue
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        wd  = is_withdrawn(m['status'], m['force_active'])
        par_id = upline_parent.get(m['id'])
        par_m  = members_by_id.get(par_id)
        par_mc = par_m['member_code'] if par_m else "ROOT"
        children_ids = upline_children.get(m['id'], [])
        children_mc = [members_by_id[c]['member_code'] for c in children_ids if c in members_by_id]
        label = "ACT" if act else "WD" if wd else "非ACT"
        print(f"\n  {mc} [{label}] pt={m['self_pt_04']} status={m['status']}")
        print(f"    upline親: {par_mc}")
        print(f"    down子: {children_mc}")

    print("\n" + "=" * 80)
    print("【ステップ実行】82から14578101まで段階的に追跡")
    print("非ACT透過でどのように段数が決まるかを1ステップずつ確認")
    print("=" * 80)

    # 特定のパスに沿って段数を手動計算
    # path: 82 → 95446801 → 64150101 → 42845501 → 76348701 → 76348702 → 82938301 → 51556601 → 10885801 → 10885802 → 57251401 → 14578101

    path_mcs = ['82179501', '95446801', '64150101', '42845501', '76348701', '76348702', '82938301', '51556601', '10885801', '10885802', '57251401', '14578101']

    depth = 0  # 82自身はdepth=0（起点）
    prev_was_act = False
    print(f"\n  {'会員':12s} {'状態':8s} {'depth変化':15s} {'現在depth'}")
    print(f"  {'82179501':12s} {'ACT(起点)':8s} {'d=0':15s} 0")

    for i, mc in enumerate(path_mcs[1:], 1):
        m = members_by_code.get(mc)
        if not m: continue
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        wd  = is_withdrawn(m['status'], m['force_active'])
        prev_mc = path_mcs[i-1]
        prev_m  = members_by_code.get(prev_mc)
        prev_act = is_active(prev_m['status'], prev_m['self_pt_04'], prev_m['has_req_04'], prev_m['force_active'])
        prev_wd  = is_withdrawn(prev_m['status'], prev_m['force_active'])

        if prev_act:
            depth += 1
            change = f"前ACT→d+1={depth}"
        else:
            change = f"前非ACT/WD→d変化なし={depth}"

        label = "ACT" if act else "WD" if wd else "非ACT"
        print(f"  {mc:12s} {label:8s} {change:15s} {depth}")

    print(f"\n  → 14578101のdepth={depth}")
    print(f"  ← 段7(max)は7なので、{'カウント対象' if depth <= 7 else 'カウント対象外(段'+str(depth)+')'}")

    print("\n" + "=" * 80)
    print("【重要確認】10885801のdepthは何段か？")
    print("82938301(d=6)の子は51556601(非ACT)だが、")
    print("upline_children[82938301.id]に51556601が含まれているか確認")
    print("=" * 80)

    m_82938301 = members_by_code.get('82938301')
    m_51556601 = members_by_code.get('51556601')
    m_10885801 = members_by_code.get('10885801')

    if m_82938301:
        children_82938301 = upline_children.get(m_82938301['id'], [])
        children_mc = [members_by_id[c]['member_code'] for c in children_82938301 if c in members_by_id]
        print(f"\n  82938301の子: {children_mc}")

    if m_51556601:
        children_51556601 = upline_children.get(m_51556601['id'], [])
        children_mc = [members_by_id[c]['member_code'] for c in children_51556601 if c in members_by_id]
        print(f"  51556601の子: {children_mc}")

    if m_10885801:
        print(f"  10885801のupline: {members_by_id.get(upline_parent.get(m_10885801['id']),{}).get('member_code','?')}")

    # 実際にDFSで82から10885801に到達するときのdepthを確認
    print("\n  10885801に到達する全パスのdepth:")
    target_id = m_10885801['id']
    found_paths = []
    from collections import deque
    queue = deque([(child_id, 1, []) for child_id in upline_children.get(m82_id, [])])
    while queue:
        cur_id, depth, path = queue.popleft()
        if cur_id == target_id:
            m = members_by_id[cur_id]
            found_paths.append((depth, path + [m['member_code']]))
            continue
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        next_d = depth+1 if act else depth
        if next_d <= 12:
            for c in upline_children.get(cur_id, []):
                queue.append((c, next_d, path + [f"{m['member_code']}({'ACT' if act else 'trans'})d{next_d if act else depth}"]))

    found_paths.sort(key=lambda x: x[0])
    for i, (d, path) in enumerate(found_paths[:5]):
        print(f"    パス{i+1}: depth={d} via {' → '.join(path[-8:])}")

    print("\n" + "=" * 80)
    print("【仮説】82938301の子として51556601が設定されているが、")
    print("82938301自体はd=6のACTであり、その子51556601はd=7で探索される")
    print("そして51556601の子10885801もd=7で到達する（51556601は透過）")
    print("")
    print("でも上の確認から、10885801に到達するdepthは7のはず...")
    print("ということは10885801はd=7のACT、その子は全部d=8")
    print("10885802(WD,d=8透過)→57251401(非ACT,d=8透過)→14578101(ACT,d=8)")
    print("→ 14578101はd=8でカウント対象外 ← これが問題！")
    print("")
    print("bonusCSVでは14578101がd=7にカウントされている")
    print("→ bonusCSVでは10885801がd=6に配置されている")
    print("→ つまり51556601(非ACT)が透過されてd=6のまま10885801がACTでd=6到達")
    print("")
    print("つまりV1のロジックと同じ... なのに結果が違う?")
    print("")
    print("再検討: 82938301のdepthは本当に6か？")
    print("=" * 80)

    # 82から82938301へのdepth(BFS最短)
    target_id_82938301 = m_82938301['id']
    queue = deque([(child_id, 1) for child_id in upline_children.get(m82_id, [])])
    bfs_82938301 = {}
    while queue:
        cur_id, depth = queue.popleft()
        if cur_id in bfs_82938301:
            continue
        bfs_82938301[cur_id] = depth
        m = members_by_id.get(cur_id)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        next_d = depth+1 if act else depth
        for c in upline_children.get(cur_id, []):
            if c not in bfs_82938301:
                queue.append((c, next_d))

    print(f"\n  82から82938301へのBFS最短depth: {bfs_82938301.get(target_id_82938301, 'NOT FOUND')}")
    print(f"  82から10885801へのBFS最短depth: {bfs_82938301.get(m_10885801['id'], 'NOT FOUND')}")
    print(f"  82から51556601へのBFS最短depth: {bfs_82938301.get(m_51556601['id'], 'NOT FOUND')}")
    print(f"  82から14578101へのBFS最短depth: {bfs_82938301.get(members_by_code['14578101']['id'], 'NOT FOUND')}")

    print("\n" + "=" * 80)
    print("【新しい調査】82938301以外のパスで10885801に到達する可能性")
    print("10885801はどこからでも参照される?")
    print("= upline_parent[10885801.id] = 51556601 (確定)")
    print("= upline_parent[51556601.id] = 82938301 (要確認)")
    print("82938301以外の上流パスがあれば別の深度も有りうる")
    print("=" * 80)

    # 51556601のuplineを確認
    p51 = upline_parent.get(m_51556601['id'])
    p51_m = members_by_id.get(p51)
    print(f"\n  51556601のupline: {p51_m['member_code'] if p51_m else 'ROOT'}")

    # 82938301のuplineを確認
    p82938301 = upline_parent.get(m_82938301['id'])
    p82938301_m = members_by_id.get(p82938301)
    print(f"  82938301のupline: {p82938301_m['member_code'] if p82938301_m else 'ROOT'}")

    # 76348702のdowndown子リスト確認
    m_76348702 = members_by_code.get('76348702')
    if m_76348702:
        children = [members_by_id[c]['member_code'] for c in upline_children.get(m_76348702['id'], []) if c in members_by_id]
        print(f"\n  76348702の子: {children}")

    # ループ: 82938301の上流チェーン
    print(f"\n  82938301の上流チェーン (upline方向):")
    cur_id = m_82938301['id']
    depth = 0
    while cur_id:
        m = members_by_id.get(cur_id)
        if not m: break
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        wd  = is_withdrawn(m['status'], m['force_active'])
        label = "ACT" if act else "WD" if wd else "非ACT"
        print(f"    {m['member_code']} [{label}]")
        if m['id'] == m82_id:
            print(f"    ↑ = 82179501 (ROOT)")
            break
        cur_id = upline_parent.get(cur_id)
        depth += 1
        if depth > 20:
            print("    ... (超深度)")
            break

    print("\n✅ 追跡完了")

if __name__ == "__main__":
    main()
