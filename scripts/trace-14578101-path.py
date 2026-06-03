#!/usr/bin/env python3
"""
trace-14578101-path.py
========================
14578101の具体的なdepth計算追跡。
82のtargetから14578101までの全経路を追跡する。

前の分析から：
  14578101(d8) ← 82938301(d7,ACT) → 51556601(d-,NA) → 10885801(d8,ACT) → 10885802(d-,WD) → 57251401(d-,NA)

この経路を正確に追跡する：
  82179501 → ... → 82938301(d7) → 51556601(NA) → 10885801(d8?) → 10885802(WD) → 57251401(NA) → 14578101(d?)

問い: 14578101 のdepthは実際何か？
"""

import os, sys, csv, math
import psycopg2, psycopg2.extras
from collections import defaultdict

DATABASE_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
BONUS_MONTH  = "2026-04"
POINT_RATE   = 100
UNILEVEL_RATES = {
    4: [15, 9, 6, 5, 3, 2, 1],
    5: [15, 10, 7, 6, 4, 3, 2],
}

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
             AND p.order_id IS NOT NULL
            THEN p."totalPoints" ELSE 0 END), 0)::int AS self_pt_04,
        BOOL_OR(p."purchaseMonth" = %s
            AND p."productCode" IN ('1000','2000')
            AND p.order_id IS NOT NULL) AS has_req_04
    FROM "mlm_members" m
    LEFT JOIN "mlm_purchases" p ON p."mlmMemberId" = m.id
    GROUP BY m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
             m."uplineId", m."referrerId"
