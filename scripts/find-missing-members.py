#!/usr/bin/env python3
"""
find-missing-members.py
========================
V1（非ACT透過版）の段1-7 ACT会員集合 と bonusCSV のグループACT会員集合を直接比較。
bonusCSVにいてV1段1-7にいない会員 → これがULB差の根本原因。

また、bonusCSVのgrp_ptとV1段1-7 ptの差の原因も特定する。
"""

import os, sys, csv, math
import psycopg2, psycopg2.extras
from collections import defaultdict

DATABASE_URL = "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
BONUS_CSV    = "/home/user/uploaded_files/bonus_list_full.csv"
BONUS_MONTH  = "2026-04"
CURRENT_MONTH= "2026-05"
POINT_RATE   = 100
UNILEVEL_RATES = {
    4: [15,  9,  6,  5,  3,  2,  1],
    5: [15, 10,  7,  6,  4,  3,  2],
}
EXPECTED = {
    "82179501": {"ulb": 53850,  "level": 4},
    "44504701": {"ulb": 44850,  "level": 5},
}
TARGETS = list(EXPECTED.keys())

# ── DB接続 ──────────────────────────────────────────────
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
print(f"DB総会員数: {len(rows)}")

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

# ── bonusCSV読み込み ──────────────────────────────────────
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
            'lv_title': row['称号レベル'].strip(),
        }

# ── ヘルパー関数 ─────────────────────────────────────────
def is_withdrawn(status, fa):
    if fa: return False
    return status in ('withdrawn', 'lapsed')

def is_active(status, self_pt, has_req, fa):
    if fa: return True
    if status in ('withdrawn', 'lapsed'): return False
    return self_pt > 0 and has_req

def ulb_bonus(pt, rate):
    return math.floor(pt * (rate / 100) * POINT_RATE)

def get_effective_level(mid):
    m = members_by_code.get(mid, {})
    if not m:
        return 4
    # forceLevel優先、次にtitleLevel、なければcurrentLevel
    fl = m.get('force_level')
    tl = m.get('title_level')
    cl = m.get('current_level')
    for lv in [fl, tl, cl]:
        if lv and int(str(lv)) in UNILEVEL_RATES:
            return int(str(lv))
    return 4

# ── V1（非ACT透過）：段別ACT詳細取得 ────────────────────
def calc_ulb_passthrough_detail(target_code, max_depth=7):
    """
    Returns:
      total_bonus: ULB合計
      d1to7: {member_id: {'depth', 'pt', 'bonus', 'rate', 'mc', 'fa', 'status'}}
      d8plus:{member_id: {'depth', 'pt', 'mc', 'fa', 'status'}}
      all_act:{member_id: ...} 全深度ACT
    """
    m0 = members_by_code.get(target_code)
    if not m0:
        return 0, {}, {}, {}
    
    level = EXPECTED.get(target_code, {}).get('level', get_effective_level(target_code))
    if level not in UNILEVEL_RATES:
        level = 4
    rates = UNILEVEL_RATES[level]
    
    total   = 0
    d1to7   = {}
    d8plus  = {}
    all_act = {}
    
    stack = [(cid, 1) for cid in upline_children.get(m0['id'], [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m:
            continue
        
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        
        if wd or not act:
            # 透過（depth消費なし）
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        else:
            # ACT → depth消費
            pt = m['self_pt_04']
            info = {
                'depth': depth, 'pt': pt,
                'mc': m['member_code'],
                'fa': m['force_active'],
                'status': m['status'],
            }
            all_act[cur_id] = info
            
            if depth <= max_depth:
                rate  = rates[depth - 1] if depth - 1 < len(rates) else 0
                bonus = ulb_bonus(pt, rate) if rate > 0 else 0
                total += bonus
                d1to7[cur_id] = {**info, 'rate': rate, 'bonus': bonus}
            else:
                d8plus[cur_id] = info
            
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth + 1))
    
    return total, d1to7, d8plus, all_act

# ── 旧ロジック（非ACT会員もdepth消費）：比較用 ───────────
def calc_ulb_old_d1to7(target_code, max_depth=7):
    m0 = members_by_code.get(target_code)
    if not m0:
        return 0, 0, {}
    
    level = EXPECTED.get(target_code, {}).get('level', get_effective_level(target_code))
    if level not in UNILEVEL_RATES:
        level = 4
    rates = UNILEVEL_RATES[level]
    
    total = 0; grp_pt = 0; d_members = {}
    stack = [(cid, 1) for cid in upline_children.get(m0['id'], [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m or depth > max_depth:
            continue
        
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        
        if wd:
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth))
        elif act:
            pt   = m['self_pt_04']
            rate = rates[depth - 1] if depth - 1 < len(rates) else 0
            b    = ulb_bonus(pt, rate) if rate > 0 else 0
            total += b; grp_pt += pt
            d_members[cur_id] = {'depth': depth, 'pt': pt, 'bonus': b, 'mc': m['member_code']}
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth + 1))
        else:
            # 非ACT depth消費（旧ロジック）
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth + 1))
    
    return total, grp_pt, d_members

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【仮説検証】bonusCSVのgrp_ptは旧ロジック？新ロジック？")
print("=" * 70)

