#!/usr/bin/env python3
"""
identify-missing-7members.py
==============================
82の差異（grp_pt差=900pt=6名、ULB差=1050円=7名相当）の完全解明。
- 段8+のACT会員の中から「bonusCSVで段7以内として計算されているべき7名」を特定
- pt=0のFA会員の存在確認
- 実際の深度割り当てロジックの違いを特定

新ロジック(非ACT透過)での段1-7 ACT = 149名, pt=21,900, ULB=52,800
bonusCSV:                       grp_act=206名, grp_pt=22,800, ULB=53,850

差: ULB+1050円、grp_pt+900pt（6名×150pt）
謎: ULBは7名相当(1050円@1%)、grp_ptは6名相当(900pt)
→ 1名はpt=0のFA会員（pt=0なのでgrp_ptに影響しないがACT数と段カウントはされる）
"""

import os, sys, csv, math
import psycopg2, psycopg2.extras
from collections import defaultdict

DATABASE_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
BONUS_CSV    = "/home/user/uploaded_files/bonus_list_full.csv"
BONUS_MONTH  = "2026-04"
POINT_RATE   = 100
UNILEVEL_RATES = {
    4: [15,  9,  6,  5,  3,  2,  1],
    5: [15, 10,  7,  6,  4,  3,  2],
}

conn = psycopg2.connect(DATABASE_URL)
conn.set_client_encoding("UTF8")
cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT
        m.id, m."memberCode", m.status, m."forceActive", m."forceLevel",
        m."uplineId", m."referrerId", m."titleLevel", m."currentLevel",
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
             m."uplineId", m."referrerId", m."titleLevel", m."currentLevel"
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
        'force_level':  r['forceLevel'],
        'title_level':  r['titleLevel'],
        'current_level':r['currentLevel'],
        'upline_id':    r['uplineId'],
        'referrer_id':  r['referrerId'],
        'self_pt_04':   int(r['self_pt_04'] or 0),
        'has_req_04':   bool(r['has_req_04']),
    }
    members_by_id[m['id']]           = m
    members_by_code[m['member_code']] = m
    if m['upline_id']:
        upline_children[m['upline_id']].append(m['id'])