""", (BONUS_MONTH, BONUS_MONTH))
rows = cur.fetchall()
cur.close(); conn.close()

members_by_id   = {}
members_by_code = {}
upline_children = defaultdict(list)

for r in rows:
    m = {
        'id':           r['id'],
        'member_code':  r['memberCode'],
        'status':       r['status'],
        'force_active': bool(r['forceActive']),
        'upline_id':    r['uplineId'],
        'referrer_id':  r['referrerId'],
        'self_pt_04':   int(r['self_pt_04'] or 0),
        'has_req_04':   bool(r['has_req_04']),
    }
    members_by_id[m['id']]           = m
    members_by_code[m['member_code']] = m
    if m['upline_id']:
        upline_children[m['upline_id']].append(m['id'])

def is_withdrawn(status, fa):
    if fa: return False
    return status in ('withdrawn', 'lapsed')

def is_active(status, self_pt, has_req, fa):
    if fa: return True
    if status in ('withdrawn', 'lapsed'): return False
    return self_pt > 0 and has_req

# ── 追跡対象会員のupline chainを逆向きに確認 ──────────
print("=" * 70)
print("【特定会員のupline chain追跡】")
print("=" * 70)

trace_members = ['14578101', '32647101', '10885801', '82938301', '51556601', '10885802', '57251401', '48344003', '78108601', '32647101']

for mc in trace_members:
    m = members_by_code.get(mc)
    if not m:
        print(f"  {mc}: NOT FOUND")
        continue
    wd  = is_withdrawn(m['status'], m['force_active'])
    act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
    status_str = 'ACT' if act else ('WD' if wd else 'NA')
    children_ids = upline_children.get(m['id'], [])
    children_mcs = [members_by_id.get(c, {}).get('member_code', '?') for c in children_ids]
    print(f"  {mc}: status={m['status']}, fa={m['force_active']}, pt={m['self_pt_04']}, "
          f"req={m['has_req_04']}, [{status_str}]")
    print(f"    uplineId→{members_by_code.get(members_by_id.get(m['upline_id'],{}).get('member_code','?'),{}).get('member_code','?') if m['upline_id'] else 'None'}")
    print(f"    children: {children_mcs}")

# ── 単一会員への経路を手動追跡 ───────────────────────────
print("\n" + "=" * 70)
print("【手動経路追跡】82179501 → 14578101 への経路")
print("=" * 70)

# uplineチェーンを辿る
target_mc = '14578101'
target_m = members_by_code.get(target_mc)
if target_m:
    chain = [target_mc]
    cur_id = target_m['id']
    for _ in range(20):
        m = members_by_id.get(cur_id)
        if not m: break
        up_id = m.get('upline_id')
        if not up_id: break
        up_m = members_by_id.get(up_id)
        if not up_m: break
        chain.append(up_m['member_code'])
        if up_m['member_code'] == '82179501':
            break
        cur_id = up_id
    
    chain.reverse()
    print(f"\n  経路: {' → '.join(chain)}")
    
    print("\n  各会員の詳細:")
    for mc in chain:
        m = members_by_code.get(mc)
        if not m: continue
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        status_str = 'ACT' if act else ('WD' if wd else 'NA')
        print(f"  {mc}: [{status_str}] status={m['status']}, fa={m['force_active']}, pt={m['self_pt_04']}")

# ── BFS でdepthを正確に計算 ──────────────────────────────
print("\n" + "=" * 70)
print("【BFSによる正確なdepth計算】82179501からの非ACT透過BFS")
print("=" * 70)

m0 = members_by_code.get('82179501')
rates = UNILEVEL_RATES[4]

# BFS: キューで処理（DFSとの違いを確認）
from collections import deque

# BFS版
bfs_depth_map = {}  # id → assigned ACT depth
bfs_all_node  = {}  # id → (act_depth_assigned, actual_depth)

queue = deque([(cid, 1) for cid in upline_children.get(m0['id'], [])])
visited_for_depth = {}  # 同じノードを複数経路から訪れた場合の最小深度

while queue:
    cur_id, depth = queue.popleft()
    
    # 既に処理済みの場合は深い方を無視
    if cur_id in visited_for_depth:
        if visited_for_depth[cur_id] <= depth:
            continue
    visited_for_depth[cur_id] = depth
    
    m = members_by_id.get(cur_id)
    if not m: continue
    
    wd  = is_withdrawn(m['status'], m['force_active'])
    act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
    
    if wd or not act:
        for c in upline_children.get(cur_id, []):
            queue.append((c, depth))
    else:
        bfs_depth_map[cur_id] = depth
        for c in upline_children.get(cur_id, []):
            queue.append((c, depth + 1))

bfs_d7 = [(mid, d) for mid, d in bfs_depth_map.items() if d == 7]
bfs_d8 = [(mid, d) for mid, d in bfs_depth_map.items() if d == 8]

print(f"\n  BFS結果: 段7={len(bfs_d7)}名, 段8={len(bfs_d8)}名")

# DFS版との比較
dfs_depth_map = {}
stack = [(cid, 1) for cid in upline_children.get(m0['id'], [])]
while stack:
    cur_id, depth = stack.pop()
    m = members_by_id.get(cur_id)
    if not m: continue
    wd  = is_withdrawn(m['status'], m['force_active'])
    act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
    if wd or not act:
        for c in upline_children.get(cur_id, []): stack.append((c, depth))
    else:
        dfs_depth_map[cur_id] = depth
        for c in upline_children.get(cur_id, []): stack.append((c, depth+1))

dfs_d7 = [(mid, d) for mid, d in dfs_depth_map.items() if d == 7]
dfs_d8 = [(mid, d) for mid, d in dfs_depth_map.items() if d == 8]

print(f"\n  DFS結果: 段7={len(dfs_d7)}名, 段8={len(dfs_d8)}名")

# 差分
bfs_set_d7 = set(mid for mid, _ in bfs_d7)
dfs_set_d7 = set(mid for mid, _ in dfs_d7)
print(f"\n  BFSにあってDFSにない段7: {[members_by_id[mid]['member_code'] for mid in bfs_set_d7 - dfs_set_d7]}")
print(f"  DFSにあってBFSにない段7: {[members_by_id[mid]['member_code'] for mid in dfs_set_d7 - bfs_set_d7]}")

# 14578101のdepth
t14 = members_by_code.get('14578101', {}).get('id')
if t14:
    print(f"\n  14578101 BFS depth={bfs_depth_map.get(t14, 'not found')}")
    print(f"  14578101 DFS depth={dfs_depth_map.get(t14, 'not found')}")

# ── 14578101 の正確なBFS経路（複数経路があるか確認） ────
print("\n" + "=" * 70)
print("【14578101への全経路確認】（ツリー構造なので複数経路はないはず）")
print("=" * 70)

target_mc = '14578101'
target_m = members_by_code.get(target_mc)
if target_m:
    target_id = target_m['id']
    
    # uplineを辿って82179501まで
    print(f"\n  upline chain（下から上）:")
    cur_id = target_id
    actual_depth = 0
    act_depth = 0
    last_act_depth = 0
    
    chain_details = []
    while True:
        m = members_by_id.get(cur_id)
        if not m: break
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        chain_details.append({
            'mc': m['member_code'],
            'act': act, 'wd': wd, 'fa': m['force_active'],
            'pt': m['self_pt_04'],
        })
        if m['member_code'] == '82179501': break
        up_id = m.get('upline_id')
        if not up_id: break
        cur_id = up_id
    
    chain_details.reverse()
    
    # 非ACT透過ロジックでdepthを計算
    print(f"\n  経路（上→下）と非ACT透過でのdepth計算:")
    current_depth = 0  # 始点は82179501のdepth=0
    for detail in chain_details:
        if detail['mc'] == '82179501':
            current_depth = 0
            print(f"  start: {detail['mc']} [{'ACT' if detail['act'] else 'WD' if detail['wd'] else 'NA'}] depth={current_depth}")
        else:
            if detail['act']:
                current_depth += 1
                print(f"  → ACT:  {detail['mc']} pt={detail['pt']} → depth消費: depth={current_depth}")
            elif detail['wd']:
                print(f"  → WD:   {detail['mc']} → 透過: depth={current_depth}(変わらず)")
            else:
                print(f"  → NA:   {detail['mc']} → 透過: depth={current_depth}(変わらず)")
    
    print(f"\n  最終depth={current_depth}")
    print(f"  BFS計算depth={bfs_depth_map.get(target_id, '?')}")
    print(f"  DFS計算depth={dfs_depth_map.get(target_id, '?')}")

# ── 82の7名全員を同様に追跡 ─────────────────────────────
print("\n" + "=" * 70)
print("【82の7名の正確なdepth計算（upline chain）】")
print("=" * 70)

prev_7 = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']
rates82 = UNILEVEL_RATES[4]

for mc_target in prev_7:
    m_t = members_by_code.get(mc_target)
    if not m_t: continue
    
    chain_details = []
    cur_id = m_t['id']
    while True:
        m = members_by_id.get(cur_id)
        if not m: break
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        chain_details.append({'mc': m['member_code'], 'act': act, 'wd': wd, 'pt': m['self_pt_04']})
        if m['member_code'] == '82179501': break
        up_id = m.get('upline_id')
        if not up_id: break
        cur_id = up_id
    
    chain_details.reverse()
    
    # ACT段数をカウント（82179501を含まない）
    act_count = sum(1 for d in chain_details if d['act'] and d['mc'] != '82179501')
    
    chain_str = " → ".join([
        f"{d['mc']}({'ACT' if d['act'] else 'WD' if d['wd'] else 'NA'})"
        for d in chain_details
    ])
    
    bfs_d = bfs_depth_map.get(m_t['id'], '?')
    dfs_d = dfs_depth_map.get(m_t['id'], '?')
    
    print(f"\n  {mc_target}: ACT段数={act_count}, BFS_d={bfs_d}, DFS_d={dfs_d}")
    print(f"  経路: {chain_str}")
    if act_count == 7:
        bonus = math.floor(m_t['self_pt_04'] * (rates82[6]/100) * POINT_RATE)
        print(f"  ✅ ACT段数=7 → 段7のボーナス対象！bonus={bonus}円")
    elif act_count == 8:
        print(f"  ❌ ACT段数=8 → 段8 → 対象外")

# ── 44の対象1名（段7に来るべき会員）を特定 ─────────────
print("\n" + "=" * 70)
print("【44の差異の根本特定】段7に来るべき1名を特定する")
print("各段8ACT会員のACT段数をカウントして段7=7のものを探す")
print("=" * 70)

m0_44 = members_by_code.get('44504701')
rates44 = UNILEVEL_RATES[5]

# 44の全ACT段数マップ（upline chain上のACT会員数）
def count_act_in_chain(member_id, root_id):
    """root_idからmember_idまでのupline chainのACT会員数"""
    chain = []
    cur_id = member_id
    while True:
        m = members_by_id.get(cur_id)
        if not m: break
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        chain.append({'id': cur_id, 'act': act, 'wd': wd, 'mc': m['member_code']})
        if cur_id == root_id: break
        up_id = m.get('upline_id')
        if not up_id: break
        cur_id = up_id
    
    chain.reverse()
    # root_idを除いてACT会員数をカウント
    act_count = sum(1 for d in chain if d['act'] and d['id'] != root_id)
    return act_count, chain

# 44の段8 ACT会員のACT段数を全員確認
act_map_44_v = {}
stack = [(cid, 1) for cid in upline_children.get(m0_44['id'], [])]
while stack:
    cur_id, depth = stack.pop()
    m = members_by_id.get(cur_id)
    if not m: continue
    wd  = is_withdrawn(m['status'], m['force_active'])
    act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
    if wd or not act:
        for c in upline_children.get(cur_id, []): stack.append((c, depth))
    else:
        act_map_44_v[cur_id] = depth
        for c in upline_children.get(cur_id, []): stack.append((c, depth+1))

d8_44_v = [(mid, d) for mid, d in act_map_44_v.items() if d == 8]
print(f"\n44の段8 ACT会員: {len(d8_44_v)}名")
print(f"\n各会員のACT段数（upline chain上のACT会員数）:")

for mid, depth in sorted(d8_44_v, key=lambda x: members_by_id[x[0]]['member_code']):
    m = members_by_id[mid]
    act_c, chain = count_act_in_chain(mid, m0_44['id'])
    bonus_if_d7 = math.floor(m['self_pt_04'] * (rates44[6]/100) * POINT_RATE)
    chain_str = " → ".join([f"{d['mc']}({'A' if d['act'] else 'W' if d['wd'] else 'N'})" for d in chain])
    marker = "✅" if act_c == 7 else ("  ")
    print(f"  {marker}{m['member_code']}: BFS_d={depth}, chain_ACT={act_c}  {chain_str}")