for tc in TARGETS:
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    csv_grp_act= brow.get('grp_act', 0)
    
    new_ulb, d1to7, d8plus, all_act = calc_ulb_passthrough_detail(tc)
    old_ulb, old_grp_pt, old_d = calc_ulb_old_d1to7(tc)
    
    new_grp_pt  = sum(v['pt'] for v in d1to7.values())
    new_grp_act = len(d1to7)
    old_grp_act = len(old_d)
    
    level = EXPECTED[tc]['level']
    rates = UNILEVEL_RATES[level]
    
    print(f"\n{'─'*60}")
    print(f"  {tc}  LV{level}")
    print(f"  bonusCSV: ULB={csv_ulb:,}円  grp_pt={csv_grp_pt:,}  grp_act={csv_grp_act}")
    print(f"  新ロジック(非ACT透過)段1-7: {new_grp_act}名, pt={new_grp_pt:,}, ULB={new_ulb:,}")
    print(f"  旧ロジック(depth消費)段1-7:  {old_grp_act}名, pt={old_grp_pt:,}, ULB={old_ulb:,}")
    print(f"  全深度ACT:                  {len(all_act)}名, pt={sum(v['pt'] for v in all_act.values()):,}")
    
    if old_grp_pt == csv_grp_pt:
        print(f"  ✅ 旧ロジック grp_pt == CSV grp_pt ← bonusCSVは旧ロジックでgrp_pt計算！")
    elif new_grp_pt == csv_grp_pt:
        print(f"  ✅ 新ロジック grp_pt == CSV grp_pt")
    else:
        print(f"  差: 新={new_grp_pt-csv_grp_pt:+,}  旧={old_grp_pt-csv_grp_pt:+,}")
    
    if old_ulb == csv_ulb:
        print(f"  ✅ 旧ロジック ULB == CSV ULB！")
    elif new_ulb == csv_ulb:
        print(f"  ✅ 新ロジック ULB == CSV ULB！")
    else:
        print(f"  ULB差: 新={new_ulb-csv_ulb:+,}  旧={old_ulb-csv_ulb:+,}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【詳細分析】段1-7のACT会員リスト直接比較")
print("（新ロジック vs 旧ロジック の差分会員）")
print("=" * 70)