bonus_data = {}
with open(BONUS_CSV, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        mid = row['会員番号'].strip()
        bonus_data[mid] = {
            'ulb':      int(row['ユニレベルB'].replace(',','') or 0),
            'grp_pt':   int(row['グループpt'].replace(',','') or 0),
            'grp_act':  int(row['グループACT'].replace(',','') or 0),
            'self_pt':  int(row['自己購入pt'].replace(',','') or 0),
            'active':   row['ｱｸﾃｨﾌﾞ'].strip(),
        }

def is_withdrawn(status, fa):
    if fa: return False
    return status in ('withdrawn', 'lapsed')

def is_active(status, self_pt, has_req, fa):
    if fa: return True
    if status in ('withdrawn', 'lapsed'): return False
    return self_pt > 0 and has_req

def ulb_bonus(pt, rate):
    return math.floor(pt * (rate / 100) * POINT_RATE)

# ── 全深度ACT会員の深度マップ（非ACT透過） ──────────────
def get_all_act_depth_map(target_code, level):
    m0 = members_by_code.get(target_code)
    if not m0: return {}
    rates = UNILEVEL_RATES.get(level, UNILEVEL_RATES[4])
    
    act_map = {}  # id → depth
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
            act_map[cur_id] = depth
            for c in upline_children.get(cur_id, []): stack.append((c, depth + 1))
    return act_map

# ══════════════════════════════════════════════════════════
print("=" * 70)
print("【核心調査】82/44の段8+ACT会員のupline chainを追跡")
print("それぞれが「どのACT会員を経由して段8+になったか」を確認")
print("=" * 70)

def get_upline_chain(mid, act_map_82, act_map_44):
    """指定IDから上へ、uplineIDを辿ってACT会員を見つける"""
    chain = []
    m = members_by_id.get(mid)
    if not m: return chain
    
    cur = m
    for _ in range(20):  # 最大20段
        up_id = cur.get('upline_id')
        if not up_id: break
        up_m = members_by_id.get(up_id)
        if not up_m: break
        wd  = is_withdrawn(up_m['status'], up_m['force_active'])
        act = is_active(up_m['status'], up_m['self_pt_04'], up_m['has_req_04'], up_m['force_active'])
        d82 = act_map_82.get(up_id, '-')
        d44 = act_map_44.get(up_id, '-')
        chain.append({
            'mc': up_m['member_code'],
            'act': act, 'wd': wd, 'fa': up_m['force_active'],
            'pt': up_m['self_pt_04'],
            'depth_82': d82,
            'depth_44': d44,
        })
        cur = up_m
    return chain

act_map_82 = get_all_act_depth_map("82179501", 4)
act_map_44 = get_all_act_depth_map("44504701", 5)

d8plus_82 = {mid: d for mid, d in act_map_82.items() if d > 7}
d8plus_44 = {mid: d for mid, d in act_map_44.items() if d > 7}

print(f"\n82の段8+: {len(d8plus_82)}名, 44の段8+: {len(d8plus_44)}名")

# ── pt=0のFA会員を探す（全ACT会員の中で） ─────────────
print("\n" + "=" * 70)
print("【重要】全ACT会員の中でpt=0の会員を探す（FA=Trueで自己pt=0）")
print("=" * 70)

fa_zero_pt_in_act = []
for mid, depth in act_map_82.items():
    m = members_by_id[mid]
    if m['self_pt_04'] == 0 and m['force_active']:
        fa_zero_pt_in_act.append((mid, depth, m['member_code']))

print(f"\n82のACT会員でpt=0（FA会員）: {len(fa_zero_pt_in_act)}名")
for mid, depth, mc in sorted(fa_zero_pt_in_act, key=lambda x: x[1]):
    print(f"  {mc}: depth={depth}, fa=True, pt=0")

fa_zero_pt_in_act_44 = []
for mid, depth in act_map_44.items():
    m = members_by_id[mid]
    if m['self_pt_04'] == 0 and m['force_active']:
        fa_zero_pt_in_act_44.append((mid, depth, m['member_code']))

print(f"\n44のACT会員でpt=0（FA会員）: {len(fa_zero_pt_in_act_44)}名")
for mid, depth, mc in sorted(fa_zero_pt_in_act_44, key=lambda x: x[1]):
    print(f"  {mc}: depth={depth}, fa=True, pt=0")

# ── 82の謎解明：ULB差=1050、grp_pt差=900 ─────────────
print("\n" + "=" * 70)
print("【82の謎解明】ULB差=1050円(7名相当)、grp_pt差=900pt(6名)")
print("→ 1名はpt=0のFA会員の可能性")
print("=" * 70)

# 段8+にいてpt=0のFA会員
d8plus_fa_zero_82 = [(mid, d) for mid, d in d8plus_82.items() 
                     if members_by_id[mid]['self_pt_04'] == 0 and members_by_id[mid]['force_active']]
print(f"\n82の段8+にpt=0のFA会員: {len(d8plus_fa_zero_82)}名")
for mid, depth in d8plus_fa_zero_82:
    m = members_by_id[mid]
    print(f"  {m['member_code']}: depth={depth}, pt={m['self_pt_04']}, fa={m['force_active']}")

# 段8+にいてpt>0の会員
d8plus_pt_pos_82 = sorted(
    [(mid, d, members_by_id[mid]['self_pt_04'], members_by_id[mid]['member_code']) 
     for mid, d in d8plus_82.items() if members_by_id[mid]['self_pt_04'] > 0],
    key=lambda x: x[1]
)
print(f"\n82の段8+にpt>0の会員: {len(d8plus_pt_pos_82)}名")
# 段8のみ表示
d8_pos = [(mid, d, pt, mc) for mid, d, pt, mc in d8plus_pt_pos_82 if d == 8]
print(f"うち段8: {len(d8_pos)}名")
for mid, depth, pt, mc in d8_pos:
    print(f"  {mc}: depth={depth}, pt={pt}")

# ── 仮説：bonusCSVは「ACT段数を数える際にpt=0のFA会員もカウント」？
# → ULBを計算する際もpt=0のFA会員はrate×0=0円だが、段カウントはする？
# → 段7のACT会員数=47で、うち1名がpt=0のFA → grp_pt差=6名×150=900、ULB差=7名但し1名は0円
# まずはそれを確認

print("\n" + "=" * 70)
print("【仮説検証】bonusCSVの段7に入るべき7名の特定")
print("ULB差=1050円@rate1%→1050pt相当の7名")  
print("grp_pt差=900pt=6名×150pt → うち1名がpt=0のFA")
print("=" * 70)

# 82の段8+にいるACT会員の中で深度8のもの、その親（ACT段7）を確認
rates82 = UNILEVEL_RATES[4]

print(f"\n82のツリー段7のACT会員リスト（新ロジック=40名）:")
d7_82 = [(mid, d) for mid, d in act_map_82.items() if d == 7]
d7_82_sorted = sorted(d7_82, key=lambda x: members_by_id[x[0]]['member_code'])
for mid, d in d7_82_sorted:
    m = members_by_id[mid]
    b = ulb_bonus(m['self_pt_04'], rates82[6])
    print(f"  {m['member_code']}: pt={m['self_pt_04']}, bonus={b}円, fa={m['force_active']}")

d7_pt_sum = sum(members_by_id[mid]['self_pt_04'] for mid, _ in d7_82)
d7_ulb_sum = sum(ulb_bonus(members_by_id[mid]['self_pt_04'], rates82[6]) for mid, _ in d7_82)
print(f"\n  段7合計: {len(d7_82)}名, pt={d7_pt_sum:,}, ULB={d7_ulb_sum:,}円")
print(f"  bonusCSV期待: 47名, ULB=53,850円 (段1-6= 52,800-6,000=46,800円)")

# 段7のULBを確認
d1_6_ulb = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates82[d-1]) 
    for mid, d in act_map_82.items() if 1 <= d <= 6
)
d7_ulb = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates82[6]) 
    for mid, d in act_map_82.items() if d == 7
)
print(f"\n  新ロジック段1-6のULB: {d1_6_ulb:,}円")
print(f"  新ロジック段7のULB: {d7_ulb:,}円")
print(f"  bonusCSV ULB - 段1-6: {53850 - d1_6_ulb:,}円 ← CSVの段7相当")
expected_d7_ulb = 53850 - d1_6_ulb
print(f"  CSVの段7 ULB={expected_d7_ulb:,}円 ÷ rate1% × POINT_RATE = {expected_d7_ulb/1*100:.0f}pt")
print(f"  = {expected_d7_ulb*100//100}pt ÷ 150pt/名 = {expected_d7_ulb*100//100//150}名×150pt + {expected_d7_ulb*100//100%150}pt")

