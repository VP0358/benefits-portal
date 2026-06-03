#!/usr/bin/env python3
"""
trace-44-depth7-gap.py
========================
44504701のULB差=300円（1名×150pt×rate2%）の根本原因を特定。

前スクリプトは「段7非ACT由来16名=4800円」と言っているが、
CSVとの差は300円（1名分）。なぜ16名のうち15名はCSVで段8扱いなのか？

44のCSV: ULB=44,850円
V1新ロジック: ULB=44,550円
差: +300円

段1-6の差がない（確認済み）ので、段7の差のみ:
  新ロジック段7: 52名, pt=7950, ULB=15900
  CSV段7: 53名, pt=8100, ULB=16200 ← (44,850 - 44,550 + 15900=16200... 検算)
  実際に: 44850 - (44550 - 15900) = 44850 - 28650 = 16200円 ← CSV段7相当

よって差は1名（150pt×rate2%=300円）のみ。
この1名を特定する。
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
            'ulb':    int(row['ユニレベルB'].replace(',','') or 0),
            'grp_pt': int(row['グループpt'].replace(',','') or 0),
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

def get_act_depth_map(target_code, level):
    m0 = members_by_code.get(target_code)
    if not m0: return {}
    rates = UNILEVEL_RATES.get(level, UNILEVEL_RATES[4])
    act_map = {}
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
            for c in upline_children.get(cur_id, []): stack.append((c, depth+1))
    return act_map

# ──────────────────────────────────────────────────────────
print("=" * 70)
print("【44の段7分析】なぜ段8に16名いてもULB差は1名分（300円）のみ？")
print("=" * 70)

# 44の新ロジックでの段別詳細
act_map_44 = get_act_depth_map("44504701", 5)
rates44 = UNILEVEL_RATES[5]
m0_44 = members_by_code.get("44504701")

print(f"\n44の新ロジック各段集計:")
ulb_total = 0
for d in range(1, 9):
    mems = [(mid, members_by_id[mid]) for mid, depth in act_map_44.items() if depth == d]
    pt   = sum(m['self_pt_04'] for _, m in mems)
    rate = rates44[d-1] if d-1 < len(rates44) else 0
    b    = sum(ulb_bonus(m['self_pt_04'], rate) for _, m in mems) if rate > 0 else 0
    if d <= 7: ulb_total += b
    print(f"  段{d}: {len(mems):3}名, pt={pt:6,}, rate={rate}%, ULB={b:6,}円  {'(計算対象)' if d<=7 else '(除外)'}")

brow = bonus_data.get("44504701", {})
print(f"\n  V1新ロジック段1-7 ULB合計: {ulb_total:,}円")
print(f"  bonusCSV ULB: {brow.get('ulb',0):,}円")
print(f"  差: {ulb_total - brow.get('ulb',0):+,}円")

# 段7のACT会員詳細
d7_44 = [(mid, members_by_id[mid]) for mid, d in act_map_44.items() if d == 7]
d7_pt = sum(m['self_pt_04'] for _, m in d7_44)
print(f"\n  新ロジック段7: {len(d7_44)}名, pt={d7_pt:,}")
print(f"  段7 ULB: {sum(ulb_bonus(m['self_pt_04'],rates44[6]) for _,m in d7_44):,}円")

# CSVから44の段7相当のULBを逆算
d1_6_ulb = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates44[d-1]) 
    for mid, d in act_map_44.items() if 1 <= d <= 6
)
csv_ulb = brow.get('ulb', 0)
csv_d7_ulb = csv_ulb - d1_6_ulb
print(f"\n  CSV逆算: 段1-6 ULB={d1_6_ulb:,}円, 段7 CSV={csv_d7_ulb:,}円")
print(f"  CSV段7 ULB={csv_d7_ulb:,} / rate2% / 100 = {csv_d7_ulb/2*100:.0f}pt = {csv_d7_ulb/2*100/150:.1f}名")
print(f"  → CSV段7は{csv_d7_ulb//300:,}名（各150pt）")

# 82の確認
print("\n" + "=" * 70)
print("【82の段7分析】確認用")
print("=" * 70)

act_map_82 = get_act_depth_map("82179501", 4)
rates82 = UNILEVEL_RATES[4]

d1_6_ulb_82 = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates82[d-1]) 
    for mid, d in act_map_82.items() if 1 <= d <= 6
)
brow82 = bonus_data.get("82179501", {})
csv_ulb_82 = brow82.get('ulb', 0)
csv_d7_ulb_82 = csv_ulb_82 - d1_6_ulb_82
print(f"  CSV逆算: 段1-6 ULB={d1_6_ulb_82:,}円, 段7 CSV={csv_d7_ulb_82:,}円")
print(f"  CSV段7 ULB={csv_d7_ulb_82:,} / rate1% / 100 = {csv_d7_ulb_82/1*100:.0f}pt = {csv_d7_ulb_82/1*100/150:.1f}名")
print(f"  → CSV段7は{csv_d7_ulb_82//150:,}名（各150pt）")

d7_82 = [(mid, members_by_id[mid]) for mid, d in act_map_82.items() if d == 7]
print(f"  V1新ロジック段7: {len(d7_82)}名")
d8_82 = [(mid, members_by_id[mid]) for mid, d in act_map_82.items() if d == 8]
print(f"  V1新ロジック段8: {len(d8_82)}名")
print(f"  差: {csv_d7_ulb_82//150 - len(d7_82)}名")

# ══════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("【44の段8ACT会員の来歴詳細】段7非ACTから来た会員を特定")
print("=" * 70)

# 44の段8のACT会員（新ロジック）
d8_44 = [(mid, d) for mid, d in act_map_44.items() if d == 8]
d7_44_set = set(mid for mid, d in act_map_44.items() if d == 7)

print(f"\n44の段8ACT会員: {len(d8_44)}名")
print(f"44の段7ACT会員: {len(d7_44_set)}名")

# 段7ACTの直接の子で段8のACT
d7_children_act_d8 = []
for d7_id in d7_44_set:
    for child_id in upline_children.get(d7_id, []):
        if child_id in act_map_44 and act_map_44[child_id] == 8:
            d7_children_act_d8.append((d7_id, child_id))

print(f"段7ACT → 段8ACT（直接の子）: {len(d7_children_act_d8)}名")

# 段7非ACTの子で段8（非ACT透過後に段8になった）
# → これが「本来段7に来るべき」会員
# → 段7のACT会員の子は非ACT(depth=8相当だが透過後7)→その子がACT→段8

# まず44のツリーで段7にいるすべての「非ACT」ノードを特定
# （新ロジックでは段7のACTが見えているが、その前に非ACTが透過されている）

# 段7のACT会員のIDと、その直上に非ACT会員があるケースを探す
# → 段7ACTのuplineに非ACT会員がいる場合、その非ACTは段6で透過したもの

# 正確なアプローチ：
# 段7ACT: その直接の親（uplineId）が段7以内のACTか確認
# もし親が非ACTで透過してきたなら、段7ACTは元々どこにいるか

# 別アプローチ：全ノード（ACT+非ACT）のdepth割り当てを追跡
def get_full_depth_map(target_code):
    """全ノード（ACT/非ACT/WD問わず）の「有効深度」を追跡"""
    m0 = members_by_code.get(target_code)
    if not m0: return {}, {}
    
    all_depth = {}    # id → (actual_depth, act_depth)
    act_depth_map = {}  # id → assigned ACT depth
    
    # (node_id, act_depth_from_parent, actual_depth)
    # act_depth_from_parent = 親ACTの深度 + 1（次にACTが来たときの深度）
    stack = [(cid, 1, 1) for cid in upline_children.get(m0['id'], [])]
    while stack:
        cur_id, act_depth, actual_depth = stack.pop()
        m = members_by_id.get(cur_id)
        if not m: continue
        
        wd  = is_withdrawn(m['status'], m['force_active'])
        act = is_active(m['status'], m['self_pt_04'], m['has_req_04'], m['force_active'])
        
        all_depth[cur_id] = {
            'act_depth': act_depth,
            'actual_depth': actual_depth,
            'act': act, 'wd': wd,
            'mc': m['member_code'],
            'pt': m['self_pt_04'],
        }
        
        if wd or not act:
            # 透過: act_depthは変わらず
            for c in upline_children.get(cur_id, []):
                stack.append((c, act_depth, actual_depth + 1))
        else:
            # ACT: act_depthに配置
            act_depth_map[cur_id] = act_depth
            for c in upline_children.get(cur_id, []):
                stack.append((c, act_depth + 1, actual_depth + 1))
    
    return all_depth, act_depth_map

all_44, act_44 = get_full_depth_map("44504701")

# 44のact_44 でact_depth=8の会員
d8_act_44 = {mid: info for mid, info in all_44.items() if info['act'] and info['act_depth'] == 8}
print(f"\n44の全ノード深度マップ: ACT段8に{len(d8_act_44)}名")

# act_depth=7の非ACT会員（透過ノード）
d7_nonact_44 = {mid: info for mid, info in all_44.items() if not info['act'] and info['act_depth'] == 7}
print(f"44のact_depth=7の非ACT会員: {len(d7_nonact_44)}名")

# act_depth=7の非ACT会員の子でACTの会員（→ act_depth=7になるはず）
d7_nonact_children_act = {}
for nonact_id, nonact_info in d7_nonact_44.items():
    for child_id in upline_children.get(nonact_id, []):
        child_info = all_44.get(child_id, {})
        if child_info.get('act'):
            d7_nonact_children_act[child_id] = {
                'parent_nonact': nonact_info['mc'],
                'act_depth': child_info['act_depth'],
                'pt': child_info['pt'],
                'mc': child_info['mc'],
            }

print(f"\nact_depth=7の非ACT会員の子でACTの会員: {len(d7_nonact_children_act)}名")
for mid, info in sorted(d7_nonact_children_act.items(), key=lambda x: x[1]['mc']):
    print(f"  {info['mc']}: act_depth={info['act_depth']}, pt={info['pt']}, parent_nonact={info['parent_nonact']}")

# 問題の確認: act_depth=8になった理由は？
# 段7ACT → act_depth=8 → その子の非ACT → act_depth=8のまま → その子のACT → act_depth=8
# でも、act_depth=7の非ACT → その子のACT → act_depth=7

# 前スクリプトが「段7非ACTの子で段8のACT16名」と言った理由：
# 「段7に来た非ACTの子でdepth=8のACT」= 
#   段7ACT.children → act_depth=8 の非ACT → .children → ACT → act_depth=8
# ではなく
#   act_depth=7の非ACT.children → ACT → act_depth=7 のはず

# 混乱の原因: 前スクリプトの「段7非ACT」の定義が曖昧

# ── 実際の44の段8ACT会員の来歴を正確に追跡 ──────────────
print("\n" + "=" * 70)
print("【44の段8ACT全員の親chainを追跡して「なぜ段8か」確認】")
print("=" * 70)

def get_upline_path(mid, steps=5):
    """uplineを steps 段辿ってパスを返す"""
    path = []
    cur_id = mid
    for _ in range(steps):
        m = members_by_id.get(cur_id)
        if not m: break
        up_id = m.get('upline_id')
        if not up_id: break
        up_m = members_by_id.get(up_id)
        if not up_m: break
        wd  = is_withdrawn(up_m['status'], up_m['force_active'])
        act = is_active(up_m['status'], up_m['self_pt_04'], up_m['has_req_04'], up_m['force_active'])
        path.append({
            'mc': up_m['member_code'],
            'act': act, 'wd': wd,
            'fa': up_m['force_active'],
            'pt': up_m['self_pt_04'],
            'act_d': act_44.get(up_id, '-'),
        })
        cur_id = up_id
    return path

print("44の段8ACT会員（新ロジック）の上流パス:")
d8_44_sorted = sorted([(mid, act_44[mid]) for mid in act_44 if act_44[mid] == 8],
                      key=lambda x: members_by_id[x[0]]['member_code'])

for mid, depth in d8_44_sorted[:20]:
    m = members_by_id[mid]
    path = get_upline_path(mid, 4)
    path_str = " → ".join([f"{p['mc']}(d{p['act_d']},{'ACT' if p['act'] else 'WD' if p['wd'] else 'NA'})" for p in reversed(path)])
    print(f"  {m['member_code']}(d8,pt={m['self_pt_04']}) ← {path_str}")

# ── 44のULB差の根本：1名を特定 ──────────────────────────
print("\n" + "=" * 70)
print("【44のULB差+300円：段7に1名追加で一致する組み合わせを探す】")
print("=" * 70)

# 段8のACT会員のうち、仮に「そのACT会員が段7扱いになれば」ULBが増える額
rates44_7 = rates44[6]  # 2%
for mid, depth in d8_44_sorted:
    m = members_by_id[mid]
    bonus_if_d7 = ulb_bonus(m['self_pt_04'], rates44_7)
    if bonus_if_d7 == 300:  # 1名分=300円
        path = get_upline_path(mid, 4)
        path_str = " → ".join([f"{p['mc']}(d{p['act_d']},{'ACT' if p['act'] else 'WD' if p['wd'] else 'NA'})" for p in reversed(path)])
        print(f"  ✅ {m['member_code']}(pt={m['self_pt_04']}) → +300円 ← {path_str}")

# 実際のULBを最終確認
ulb44_new = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates44[d-1] if d-1 < len(rates44) else 0)
    for mid, d in act_44.items() if d <= 7
)
print(f"\n44の最終ULB（新ロジック段1-7）: {ulb44_new:,}円 vs CSV: 44,850円")

# ── 82の同様確認 ──────────────────────────────────────
print("\n" + "=" * 70)
print("【82のULB差+1050円の最終確認】")
print("=" * 70)

d8_82_sorted = sorted([(mid, act_map_82[mid]) for mid in act_map_82 if act_map_82[mid] == 8],
                      key=lambda x: members_by_id[x[0]]['member_code'])

rates82_7 = rates82[6]  # 1%
total_if_d7 = sum(ulb_bonus(members_by_id[mid]['self_pt_04'], rates82_7) for mid, _ in d8_82_sorted)
print(f"  段8全員が段7だったとしたら追加ULB: {total_if_d7:,}円 (段8={len(d8_82_sorted)}名)")

# 前セッション特定の7名: 14578101, 32647101, 48743401, 54619301, 61225401, 64072801, 92993201
prev_7_names = ['14578101', '32647101', '48743401', '54619301', '61225401', '64072801', '92993201']
print(f"\n  前セッション特定の7名: {prev_7_names}")
prev_7_ids = [members_by_code.get(mc, {}).get('id') for mc in prev_7_names if mc in members_by_code]
prev_7_bonus = sum(ulb_bonus(members_by_id[mid]['self_pt_04'], rates82_7) for mid in prev_7_ids if mid)
print(f"  7名のbonus合計: {prev_7_bonus:,}円 (期待=1,050円)")
if prev_7_bonus == 1050:
    print(f"  ✅ 完全一致！")
else:
    print(f"  ❌ 不一致")

# これら7名の上流パスを確認
all_82, act_82_full = get_full_depth_map("82179501")
print(f"\n  7名の上流パス（新ロジックでなぜ段8になったか）:")
for mc in prev_7_names:
    m0_check = members_by_code.get(mc)
    if not m0_check: continue
    mid = m0_check['id']
    path = get_upline_path(mid, 5)
    path_str = " → ".join([f"{p['mc']}(d{p['act_d']},{'ACT' if p['act'] else 'WD' if p['wd'] else 'NA'})" for p in reversed(path)])
    print(f"  {mc}(d{act_map_82.get(mid,'?')}) ← {path_str}")

# ── まとめ ────────────────────────────────────────────
print("\n" + "=" * 70)
print("【結論】ULB差の根本原因と必要な修正")
print("=" * 70)

ulb82_new = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates82[d-1] if d-1 < len(rates82) else 0)
    for mid, d in act_map_82.items() if d <= 7
)
ulb44_new2 = sum(
    ulb_bonus(members_by_id[mid]['self_pt_04'], rates44[d-1] if d-1 < len(rates44) else 0)
    for mid, d in act_44.items() if d <= 7
)

print(f"\n  82: V1新ロジックULB={ulb82_new:,}円 vs CSV=53,850円  差={ulb82_new-53850:+,}")
print(f"  44: V1新ロジックULB={ulb44_new2:,}円 vs CSV=44,850円  差={ulb44_new2-44850:+,}")

print(f"\n  【82の差異】: 7名(各150pt)が段8→段7になると+1050円 → 一致")
print(f"  7名の上流構造: 段6のACT → 段7のACT → 非ACT → ACT(段8)")
print(f"  修正案: 段7のACTの直接の子が非ACTの場合、その子の子は段7として計算")
print(f"  = 「直近ACT会員の深度 + 1」ではなく「透過ACT計算時は透過会員を読み飛ばす」")
print()
print(f"  【44の差異】: 1名(150pt)が段8→段7になると+300円 → 一致のはず")
print(f"  → 段8のどの会員が対象かを確認する")