for tc in TARGETS:
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    
    new_ulb, d1to7_new, d8plus, all_act = calc_ulb_passthrough_detail(tc)
    old_ulb, old_grp_pt, d1to7_old     = calc_ulb_old_d1to7(tc)
    
    level = EXPECTED[tc]['level']
    rates = UNILEVEL_RATES[level]
    
    new_set = set(d1to7_new.keys())
    old_set = set(d1to7_old.keys())
    
    # 新にあって旧にない（透過で浮上してきた会員）
    in_new_not_old = new_set - old_set
    # 旧にあって新にない（透過で深度が変わった会員）
    in_old_not_new = old_set - new_set
    
    print(f"\n{'─'*60}")
    print(f"  {tc}  LV{level}")
    print(f"  新ロジック段1-7: {len(new_set)}名, pt={sum(d1to7_new[x]['pt'] for x in new_set):,}")
    print(f"  旧ロジック段1-7: {len(old_set)}名, pt={sum(d1to7_old[x]['pt'] for x in old_set):,}")
    print(f"  新にあって旧にない: {len(in_new_not_old)}名 (透過で浮上)")
    print(f"  旧にあって新にない: {len(in_old_not_new)}名 (透過で深くなった)")
    
    if in_old_not_new:
        print(f"\n  【旧段1-7にあって新段1-7にない会員】← これがULB差の原因？")
        for mid in sorted(in_old_not_new):
            old_info = d1to7_old[mid]
            # 新ロジックでの深度
            new_depth = all_act.get(mid, {}).get('depth', '?')
            new_bonus = d1to7_new.get(mid, {}).get('bonus', 0)
            old_bonus = old_info['bonus']
            m = members_by_id[mid]
            print(f"    {m['member_code']}: 旧depth={old_info['depth']}, 旧bonus={old_bonus}, "
                  f"新depth={new_depth}, pt={old_info['pt']}")
    
    if in_new_not_old:
        print(f"\n  【新段1-7にあって旧段1-7にない会員（新で浮上）】")
        for mid in sorted(in_new_not_old)[:10]:
            new_info = d1to7_new[mid]
            m = members_by_id[mid]
            print(f"    {m['member_code']}: 新depth={new_info['depth']}, bonus={new_info['bonus']}, pt={new_info['pt']}")
    
    # 深度変化会員（両方にいるが深度が違う）
    common = new_set & old_set
    depth_changed = [(mid, d1to7_new[mid]['depth'], d1to7_old[mid]['depth']) 
                     for mid in common 
                     if d1to7_new[mid]['depth'] != d1to7_old[mid]['depth']]
    if depth_changed:
        print(f"\n  【段1-7内で深度が変わった会員】: {len(depth_changed)}名")
        for mid, nd, od in sorted(depth_changed, key=lambda x: x[0])[:20]:
            m = members_by_id[mid]
            nb = d1to7_new[mid]['bonus']
            ob = d1to7_old[mid]['bonus']
            print(f"    {m['member_code']}: 旧depth={od}→新depth={nd}, bonus={ob}→{nb}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【最重要】bonusCSVのULBが旧/新のどちらと一致するか全5名で確認")
print("=" * 70)

ALL_TARGETS = ["82179501","44504701","86820601","93713601","89248801"]
ALL_EXPECTED_ULB = {
    "82179501": 53850,
    "44504701": 44850,
    "86820601": 98550,
    "93713601": 52650,
    "89248801": 19950,
}
ALL_EXPECTED_LEVEL = {
    "82179501": 4,
    "44504701": 5,
    "86820601": 5,
    "93713601": 4,
    "89248801": 5,
}

print(f"\n{'会員':>12} {'旧ULB':>10} {'新ULB':>10} {'CSV_ULB':>10} {'旧差':>8} {'新差':>8}")
print("─" * 70)
for tc in ALL_TARGETS:
    m0 = members_by_code.get(tc)
    if not m0:
        print(f"  {tc}: not found"); continue
    
    level = ALL_EXPECTED_LEVEL[tc]
    rates = UNILEVEL_RATES[level]
    
    new_ulb, _, _, _ = calc_ulb_passthrough_detail(tc)
    old_ulb, _, _    = calc_ulb_old_d1to7(tc)
    csv_ulb = ALL_EXPECTED_ULB[tc]
    
    new_ok = "✅" if new_ulb == csv_ulb else "❌"
    old_ok = "✅" if old_ulb == csv_ulb else "❌"
    
    print(f"  {tc}: 旧={old_ulb:>8,} {old_ok}  新={new_ulb:>8,} {new_ok}  CSV={csv_ulb:>8,}  "
          f"旧差={old_ulb-csv_ulb:+7,}  新差={new_ulb-csv_ulb:+7,}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【ハイブリッド仮説】bonusCSVのgrp_ptは旧、ULBは新ロジックか？")
print("または grp_pt は旧の段1-7 pt だが ULB は旧の段1-7 bonus？")
print("=" * 70)