# ── 段1-6のACT集合の確認（新ロジックで段1-6のACT会員の段を確認） ─
print("\n" + "=" * 70)
print("【確認】段1-6の各段ULBが新/旧で一致するか（段1-6は差がないか）")
print("=" * 70)

for tc, level, label in [("82179501", 4, "82"), ("44504701", 5, "44")]:
    brow = bonus_data.get(tc, {})
    csv_ulb = brow.get('ulb', 0)
    rates = UNILEVEL_RATES[level]
    
    act_map = get_all_act_depth_map(tc, level)
    
    total_new = 0
    print(f"\n{tc} LV{level}:")
    for d in range(1, 8):
        members_at_d = [(mid, members_by_id[mid]['self_pt_04']) 
                        for mid, depth in act_map.items() if depth == d]
        pt_sum = sum(pt for _, pt in members_at_d)
        b_sum  = sum(ulb_bonus(pt, rates[d-1]) for _, pt in members_at_d)
        total_new += b_sum
        print(f"  段{d}: {len(members_at_d):3}名, pt={pt_sum:6,}, ULB={b_sum:6,}円  rate={rates[d-1]}%")
    print(f"  合計: ULB={total_new:,}円 vs CSV={csv_ulb:,}円  差={total_new-csv_ulb:+,}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【決定的調査】段8でpt=150のACT会員の「なぜ段8になったか」を調査")
print("（新ロジックで段7のACT会員の子が非ACT → さらにその子のACT = 段8）")
print("特に「段8のACT会員で、その直接のuplineツリー上のACT会員が段7にいる」ケース")
print("=" * 70)

