#!/usr/bin/env python3
"""
decode-bonus-csv-grppt.py
==========================
bonusCSVのgrp_ptの計算方法を解明する。
新ロジック=22,800(82)、旧=18,450、CSV=22,800... wait
実際には：
  新ロジック新(非ACT透過)段1-7: 21,900 ≠ 22,800
  旧ロジック: 18,450 ≠ 22,800
  CSV: 22,800

考えられる仮説：
  仮説1: 非ACT透過版 + depth制限なし（全深度）のgrp_pt
  仮説2: 特定の追加ロジック（FA会員は段数制限外など）
  仮説3: bonusCSVのgrp_ptはULBとは別の方法で計算
  仮説4: uplineツリーとreferrerツリーで計算が違う

また、bonusCSVのgrp_ptとULBから逆算してみる：
  82のCSV: ULB=53,850, grp_pt=22,800
  LV4のrates=[15,9,6,5,3,2,1] → 段別に分解してみる

  もしgrp_ptが段1-7のACT会員ptだとしたら：
  grp_pt=22,800 vs ULB=53,850
  → この関係性から逆算する
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
TARGETS = {
    "82179501": 4,
    "44504701": 5,
}

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

# ── 汎用トラバーサル（フラグ指定） ───────────────────────
def traverse(target_code, level, passthrough_wd=True, passthrough_nonact=True, max_depth=7):
    """
    passthrough_wd: WD会員を透過するか
    passthrough_nonact: 非ACT会員を透過するか
    max_depth: 何段まで計算するか（Noneなら無制限）
    Returns: (ulb, grp_pt, grp_act, depth_detail)
    """
    m0 = members_by_code.get(target_code)
    if not m0: return 0, 0, 0, {}
    
    rates = UNILEVEL_RATES.get(level, UNILEVEL_RATES[4])
    
    ulb = 0; grp_pt = 0; grp_act = 0
    depth_detail = defaultdict(lambda: {'count': 0, 'pt': 0, 'bonus': 0})
    
    stack = [(cid, 1) for cid in upline_children.get(m0['id'], [])]
    while stack:
        cur_id, depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        
        if wd:
            if passthrough_wd:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth))
            else:
                # WD depth消費（非透過）- ただし通常カウントしない
                if max_depth is None or depth <= max_depth:
                    for c in upline_children.get(cur_id, []):
                        stack.append((c, depth + 1))
        elif act:
            pt = m['self_pt_04']
            if max_depth is None or depth <= max_depth:
                rate  = rates[depth - 1] if depth - 1 < len(rates) else 0
                bonus = ulb_bonus(pt, rate) if rate > 0 else 0
                ulb     += bonus
                grp_pt  += pt
                grp_act += 1
                depth_detail[depth]['count'] += 1
                depth_detail[depth]['pt']    += pt
                depth_detail[depth]['bonus'] += bonus
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth + 1))
        else:
            # 非ACT
            if passthrough_nonact:
                for c in upline_children.get(cur_id, []):
                    stack.append((c, depth))
            else:
                if max_depth is None or depth <= max_depth:
                    for c in upline_children.get(cur_id, []):
                        stack.append((c, depth + 1))
    
    return ulb, grp_pt, grp_act, dict(depth_detail)

# ══════════════════════════════════════════════════════════
print("=" * 70)
print("【グリッド検証】各ロジック組み合わせでCSV値と一致するものを探す")
print("=" * 70)

configs = [
    # (名前, passthrough_wd, passthrough_nonact, max_depth)
    ("WD透過+非ACT透過+7段",    True,  True,  7),
    ("WD透過+非ACT透過+8段",    True,  True,  8),
    ("WD透過+非ACT透過+無限",   True,  True,  None),
    ("WD透過+非ACT非透過+7段",  True,  False, 7),
    ("WD透過+非ACT非透過+8段",  True,  False, 8),
    ("WD非透過+非ACT透過+7段",  False, True,  7),
    ("WD非透過+非ACT非透過+7段",False, False, 7),
]

for tc, level in TARGETS.items():
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    csv_grp_act= brow.get('grp_act', 0)
    
    print(f"\n{tc} LV{level}: CSV ULB={csv_ulb:,} grp_pt={csv_grp_pt:,} grp_act={csv_grp_act}")
    print(f"  {'ロジック':30} {'ULB':>10} {'grp_pt':>8} {'grp_act':>8} {'ULB?':>5} {'pt?':>5}")
    print("  " + "─" * 75)
    
    for name, pwd, pna, md in configs:
        u, gpt, gact, _ = traverse(tc, level, pwd, pna, md)
        u_ok  = "✅" if u    == csv_ulb    else "  "
        pt_ok = "✅" if gpt  == csv_grp_pt else "  "
        print(f"  {name:30} {u:>10,} {gpt:>8,} {gact:>8} {u_ok:>5} {pt_ok:>5}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【特別仮説】FA会員の扱い：FAのself_ptは0として計算するか？")
print("（FA会員はボーナス発生源だが、グループptカウントは別途扱いかも）")
print("=" * 70)

def traverse_fa_zero_pt(target_code, level, max_depth=7):
    """FA会員のself_pt=0として計算（FAはグループptにカウントしない）"""
    m0 = members_by_code.get(target_code)
    if not m0: return 0, 0, 0, {}
    rates = UNILEVEL_RATES.get(level, UNILEVEL_RATES[4])
    ulb = 0; grp_pt = 0; grp_act = 0
    depth_detail = defaultdict(lambda: {'count': 0, 'pt': 0, 'bonus': 0})
    
    stack = [(cid, 1) for cid in upline_children.get(m0['id'], [])]
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
            # FAはpt=0として計算（自己ptはグループに含めない）
            pt = 0 if m['force_active'] else m['self_pt_04']
            if depth <= max_depth:
                rate  = rates[depth - 1] if depth - 1 < len(rates) else 0
                bonus = ulb_bonus(pt, rate) if rate > 0 else 0
                ulb     += bonus
                grp_pt  += pt
                grp_act += 1
                depth_detail[depth]['count'] += 1
                depth_detail[depth]['pt']    += pt
                depth_detail[depth]['bonus'] += bonus
            for c in upline_children.get(cur_id, []):
                stack.append((c, depth + 1))
    
    return ulb, grp_pt, grp_act, dict(depth_detail)

for tc, level in TARGETS.items():
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    
    u, gpt, gact, dd = traverse_fa_zero_pt(tc, level)
    print(f"\n{tc}: FA_zeroPt: ULB={u:,} grp_pt={gpt:,} grp_act={gact}")
    print(f"  CSV: ULB={csv_ulb:,} grp_pt={csv_grp_pt:,}")
    if u == csv_ulb: print("  ✅ ULB一致！")
    if gpt == csv_grp_pt: print("  ✅ grp_pt一致！")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【逆算】bonusCSVのgrp_ptから段別pt分布を逆算する")
print("（bonusCSVのULBとgrp_ptの関係をチェック）")
print("=" * 70)

for tc, level in TARGETS.items():
    brow = bonus_data.get(tc, {})
    csv_ulb    = brow.get('ulb', 0)
    csv_grp_pt = brow.get('grp_pt', 0)
    csv_grp_act= brow.get('grp_act', 0)
    rates = UNILEVEL_RATES[level]
    
    # 新ロジックの段別データを取得
    _, _, _, depth_new = traverse(tc, level, True, True, 7)
    _, _, _, depth_old = traverse(tc, level, True, False, 7)
    
    print(f"\n{tc} LV{level}: rates={rates}")
    print(f"  新ロジック段別: ", end="")
    for d in range(1, 8):
        dd = depth_new.get(d, {'count':0,'pt':0,'bonus':0})
        print(f"段{d}={dd['pt']:,}pt({dd['count']}名) ", end="")
    print()
    
    # 段7から7名(各150pt)を追加するとULBがどうなるか
    extra_names = (csv_ulb - sum(depth_new.get(d, {'bonus':0})['bonus'] for d in range(1,8))) // ulb_bonus(150, rates[6])
    extra_pt    = extra_names * 150
    new_total_pt = sum(depth_new.get(d, {'pt':0})['pt'] for d in range(1,8)) + extra_pt
    print(f"  段7に{extra_names}名×150pt追加するとULB={csv_ulb:,}円, grp_pt合計={new_total_pt:,} vs CSV={csv_grp_pt:,}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【仮説4】同じ会員が82のツリーでも44のツリーでも二重カウントされている？")
print("（82と44は独立したuplineツリーを持つのか、それとも共通部分があるか）")
print("=" * 70)

_, d1to7_82, d8p_82, all82 = traverse("82179501", 4, True, True, 7), None, None, None
ulb82, gpt82, gact82, dd82 = traverse("82179501", 4, True, True, 7)
ulb44, gpt44, gact44, dd44 = traverse("44504701", 5, True, True, 7)

# 段1-7のACT会員IDセット取得
def get_act_set_d1to7(target_code, level):
    m0 = members_by_code.get(target_code)
    if not m0: return set()
    rates = UNILEVEL_RATES.get(level, UNILEVEL_RATES[4])
    act_set = set()
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
            if depth <= 7: act_set.add(cur_id)
            for c in upline_children.get(cur_id, []): stack.append((c, depth+1))
    return act_set

set82 = get_act_set_d1to7("82179501", 4)
set44 = get_act_set_d1to7("44504701", 5)
overlap = set82 & set44
print(f"  82の段1-7 ACT: {len(set82)}名")
print(f"  44の段1-7 ACT: {len(set44)}名")
print(f"  重複会員: {len(overlap)}名")
if overlap:
    for mid in list(overlap)[:5]:
        m = members_by_id[mid]
        print(f"    {m['member_code']}: status={m['status']}, fa={m['force_active']}")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【最終分析】bonusCSVのgrp_ptの値から可能なロジックを全て試す")
print("82のCSV grp_pt=22,800 = 新ロジック(21,900) + 900pt")
print("44のCSV grp_pt=16,050 = 新ロジック(15,900) + 150pt")
print("これは「特定の会員が新ロジックでは段8+だがCSVでは段7以内」")
print("=" * 70)

# 新ロジックで段8+にいる会員のうち、ptが一致する組み合わせを調べる
for tc, level in TARGETS.items():
    brow = bonus_data.get(tc, {})
    csv_grp_pt = brow.get('grp_pt', 0)
    csv_ulb    = brow.get('ulb', 0)
    rates = UNILEVEL_RATES[level]
    
    m0 = members_by_code.get(tc)
    if not m0: continue
    
    # 新ロジックで全深度トラバース、d8+のACT会員を取得
    new_ulb, new_gpt, new_gact, _ = traverse(tc, level, True, True, 7)
    
    # 全深度での段番号付きACT会員リスト
    all_act_with_depth = {}
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
            all_act_with_depth[cur_id] = {'depth': depth, 'pt': m['self_pt_04'], 'mc': m['member_code']}
            for c in upline_children.get(cur_id, []): stack.append((c, depth+1))
    
    d8plus = {mid: info for mid, info in all_act_with_depth.items() if info['depth'] > 7}
    target_diff_pt = csv_grp_pt - new_gpt  # 足りないpt
    target_diff_ulb = csv_ulb - new_ulb    # 足りないULB円
    
    print(f"\n{tc}: 新ロジック段1-7のgrp_pt={new_gpt:,} → CSV={csv_grp_pt:,} 差={target_diff_pt}")
    print(f"  新ロジック段1-7のULB={new_ulb:,} → CSV={csv_ulb:,} 差={target_diff_ulb}")
    print(f"  段8+のACT会員: {len(d8plus)}名")
    print(f"  段8のACT会員:")
    d8_members = [(mid, info) for mid, info in d8plus.items() if info['depth'] == 8]
    d8_sorted = sorted(d8_members, key=lambda x: x[1]['pt'], reverse=True)
    for mid, info in d8_sorted[:15]:
        print(f"    {info['mc']}: depth={info['depth']}, pt={info['pt']}")
    
    # pt合計がtarget_diff_ptに一致する組み合わせを探す（段8の会員から）
    # 簡単な探索：pt=150の会員からtarget_diff_pt/150名を選ぶ
    d8_pt150 = [mid for mid, info in d8plus.items() 
                if info['depth'] == 8 and info['pt'] == 150]
    print(f"\n  段8でpt=150の会員: {len(d8_pt150)}名")
    print(f"  必要: {target_diff_pt}pt = {target_diff_pt//150}名×150pt")
    print(f"  必要ULB追加: {target_diff_ulb}円 = {target_diff_ulb}/(rate{rates[6]}%/100)/100 = "
          f"{target_diff_ulb/(rates[6]/100)/100:.1f}pt相当")