for tc in TARGETS:
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    
    new_ulb, d1to7_new, _, all_act = calc_ulb_passthrough_detail(tc)
    old_ulb, old_grp_pt, d1to7_old = calc_ulb_old_d1to7(tc)
    
    level = EXPECTED[tc]['level']
    rates = UNILEVEL_RATES[level]
    
    # 新ロジック全深度ULB（深度制限なし）
    def calc_ulb_passthrough_nodepth(target_code):
        m0 = members_by_code.get(target_code)
        if not m0: return 0
        level = EXPECTED.get(target_code, {}).get('level', 4)
        if level not in UNILEVEL_RATES: level = 4
        rates = UNILEVEL_RATES[level]
        total = 0
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
                if depth - 1 < len(rates):
                    total += ulb_bonus(m['self_pt_04'], rates[depth-1])
                for c in upline_children.get(cur_id, []): stack.append((c, depth+1))
        return total
    
    nodepth_ulb = calc_ulb_passthrough_nodepth(tc)
    
    print(f"\n  {tc}:")
    print(f"  旧d1-7 ULB={old_ulb:,}  新d1-7 ULB={new_ulb:,}  新全深度={nodepth_ulb:,}  CSV={csv_ulb:,}")
    print(f"  旧grp_pt={old_grp_pt:,}  新grp_pt={sum(v['pt'] for v in d1to7_new.values()):,}  CSV={csv_grp_pt:,}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【段7詳細】82/44の段7のACT会員リスト（旧と新の差分）")
print("=" * 70)

for tc in TARGETS:
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    
    new_ulb, d1to7_new, d8plus, all_act = calc_ulb_passthrough_detail(tc)
    old_ulb, old_grp_pt, d1to7_old     = calc_ulb_old_d1to7(tc)
    
    level = EXPECTED[tc]['level']
    rates = UNILEVEL_RATES[level]
    
    d7_new = {mid: info for mid, info in d1to7_new.items() if info['depth'] == 7}
    d7_old = {mid: info for mid, info in d1to7_old.items() if info['depth'] == 7}
    
    # 旧で段7にいて新で段8+にいる会員
    in_old_d7_not_new_d7 = set(d7_old.keys()) - set(d7_new.keys())
    
    print(f"\n  {tc}: 旧段7={len(d7_old)}名, 新段7={len(d7_new)}名")
    print(f"  旧段7にいて新段7にない会員: {len(in_old_d7_not_new_d7)}名")
    
    if in_old_d7_not_new_d7:
        total_bonus_diff = 0
        total_pt_diff = 0
        for mid in sorted(in_old_d7_not_new_d7):
            old_info = d7_old[mid]
            new_depth = all_act.get(mid, {}).get('depth', '?')
            m = members_by_id[mid]
            b = ulb_bonus(old_info['pt'], rates[6])
            total_bonus_diff += b
            total_pt_diff    += old_info['pt']
            print(f"    {m['member_code']}: 旧d=7 新d={new_depth}, pt={old_info['pt']}, "
                  f"bonus_損失={b}円, fa={m['force_active']}")
        print(f"  → これらが新ロジックで段8+に移動したことによるULB損失計: {total_bonus_diff:,}円")
        print(f"    pt合計: {total_pt_diff:,}pt")
    
    # 新で段7にいて旧で段7にない会員（新ロジックで浮上して段7に入った）
    in_new_d7_not_old_d7 = set(d7_new.keys()) - set(d7_old.keys())
    if in_new_d7_not_old_d7:
        total_bonus_gain = sum(ulb_bonus(d7_new[mid]['pt'], rates[6]) for mid in in_new_d7_not_old_d7)
        print(f"  新で段7に浮上してきた会員: {len(in_new_d7_not_old_d7)}名, bonus利得={total_bonus_gain:,}円")

print("\n" + "=" * 70)
print("結論サマリー")
print("=" * 70)
for tc in TARGETS:
    brow = bonus_data.get(tc, {})
    csv_ulb = brow.get('ulb', 0)
    new_ulb, d1to7_new, _, _ = calc_ulb_passthrough_detail(tc)
    old_ulb, _, _ = calc_ulb_old_d1to7(tc)
    print(f"  {tc}: 旧={old_ulb:,} 新={new_ulb:,} CSV={csv_ulb:,}  旧差={old_ulb-csv_ulb:+,} 新差={new_ulb-csv_ulb:+,}")