def find_parent_act_depth(child_id, act_map):
    """child_idのupline chain上で最初のACT会員を見つけてその深度を返す"""
    m = members_by_id.get(child_id)
    if not m: return None, None
    
    cur = m
    for _ in range(30):
        up_id = cur.get('upline_id')
        if not up_id: break
        up_m = members_by_id.get(up_id)
        if not up_m: break
        if up_id in act_map:
            return up_id, act_map[up_id]
        cur = up_m
    return None, None

print("\n82の段8のACT会員（pt=150）とその直近ACT祖先：")
d8_150_82 = [(mid, d) for mid, d in act_map_82.items() 
             if d == 8 and members_by_id[mid]['self_pt_04'] == 150]
d8_150_82_sorted = sorted(d8_150_82, key=lambda x: members_by_id[x[0]]['member_code'])

print(f"  段8でpt=150の会員: {len(d8_150_82)}名")
for mid, depth in d8_150_82_sorted:
    m = members_by_id[mid]
    # 直接の親
    up_id = m.get('upline_id')
    up_m  = members_by_id.get(up_id, {})
    up_mc = up_m.get('member_code', '?')
    up_d  = act_map_82.get(up_id, '-')
    up_act = is_active(up_m.get('status',''), up_m.get('self_pt_04',0), up_m.get('has_req_04',False), up_m.get('force_active',False))
    up_wd  = is_withdrawn(up_m.get('status',''), up_m.get('force_active',False))
    # 最近のACT祖先
    parent_id, parent_depth = find_parent_act_depth(mid, act_map_82)
    parent_mc = members_by_id.get(parent_id, {}).get('member_code', '?') if parent_id else '?'
    print(f"  {m['member_code']}: d={depth}, 直親={up_mc}(d={up_d},act={up_act},wd={up_wd}), ACT祖先={parent_mc}(d={parent_depth})")

# ── 44の分析も ─────────────────────────────────────────
print("\n44の段8のACT会員（pt=150）で直近ACT祖先が段7のもの：")
d8_150_44 = [(mid, d) for mid, d in act_map_44.items() 
             if d == 8 and members_by_id[mid]['self_pt_04'] == 150]
for mid, depth in sorted(d8_150_44, key=lambda x: members_by_id[x[0]]['member_code'])[:20]:
    m = members_by_id[mid]
    up_id = m.get('upline_id')
    up_m  = members_by_id.get(up_id, {})
    up_mc = up_m.get('member_code', '?')
    up_d  = act_map_44.get(up_id, '-')
    parent_id, parent_depth = find_parent_act_depth(mid, act_map_44)
    parent_mc = members_by_id.get(parent_id, {}).get('member_code', '?') if parent_id else '?'
    up_act = is_active(up_m.get('status',''), up_m.get('self_pt_04',0), up_m.get('has_req_04',False), up_m.get('force_active',False))
    up_wd  = is_withdrawn(up_m.get('status',''), up_m.get('force_active',False))
    print(f"  {m['member_code']}: d={depth}, 直親={up_mc}(d={up_d},act={up_act},wd={up_wd}), ACT祖先={parent_mc}(d={parent_depth})")

# ── 新旧ロジックの深度比較で差がある会員を詳細調査 ──────
print("\n" + "=" * 70)
print("【解明】なぜ特定の段8ACT会員がCSVでは段7扱いなのか")
print("bonusCSVのロジック仮説：段7のACT会員の子がWD/非ACTでも")
print("「その子の子」は段8ではなく段7に透過して入れる？")
print("（透過はACT→非ACT→ACTの場合だけ段消費なし？それともACT→ACT→非ACT→ACT？）")
print("=" * 70)

# 問題のケースを調べる：段7ACTの子が非ACT → その子がACT = 段8になる
# これを段7扱いにするには「非ACT透過は深度を減らす」必要がある
# または「段7のACT会員の配下はすべて段7として処理」
print("\n段7ACTの子が非ACTで、さらにその子がACTになるケースの詳細（82）:")

d7_ids_82 = set(mid for mid, d in act_map_82.items() if d == 7)
cases = []
for d7_id in d7_ids_82:
    for child_id in upline_children.get(d7_id, []):
        child_m = members_by_id.get(child_id)
        if not child_m: continue
        wd  = is_withdrawn(child_m['status'], child_m['force_active'])
        act = is_active(child_m['status'], child_m['self_pt_04'], child_m['has_req_04'], child_m['force_active'])
        if not act:  # 非ACT子
            # その子の配下のACT会員（段8になっているはず）
            for grandchild_id in upline_children.get(child_id, []):
                gc_m = members_by_id.get(grandchild_id)
                if not gc_m: continue
                gc_act = is_active(gc_m['status'], gc_m['self_pt_04'], gc_m['has_req_04'], gc_m['force_active'])
                if gc_act and act_map_82.get(grandchild_id, 0) == 8:
                    cases.append({
                        'd7_id': d7_id, 'nonact_id': child_id, 'gc_id': grandchild_id,
                        'd7_mc': members_by_id[d7_id]['member_code'],
                        'nonact_mc': child_m['member_code'],
                        'gc_mc': gc_m['member_code'],
                        'gc_pt': gc_m['self_pt_04'],
                    })

print(f"  段7ACT → 非ACT子 → ACT孫（段8）のケース: {len(cases)}件")
for case in cases:
    print(f"    {case['d7_mc']}(d7) → {case['nonact_mc']}(非ACT) → {case['gc_mc']}(d8, pt={case['gc_pt']})")

# 必要な「段7に追加されるべき7名」= cases の gc_id
needed_d7_members = [c['gc_id'] for c in cases]
needed_d7_pt = sum(members_by_id[mid]['self_pt_04'] for mid in needed_d7_members)
needed_d7_fa = [mid for mid in needed_d7_members if members_by_id[mid]['force_active']]
print(f"\n  段7に追加されるべき会員: {len(needed_d7_members)}名")
print(f"  うちFA(pt=0): {len(needed_d7_fa)}名")
print(f"  合計pt: {needed_d7_pt}")
needed_d7_ulb = sum(ulb_bonus(members_by_id[mid]['self_pt_04'], rates82[6]) for mid in needed_d7_members)
print(f"  合計ULB追加: {needed_d7_ulb}円")
print(f"  bonusCSV ULB差: 1050円")
if needed_d7_ulb == 1050:
    print(f"  ✅ 一致！これが82のULB残差の根本原因！")
else:
    print(f"  差: {needed_d7_ulb - 1050}円")

# ── 44の同様調査 ─────────────────────────────────────
print("\n段7ACTの子が非ACTで、さらにその子がACTになるケースの詳細（44）:")
rates44 = UNILEVEL_RATES[5]
d7_ids_44 = set(mid for mid, d in act_map_44.items() if d == 7)
cases_44 = []
for d7_id in d7_ids_44:
    for child_id in upline_children.get(d7_id, []):
        child_m = members_by_id.get(child_id)
        if not child_m: continue
        wd  = is_withdrawn(child_m['status'], child_m['force_active'])
        act = is_active(child_m['status'], child_m['self_pt_04'], child_m['has_req_04'], child_m['force_active'])
        if not act:
            for grandchild_id in upline_children.get(child_id, []):
                gc_m = members_by_id.get(grandchild_id)
                if not gc_m: continue
                gc_act = is_active(gc_m['status'], gc_m['self_pt_04'], gc_m['has_req_04'], gc_m['force_active'])
                if gc_act and act_map_44.get(grandchild_id, 0) == 8:
                    cases_44.append({
                        'd7_mc': members_by_id[d7_id]['member_code'],
                        'nonact_mc': child_m['member_code'],
                        'gc_mc': gc_m['member_code'],
                        'gc_pt': gc_m['self_pt_04'],
                        'gc_id': grandchild_id,
                    })

print(f"  段7ACT → 非ACT子 → ACT孫（段8）のケース: {len(cases_44)}件")
for case in cases_44:
    print(f"    {case['d7_mc']}(d7) → {case['nonact_mc']}(非ACT) → {case['gc_mc']}(d8, pt={case['gc_pt']})")

if cases_44:
    needed_44_ulb = sum(ulb_bonus(members_by_id[c['gc_id']]['self_pt_04'], rates44[6]) for c in cases_44)
    print(f"  追加ULB: {needed_44_ulb}円 vs 差300円")
    if needed_44_ulb == 300:
        print(f"  ✅ 一致！")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【最終仮説】「非ACT透過の対象：WDのみ」(通常の非ACT会員はdepth消費)")
print("ただし上記でも86/93/89が一致しない...")
print("別の可能性：「ACTの連続する段でのみ深度消費」")
print("=" * 70)

# 根本的な問題を整理
# 新ロジック（WD+非ACT透過）: 82=52,800, 44=44,550 → 小さすぎる
# bonusCSV: 82=53,850, 44=44,850 → もっと大きい
# 差: 82=+1050, 44=+300

# 1050円は段7 rate=1%で 7名×150pt の bonus
# 300円は段7 rate=2%で 1名×150pt × 2 の bonus
# これらは「新ロジックで段8になった会員が段7扱いになれば達成」

# 新ロジックの問題：
# 段7ACT → 非ACT(1名) → ACT = 段8（透過した後なのにそこから+1）
# 正しくは：段7ACT → 非ACT(1名) → ACT = 段7（非ACT透過後は段7のまま）
# これは「非ACT会員の子は段を維持」を意味する

# つまり「段7ACTの子が非ACTなら、その非ACTの子はすべて段7」
# これが正しいロジック

# 検証
def calc_ulb_passthrough_maintain_depth(target_code, level, max_depth=7):
    """
    非ACT透過ロジック改：透過後は前のACT会員の深度を維持
    段7ACTの子が非ACT → その非ACTの子も段7（+0）
    """
    m0 = members_by_code.get(target_code)
    if not m0: return 0, 0, {}
    rates = UNILEVEL_RATES.get(level, UNILEVEL_RATES[4])
    
    ulb = 0; grp_pt = 0
    act_map = {}  # id → assigned_depth
    
    # stack: (child_id, assigned_depth_from_parent)
    # assigned_depth_from_parent = 前のACT会員の深度（次のACTはここに割り当てる）
    # 初期: targetの子は深度1からスタート
    stack = [(cid, 1) for cid in upline_children.get(m0['id'], [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        
        if wd or not act:
            # 透過: 深度を変えずに子へ（depthはそのまま）
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            # ACT: この深度に配置
            pt = m['self_pt_04']
            act_map[cur_id] = depth
            if depth <= max_depth:
                rate  = rates[depth - 1] if depth - 1 < len(rates) else 0
                b     = ulb_bonus(pt, rate) if rate > 0 else 0
                ulb   += b
                grp_pt+= pt
            # この会員の子は depth+1 から
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth + 1))
    
    return ulb, grp_pt, act_map

# これは既存の新ロジックと全く同じはず（確認）
for tc, level in [("82179501", 4), ("44504701", 5)]:
    brow = bonus_data.get(tc, {})
    csv_ulb = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    
    u, gpt, am = calc_ulb_passthrough_maintain_depth(tc, level)
    print(f"\n{tc}: 維持版ULB={u:,} grp_pt={gpt:,} vs CSV ULB={csv_ulb:,} grp_pt={csv_grp_pt:,}")
    # 段7の数確認
    d7_c = sum(1 for d in am.values() if d == 7)
    d7_p = sum(members_by_id[mid]['self_pt_04'] for mid, d in am.items() if d == 7)
    print(f"  段7: {d7_c}名, pt={d7_p:,}")

print("\n" + "─" * 70)
print("上記は既存の新ロジックと同じ（どちらも非ACT透過でdepthを維持している）")
print()
print("残る謎：bonusCSVでは82が53,850で新ロジック52,800より1050円多い")
print("この差は「段7の新ロジック=40名に対してCSVは47名」という計算から来ている")
print()
print("【新仮説】bonusCSVは「ACT→非ACT×複数段→ACT」でも段消費なし")
print("つまり非ACTが2段連続しても透過（段7ACT→非ACT→非ACT→ACT = 段7）")
print("現行の新ロジックは既にこれを実装済み（スタックに同じdepthで積む）")
print()
print("→ 差の原因は別のところ（ツリー構造の違い？データの違い？）")
